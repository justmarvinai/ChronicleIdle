/**
 * The Idle Chest (docs/design/ECONOMY.md §6). The chest fills for as long as the game is closed
 * or open, up to a capacity that grows with the chronicle's level, and pays a farm tier's hourly
 * yield when it is opened. Everything past capacity is lost — that is the "come back in time"
 * tension the brief asks for, and the reason the capacity bands matter.
 *
 * The chest is a **small bonus, never a substitute for playing** (owner's steer, ADR-035). Every
 * number here is set against what the same hour of campaign play pays: an idle hour is worth about
 * one run's gold, and everything else is a fraction of what a run drops. Changing a number here
 * changes the game's idle income, which the 30-day economy simulation (Phase 15) checks against
 * the gold and gem budgets in `ECONOMY.md` §7–§8.
 */
import type { CurrencyId } from '@content/currencies/types';

/**
 * How long the chest takes to fill, by player level (ECONOMY.md §6). `upTo` is inclusive; the
 * last band carries every level above it.
 */
export const IDLE_CAPACITY_BANDS: readonly { upTo: number; hours: number }[] = [
  { upTo: 9, hours: 3 },
  { upTo: 19, hours: 6 },
  { upTo: 29, hours: 12 },
  { upTo: 39, hours: 16 },
  { upTo: 49, hours: 18 },
  { upTo: 59, hours: 21 },
  { upTo: 100, hours: 24 },
];

/**
 * Farm tier 1–36: the settlements of the three difficulties end to end (Intro 1–12, Normal 13–24,
 * Hard 25–36). Tier 0 means no boss has fallen yet and the chest pays nothing.
 */
export const FARM_TIER_MAX = 36;
/** Tier bands, one per difficulty, used by the material table below. */
export const FARM_TIER_BAND = 12;

/**
 * Gold per hour: `IDLE_GOLD_BASE × tier^IDLE_GOLD_POWER` (tier 1: 120; 12: 1.4k; 36: 4.3k). The
 * curve is linear because the campaign's own gold is linear in stage index (`GOLD_STAGE_GROWTH`):
 * one idle hour is worth roughly one run at the tier the chest farms, so a full chest is a dozen
 * to two dozen runs' gold against the ~180 runs an active day spends.
 */
export const IDLE_GOLD_BASE = 120;
export const IDLE_GOLD_POWER = 1;

/** Chronicle XP per hour, per farm tier. It never carries a chronicle past its unlocks alone. */
export const IDLE_PLAYER_XP_PER_TIER = 5;

/** Energy per hour, and the most a single fill may hold. */
export const IDLE_ENERGY_PER_HOUR = 4;
export const IDLE_ENERGY_PER_FILL = 60;

/**
 * Forge materials per hour, by the tier's band: Scrap Iron in the Intro band, Ember Alloy in the
 * Normal band, Starsteel in the Hard band (ECONOMY.md §6). A tier's band pays only its own
 * material, which is what keeps the three Forge tiers on different farms.
 */
export const IDLE_MATERIALS: readonly { currency: CurrencyId; perHour: number; minTier: number }[] = [
  { currency: 'mat_scrap_iron', perHour: 1, minTier: 1 },
  { currency: 'mat_ember_alloy', perHour: 0.4, minTier: FARM_TIER_BAND + 1 },
  { currency: 'mat_starsteel', perHour: 0.18, minTier: FARM_TIER_BAND * 2 + 1 },
];

/**
 * The chest's chance rolls, one roll per whole hour it holds (ECONOMY.md §6). `perFill` caps how
 * many times a single fill may pay out, so a 24-hour chest is not a slot machine.
 */
export interface IdleChanceDef {
  id: string;
  /** Chance per hour, 0..1. */
  chance: number;
  /** Chance per hour once the farm tier reaches `betterFrom`. */
  betterChance?: number;
  betterFrom?: number;
  /** Most procs a single fill may pay. */
  perFill: number;
  /** What one proc pays. `brew: true` pays the farm settlement's own brew instead. */
  currency?: CurrencyId;
  amount?: number;
  brew?: boolean;
}

/**
 * Brews are a stroke of luck rather than a line in the preview: one potion is 1,500 champion XP
 * (`balance/xp.ts`), and a chest that paid them by the hour out-earned the campaign's own 12 %
 * drop per run several times over. At 6 % an hour, capped twice, a full chest is one brew more
 * often than not and never more than two — of the settlement's own element only.
 */
export const IDLE_CHANCES: readonly IdleChanceDef[] = [
  { id: 'gems', chance: 0.08, perFill: 2, currency: 'gems', amount: 5 },
  { id: 'brew', chance: 0.06, perFill: 2, brew: true, amount: 1 },
  { id: 'shard_faded', chance: 0.05, perFill: 2, currency: 'shard_faded', amount: 1 },
  {
    id: 'shard_ancient',
    chance: 0.01,
    betterChance: 0.02,
    betterFrom: FARM_TIER_BAND * 2 + 1,
    perFill: 1,
    currency: 'shard_ancient',
    amount: 1,
  },
];

/** The chest is claimable once this much has accrued; below it the button waits. */
export const IDLE_MIN_CLAIM_MINUTES = 1;
