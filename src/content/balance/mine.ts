/**
 * The Mine — the Deepvein under Emberhold (docs/design/MINE.md).
 *
 * A building the chronicle digs deeper one level at a time. Each level sets how many gems a day
 * the crews bring up, how many the store holds before they stop, and — from the fourth level on —
 * the slow trickle of Glyph Sigils that is the Forge's scarcest material. Nothing here is rolled:
 * the Mine pays what the clock says it has dug, so the table is the whole of its behaviour.
 *
 * Changing a row moves the game's gem income, which `pnpm sim:economy` holds to ECONOMY.md §7's
 * bands (the `mine` line and the week's total). Levels may be appended — the save stores only the
 * level built — but a row must never be removed, or a chronicle that dug that deep would own a
 * Mine the table no longer describes.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import { FEATURE_UNLOCK_LEVEL } from './unlocks';

export interface MineLevelDef {
  level: number;
  /** The chronicle level this Mine level may be dug at (MINE.md §3). */
  opensAt: number;
  /** Gems the crews bring up in a day. */
  gemsPerDay: number;
  /**
   * Whole gems the store holds. It fills in `storeGems / gemsPerDay` days and then stops — the
   * crews do not dig what nobody comes to collect — so a deeper Mine can also wait longer.
   */
  storeGems: number;
  /** Glyph Sigils a day, accrued over the same time the gems are and stopped by the same store. */
  sigilsPerDay: number;
  /** What digging down *to* this level costs. Level 1 is built already and costs nothing. */
  cost: readonly CurrencyAmount[];
}

/**
 * The ten levels, from the one the chronicle is handed at level 6 to the one a finished chronicle
 * works towards for months. Gold is the real decision at every step; the materials are the ones
 * `sim:economy` shows piling up with nowhere to go (MINE.md §4), so each costs a few days of a
 * surplus rather than competing with the Forge.
 */
export const MINE_LEVELS: readonly MineLevelDef[] = [
  // The first level opens with the Mine itself, so the two can never disagree.
  { level: 1, opensAt: FEATURE_UNLOCK_LEVEL.mine, gemsPerDay: 6, storeGems: 3, sigilsPerDay: 0, cost: [] },
  {
    level: 2,
    opensAt: 9,
    gemsPerDay: 8,
    storeGems: 4,
    sigilsPerDay: 0,
    cost: [
      { currency: 'gold', amount: 25_000 },
      { currency: 'mat_scrap_iron', amount: 150 },
    ],
  },
  {
    level: 3,
    opensAt: 12,
    gemsPerDay: 10,
    storeGems: 6,
    sigilsPerDay: 0,
    cost: [
      { currency: 'gold', amount: 50_000 },
      { currency: 'mat_scrap_iron', amount: 300 },
      { currency: 'mat_arcane_dust', amount: 40 },
    ],
  },
  {
    level: 4,
    opensAt: 16,
    gemsPerDay: 13,
    storeGems: 8,
    sigilsPerDay: 0.25,
    cost: [
      { currency: 'gold', amount: 90_000 },
      { currency: 'mat_scrap_iron', amount: 500 },
      { currency: 'mat_arcane_dust', amount: 100 },
    ],
  },
  {
    level: 5,
    opensAt: 20,
    gemsPerDay: 16,
    storeGems: 11,
    sigilsPerDay: 0.35,
    cost: [
      { currency: 'gold', amount: 150_000 },
      { currency: 'mat_scrap_iron', amount: 700 },
      { currency: 'mat_arcane_dust', amount: 250 },
      { currency: 'mat_ember_alloy', amount: 60 },
    ],
  },
  {
    level: 6,
    opensAt: 25,
    gemsPerDay: 19,
    storeGems: 14,
    sigilsPerDay: 0.45,
    cost: [
      { currency: 'gold', amount: 240_000 },
      { currency: 'mat_scrap_iron', amount: 900 },
      { currency: 'mat_arcane_dust', amount: 400 },
      { currency: 'mat_ember_alloy', amount: 150 },
    ],
  },
  {
    level: 7,
    opensAt: 30,
    gemsPerDay: 22,
    storeGems: 17,
    sigilsPerDay: 0.6,
    cost: [
      { currency: 'gold', amount: 360_000 },
      { currency: 'mat_scrap_iron', amount: 1_100 },
      { currency: 'mat_arcane_dust', amount: 600 },
      { currency: 'mat_ember_alloy', amount: 300 },
      { currency: 'mat_starsteel', amount: 10 },
    ],
  },
  {
    level: 8,
    opensAt: 38,
    gemsPerDay: 26,
    storeGems: 22,
    sigilsPerDay: 0.75,
    cost: [
      { currency: 'gold', amount: 520_000 },
      { currency: 'mat_scrap_iron', amount: 1_300 },
      { currency: 'mat_arcane_dust', amount: 800 },
      { currency: 'mat_ember_alloy', amount: 450 },
      { currency: 'mat_starsteel', amount: 30 },
    ],
  },
  {
    level: 9,
    opensAt: 46,
    gemsPerDay: 30,
    storeGems: 28,
    sigilsPerDay: 0.9,
    cost: [
      { currency: 'gold', amount: 750_000 },
      { currency: 'mat_scrap_iron', amount: 1_600 },
      { currency: 'mat_arcane_dust', amount: 1_000 },
      { currency: 'mat_ember_alloy', amount: 650 },
      { currency: 'mat_starsteel', amount: 60 },
      { currency: 'mat_refining_core', amount: 10 },
    ],
  },
  {
    level: 10,
    opensAt: 55,
    gemsPerDay: 36,
    storeGems: 36,
    sigilsPerDay: 1,
    cost: [
      { currency: 'gold', amount: 1_100_000 },
      { currency: 'mat_scrap_iron', amount: 2_000 },
      { currency: 'mat_arcane_dust', amount: 1_400 },
      { currency: 'mat_ember_alloy', amount: 900 },
      { currency: 'mat_starsteel', amount: 100 },
      { currency: 'mat_refining_core', amount: 20 },
    ],
  },
];

/** The deepest level the Mine can be dug to today. */
export const MINE_MAX_LEVEL = MINE_LEVELS.length;
