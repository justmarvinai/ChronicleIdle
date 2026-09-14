/**
 * What a chronicle level pays (docs/design/ECONOMY.md §4). Pure: the store applies the bundle and
 * the dialog renders it, so the same numbers drive the payout, the celebration and the tests.
 */
import {
  LEVEL_ANCIENT_SHARD_EVERY,
  LEVEL_ENERGY_REFILL,
  LEVEL_GEMS_AMOUNT,
  LEVEL_GEMS_EVERY,
  LEVEL_GOLD_PER_LEVEL,
  LEVEL_SACRED_SHARD_LEVELS,
} from '@content/balance/levels';
import type { FeatureId } from '@content/balance/unlocks';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import type { CurrencyAmount } from '@content/currencies/types';
import { energyCap } from '@engine/economy/energy';
import { featuresUnlockedAt } from './unlocks';

export interface LevelReward {
  /** The level reached. */
  level: number;
  /** Energy added on top of the wallet — the new cap, overflow included. */
  energy: number;
  currencies: CurrencyAmount[];
  /** Features this level opens (`GAME_DESIGN.md` §6). */
  unlocks: FeatureId[];
}

/** The bundle for reaching `level` (1 pays nothing: it is where a chronicle starts). */
export function levelUpReward(level: number): LevelReward {
  const reached = Math.min(Math.max(1, Math.round(level)), PLAYER_MAX_LEVEL);
  const currencies: CurrencyAmount[] = [{ currency: 'gold', amount: LEVEL_GOLD_PER_LEVEL * reached }];
  if (reached % LEVEL_GEMS_EVERY === 0) currencies.push({ currency: 'gems', amount: LEVEL_GEMS_AMOUNT });
  if (reached % LEVEL_ANCIENT_SHARD_EVERY === 0) currencies.push({ currency: 'shard_ancient', amount: 1 });
  if (LEVEL_SACRED_SHARD_LEVELS.includes(reached)) currencies.push({ currency: 'shard_sacred', amount: 1 });
  return {
    level: reached,
    energy: LEVEL_ENERGY_REFILL ? energyCap(reached) : 0,
    currencies,
    unlocks: featuresUnlockedAt(reached),
  };
}

/** Every level gained from `from` (exclusive) to `to` (inclusive), in order. */
export function levelUpRewards(from: number, to: number): LevelReward[] {
  const rewards: LevelReward[] = [];
  for (let level = Math.max(2, from + 1); level <= Math.min(to, PLAYER_MAX_LEVEL); level += 1)
    rewards.push(levelUpReward(level));
  return rewards;
}

/** The same rewards merged, for one payout and one dialog after several levels at once. */
export function mergeLevelRewards(rewards: readonly LevelReward[]): {
  energy: number;
  currencies: CurrencyAmount[];
  unlocks: FeatureId[];
} {
  const totals = new Map<CurrencyAmount['currency'], number>();
  const unlocks: FeatureId[] = [];
  let energy = 0;
  for (const reward of rewards) {
    energy += reward.energy;
    for (const entry of reward.currencies)
      totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amount);
    unlocks.push(...reward.unlocks);
  }
  return {
    energy,
    currencies: [...totals.entries()].map(([currency, amount]) => ({ currency, amount })),
    unlocks,
  };
}
