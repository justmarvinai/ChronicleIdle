/**
 * The goal evaluator (docs/design/QUESTS_MISSIONS.md §1).
 *
 * Every goal answers the same three questions — how far along, how far to go, and is it done — so
 * a quest row, a mission card and the points track all read one shape. Pure: a goal is a function
 * of the save and the baseline the period (or the mission) started from, never of a timer or an
 * event stream, so a missed event cannot leave a quest stuck and a reload cannot double it.
 *
 * Two families, and the difference is the whole design (ADR-040):
 *
 * - **Counter goals** are the delta of a lifetime counter against the baseline, so what came
 *   before never finishes what was asked after.
 * - **State predicates** are read live off the save, because they ask what the chronicle *is*.
 *   Levelling one piece from +12 to +16 counts once; selling it uncounts it.
 *
 * What a predicate needs from content — a champion's rarity, a set's size, a boss's pool — comes
 * in as `lookups`, so the engine stays free of the registry.
 */
import { PARTY_SIZE_BOSS } from '@content/balance/battle';
import type { BossDef } from '@content/bosses/types';
import type { ChampionDef, Rarity } from '@content/champions/types';
import type { Goal, GoalType } from '@content/quests/types';
import type { GearSetDef } from '@content/sets/types';
import type { ChampionInstance } from '@engine/champions/instance';
import { currentPeriod, damagePercent, freshPeriod, tierDamage } from '@engine/bosses/period';
import { difficultyStars, isStageCleared, settlementStars, stageIdOf } from '@engine/campaign/progress';
import { totalPower } from '@engine/gear/champion-stats';
import { wornBy } from '@engine/gear/equip';
import type { GearInstance } from '@engine/gear/instance';
import { setGroups } from '@engine/gear/sets';
import { counter, type CounterKey } from '@engine/progression/counters';
import { maxSteps, stepsTaken } from '@engine/progression/tavern-skills';
import type { SaveGame } from '@engine/schema/save';

/** What a state predicate needs to look up in content. */
export interface GoalLookups {
  champion: (id: string) => ChampionDef | undefined;
  gearSet: (id: string) => GearSetDef | undefined;
  boss: (id: string) => BossDef | undefined;
}

/** What a goal reads: the chronicle now, and the counters as they stood when it became active. */
export interface GoalContext {
  save: SaveGame;
  /** The counters at the start of the period, or at the mission's activation. */
  baseline: Readonly<Record<string, number>>;
  /** Now — only the boss-period goals need it, and only to tell this period from a spent one. */
  now: number;
  lookups: GoalLookups;
  /**
   * Whether every mission before this one is claimed. Only the Path's last page asks
   * (`all_previous`), and only the mission line can answer it.
   */
  allPrevious?: boolean;
}

export interface GoalProgress {
  progress: number;
  target: number;
  done: boolean;
}

/**
 * The counter each plain `count`-style goal measures, by goal type. A goal whose key is not
 * written by anything would sit at zero for ever, so `COUNTER_KEYS` owns the names and the content
 * validator checks this map against it (`@engine/progression/counters`). The goals that narrow to
 * one tier, shard or bench name their key in `goalCounterKey` instead.
 */
export const GOAL_COUNTERS: Readonly<Partial<Record<GoalType, CounterKey>>> = {
  clear_stages: 'campaign.cleared',
  win_battles: 'battles.victory',
  win_manual: 'battles.won.manual',
  spend_energy: 'energy.spent',
  level_champion_times: 'tavern.levelUps',
  rank_up_times: 'tavern.rankUps',
  skill_upgrades: 'tavern.skillUpgrades',
  gear_levels: 'gear.levels',
  craft: 'forge.crafts',
  dismantle: 'forge.dismantles',
  gear_refine_times: 'forge.refines',
  summon: 'summon.pulls',
  claim_idle: 'idle.claims',
  complete_daily_quests_days: 'quests.daily.days',
};

/** A counter's growth since the baseline was taken, never negative. */
function delta(ctx: GoalContext, key: string): number {
  return Math.max(0, counter(ctx.save, key) - (ctx.baseline[key] ?? 0));
}

const made = (progress: number, target: number): GoalProgress => ({
  progress: Math.min(progress, target),
  target,
  done: progress >= target,
});

/** Instances of a rarity (or of any rarity), with their definitions. */
function owned(ctx: GoalContext, rarity?: Rarity): { instance: ChampionInstance; def: ChampionDef }[] {
  const all: { instance: ChampionInstance; def: ChampionDef }[] = [];
  for (const instance of Object.values(ctx.save.roster)) {
    const def = ctx.lookups.champion(instance.defId);
    if (def && (rarity === undefined || def.rarity === rarity)) all.push({ instance, def });
  }
  return all;
}

/** The pieces one champion is wearing. */
const worn = (ctx: GoalContext, instance: ChampionInstance): GearInstance[] =>
  wornBy(instance, ctx.save.inventory);

/** The most any single champion manages — "on one champion" goals all read this way. */
function bestChampion(ctx: GoalContext, of: (pieces: GearInstance[]) => number): number {
  let best = 0;
  for (const instance of Object.values(ctx.save.roster)) best = Math.max(best, of(worn(ctx, instance)));
  return best;
}

/** One boss's state as it stands now: this period's numbers, or an empty period with its records. */
function bossState(ctx: GoalContext, boss: BossDef) {
  const saved = ctx.save.bosses[boss.id];
  const empty = freshPeriod('', {});
  return currentPeriod(saved ?? empty, boss.period, ctx.now);
}

/** How far along one goal is. */
export function evaluateGoal(goal: Goal, ctx: GoalContext): GoalProgress {
  switch (goal.type) {
    // Opening the game is the goal: reading the board is the proof.
    case 'login':
      return made(1, 1);

    // The closest of several ways to finish (QUESTS_MISSIONS.md §2, "craft or dismantle").
    case 'any': {
      const parts = goal.goals.map((inner) => evaluateGoal(inner, ctx));
      const best = parts.reduce<GoalProgress | null>(
        (winner, part) =>
          !winner || part.progress / Math.max(1, part.target) > winner.progress / Math.max(1, winner.target)
            ? part
            : winner,
        null,
      );
      return best ?? made(0, 1);
    }

    // ── Counter goals ────────────────────────────────────────────────────────────────────────
    case 'spend_energy':
      return made(delta(ctx, counterOf(goal.type)), goal.amount);

    case 'craft':
      return made(delta(ctx, goal.tier ? `${CRAFT_BENCH}${goal.tier}` : counterOf(goal.type)), goal.count);

    case 'summon':
      return made(delta(ctx, goal.shard ? `${SUMMON_SHARD}${goal.shard}` : counterOf(goal.type)), goal.count);

    case 'boss_fights':
      return made(delta(ctx, bossFightsKey(goal.boss, goal.tier)), goal.count);

    case 'complete_daily_quests_days':
      return made(delta(ctx, goal.quests === 5 ? DAILY_FIVE : counterOf(goal.type)), goal.count);

    // ── The campaign, as it stands ───────────────────────────────────────────────────────────
    case 'clear_stage': {
      const cleared = isStageCleared(
        ctx.save.campaign,
        stageIdOf(goal.settlement, goal.stage),
        goal.difficulty,
      );
      return made(cleared ? 1 : 0, 1);
    }

    case 'settlement_stars':
      return made(settlementStars(ctx.save.campaign, goal.settlement, goal.difficulty), goal.stars);

    case 'difficulty_stars':
      return made(difficultyStars(ctx.save.campaign, goal.difficulty).stars, goal.stars);

    // ── The roster, as it stands ─────────────────────────────────────────────────────────────
    case 'own_champions':
      return made(owned(ctx, goal.rarity).length, goal.count);

    case 'champion_reach_level':
      return made(
        owned(ctx).filter(
          ({ instance }) =>
            instance.level >= goal.level && (goal.stars === undefined || instance.stars >= goal.stars),
        ).length,
        goal.count,
      );

    case 'champion_reach_stars':
      return made(owned(ctx).filter(({ instance }) => instance.stars >= goal.stars).length, goal.count);

    case 'all_skills_maxed': {
      const finished = owned(ctx, goal.rarity).filter(({ instance, def }) =>
        def.abilities.every((ability) => stepsTaken(instance, ability.id) >= maxSteps(ability)),
      );
      return made(finished.length > 0 ? 1 : 0, 1);
    }

    case 'player_level':
      return made(ctx.save.profile.level, goal.level);

    /*
     * The strongest party the chronicle could field: the best four, which is the boss party
     * (`BATTLE.md` §1). Power counts everything worn, so gear and set bonuses are in it.
     */
    case 'team_power': {
      const powers = owned(ctx)
        .map(({ instance, def }) => totalPower(def, instance, worn(ctx, instance), ctx.lookups.gearSet))
        .sort((a, b) => b - a)
        .slice(0, PARTY_SIZE_BOSS);
      return made(Math.round(powers.reduce((sum, value) => sum + value, 0)), goal.power);
    }

    // ── The racks, as they stand ─────────────────────────────────────────────────────────────
    case 'equip_pieces':
      return made(
        bestChampion(
          ctx,
          (pieces) =>
            pieces.filter((piece) => goal.minStars === undefined || piece.stars >= goal.minStars).length,
        ),
        goal.count,
      );

    case 'equip_full_set': {
      const groups = bestChampion(ctx, (pieces) =>
        setGroups(pieces, ctx.lookups.gearSet)
          .filter((group) => group.set.pieces === goal.pieces)
          .reduce((most, group) => Math.max(most, group.groups), 0),
      );
      return made(groups > 0 ? 1 : 0, 1);
    }

    /*
     * A piece the racks hold at that level or better: a state, so it is read live rather than
     * counted. Levelling a piece and then levelling it further must not count twice.
     */
    case 'gear_reach_level': {
      const at = (piece: GearInstance): boolean => piece.level >= goal.level;
      const count = goal.onOneChampion
        ? bestChampion(ctx, (pieces) => pieces.filter(at).length)
        : Object.values(ctx.save.inventory).filter(at).length;
      return made(count, goal.count);
    }

    // ── The bosses ───────────────────────────────────────────────────────────────────────────
    /** What this period's keys have put into one tier's pool: it empties with the period. */
    case 'boss_damage': {
      const boss = ctx.lookups.boss(goal.boss);
      if (!boss) return made(0, goal.amount);
      return made(Math.round(tierDamage(bossState(ctx, boss), goal.tier)), goal.amount);
    }

    /** The best a tier has ever taken, as a share of its pool — a record outlives every reset. */
    case 'boss_percent': {
      const boss = ctx.lookups.boss(goal.boss);
      const tier = boss?.tiers.find((entry) => entry.id === goal.tier);
      if (!tier) return made(0, goal.pct);
      const best = ctx.save.bosses[goal.boss]?.records[goal.tier]?.damage ?? 0;
      return made(Math.floor(damagePercent(tier, best)), goal.pct);
    }

    // ── The Path ─────────────────────────────────────────────────────────────────────────────
    case 'all_previous':
      return made(ctx.allPrevious ? 1 : 0, 1);

    default:
      return made(delta(ctx, counterOf(goal.type)), goal.count);
  }
}

/** The counter a plain goal type measures; throws for a type that has none, which the types prevent. */
function counterOf(type: GoalType): CounterKey {
  const key = GOAL_COUNTERS[type];
  if (!key) throw new Error(`Goal type ${type} has no counter`);
  return key;
}

/** Suffixed counter families a narrowed goal reads (`@engine/progression/counters`). */
const CRAFT_BENCH = 'forge.crafts.';
const SUMMON_SHARD = 'summon.pulls.';
const DAILY_FIVE = 'quests.daily.days5';

const bossFightsKey = (boss: string, tier?: string): string => `boss.fights.${boss}${tier ? `.${tier}` : ''}`;

/**
 * The counter keys a set of goals needs, for the baseline a period or a mission snapshots. The
 * narrowed families are named here rather than in the static map, because their keys carry an id.
 */
export function goalCounterKeys(goals: readonly Goal[]): string[] {
  const keys = new Set<string>();
  const walk = (goal: Goal): void => {
    switch (goal.type) {
      case 'any':
        for (const inner of goal.goals) walk(inner);
        return;
      case 'boss_fights':
        keys.add(bossFightsKey(goal.boss, goal.tier));
        return;
      case 'craft':
        keys.add(goal.tier ? `${CRAFT_BENCH}${goal.tier}` : counterOf(goal.type));
        return;
      case 'summon':
        keys.add(goal.shard ? `${SUMMON_SHARD}${goal.shard}` : counterOf(goal.type));
        return;
      case 'complete_daily_quests_days':
        keys.add(goal.quests === 5 ? DAILY_FIVE : counterOf(goal.type));
        return;
      default: {
        const key = GOAL_COUNTERS[goal.type];
        if (key) keys.add(key);
      }
    }
  };
  for (const goal of goals) walk(goal);
  return [...keys].sort();
}
