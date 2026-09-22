/**
 * The three timed boosts (docs/design/MARKET.md §4).
 *
 * The whole module is arithmetic on **one instant per boost**: the moment it runs out. Whether a
 * boost is live is that instant against the clock, so there is no timer to run, nothing to tick,
 * and no way for a save left closed over a weekend to come back owing two days of boost. This is
 * the same discipline the energy pool and the boss period keys use (`CLAUDE.md` §5.5).
 *
 * **Stacking is addition on the expiry, not on the multiplier.** Using a boost while one of the
 * same kind is already live pushes its expiry out; using one when none is pushes it out from *now*.
 * That is what makes three purchases 72 hours at ×2 rather than one day at ×8 (the owner's brief),
 * and it is the one rule worth reading the code for:
 *
 *     expiry = max(expiry, now) + duration
 */
import { BOOST_IDS, BOOST_MULTIPLIER, boostDurationMs, type BoostId } from '@content/balance/boosts';

/** Boost id → the instant it runs out. A boost with no entry has never been used. */
export type BoostExpiries = Readonly<Partial<Record<BoostId, number>>>;

/** No boost has ever run. */
export const NO_BOOSTS: BoostExpiries = {};

/** Whether this boost is live right now. */
export function isBoostActive(expiries: BoostExpiries, boost: BoostId, now: number): boolean {
  return (expiries[boost] ?? 0) > now;
}

/** Milliseconds left on a boost, or 0 when it is not running. */
export function boostRemaining(expiries: BoostExpiries, boost: BoostId, now: number): number {
  return Math.max(0, (expiries[boost] ?? 0) - now);
}

/**
 * The multiplier to apply to whatever this boost governs: its value while live, 1 otherwise.
 *
 * Every reward site that can be boosted reads this rather than testing the expiry itself, so
 * "is it running" is answered in exactly one place.
 */
export function boostMultiplier(expiries: BoostExpiries, boost: BoostId, now: number): number {
  return isBoostActive(expiries, boost, now) ? (BOOST_MULTIPLIER[boost] ?? 1) : 1;
}

/**
 * Starts or extends a boost, and returns the new expiries.
 *
 * Extending from `max(expiry, now)` is what makes a boost bought early and used late worth its
 * full day: a boost that had lapsed starts again from now, and one still running keeps every
 * minute it had left.
 */
export function applyBoost(expiries: BoostExpiries, boost: BoostId, now: number): BoostExpiries {
  const from = Math.max(expiries[boost] ?? 0, now);
  return { ...expiries, [boost]: from + boostDurationMs(boost) };
}

/** The boosts that are live now, in the order the header draws them. */
export function activeBoosts(
  expiries: BoostExpiries,
  now: number,
): readonly { boost: BoostId; until: number; remaining: number }[] {
  return BOOST_IDS.filter((boost) => isBoostActive(expiries, boost, now)).map((boost) => ({
    boost,
    until: expiries[boost] ?? 0,
    remaining: boostRemaining(expiries, boost, now),
  }));
}

/**
 * Drops boosts that ran out long enough ago that keeping the instant is pointless.
 *
 * Purely housekeeping so a save does not carry a row per boost forever; it can never change what
 * a boost does, because a lapsed expiry and a missing one read identically everywhere above.
 */
export function pruneBoosts(expiries: BoostExpiries, now: number): BoostExpiries {
  const kept: Partial<Record<BoostId, number>> = {};
  for (const boost of BOOST_IDS) {
    const until = expiries[boost];
    if (until !== undefined && until > now) kept[boost] = until;
  }
  return kept;
}
