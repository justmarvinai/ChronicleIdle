/**
 * Campaign tunables (docs/design/CAMPAIGN.md). Twelve settlements × ten stages × three
 * difficulties; everything a stage costs, grants and demands is derived from these numbers and
 * the stage's global index, so a balance pass is an edit here rather than 360 content edits.
 */
import type { Rarity } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';
import type { Difficulty } from './battle';

export const SETTLEMENT_COUNT = 12;
export const STAGES_PER_SETTLEMENT = 10;
/** Stage 10 of every settlement is its boss stand. */
export const BOSS_STAGE_NUMBER = 10;
/** Campaign battles field three champions (BATTLE.md §1). */
export const CAMPAIGN_PARTY_SIZE = 3;

/** Global stage index 0..119, which drives enemy scaling (BATTLE.md §4.5). */
export function globalStageIndex(settlement: number, stage: number): number {
  return (settlement - 1) * STAGES_PER_SETTLEMENT + (stage - 1);
}

/** Energy per run by settlement band and difficulty (CAMPAIGN.md §2); boss stages cost one more. */
export const ENERGY_COST: Readonly<Record<Difficulty, readonly [number, number, number]>> = {
  intro: [4, 5, 6],
  normal: [6, 7, 8],
  hard: [8, 9, 10],
};
export const BOSS_ENERGY_EXTRA = 1;

/** Ally turns allowed for the third star, and the limit past which the run is lost. */
export const STAR3_TURN_LIMIT = 25;
export const STAR3_TURN_LIMIT_BOSS = 30;
export const DEFEAT_TURN_LIMIT = 40;
export const DEFEAT_TURN_LIMIT_BOSS = 50;

/** Stars per settlement + difficulty at which a star chest is granted (CAMPAIGN.md §7). */
export const STAR_CHEST_THRESHOLDS = [10, 20, 30] as const;
/** Stars available per settlement and difficulty. */
export const STARS_PER_SETTLEMENT = STAGES_PER_SETTLEMENT * 3;

/** Enemy level shown on plates: display only, never a stat multiplier (USER_QUESTIONS Q29). */
export const ENEMY_LEVEL_PER_STAGE = 0.5;
export const ENEMY_LEVEL_DIFFICULTY_ADD: Readonly<Record<Difficulty, number>> = {
  intro: 0,
  normal: 20,
  hard: 40,
};

// ---------------------------------------------------------------------------------------------
// Rewards (CAMPAIGN.md §7)
// ---------------------------------------------------------------------------------------------

export const GOLD_BASE = 120;
/** Gold grows 6 % per global stage index. */
export const GOLD_STAGE_GROWTH = 0.06;
export const GOLD_DIFFICULTY: Readonly<Record<Difficulty, number>> = { intro: 1, normal: 2.2, hard: 4 };
export const GOLD_BOSS_MULT = 2;

/**
 * Champion and player XP per point of energy a run costs (CAMPAIGN.md §7). Not to be confused
 * with `balance/xp.ts`'s curve bases: these are what a win pays, those are what a level costs.
 *
 * Both were lifted in `0.7.2` after the owner played the campaign end to end and found it paid
 * too slowly: champion XP by a seventh (30 → 34, so an Intro stand of the first band feeds 136
 * instead of 120) and chronicle XP by a tenth (10 → 11, so three stands still make level 2).
 * Raising these shortens every level in the game, so they move a notch at a time.
 */
export const CHAMPION_XP_PER_ENERGY = 34;
export const PLAYER_XP_PER_ENERGY = 11;
export const XP_DIFFICULTY: Readonly<Record<Difficulty, number>> = { intro: 1, normal: 1.5, hard: 2 };

/**
 * Chance that a run leaves a piece of gear behind; the piece itself is rolled by `@engine/gear`.
 *
 * Lifted from 18 % in `0.7.2`, the other half of that pass: `DROP_RARITY_WEIGHTS` in
 * `balance/gear.ts` now pulls every difficulty's rarities *down*, so the racks fill a little
 * faster to keep a run's spoils feeling the same size. Roughly one piece every four or five runs
 * rather than every five or six; raising it further makes the armoury's 400 slots the wall.
 */
export const GEAR_DROP_CHANCE: Readonly<Record<Difficulty, number>> = {
  intro: 0.22,
  normal: 0.22,
  hard: 0.22,
};
export const GEAR_DROP_CHANCE_BOSS = 0.5;
/** A dropped piece belongs to one of the settlement's own sets this often, else to any set. */
export const GEAR_SET_FROM_POOL_CHANCE = 0.6;

/** A Faded Shard now and then, more often on the harder difficulties. */
export const SHARD_DROP_CHANCE: Readonly<Record<Difficulty, number>> = {
  intro: 0.03,
  normal: 0.04,
  hard: 0.05,
};
/** A brew matching the settlement's dominant element. */
export const BREW_DROP_CHANCE = 0.12;

/** Material ranges rolled on every victory (inclusive). */
export interface MaterialRoll {
  currency: CurrencyId;
  min: number;
  max: number;
}
export const MATERIAL_DROPS: Readonly<Record<Difficulty, readonly MaterialRoll[]>> = {
  intro: [
    { currency: 'mat_scrap_iron', min: 2, max: 4 },
    { currency: 'mat_arcane_dust', min: 1, max: 3 },
  ],
  normal: [
    { currency: 'mat_scrap_iron', min: 3, max: 5 },
    { currency: 'mat_ember_alloy', min: 1, max: 2 },
    { currency: 'mat_arcane_dust', min: 1, max: 3 },
  ],
  hard: [
    { currency: 'mat_ember_alloy', min: 2, max: 3 },
    { currency: 'mat_starsteel', min: 0, max: 1 },
    { currency: 'mat_arcane_dust', min: 1, max: 3 },
  ],
};

/** First clear of a stage, per difficulty (CAMPAIGN.md §7); boss stages use the `boss` row. */
export interface RewardBundle {
  gems?: number;
  energy?: number;
  currencies?: readonly { currency: CurrencyId; amount: number }[];
}
export const FIRST_CLEAR: Readonly<Record<Difficulty, { stage: RewardBundle; boss: RewardBundle }>> = {
  intro: {
    stage: { gems: 5, energy: 15 },
    boss: { gems: 20, energy: 50, currencies: [{ currency: 'shard_ancient', amount: 1 }] },
  },
  normal: {
    stage: { gems: 10, energy: 25 },
    boss: {
      gems: 40,
      energy: 100,
      currencies: [
        { currency: 'shard_ancient', amount: 1 },
        { currency: 'tome_epic', amount: 2 },
      ],
    },
  },
  hard: {
    stage: { gems: 20, energy: 40 },
    boss: {
      gems: 80,
      energy: 150,
      currencies: [
        { currency: 'shard_sacred', amount: 1 },
        { currency: 'tome_legendary', amount: 1 },
      ],
    },
  },
};

/**
 * Star chests at 10 / 20 / 30 stars in a settlement, per difficulty (CAMPAIGN.md §7). The
 * 20-star chest also carries Glyph Sigils: their designed homes are the weekly boss, the
 * missions and the weekly quests (`ECONOMY.md` §2), none of which exist yet, and a Forge whose
 * set chooser can never be used is not a finished Forge (`USER_QUESTIONS.md` Q38).
 */
export const STAR_CHESTS: Readonly<Record<Difficulty, readonly RewardBundle[]>> = {
  intro: [
    {
      currencies: [
        { currency: 'gold', amount: 10_000 },
        { currency: 'brew_universal', amount: 2 },
      ],
    },
    {
      gems: 30,
      currencies: [
        { currency: 'shard_faded', amount: 1 },
        { currency: 'mat_glyph_sigil', amount: 1 },
      ],
    },
    {
      currencies: [
        { currency: 'shard_ancient', amount: 1 },
        { currency: 'mat_refining_core', amount: 5 },
      ],
    },
  ],
  normal: [
    {
      currencies: [
        { currency: 'gold', amount: 25_000 },
        { currency: 'brew_universal', amount: 4 },
      ],
    },
    {
      gems: 60,
      currencies: [
        { currency: 'shard_faded', amount: 2 },
        { currency: 'mat_glyph_sigil', amount: 2 },
      ],
    },
    {
      currencies: [
        { currency: 'shard_sacred', amount: 1 },
        { currency: 'mat_refining_core', amount: 10 },
      ],
    },
  ],
  hard: [
    {
      currencies: [
        { currency: 'gold', amount: 60_000 },
        { currency: 'brew_universal', amount: 8 },
      ],
    },
    {
      gems: 100,
      currencies: [
        { currency: 'shard_ancient', amount: 1 },
        { currency: 'mat_glyph_sigil', amount: 3 },
      ],
    },
    {
      currencies: [
        { currency: 'shard_primordial', amount: 1 },
        { currency: 'mat_refining_core', amount: 20 },
      ],
    },
  ],
};

/**
 * The milestone chest for three stars on every stand of a difficulty (CAMPAIGN.md §7). Intro's
 * reward is an Epic champion of the player's choice and waits for the Summoning Portal's picker
 * (Phase 8), so it is `null` here rather than a silently different prize.
 */
export const MILESTONE_CHESTS: Readonly<Record<Difficulty, RewardBundle | null>> = {
  intro: null,
  normal: {
    gems: 300,
    currencies: [{ currency: 'shard_sacred', amount: 2 }],
  },
  hard: {
    gems: 1_000,
    currencies: [{ currency: 'shard_primordial', amount: 1 }],
  },
};

/**
 * Champion choices the campaign owes (CAMPAIGN.md §7). Mastering a difficulty is the entitlement;
 * the pick itself is taken at the Portal's picker (SUMMONING.md §5), which is why Intro's
 * milestone chest above carries no currencies.
 *
 * Which choices are *owed* is derived from the stars in the save, so a chronicle that mastered
 * Intro before the Portal existed is owed its Epic too; only the taking is stored (CLAUDE.md §5.5).
 */
export interface ChampionChoiceDef {
  id: string;
  /** Three stars on every stand of this difficulty owes the pick. */
  difficulty: Difficulty;
  /** The rarity the picker offers, from the summonable pool. */
  rarity: Rarity;
  /** i18n key naming where the choice came from. */
  reason: string;
}

export const CHAMPION_CHOICES: readonly ChampionChoiceDef[] = [
  {
    id: 'choice.milestone.intro',
    difficulty: 'intro',
    rarity: 'epic',
    reason: 'summon.choice.reason.milestone_intro',
  },
];

/** Auto-repeat run counts and the player level each unlocks (CAMPAIGN.md §9). */
export const AUTO_REPEAT_TIERS = [
  { runs: 10, feature: 'auto_repeat_10' },
  { runs: 25, feature: 'auto_repeat_25' },
  { runs: 50, feature: 'auto_repeat_50' },
] as const;
