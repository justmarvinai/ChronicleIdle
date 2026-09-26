/**
 * The ten ranks of the Hall (docs/design/ACHIEVEMENTS.md §2). Each stands on the renown claimed so
 * far and is claimed by hand, in order, for its reward. The frames and titles a rank hangs up
 * name the rank as their source (`frames.ts`, `titles/index.ts`), so this table is the ladder
 * and its purse.
 *
 * The whole Hall is worth about 7,700 renown, so the tenth rank asks for nearly all of it; the
 * first is a morning's claiming the day the Hall opens.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import type { HallRankDef } from './types';

const rank = (index: number, renown: number, rewards: CurrencyAmount[]): HallRankDef => {
  const id = `hall_rank.${`${index}`.padStart(2, '0')}`;
  return { id, rank: index, name: `${id}.name`, renown, rewards, version: 1 };
};

export const HALL_RANKS: readonly HallRankDef[] = [
  rank(1, 25, [
    { currency: 'gems', amount: 50 },
    { currency: 'gold', amount: 10_000 },
  ]),
  rank(2, 100, [
    { currency: 'gems', amount: 100 },
    { currency: 'shard_faded', amount: 2 },
  ]),
  rank(3, 250, [
    { currency: 'gems', amount: 150 },
    { currency: 'shard_ancient', amount: 1 },
  ]),
  rank(4, 500, [
    { currency: 'gems', amount: 200 },
    { currency: 'shard_ancient', amount: 1 },
    { currency: 'tome_epic', amount: 2 },
  ]),
  rank(5, 900, [
    { currency: 'gems', amount: 300 },
    { currency: 'shard_sacred', amount: 1 },
  ]),
  rank(6, 1_500, [
    { currency: 'gems', amount: 400 },
    { currency: 'shard_ancient', amount: 2 },
    { currency: 'tome_legendary', amount: 1 },
  ]),
  rank(7, 2_300, [
    { currency: 'gems', amount: 500 },
    { currency: 'shard_sacred', amount: 1 },
  ]),
  rank(8, 3_400, [
    { currency: 'gems', amount: 600 },
    { currency: 'shard_sacred', amount: 2 },
  ]),
  rank(9, 5_000, [
    { currency: 'gems', amount: 800 },
    { currency: 'shard_primordial', amount: 1 },
  ]),
  rank(10, 7_000, [
    { currency: 'gems', amount: 1_000 },
    { currency: 'shard_primordial', amount: 1 },
    { currency: 'tome_mythic', amount: 1 },
  ]),
];
