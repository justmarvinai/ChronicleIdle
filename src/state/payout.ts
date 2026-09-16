/**
 * Paying a reward list into a save.
 *
 * Every currency but one is a wallet row. Energy is a pool with a cap and a tick (`ECONOMY.md`
 * §5), so a reward that lists it has to go through `addEnergy` rather than into the wallet — and
 * the change the UI ticks up still has to mention it. Reward lists that can contain energy pay
 * through here so that split lives in one place.
 */
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { addEnergy } from '@engine/economy/energy';
import { grant, type CurrencyChange } from '@engine/economy/wallet';
import type { SaveGame } from '@engine/schema/save';

/** Credits `amounts` to the draft and returns what moved, in the order the list named it. */
export function payCurrencies(
  save: SaveGame,
  amounts: readonly CurrencyAmount[],
  now: number,
): CurrencyChange[] {
  const granted = grant(
    save.wallet,
    amounts.filter((entry) => entry.currency !== 'energy'),
  );
  save.wallet = granted.wallet;
  const changes: CurrencyChange[] = [...granted.changes];
  const energy = amounts.reduce((sum, entry) => sum + (entry.currency === 'energy' ? entry.amount : 0), 0);
  if (energy > 0) {
    save.energy = addEnergy(save.energy, energy, save.profile.level, now);
    changes.push({ currency: 'energy', delta: energy, total: save.energy.value });
  }
  return changes;
}

/**
 * One entry per currency, in first-named order. A reward list assembled from several sources — the
 * five quests a "Claim all" takes at once — otherwise pays three separate piles of gold, and the
 * toast and the top bar would count each of them.
 */
export function mergeAmounts(amounts: readonly CurrencyAmount[]): CurrencyAmount[] {
  const total = new Map<CurrencyId, number>();
  for (const { currency, amount } of amounts) total.set(currency, (total.get(currency) ?? 0) + amount);
  return [...total].map(([currency, amount]) => ({ currency, amount }));
}
