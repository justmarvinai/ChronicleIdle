/**
 * Timed boosts (docs/design/MARKET.md §4): the three doublers the Gem Market sells.
 *
 * A boost is **an instant, not a duration** (`CLAUDE.md` §5.5). The save keeps the moment each
 * one runs out; whether it is live now is that instant against the clock, so a boost cannot be
 * paused by closing the tab, cannot drift, and needs nothing running in the background.
 *
 * They **stack in time, never in strength** (the owner's brief): using a second Player XP Boost
 * while one is live pushes its expiry another 24 hours out rather than making the multiplier ×4.
 * Three of them is 72 hours at ×2, which is exactly what the owner asked for. There is no cap on
 * how far the expiry can be pushed — a chronicle that buys a fortnight of boost has a fortnight.
 */

/** The three boosts, in the order the header shows them. */
export const BOOST_IDS = ['champion_xp', 'player_xp', 'brewery'] as const;

export type BoostId = (typeof BOOST_IDS)[number];

/**
 * What one purchase adds to a boost's expiry. Changing this changes how long every boost of that
 * kind lasts, retroactively for nobody — only purchases made afterwards.
 */
export const BOOST_HOURS: Readonly<Record<BoostId, number>> = {
  champion_xp: 24,
  player_xp: 24,
  brewery: 24,
};

/**
 * The multiplier a live boost applies. ×2 across the board (the owner's brief).
 *
 * Champion and player XP multiply what a **fight** pays (`CAMPAIGN.md` §7 and the other modes'
 * reward rolls) — never what a brew or a tome pays at the Tavern, which are items the player
 * already holds. The Brewery boost multiplies the **brews a run pours**, which is the whole
 * reason to spend a run.
 */
export const BOOST_MULTIPLIER: Readonly<Record<BoostId, number>> = {
  champion_xp: 2,
  player_xp: 2,
  brewery: 2,
};

/** Milliseconds one purchase of a boost is worth. */
export function boostDurationMs(boost: BoostId): number {
  return (BOOST_HOURS[boost] ?? 0) * 3_600_000;
}
