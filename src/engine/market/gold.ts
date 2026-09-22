/**
 * The Gold Market's hourly stall (docs/design/MARKET.md §1).
 *
 * The shelf is **derived, never rolled and stored**. `(seedRoot, hourKey)` seeds the RNG, so the
 * six slots a chronicle sees at 14:00 are the same six at 14:59 however many times the tab is
 * reloaded, and they are a different six at 15:00 without anything having to run at the top of the
 * hour. This is the tower-floor discipline applied to a shop: what the save keeps is not the shelf
 * but only which of its slots have already been bought.
 *
 * It also closes the obvious exploit for free. A shelf that were rolled *and stored* could be
 * rerolled by refusing to save; a shelf that is a pure function of the hour cannot be.
 */
import {
  GOLD_MARKET_POOL,
  GOLD_MARKET_ROTATION_MS,
  GOLD_MARKET_SLOTS,
  type GoldMarketRow,
} from '@content/balance/market';
import type { CurrencyId } from '@content/currencies/types';
import { createRng } from '@engine/rng/rng';

export interface GoldSlot {
  /** Its place on the shelf, 0-based — what a purchase records. */
  index: number;
  currency: CurrencyId;
  /** How many this slot offers in total. */
  stock: number;
  /** Gold for one. */
  unitGold: number;
}

/** Which hour a moment belongs to. The stall changes hands when this changes. */
export function marketHour(now: number): number {
  return Math.floor(now / GOLD_MARKET_ROTATION_MS);
}

/** Milliseconds until the stall changes hands — what the screen counts down. */
export function msUntilRotation(now: number): number {
  return GOLD_MARKET_ROTATION_MS - (now - marketHour(now) * GOLD_MARKET_ROTATION_MS);
}

/**
 * This hour's six slots.
 *
 * Rows are drawn **without replacement** so a shelf is six different things rather than three
 * lots of scrap iron: a stall that repeats itself is a stall with nothing to choose from. With
 * seventeen rows in the pool and six slots that is always possible.
 */
export function goldShelf(seedRoot: string, now: number): readonly GoldSlot[] {
  const rng = createRng(`${seedRoot}:market:${marketHour(now)}`);
  const remaining: GoldMarketRow[] = [...GOLD_MARKET_POOL];
  const slots: GoldSlot[] = [];
  for (let index = 0; index < GOLD_MARKET_SLOTS && remaining.length > 0; index += 1) {
    const row = rng.weighted(remaining.map((entry) => ({ item: entry, weight: entry.weight })));
    remaining.splice(remaining.indexOf(row), 1);
    slots.push({
      index,
      currency: row.currency,
      stock: rng.int(row.min, row.max),
      unitGold: row.unitGold,
    });
  }
  return slots;
}

/** What buying `count` of a slot costs. */
export function slotCost(slot: GoldSlot, count: number): number {
  return slot.unitGold * Math.max(0, Math.trunc(count));
}

/** How many of a slot are left, given what has already been taken from it this hour. */
export function slotLeft(slot: GoldSlot, taken: number): number {
  return Math.max(0, slot.stock - Math.max(0, Math.trunc(taken)));
}

/**
 * The most of this slot a chronicle could buy right now: what is left, capped by what the purse
 * can pay for. Zero means the button is disabled, and the screen says which reason it is.
 */
export function affordableFromSlot(slot: GoldSlot, taken: number, gold: number): number {
  if (slot.unitGold <= 0) return 0;
  return Math.min(slotLeft(slot, taken), Math.floor(gold / slot.unitGold));
}
