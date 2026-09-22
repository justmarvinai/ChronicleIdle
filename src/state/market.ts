/**
 * The Market through the store (docs/design/MARKET.md §1–§2).
 *
 * The engine owns what is on the shelf; this spends the purse and files what was bought. Two
 * shelves, two rules:
 *
 * - The **Gold Market** rotates hourly, and what the save keeps is only which slots of *this* hour
 *   have been bought. A `taken` list stamped with an older hour reads as an untouched stall, which
 *   is how the stock comes back at the top of the hour with nothing having run (the same rule the
 *   Brewery's runs and the boss gates use).
 * - The **Gem Market** never rotates. Singles are infinite; a bundle is struck off for good the
 *   first time it is taken (the owner's answer).
 */
import { content } from '@content/registry';
import type { GemShelfEntry } from '@content/market/types';
import type { CurrencyId } from '@content/currencies/types';
import { fail, ok, type Result } from '@engine/errors';
import {
  affordableFromSlot,
  goldShelf,
  marketHour,
  msUntilRotation,
  slotCost,
  slotLeft,
  type GoldSlot,
} from '@engine/market/index';
import { bumpCounter, bumpCounterId } from '@engine/progression/counters';
import { spend, type CurrencyChange } from '@engine/economy/wallet';
import type { SaveGame } from '@engine/schema/save';
import { payGrants, type GrantResult } from './grants';

/** One slot of the Gold Market, with what this chronicle has already taken from it. */
export interface GoldSlotView extends GoldSlot {
  /** Bought from this slot this hour. */
  taken: number;
  /** Still on the shelf. */
  left: number;
  /** The most this purse could buy right now — 0 disables the button. */
  affordable: number;
}

export interface GoldMarketView {
  slots: readonly GoldSlotView[];
  /** Milliseconds until the stall changes hands. */
  rotatesIn: number;
}

/**
 * What the save's `taken` list means *now*. A list stamped with an older hour is not this hour's,
 * so it reads as empty — the stall has changed hands and nothing on it has been bought.
 */
function takenThisHour(save: SaveGame, now: number): Readonly<Record<string, number>> {
  return save.market.hour === marketHour(now) ? save.market.taken : {};
}

export function goldMarketView(save: SaveGame, now: number): GoldMarketView {
  const taken = takenThisHour(save, now);
  const gold = save.wallet.gold ?? 0;
  return {
    slots: goldShelf(save.seedRoot, now).map((slot) => {
      const already = taken[String(slot.index)] ?? 0;
      return {
        ...slot,
        taken: already,
        left: slotLeft(slot, already),
        affordable: affordableFromSlot(slot, already, gold),
      };
    }),
    rotatesIn: msUntilRotation(now),
  };
}

export interface GemEntryView {
  entry: GemShelfEntry;
  /** A one-time bundle already taken; singles are never taken. */
  taken: boolean;
  affordable: boolean;
}

export function gemMarketView(save: SaveGame): readonly GemEntryView[] {
  const gems = save.wallet.gems ?? 0;
  return [...content.gemShelf]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      entry,
      taken: entry.once === true && save.market.bundles.includes(entry.id),
      affordable: gems >= entry.price,
    }));
}

export interface PurchaseResult {
  /** What the purchase cost, so the screen can animate the purse down. */
  paid: CurrencyChange[];
  /** What it handed over. */
  got: GrantResult;
}

/**
 * Buys `count` of a Gold Market slot.
 *
 * Re-derives the shelf from `now` rather than trusting what the screen was drawing: a tab left
 * open across the turn of the hour would otherwise buy this hour's stock at last hour's price.
 */
export function applyGoldPurchase(
  save: SaveGame,
  index: number,
  count: number,
  now: number,
): Result<PurchaseResult> {
  const wanted = Math.trunc(count);
  if (wanted <= 0) return fail('invalid_argument', 'Nothing to buy');
  const hour = marketHour(now);
  const slot = goldShelf(save.seedRoot, now).find((entry) => entry.index === index);
  if (!slot) return fail('invalid_argument', `No slot ${index} on this hour's shelf`);

  const taken = takenThisHour(save, now);
  const already = taken[String(index)] ?? 0;
  if (slotLeft(slot, already) < wanted) return fail('invalid_argument', 'Not that many left');

  const cost = slotCost(slot, wanted);
  const purse = spend(save.wallet, [{ currency: 'gold', amount: cost }]);
  if (!purse.ok) return purse;
  save.wallet = purse.value.wallet;

  // Stamping the hour here is what makes an older list read as empty above.
  save.market = {
    ...save.market,
    hour,
    taken: { ...taken, [String(index)]: already + wanted },
  };

  const got = payGrants(save, [{ kind: 'currency', currency: slot.currency, amount: wanted }], now);
  bumpCounter(save, 'market.purchases');
  bumpCounter(save, 'market.gold.spent', cost);
  return ok({ paid: purse.value.changes, got });
}

/** Buys one Gem Market entry — a single, or a bundle that is then struck off for good. */
export function applyGemPurchase(save: SaveGame, entryId: string, now: number): Result<PurchaseResult> {
  const entry = content.gemShelfById(entryId);
  if (!entry) return fail('invalid_argument', `No shelf entry ${entryId}`);
  if (entry.once === true && save.market.bundles.includes(entry.id))
    return fail('invalid_argument', 'That bundle has already been taken');

  const purse = spend(save.wallet, [{ currency: 'gems', amount: entry.price }]);
  if (!purse.ok) return purse;
  save.wallet = purse.value.wallet;

  if (entry.once === true) save.market = { ...save.market, bundles: [...save.market.bundles, entry.id] };

  const got = payGrants(save, entry.contents, now);
  bumpCounter(save, 'market.purchases');
  bumpCounter(save, 'market.gems.spent', entry.price);
  bumpCounterId(save, 'market.bought.', entry.id);
  return ok({ paid: purse.value.changes, got });
}

/** Gold the shelf would take to clear entirely — what the screen prints under the stall. */
export function shelfTotal(view: GoldMarketView): { gold: number; currencies: readonly CurrencyId[] } {
  return {
    gold: view.slots.reduce((sum, slot) => sum + slot.unitGold * slot.left, 0),
    currencies: view.slots.map((slot) => slot.currency),
  };
}
