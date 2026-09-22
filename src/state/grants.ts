/**
 * Paying a grant (docs/design/MARKET.md §6).
 *
 * The Market's shelves and the Login Calendar both hand over lists that can mix wallet rows with
 * Bag items, and both pay them **here** — one function, so a bundle and a calendar tile cannot
 * drift apart in what they do with the same list. `payCurrencies` already knows that energy is not
 * an ordinary wallet row; this adds the consumables and leaves the rest to it.
 */
import type { Grant } from '@content/grants';
import { grantConsumables, grantCurrencies } from '@content/grants';
import { addToBag } from '@engine/bag/index';
import type { CurrencyChange } from '@engine/economy/wallet';
import type { SaveGame } from '@engine/schema/save';
import { payCurrencies } from './payout';

export interface GrantResult {
  /** Wallet rows that moved, for the reward line a screen prints. */
  currencies: CurrencyChange[];
  /** Consumables that went into the Bag. */
  items: readonly { item: string; count: number }[];
}

/**
 * Hands over everything in a list. Mutates `save` — like every other reducer in `state/`, which
 * runs inside immer's draft.
 */
export function payGrants(save: SaveGame, grants: readonly Grant[], now: number): GrantResult {
  const currencies = payCurrencies(save, grantCurrencies(grants), now);
  const items = grantConsumables(grants);
  for (const row of items) save.bag = addToBag(save.bag, row.item, row.count);
  return { currencies, items };
}
