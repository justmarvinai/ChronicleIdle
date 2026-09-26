/**
 * The Mine — the Deepvein under Emberhold (docs/design/MINE.md).
 *
 * The save keeps three things: the level dug, the instant the store was last emptied, and the
 * fractions of a gem or a Sigil the last collection could not pay whole. What the store holds now,
 * how long until it is full and what the next level asks for are all derived from those and the
 * clock (CLAUDE.md §5.5), so a reload, an import or a clock that jumped can never pay twice.
 *
 * Nothing is rolled. The crews bring up exactly `gemsPerDay` a day until the store is full, and
 * the fractions a collection leaves behind are carried rather than rounded away — collecting often
 * never costs a part-gem; only time past a full store is lost.
 */
import { MINE_LEVELS, MINE_MAX_LEVEL, type MineLevelDef } from '@content/balance/mine';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { fail, ok, type Result } from '@engine/errors';
import { MS_PER_DAY } from '@engine/time/clock';

/** The Mine as a save stores it (`save.mine`, save v20). */
export interface MineState {
  /** The level dug, 1..`MINE_MAX_LEVEL`. */
  level: number;
  /** When the store was last emptied — by a collection or by the collection an upgrade makes. */
  collectedAt: number;
  /** What the last collection could not pay whole, each below one. */
  carry: { gems: number; sigils: number };
}

/**
 * A sum that should land on a whole number can come out a hair under it in binary (0.35 × 20 is
 * 6.999…), which would hold a gem back for a millisecond it has already been earned in. Whole
 * units are counted with this much slack; it is a float tolerance, not a tunable.
 */
const WHOLE_TOLERANCE = 1e-9;

/** The whole units in `amount`, and what is left of it below one. */
export function splitWhole(amount: number): { whole: number; rest: number } {
  const whole = Math.max(0, Math.floor(amount + WHOLE_TOLERANCE));
  return { whole, rest: Math.max(0, amount - whole) };
}

/** A level's row. Levels outside the table read as the nearest end of it. */
export function mineLevel(level: number): MineLevelDef {
  const index = Math.min(Math.max(Math.trunc(level), 1), MINE_MAX_LEVEL) - 1;
  const def = MINE_LEVELS[index];
  if (!def) throw new RangeError(`the Mine has no level ${level}`);
  return def;
}

/** The level after this one, or `null` when the Mine is as deep as it goes. */
export function nextMineLevel(level: number): MineLevelDef | null {
  return level >= MINE_MAX_LEVEL ? null : mineLevel(level + 1);
}

/** How long a level's store takes to fill from empty: `storeGems / gemsPerDay` days. */
export function mineStoreMs(level: number): number {
  const def = mineLevel(level);
  // Rounded up, so the store is full no sooner than its last gem has been dug.
  return def.gemsPerDay > 0 ? Math.ceil((def.storeGems / def.gemsPerDay) * MS_PER_DAY) : 0;
}

/**
 * A Mine as the chronicle is handed it: level 1, **its first store already full**. The crews dug
 * before the Chronicler arrived, so the first visit — the one the tutorial walks — always has
 * gems to collect, however quickly the chronicle reached the level that opens it.
 */
export function newMine(now: number): MineState {
  return { level: 1, collectedAt: Math.max(0, now - mineStoreMs(1)), carry: { gems: 0, sigils: 0 } };
}

export interface MineStore {
  /** Real time since the store was emptied, never negative (a clock moved back reads 0). */
  elapsedMs: number;
  /** The part of it the crews worked: the elapsed time, capped at the store. */
  heldMs: number;
  /** How long the store takes to fill from empty at this level. */
  storeMs: number;
  /** 0..1 of the store. */
  fraction: number;
  full: boolean;
  /** Milliseconds until the store is full; 0 when it already is. */
  msToFull: number;
  /** What the store holds exactly, the carried fractions included. */
  gemsExact: number;
  sigilsExact: number;
  /** What a collection would pay now: the whole units of the above. */
  gems: number;
  sigils: number;
  /** Whether a collection would pay anything at all. */
  collectable: boolean;
  /** Milliseconds until the next whole gem, or `null` when the store fills before it. */
  msToNextGem: number | null;
}

/**
 * What the store holds at `now`: `carry + perDay × min(elapsed, store) / day`, for gems and for
 * Sigils alike. The gems are clamped to the store, so a full store holds exactly `storeGems` on
 * top of what was carried, whatever the float arithmetic of the division made of it.
 */
export function mineStore(mine: MineState, now: number): MineStore {
  const def = mineLevel(mine.level);
  const storeMs = mineStoreMs(mine.level);
  const elapsedMs = Math.max(0, now - mine.collectedAt);
  const heldMs = Math.min(elapsedMs, storeMs);
  const full = heldMs >= storeMs;
  const dug = full ? def.storeGems : Math.min(def.storeGems, (def.gemsPerDay * heldMs) / MS_PER_DAY);
  const gemsExact = mine.carry.gems + dug;
  const sigilsExact = mine.carry.sigils + (def.sigilsPerDay * heldMs) / MS_PER_DAY;
  const gems = splitWhole(gemsExact).whole;
  const sigils = splitWhole(sigilsExact).whole;
  // The next whole gem, unless the store fills before it is dug — then it never comes.
  const reachable = !full && gems + 1 <= mine.carry.gems + def.storeGems + WHOLE_TOLERANCE;
  const toNext = reachable ? Math.ceil(((gems + 1 - gemsExact) / def.gemsPerDay) * MS_PER_DAY) : null;
  return {
    elapsedMs,
    heldMs,
    storeMs,
    fraction: storeMs > 0 ? Math.min(1, heldMs / storeMs) : 0,
    full,
    msToFull: Math.max(0, storeMs - elapsedMs),
    gemsExact,
    sigilsExact,
    gems,
    sigils,
    collectable: gems > 0 || sigils > 0,
    msToNextGem: toNext === null ? null : Math.max(0, toNext),
  };
}

export interface MineHaul {
  /** The Mine afterwards: the clock reset to `now`, the fractions carried. */
  mine: MineState;
  /** What the collection paid, in whole units, gems first. Empty when nothing was whole yet. */
  paid: CurrencyAmount[];
  gems: number;
  sigils: number;
  /** Whether the store was full — the "the crews stopped" line. */
  wasFull: boolean;
}

/**
 * Empties the store: pays its whole units, carries the fractions and starts the clock again at
 * `now`. Always succeeds — settling an empty store only moves what was dug into `carry` — which
 * is what lets an upgrade settle the old level before the new one starts digging.
 */
export function settleMine(mine: MineState, now: number): MineHaul {
  const store = mineStore(mine, now);
  const gems = splitWhole(store.gemsExact);
  const sigils = splitWhole(store.sigilsExact);
  const paid: CurrencyAmount[] = [];
  if (gems.whole > 0) paid.push({ currency: 'gems', amount: gems.whole });
  if (sigils.whole > 0) paid.push({ currency: 'mat_glyph_sigil', amount: sigils.whole });
  return {
    // A clock moved backwards keeps the old instant: resetting to it would pay the gap twice.
    mine: {
      level: mine.level,
      collectedAt: Math.max(now, mine.collectedAt),
      carry: { gems: gems.rest, sigils: sigils.rest },
    },
    paid,
    gems: gems.whole,
    sigils: sigils.whole,
    wasFull: store.full,
  };
}

/** A collection the player asked for: refused while nothing in the store is whole yet. */
export function collectMine(mine: MineState, now: number): Result<MineHaul> {
  if (!mineStore(mine, now).collectable) return fail('invalid_argument', 'The store holds nothing whole yet');
  return ok(settleMine(mine, now));
}

/** Why the next level cannot be dug yet, if it cannot. */
export type MineUpgradeBlock =
  { reason: 'max' } | { reason: 'level'; opensAt: number } | { reason: 'cost'; missing: CurrencyAmount[] };

/**
 * Whether the next level can be dug: the Mine is not at its deepest, the chronicle has reached
 * the level's gate, and the wallet holds its cost. `owned` reads the wallet, so the engine stays
 * free of the wallet's shape. `missing` lists the shortfall of each currency, not its full price.
 */
export function mineUpgradeBlock(
  level: number,
  playerLevel: number,
  owned: (currency: CurrencyId) => number,
): MineUpgradeBlock | null {
  const next = nextMineLevel(level);
  if (!next) return { reason: 'max' };
  if (playerLevel < next.opensAt) return { reason: 'level', opensAt: next.opensAt };
  const missing = next.cost
    .map(({ currency, amount }) => ({ currency, amount: amount - owned(currency) }))
    .filter((short) => short.amount > 0);
  return missing.length ? { reason: 'cost', missing } : null;
}

/** Gems a day and Sigils a day a level adds over the one before it — the upgrade's promise. */
export function mineGain(
  level: number,
): { gemsPerDay: number; storeGems: number; sigilsPerDay: number } | null {
  const next = nextMineLevel(level);
  if (!next) return null;
  const now = mineLevel(level);
  return {
    gemsPerDay: next.gemsPerDay - now.gemsPerDay,
    storeGems: next.storeGems - now.storeGems,
    sigilsPerDay: next.sigilsPerDay - now.sigilsPerDay,
  };
}
