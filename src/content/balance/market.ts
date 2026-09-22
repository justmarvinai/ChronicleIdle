/**
 * The Market (docs/design/MARKET.md): two shelves that could not be less alike.
 *
 * The **Gold Market** is a stall that changes hands every hour — six slots drawn from a pool of
 * everyday goods, mostly singles and small stacks, with the occasional thing worth running for.
 * Its shelf is **derived, never stored** (`CLAUDE.md` §5.5): the hour and the chronicle's own seed
 * decide it, so reloading cannot reroll it and nothing has to run at the top of the hour. What the
 * save keeps is only which slots have already been bought this hour.
 *
 * The **Gem Market** is a fixed shelf that never rotates and never runs out. It sells the nine
 * consumables and a handful of one-time bundles, and it is the only place gems buy time rather
 * than luck.
 */
import type { CurrencyId } from '@content/currencies/types';

/** How often the Gold Market's stall changes hands, in milliseconds (the owner's 60 minutes). */
export const GOLD_MARKET_ROTATION_MS = 3_600_000;

/** Slots on the Gold Market's shelf. Six fits the screen and leaves a choice worth making. */
export const GOLD_MARKET_SLOTS = 6;

/**
 * One row of the Gold Market's pool.
 *
 * `weight` is the chance of the row being drawn for a slot, relative to the other rows; `min`/`max`
 * the stack a slot offers; `unitGold` what one of the thing costs. A row with a big `unitGold` and
 * a tiny `weight` is the "sometimes very rare" the owner asked for — most hours it is not there.
 */
export interface GoldMarketRow {
  currency: CurrencyId;
  weight: number;
  min: number;
  max: number;
  unitGold: number;
}

/**
 * What the stall can carry, cheapest first.
 *
 * Priced against `ECONOMY.md` §8: an active chronicle nets ~112k gold a day, so a shelf whose six
 * slots come to roughly 60–110k is one a player clears about every other hour when they want to —
 * a real sink, never a shopping list they can finish every time.
 *
 * The three rows at the bottom are the ones worth setting an alarm for: an Ancient Shard at 45k is
 * gold buying a summon outright, and a Sacred Shard at 260k is most of a day.
 */
export const GOLD_MARKET_POOL: readonly GoldMarketRow[] = [
  { currency: 'mat_scrap_iron', weight: 100, min: 20, max: 60, unitGold: 120 },
  { currency: 'mat_arcane_dust', weight: 90, min: 15, max: 45, unitGold: 180 },
  { currency: 'mat_ember_alloy', weight: 70, min: 8, max: 24, unitGold: 420 },
  { currency: 'brew_universal', weight: 60, min: 3, max: 10, unitGold: 900 },
  { currency: 'tome_rare', weight: 55, min: 1, max: 4, unitGold: 1_600 },
  { currency: 'mat_starsteel', weight: 40, min: 2, max: 6, unitGold: 2_400 },
  { currency: 'brew_justice', weight: 34, min: 2, max: 6, unitGold: 1_400 },
  { currency: 'brew_valor', weight: 34, min: 2, max: 6, unitGold: 1_400 },
  { currency: 'brew_faith', weight: 34, min: 2, max: 6, unitGold: 1_400 },
  { currency: 'brew_eclipse', weight: 34, min: 2, max: 6, unitGold: 1_400 },
  { currency: 'mat_refining_core', weight: 26, min: 1, max: 3, unitGold: 5_200 },
  { currency: 'tome_epic', weight: 22, min: 1, max: 2, unitGold: 9_000 },
  { currency: 'shard_faded', weight: 20, min: 1, max: 3, unitGold: 6_500 },
  { currency: 'mat_glyph_sigil', weight: 12, min: 1, max: 1, unitGold: 18_000 },
  { currency: 'tome_legendary', weight: 7, min: 1, max: 1, unitGold: 34_000 },
  { currency: 'shard_ancient', weight: 5, min: 1, max: 1, unitGold: 45_000 },
  { currency: 'shard_sacred', weight: 1, min: 1, max: 1, unitGold: 260_000 },
];

/** The pool's total weight; the roll reads it once per slot. */
export const GOLD_MARKET_WEIGHT = GOLD_MARKET_POOL.reduce((sum, row) => sum + row.weight, 0);
