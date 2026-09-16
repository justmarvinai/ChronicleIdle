/**
 * The goal evaluator (docs/design/QUESTS_MISSIONS.md §1).
 *
 * Every goal answers the same three questions — how far along, how far to go, and is it done — so
 * a quest row, a mission card and the points track all read one shape. Pure: a goal is a function
 * of the save and the baseline the period started from, never of a timer or an event stream, so a
 * missed event cannot leave a quest stuck and a reload cannot double it.
 */
import type { Goal, GoalType } from '@content/quests/types';
import { counter, type CounterKey } from '@engine/progression/counters';
import type { SaveGame } from '@engine/schema/save';

/** What a goal reads: the chronicle now, and the counters as they stood when the period began. */
export interface GoalContext {
  save: Pick<SaveGame, 'stats' | 'inventory' | 'profile'>;
  /** The counters at the start of the period; a counter goal measures the delta against it. */
  baseline: Readonly<Record<string, number>>;
}

export interface GoalProgress {
  progress: number;
  target: number;
  done: boolean;
}

/**
 * The counter each `count`-style goal measures, by goal type. A goal whose key is not written by
 * anything would sit at zero for ever, so `COUNTER_KEYS` owns the names and the content validator
 * checks this map against it (`@engine/progression/counters`).
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
  summon: 'summon.pulls',
  claim_idle: 'idle.claims',
  complete_daily_quests_days: 'quests.daily.days',
};

/** A counter's growth since the period began, never negative. */
function delta(ctx: GoalContext, key: string): number {
  return Math.max(0, counter(ctx.save, key) - (ctx.baseline[key] ?? 0));
}

const made = (progress: number, target: number): GoalProgress => ({
  progress: Math.min(progress, target),
  target,
  done: progress >= target,
});

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

    // A piece the racks hold at that level or better: a state, so it is read live rather than
    // counted. Levelling a piece and then levelling it further must not count twice.
    case 'gear_reach_level': {
      const pieces = Object.values(ctx.save.inventory).filter((piece) => piece.level >= goal.level).length;
      return made(pieces, goal.count);
    }

    case 'boss_fights':
      return made(delta(ctx, `boss.fights.${goal.boss}`), goal.count);

    case 'spend_energy':
      return made(delta(ctx, counterOf(goal.type)), goal.amount);

    default:
      return made(delta(ctx, counterOf(goal.type)), goal.count);
  }
}

/** The counter a goal type measures; throws for a type that has none, which the types prevent. */
function counterOf(type: GoalType): CounterKey {
  const key = GOAL_COUNTERS[type];
  if (!key) throw new Error(`Goal type ${type} has no counter`);
  return key;
}

/**
 * The counter keys a set of goals needs, for the baseline a period snapshots. `boss_fights` keys
 * are per boss, so they are named here rather than in the static map.
 */
export function goalCounterKeys(goals: readonly Goal[]): string[] {
  const keys = new Set<string>();
  const walk = (goal: Goal): void => {
    if (goal.type === 'any') {
      for (const inner of goal.goals) walk(inner);
      return;
    }
    if (goal.type === 'boss_fights') {
      keys.add(`boss.fights.${goal.boss}`);
      return;
    }
    const key = GOAL_COUNTERS[goal.type];
    if (key) keys.add(key);
  };
  for (const goal of goals) walk(goal);
  return [...keys].sort();
}
