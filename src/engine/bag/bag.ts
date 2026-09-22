/**
 * The Bag (docs/design/MARKET.md §5): what a chronicle is holding but has not used.
 *
 * A **count per item id** and nothing else. Gear needs instances because two 5★ Ember Guard
 * gauntlets are different objects with different substats; a consumable does not — one Brewery
 * Token is every Brewery Token. So the Bag is a `Record<string, number>` and the engine here is
 * the arithmetic that keeps it honest: never negative, and a count that reaches zero leaves
 * rather than sitting as a `0` a screen would have to remember not to draw.
 */

/** Item id → how many are held. An id that is absent is held zero times. */
export type Bag = Readonly<Record<string, number>>;

export const EMPTY_BAG: Bag = {};

/** How many of this item the chronicle holds. */
export function held(bag: Bag, item: string): number {
  return bag[item] ?? 0;
}

/** Whether there is at least one to use. */
export function holds(bag: Bag, item: string): boolean {
  return held(bag, item) > 0;
}

/** Puts `count` of an item in. A non-positive count is a no-op rather than a way to remove one. */
export function addToBag(bag: Bag, item: string, count = 1): Bag {
  if (count <= 0) return bag;
  return { ...bag, [item]: held(bag, item) + count };
}

/**
 * Takes one out, or returns `null` when there is none to take.
 *
 * Returning `null` rather than throwing is deliberate: "you do not have one" is an ordinary answer
 * a screen gives by disabling a button, not an exceptional state (`CLAUDE.md` §5.7 keeps typed
 * throws for content and save faults).
 */
export function takeFromBag(bag: Bag, item: string, count = 1): Bag | null {
  const have = held(bag, item);
  if (count <= 0 || have < count) return null;
  const left = have - count;
  const next = { ...bag };
  if (left === 0) delete next[item];
  else next[item] = left;
  return next;
}

/** Everything held, as rows a screen can draw, in the order the ids are given. */
export function bagRows(bag: Bag, order: readonly string[]): readonly { item: string; count: number }[] {
  return order.flatMap((item) => {
    const count = held(bag, item);
    return count > 0 ? [{ item, count }] : [];
  });
}

/** How many things are held in total — the number the Bag button wears. */
export function bagSize(bag: Bag): number {
  return Object.values(bag).reduce((sum, count) => sum + count, 0);
}
