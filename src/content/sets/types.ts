/**
 * Gear sets (docs/design/GEAR.md §5). A set is a passive that a champion wears: complete the
 * group and the passive joins its unit in battle, using the same shape champions' own passives
 * use, so the engine has nothing new to learn beyond the two mechanics the sets introduce.
 */
import type { PassiveDef } from '@content/champions/types';

/** Two-piece sets stack (three groups on six slots); four-piece sets take two thirds of a build. */
export const SET_SIZES = [2, 4] as const;
export type SetSize = (typeof SET_SIZES)[number];

export interface GearSetDef {
  /** `gear_set.<snake_case>`. */
  id: string;
  /** i18n keys. */
  name: string;
  description: string;
  /** Pieces needed for one complete group. */
  pieces: SetSize;
  /** What a complete group gives the wearer. */
  passive: PassiveDef;
  /** Settlements whose drops favour this set (GEAR.md §5); 1..12. */
  homes: readonly number[];
  version: number;
}
