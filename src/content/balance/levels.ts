/**
 * Chronicle level rewards (docs/design/ECONOMY.md §4). Every level pays gold, and the round
 * numbers pay more: gems every fifth level, an Ancient Shard every tenth, a Sacred Shard at the
 * five milestones. Raising these makes levelling the main source of summoning currency, which is
 * why the shard steps are sparse.
 */

/** Gold for reaching level L: `LEVEL_GOLD_PER_LEVEL × L`. */
export const LEVEL_GOLD_PER_LEVEL = 200;

/** Gems every `LEVEL_GEMS_EVERY` levels. */
export const LEVEL_GEMS_EVERY = 5;
export const LEVEL_GEMS_AMOUNT = 50;

/** One Ancient Shard every `LEVEL_ANCIENT_SHARD_EVERY` levels. */
export const LEVEL_ANCIENT_SHARD_EVERY = 10;

/** Levels that also pay a Sacred Shard. */
export const LEVEL_SACRED_SHARD_LEVELS: readonly number[] = [20, 40, 60, 80, 100];

/**
 * A level-up tops the energy up by the *new* cap on top of whatever is in the wallet — the
 * overflow is deliberate (owner's answer Q15): a level-up is a reason to play now.
 */
export const LEVEL_ENERGY_REFILL = true;
