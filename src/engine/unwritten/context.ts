/**
 * What every Unwritten reducer is given and what it gives back (docs/design/UNWRITTEN.md).
 *
 * A reducer writes into the slice it is handed — the store hands it an immer draft — and returns a
 * receipt of what reaches beyond the slice: currency for the wallet (a Warden's Tithe, an Omen's
 * seal), counters for the chronicle's lifetime ledger, and the Tale when an expedition ends.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import type { InkId } from '@content/unwritten/types';
import type { Roster } from '@engine/champions/instance';
import type { CounterKey } from '@engine/progression/counters';
import type { Tale, UnwrittenSave } from '@engine/schema/unwritten-save';
import type { UnwrittenWorld } from './world';

export interface UnwrittenCtx {
  /** The slice to write into. */
  unwritten: UnwrittenSave;
  world: UnwrittenWorld;
  /** The chronicle's champions: who the company is, at their levels now. */
  roster: Roster;
  now: number;
  /** This week's key (`ECONOMY.md` §9), for the Warden's Tithe. */
  weekKey: string;
}

export interface UnwrittenReceipt {
  /** Paid into the wallet. */
  paid: CurrencyAmount[];
  /** Lifetime counters to bump, by how much. */
  counters: Partial<Record<CounterKey, number>>;
  /** Inks newly illuminated by this step, for the screen's flourish. */
  illuminated: { ink: InkId; tier: number }[];
  /** The Tale, when this step ended the expedition. */
  ended: Tale | null;
}

export function emptyReceipt(): UnwrittenReceipt {
  return { paid: [], counters: {}, illuminated: [], ended: null };
}

export function bump(receipt: UnwrittenReceipt, key: CounterKey, by = 1): void {
  receipt.counters[key] = (receipt.counters[key] ?? 0) + by;
}

/** Adds currency to what a receipt pays, one entry per currency. */
export function pay(receipt: UnwrittenReceipt, amounts: readonly CurrencyAmount[]): void {
  for (const { currency, amount } of amounts) {
    const row = receipt.paid.find((entry) => entry.currency === currency);
    if (row) row.amount += amount;
    else receipt.paid.push({ currency, amount });
  }
}
