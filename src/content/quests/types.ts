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
import type { GlyphKey } from '@assets/manifest.generated';
import type { Difficulty } from '@content/balance/battle';
import type { CraftTier } from '@content/balance/forge';
import type { ShardId } from '@content/balance/summon';
import type { Rarity } from '@content/champions/types';
import type { SetSize } from '@content/sets/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { FeatureId } from '@content/balance/unlocks';

export const QUEST_PERIODS = ['daily', 'weekly'] as const;
export type QuestPeriod = (typeof QUEST_PERIODS)[number];

/**
 * What a quest or a mission asks for — one DSL for both (`QUESTS_MISSIONS.md` §1). The boards use
 * the counter goals; the Chronicler's Path leans on the state predicates, which is why they are
 * read live rather than counted.
 */
export type Goal =
  /** Opening the game on the day. Its own trigger: reading the period completes it. */
  | { type: 'login' }
  /** Any one of several goals; progress is the closest of them. */
  | { type: 'any'; goals: Goal[] }
  // ── The play, counted from the period or the mission's activation ─────────────────────────
  | { type: 'clear_stages'; count: number }
  | { type: 'win_battles'; count: number }
  | { type: 'win_manual'; count: number }
  | { type: 'spend_energy'; amount: number }
  | { type: 'level_champion_times'; count: number }
  | { type: 'rank_up_times'; count: number }
  | { type: 'skill_upgrades'; count: number }
  | { type: 'gear_levels'; count: number }
  /** `tier` counts that bench only (`forge.crafts.<tier>`). */
  | { type: 'craft'; count: number; tier?: CraftTier }
  | { type: 'dismantle'; count: number }
  | { type: 'gear_refine_times'; count: number }
  /** `shard` counts pulls on that shard only (`summon.pulls.<shard>`). */
  | { type: 'summon'; count: number; shard?: ShardId }
  | { type: 'claim_idle'; count: number }
  /** `tier` counts keys spent on that tier only (`boss.fights.<boss>.<tier>`). */
  | { type: 'boss_fights'; boss: string; count: number; tier?: string }
  /**
   * Days whose daily quests were completed. `quests: 5` counts the days five were claimed — the
   * mission line's "5 daily quests on 5 different days"; without it, the whole board.
   */
  | { type: 'complete_daily_quests_days'; count: number; quests?: 5 }
  /**
   * Any counter the game writes (`@engine/progression/counters`), by name. The Hall of Deeds reads
   * its lifetime counters this way — a stand-breaker, a summoner, a feat only a battle can tell —
   * rather than growing a goal type per counter; the validator checks the key is one of them.
   */
  | { type: 'counter'; key: string; count: number }
  // ── What the chronicle *is*, read live off the save ───────────────────────────────────────
  /** One stand, on one difficulty. Stage 10 is a settlement's boss (`CAMPAIGN.md` §2). */
  | { type: 'clear_stage'; settlement: number; stage: number; difficulty: Difficulty }
  | { type: 'settlement_stars'; settlement: number; difficulty: Difficulty; stars: number }
  | { type: 'difficulty_stars'; difficulty: Difficulty; stars: number }
  /** Champions in the roster; `distinct` counts each definition once, whatever its copies. */
  | { type: 'own_champions'; count: number; rarity?: Rarity; distinct?: boolean }
  /** Champions at `level` or better; `stars` narrows it to that rank or better. */
  | { type: 'champion_reach_level'; level: number; count: number; stars?: number }
  | { type: 'champion_reach_stars'; stars: number; count: number }
  /** A champion of that rarity with every ability at its last step. */
  | { type: 'all_skills_maxed'; rarity?: Rarity }
  | { type: 'player_level'; level: number }
  /** The strongest party the chronicle could field (`PARTY_SIZE_BOSS` champions). */
  | { type: 'team_power'; power: number }
  /** Pieces worn by one champion; `minStars` asks for that rank or better. */
  | { type: 'equip_pieces'; count: number; minStars?: number }
  /** A complete set group of that size on one champion (`GEAR.md` §5). */
  | { type: 'equip_full_set'; pieces: SetSize }
  /** Pieces at `level` or better — the racks, or one champion's six slots. */
  | { type: 'gear_reach_level'; level: number; count: number; onOneChampion?: boolean }
  /** Damage this period's keys have put into one tier's pool (`BOSSES.md` §1). */
  | { type: 'boss_damage'; boss: string; tier: string; amount: number }
  /** The best a tier has ever taken, as a share of its pool — a record, so it outlives resets. */
  | { type: 'boss_percent'; boss: string; tier: string; pct: number }
  /** The level the Mine has been dug to (`MINE.md` §3). */
  | { type: 'mine_level'; level: number }
  /** Nodes of the Glorious Palace taken — read live, so a reset gives them back. */
  | { type: 'palace_nodes'; count: number }
  /** Missions behind the chronicle on the Path, claimed or passed with a Dispensation. */
  | { type: 'path_walked'; missions: number }
  /** Every mission before this one — the last page of the Path. */
  | { type: 'all_previous' };

export type GoalType = Goal['type'];

/** One quest: what it asks, what it pays, and the feature it needs to make sense. */
export interface QuestDef {
  /** `quest.<period>.<slug>`. */
  id: string;
  period: QuestPeriod;
  /** i18n key for the line the row shows. */
  name: string;
  /** The glyph the row wears; the validator checks it against the asset manifest. */
  icon: GlyphKey;
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
  /**
   * What the chest pays instead on every `every`-th claim of it — the design's "1 Ancient Shard
   * (every 3rd day)" on the daily hundred (QUESTS_MISSIONS.md §2). The count is per chest and
   * lifetime, so a player who finishes the board three days running sees it on the third.
   */
  cycle?: { every: number; instead: CurrencyAmount[] };
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
