/**
 * The Glorious Palace (docs/design/GLORIOUS_PALACE.md): an account-wide skill tree whose points
 * come from finishing content and whose nodes add small permanent stats to every champion of one
 * element.
 *
 * Everything here is a tunable. The tree itself is in `src/content/palace/`, and a test holds the
 * authored nodes to the targets below — change a target and the test says which branch drifted.
 */
import type { Element, StatId } from '@content/champions/types';

/** How many points each source pays. */
export const PALACE_POINT_SOURCES = {
  /**
   * One per settlement per difficulty: 12 × 3 = 36 over the whole campaign, paid when the
   * settlement's boss stand falls. The one-time backbone of the tree.
   */
  settlement: 1,
  /**
   * One per fifth floor of the Eternal Tower, **per season** (owner's answer): a climb pays again
   * after the 30-day reset, so the tower is the engine that keeps the tree moving.
   */
  towerFloorStep: 5,
  towerFloor: 1,
  /** Emptying the daily boss's pool pays one; the weekly boss pays three (owner's brief). */
  dailyBoss: 1,
  weeklyBoss: 3,
} as const;

/**
 * What one element branch grants a champion of that element when every node in it is bought.
 *
 * Sized against one piece of gear: a 6★ main stat at +16 is worth +4,100 HP or +265 ATK on its
 * own (`balance/gear.ts`), so a whole maxed branch — about 590 power, near a tenth of an endgame
 * champion — is a permanent floor under the roster rather than a second set of gear. C.RATE and
 * C.DMG are deliberately the smallest numbers on the list and the dearest nodes to reach.
 */
export const PALACE_BRANCH_TOTALS: Readonly<Record<StatId, number>> = {
  hp: 1_500,
  atk: 150,
  def: 150,
  spd: 6,
  critRate: 5,
  critDmg: 8,
  res: 25,
  acc: 20,
};

/** Points to buy a whole branch, and the whole tree (four branches plus the core). */
export const PALACE_BRANCH_COST = 59;
export const PALACE_TREE_COST = PALACE_BRANCH_COST * 4 + 1;

/**
 * The core node, the only one that is a percentage of a champion's own HP and the only one that
 * touches every element. It is what the first point ever earned buys.
 */
export const PALACE_CORE_HP_PCT = 1;

/** The compass each branch grows along, which is the order they are read in. */
export const PALACE_BRANCH_DIRECTIONS: Readonly<Record<Element, number>> = {
  /** Degrees clockwise from north. */
  justice: 0,
  valor: 90,
  eclipse: 180,
  faith: 270,
};
