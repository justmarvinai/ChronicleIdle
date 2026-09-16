/**
 * Quest content types and the goal DSL (docs/design/QUESTS_MISSIONS.md §1–3).
 *
 * One DSL serves the daily and weekly quests now and the Chronicler's Path later: a goal is data,
 * so adding a quest is a content change. Two families, and the difference matters:
 *
 * - **Counter goals** (`clear_stages`, `summon`, …) are measured as a delta against the counter's
 *   value when the period began, so yesterday's play never completes today's quest.
 * - **State predicates** (`gear_reach_level`, `player_level`) are read live off the save, because
 *   what they ask about is a state the chronicle is in, not something it did.
 *
 * `@engine/quests/goals` evaluates both and says which family a goal belongs to.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import type { FeatureId } from '@content/balance/unlocks';

export const QUEST_PERIODS = ['daily', 'weekly'] as const;
export type QuestPeriod = (typeof QUEST_PERIODS)[number];

/**
 * What a quest asks for. The types here are the ones the daily and weekly quests use; the
 * Chronicler's Path (Phase 13) adds the rest of the DSL the design prints.
 */
export type Goal =
  /** Opening the game on the day. Its own trigger: reading the period completes it. */
  | { type: 'login' }
  /** Any one of several goals; progress is the closest of them. */
  | { type: 'any'; goals: Goal[] }
  | { type: 'clear_stages'; count: number }
  | { type: 'win_battles'; count: number }
  | { type: 'win_manual'; count: number }
  | { type: 'spend_energy'; amount: number }
  | { type: 'level_champion_times'; count: number }
  | { type: 'rank_up_times'; count: number }
  | { type: 'skill_upgrades'; count: number }
  | { type: 'gear_levels'; count: number }
  /** A piece in the racks at `level` or better — a state, checked live. */
  | { type: 'gear_reach_level'; level: number; count: number }
  | { type: 'craft'; count: number }
  | { type: 'dismantle'; count: number }
  | { type: 'summon'; count: number }
  | { type: 'claim_idle'; count: number }
  | { type: 'boss_fights'; boss: string; count: number }
  | { type: 'complete_daily_quests_days'; count: number };

export type GoalType = Goal['type'];

/** One quest: what it asks, what it pays, and the feature it needs to make sense. */
export interface QuestDef {
  /** `quest.<period>.<slug>`. */
  id: string;
  period: QuestPeriod;
  /** i18n key for the line the row shows. */
  name: string;
  icon: string;
  goal: Goal;
  points: number;
  rewards: CurrencyAmount[];
  /**
   * The feature this quest needs. While it is locked the quest is hidden and the period's
   * replacement quest stands in for its points, so the full board is always reachable
   * (QUESTS_MISSIONS.md §2).
   */
  feature: FeatureId | null;
  version: number;
}

/** One node on the points track: everything at or above `points` has earned it. */
export interface QuestChestDef {
  points: number;
  currencies: CurrencyAmount[];
}

/** A period's board: its quests, the stand-in for locked ones, and the chest ladder. */
export interface QuestBoardDef {
  period: QuestPeriod;
  /** The feature that opens the board itself. */
  feature: FeatureId;
  quests: QuestDef[];
  /**
   * The quest that stands in for every hidden one. It is the same quest whatever is locked — only
   * its points change, to exactly what the quests it replaces were worth.
   */
  replacement: QuestDef;
  chests: QuestChestDef[];
  version: number;
}
