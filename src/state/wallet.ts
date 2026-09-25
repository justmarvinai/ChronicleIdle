/**
 * The Wallet through the store (docs/design/ECONOMY.md §2, §5): what a chronicle holds of each
 * currency, and the one exchange the Wallet itself makes — gems for energy.
 *
 * Most currencies are a number in `save.wallet`. Four are not: energy and the Eternal Key are
 * regenerating pools (`@engine/economy/pool`), and the two boss keys are a period's allowance
 * less what it has spent. Their wallet rows stay at zero, so anything that shows a holding asks
 * here rather than reading the row.
 */
import { ENERGY_REFILL_AMOUNT, ENERGY_REFILL_GEMS } from '@content/balance/energy';
import type { CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import { ok, type Result } from '@engine/errors';
import { addEnergy, energyCap, msUntilNextEnergy, regenerateEnergy } from '@engine/economy/energy';
import { spend, type CurrencyChange } from '@engine/economy/wallet';
import { bumpCounter } from '@engine/progression/counters';
import type { SaveGame } from '@engine/schema/save';
import { bossView } from './bosses';
import { towerView } from './tower';

export interface Holding {
  amount: number;
  /** The ceiling of a pool — energy's cap, a boss's keys a period, the tower's ten — or null. */
  cap: number | null;
  /** Whether it comes back on its own with time: energy and the Eternal Key. */
  regenerates: boolean;
  /** Until the next one comes back, for the two that regenerate; null when full. */
  msToNext: number | null;
  /** Until a period hands its keys back, for the two boss keys. */
  msToReset: number | null;
}

/** What the chronicle holds of one currency at `now`, read from wherever that currency lives. */
export function holdingOf(save: SaveGame, currency: CurrencyId, now: number): Holding {
  switch (currency) {
    case 'energy': {
      const level = save.profile.level;
      return {
        amount: regenerateEnergy(save.energy, level, now).value,
        cap: energyCap(level),
        regenerates: true,
        msToNext: msUntilNextEnergy(save.energy, level, now),
        msToReset: null,
      };
    }
    case 'key_eternal': {
      const tower = towerView(save, now);
      return {
        amount: tower.keys,
        cap: tower.keyCap,
        regenerates: true,
        msToNext: tower.msToKey,
        msToReset: null,
      };
    }
    case 'key_daily':
    case 'key_weekly': {
      const boss = content.bosses.find((entry) => entry.keyCurrency === currency);
      const view = boss ? bossView(save, boss.id, now) : null;
      if (!boss || !view)
        return { amount: 0, cap: null, regenerates: false, msToNext: null, msToReset: null };
      return {
        amount: view.keysLeft,
        cap: boss.keysPerPeriod,
        regenerates: false,
        msToNext: null,
        msToReset: view.msUntilReset,
      };
    }
    default:
      return {
        amount: save.wallet[currency],
        cap: null,
        regenerates: false,
        msToNext: null,
        msToReset: null,
      };
  }
}

export interface EnergyRefill {
  /** The gems out and the energy in, for the toast and the purse's tick. */
  changes: CurrencyChange[];
}

/**
 * Buys `ENERGY_REFILL_AMOUNT` energy for `ENERGY_REFILL_GEMS` gems (ECONOMY.md §5): no daily limit,
 * and like every grant it may carry the pool past its cap. Refused, and nothing written, when the
 * gems are not there.
 */
export function applyEnergyRefill(save: SaveGame, now: number): Result<EnergyRefill> {
  const paid = spend(save.wallet, [{ currency: 'gems', amount: ENERGY_REFILL_GEMS }]);
  if (!paid.ok) return paid;
  save.wallet = paid.value.wallet;
  save.energy = addEnergy(save.energy, ENERGY_REFILL_AMOUNT, save.profile.level, now);
  bumpCounter(save, 'energy.refills');
  return ok({
    changes: [
      ...paid.value.changes,
      { currency: 'energy', delta: ENERGY_REFILL_AMOUNT, total: save.energy.value },
    ],
  });
}
