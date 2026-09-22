/**
 * Using what is in the Bag (docs/design/MARKET.md §5).
 *
 * One reducer, and a `switch` over `ConsumableEffect` that the compiler makes exhaustive: adding a
 * new *kind* of consumable fails to build here until it is handled, which is the whole reason the
 * effect is a discriminated union rather than an id the reducer recognises (`CLAUDE.md` §8).
 *
 * **The item leaves the Bag only if the effect actually happened.** Every arm below either applies
 * and reports what changed, or refuses and leaves the Bag untouched — a Chicken spent on a
 * champion who was already at their cap would be a player's worst moment with this feature.
 */
import { content } from '@content/registry';
import type { ConsumableDef, ConsumableEffect } from '@content/consumables/types';
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { BREWERY_DAILY_RUNS } from '@content/balance/brewery';
import { runsLeft } from '@engine/brewery/runs';
import type { BoostId } from '@content/balance/boosts';
import { applyBoost } from '@engine/boosts/index';
import { holds, takeFromBag } from '@engine/bag/index';
import { levelCap, maxStars } from '@engine/champions/stats';
import { fail, ok, type Result } from '@engine/errors';
import { dailyKey, weeklyKey } from '@engine/time/clock';
import { bumpCounter, bumpCounterId } from '@engine/progression/counters';
import type { SaveGame } from '@engine/schema/save';
import { missionsState } from './missions';

/** What using one did, for the line the Bag prints afterwards. */
export interface UseResult {
  def: ConsumableDef;
  /** A sentence-worth of what happened, as an i18n key and its numbers. */
  outcome:
    | { kind: 'boost'; boost: BoostId; until: number }
    | { kind: 'brewery_runs' }
    | { kind: 'quest_reset'; period: 'daily' | 'weekly' }
    | { kind: 'mission_skip'; missionId: string }
    | { kind: 'champion_level'; instanceId: string; level: number }
    | { kind: 'champion_stars'; instanceId: string; stars: number };
}

export interface UseInput {
  item: string;
  now: number;
  /** Required by the two that act on a champion; ignored by the rest. */
  instanceId?: string;
}

/**
 * Uses one of an item.
 *
 * The effect is applied first and the item taken only once it has, so a refusal costs nothing.
 */
export function applyUseItem(save: SaveGame, input: UseInput): Result<UseResult> {
  const def = content.consumableById(input.item);
  if (!def) return fail('invalid_argument', `No item ${input.item}`);
  if (!holds(save.bag, def.id)) return fail('invalid_argument', 'You are not holding one of those');

  const outcome = applyEffect(save, def.effect, input);
  if (!outcome.ok) return outcome;

  const bag = takeFromBag(save.bag, def.id);
  // `holds` already said there was one; this is the type system's belt to that braces.
  if (!bag) return fail('invalid_argument', 'You are not holding one of those');
  save.bag = bag;

  bumpCounter(save, 'bag.used');
  bumpCounterId(save, 'bag.used.', def.id);
  return ok({ def, outcome: outcome.value });
}

/** The nine effects. Exhaustive over `ConsumableEffect` — a new kind will not compile until added. */
function applyEffect(
  save: SaveGame,
  effect: ConsumableEffect,
  input: UseInput,
): Result<UseResult['outcome']> {
  switch (effect.kind) {
    case 'boost': {
      save.boosts = applyBoost(save.boosts, effect.boost, input.now);
      return ok({ kind: 'boost', boost: effect.boost, until: save.boosts[effect.boost] ?? 0 });
    }

    case 'brewery_runs': {
      /*
       * Hands the day's runs back by zeroing the count against *today's* key. Stamping today
       * matters: zeroing the count while leaving an older key would be a no-op, because a record
       * from an older day already reads as a fresh twenty.
       */
      const today = dailyKey(input.now, DAILY_RESET_HOUR);
      /*
       * Ask the Brewery's own rule how many runs are left rather than comparing keys here: a
       * chronicle that has never brewed carries `periodKey: ''` with a full twenty available, and
       * a guard that only checked the stored key would spend the token on nothing.
       */
      if (runsLeft(save.brewery, today) >= BREWERY_DAILY_RUNS)
        return fail('invalid_argument', 'Today’s runs are all still there');
      save.brewery = { ...save.brewery, periodKey: today, runs: 0 };
      return ok({ kind: 'brewery_runs' });
    }

    case 'quest_reset': {
      /*
       * Puts a board back to untouched — quests, points and chests (the owner's answer). The
       * baseline is re-snapshotted to *now*, which is what makes the quests re-earnable: a
       * counter goal measures the delta from its baseline, so moving the baseline forward is
       * exactly "do them again" and never "they are already done".
       */
      const period = effect.period;
      const key =
        period === 'daily'
          ? dailyKey(input.now, DAILY_RESET_HOUR)
          : weeklyKey(input.now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
      const board = save.quests[period];
      if (board.periodKey === key && board.claimed.length === 0 && board.chests.length === 0)
        return fail('invalid_argument', 'That board is already untouched');
      save.quests = {
        ...save.quests,
        [period]: {
          periodKey: key,
          baseline: { ...save.stats },
          claimed: [],
          chests: [],
          // A board earned twice still only counts one day towards the weekly that counts days.
          dayCounted: board.periodKey === key ? board.dayCounted : false,
        },
      };
      return ok({ kind: 'quest_reset', period });
    }

    case 'mission_skip': {
      /*
       * Marks the open mission done without paying it. It goes into `claimed` like any other, so
       * the line advances and the chapter's chest still counts it (the owner's answer) — the only
       * thing lost is that mission's own reward.
       *
       * It deliberately does **not** bump `missions.claimed`: that counter feeds quests and
       * missions that ask how many have been *earned*, and a bought one was not.
       */
      const state = missionsState(save, input.now);
      const active = state.active;
      if (!active) return fail('invalid_argument', 'The Path has nothing open to skip');
      save.missions.claimed.push(active.mission.id);
      // The next page opens on the counters as they stand now, exactly as a real claim does.
      const after = missionsState(save, input.now);
      save.missions.baseline = after.active ? { ...save.stats } : {};
      bumpCounter(save, 'missions.skipped');
      return ok({ kind: 'mission_skip', missionId: active.mission.id });
    }

    case 'champion_level': {
      const champion = input.instanceId ? save.roster[input.instanceId] : undefined;
      if (!champion) return fail('invalid_argument', 'Choose a champion first');
      const cap = levelCap(champion.stars);
      if (champion.level >= cap) return fail('invalid_argument', 'They are already at their cap');
      champion.level = cap;
      champion.xp = 0;
      return ok({ kind: 'champion_level', instanceId: champion.instanceId, level: cap });
    }

    case 'champion_stars': {
      const champion = input.instanceId ? save.roster[input.instanceId] : undefined;
      if (!champion) return fail('invalid_argument', 'Choose a champion first');
      const def = content.championById(champion.defId);
      if (!def) return fail('invalid_argument', 'That champion has no definition');
      const most = maxStars(def.rarity);
      if (champion.stars >= most) return fail('invalid_argument', 'They already wear every star');
      /*
       * The game's own rank-up rule, applied for free: one more star, and **the level they had**
       * (`applyRankUp`). So the Cheatmeal maxes the stars and not the level, which is the owner's
       * brief — and the Chicken is still worth buying afterwards.
       */
      champion.stars = most;
      return ok({ kind: 'champion_stars', instanceId: champion.instanceId, stars: most });
    }
  }
}
