/**
 * Summoning numbers (docs/design/SUMMONING.md). Rates, pity and the featured rotation are all
 * here: the portal is entirely local, so these tables *are* the gacha — there is no server to
 * disagree with them, and a change here changes what every future pull is worth.
 */
import type { Rarity } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';

/** The four shards, cheapest first; the order the portal's rail shows them in. */
export const SHARD_IDS = ['faded', 'ancient', 'sacred', 'primordial'] as const;
export type ShardId = (typeof SHARD_IDS)[number];

/** The currency each shard is held as. */
export const SHARD_CURRENCY: Readonly<Record<ShardId, CurrencyId>> = {
  faded: 'shard_faded',
  ancient: 'shard_ancient',
  sacred: 'shard_sacred',
  primordial: 'shard_primordial',
};

/**
 * What a shard may pull, as percentages (SUMMONING.md §1). Each row sums to 100 — the validator
 * checks it, because a row that does not is a silent rate change.
 */
export const SHARD_RATES: Readonly<Record<ShardId, Readonly<Partial<Record<Rarity, number>>>>> = {
  faded: { common: 60, uncommon: 30, rare: 10 },
  ancient: { rare: 91, epic: 8, legendary: 1 },
  sacred: { epic: 92, legendary: 8 },
  primordial: { epic: 40, legendary: 55, mythic: 5 },
};

/** What a shard can be bought for, or null when it is never sold (SUMMONING.md §1). */
export const SHARD_EXCHANGE: Readonly<Record<ShardId, { currency: CurrencyId; amount: number } | null>> = {
  faded: { currency: 'gold', amount: 5_000 },
  ancient: { currency: 'gems', amount: 300 },
  sacred: { currency: 'gems', amount: 900 },
  primordial: null,
};

/**
 * Pity, per shard type (SUMMONING.md §2). `hard` guarantees the rarity on that pull; `soft` adds
 * `stepPp` percentage points per pull once `after` pulls have passed without one. Counters live
 * in the save and persist across banners.
 */
export interface PityRule {
  rarity: Rarity;
  /** Pulls without the rarity that force it. `null` = no hard guarantee. */
  hard: number | null;
  /** Soft pity: after this many pulls, the chance climbs. `null` = none. */
  after: number | null;
  stepPp: number;
}

export const SHARD_PITY: Readonly<Record<ShardId, readonly PityRule[]>> = {
  faded: [],
  ancient: [
    { rarity: 'epic', hard: 20, after: null, stepPp: 0 },
    { rarity: 'legendary', hard: 200, after: 100, stepPp: 1 },
  ],
  sacred: [{ rarity: 'legendary', hard: 15, after: null, stepPp: 0 }],
  primordial: [{ rarity: 'mythic', hard: 50, after: 20, stepPp: 0.5 }],
};

/**
 * A Primordial Rotation accelerates its own pity (SUMMONING.md §3): the Mythic chance still
 * starts at 5 %, but the climb begins after 10 pulls instead of 20 and steps a full point.
 */
export const PRIMORDIAL_ROTATION_PITY: PityRule = {
  rarity: 'mythic',
  hard: 50,
  after: 10,
  stepPp: 1,
};

/**
 * The featured rotation (SUMMONING.md §3). The epoch is a fixed *UTC* instant: a rotation index
 * computed from it is the same number in every time zone and after every reload, which is the
 * whole point of not having a server. `2026-01-05T00:00Z` is the Monday the doc names.
 */
export const ROTATION_EPOCH = Date.UTC(2026, 0, 5);
export const ROTATION_DAYS = 14;
export const ROTATION_MS = ROTATION_DAYS * 24 * 60 * 60 * 1000;
/** Every fourth rotation (index 3, 7, 11 …) is a Primordial Rotation. */
export const PRIMORDIAL_EVERY = 4;
/** A featured champion's weight inside its rarity bucket. */
export const FEATURED_WEIGHT = 2;

/** How many pulls a ×10 press makes, and the most a single press may ever make. */
export const MULTI_PULL = 10;

/** Records kept in the save, newest first; older pulls fall off the end (`ARCHITECTURE.md` §4.1). */
export const HISTORY_LIMIT = 200;
