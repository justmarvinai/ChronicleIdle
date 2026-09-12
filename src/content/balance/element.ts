/**
 * Element wheel (docs/design/CHAMPIONS.md §1, owner's answer Q21): Justice beats Valor beats Faith
 * beats Justice; Eclipse is neutral both ways. Used by the damage formula (BATTLE.md §4.1).
 */
import type { Element } from '@content/champions/types';

/** Which element each element is strong against (`null` = neutral). */
export const ELEMENT_BEATS: Readonly<Record<Element, Element | null>> = {
  justice: 'valor',
  valor: 'faith',
  faith: 'justice',
  eclipse: null,
};

/** Damage multiplier and crit-rate shift (percentage points) for strong and weak match-ups. */
export const ELEMENT_STRONG_DMG = 1.1;
export const ELEMENT_WEAK_DMG = 0.9;
export const ELEMENT_STRONG_CRIT = 10;
export const ELEMENT_WEAK_CRIT = -10;
/** Glancing hits on weak match-ups are off in EA-0.1 (Q21); raising this makes weak hits deal half damage that often. */
export const ELEMENT_WEAK_GLANCE_CHANCE = 0;
