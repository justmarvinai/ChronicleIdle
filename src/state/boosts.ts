/**
 * Applying the boosts to what a run pays (docs/design/MARKET.md §4).
 *
 * Every reward site that can be doubled calls one of these rather than reading the expiries
 * itself, so "is a boost running" is answered in exactly one place and a site that forgets to ask
 * is a site that is visibly missing a call.
 *
 * **What is boosted, and what is not.** The owner's brief says "all fights which award Champion XP"
 * and "all fights which award Player XP", so the four fighting modes — the campaign, the keeps, the
 * tower and the two bosses — are doubled, and these are deliberately *not*:
 *
 * - **The Idle Chest.** It pays player XP, but it is not a fight; doubling it would make the
 *   strongest use of a Chronicle XP Boost be to close the game.
 * - **Brews and tomes at the Tavern.** The Champion XP Boost doubles what a *fight* pays, not what
 *   an item the player already holds is worth. A brew is worth the same whenever it is drunk, which
 *   is what lets a player save them.
 *
 * The Brewery boost is the mirror of that rule: it doubles the brews a **run** pours, which is the
 * thing a run is spent on.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import { boostMultiplier } from '@engine/boosts/index';
import type { SaveGame } from '@engine/schema/save';

/** Champion XP a fight pays, after the Champion XP Boost. */
export function boostedChampionXp(save: SaveGame, xp: number, now: number): number {
  return Math.round(xp * boostMultiplier(save.boosts, 'champion_xp', now));
}

/** Player XP a fight pays, after the Chronicle XP Boost. */
export function boostedPlayerXp(save: SaveGame, xp: number, now: number): number {
  return Math.round(xp * boostMultiplier(save.boosts, 'player_xp', now));
}

/**
 * Brews a Brewery run pours, after the Brewery Boost.
 *
 * Multiplies the amounts rather than the stage's own number, so a hall that pays two elements
 * doubles both and a change to what a stage pours needs no change here.
 */
export function boostedBrews(
  save: SaveGame,
  brews: readonly CurrencyAmount[],
  now: number,
): CurrencyAmount[] {
  const multiplier = boostMultiplier(save.boosts, 'brewery', now);
  if (multiplier === 1) return [...brews];
  return brews.map((row) => ({ ...row, amount: Math.round(row.amount * multiplier) }));
}
