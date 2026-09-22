/**
 * A **grant**: the list of things some piece of content hands over.
 *
 * `RewardBundle` (`balance/campaign.ts`) already says this for the campaign, but it can only carry
 * wallet rows — and a market shelf or a login calendar has to be able to hand over a *consumable*,
 * which lives in the Bag rather than the wallet. This is that shape, and it is deliberately the
 * one shape: the Market, the Login Calendar and anything later that pays items all read it, so
 * there is exactly one function that pays a grant out (`@state/grants`).
 */
import type { CurrencyId } from '@content/currencies/types';

export type Grant =
  | { kind: 'consumable'; item: string; count: number }
  | { kind: 'currency'; currency: CurrencyId; amount: number };

/** Every currency a grant list pays, summed — what a preview line needs. */
export function grantCurrencies(
  grants: readonly Grant[],
): readonly { currency: CurrencyId; amount: number }[] {
  const totals = new Map<CurrencyId, number>();
  for (const grant of grants) {
    if (grant.kind !== 'currency') continue;
    totals.set(grant.currency, (totals.get(grant.currency) ?? 0) + grant.amount);
  }
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

/** Every consumable a grant list pays, summed. */
export function grantConsumables(grants: readonly Grant[]): readonly { item: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const grant of grants) {
    if (grant.kind !== 'consumable') continue;
    totals.set(grant.item, (totals.get(grant.item) ?? 0) + grant.count);
  }
  return [...totals].map(([item, count]) => ({ item, count }));
}
