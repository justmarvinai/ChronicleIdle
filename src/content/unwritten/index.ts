/**
 * The Unwritten's content, in one bundle (docs/design/UNWRITTEN.md).
 *
 * Not part of the eager registry: the Unwritten loads on its own, with the screen that plays it
 * (ADR-050), so nothing here reaches the first screen's bundle. The engine takes this bundle as
 * an argument, which keeps it free of the registry, and the validator reads it directly.
 */
import { AFFIXES } from './affixes';
import { BLOTS } from './blots';
import { FOLIOS } from './folios';
import { ILLUMINATIONS } from './inks';
import { AZURE } from './inscriptions/azure';
import { BLENDS } from './inscriptions/blends';
import { CRIMSON } from './inscriptions/crimson';
import { GOLD } from './inscriptions/gold';
import { VIOLET } from './inscriptions/violet';
import { MYSTERIES } from './mysteries';
import { OMENS } from './omens';
import { RELICS } from './relics';
import { SCRIPTORIUM } from './scriptorium';
import type {
  AffixDef,
  BlotDef,
  FolioDef,
  IlluminationDef,
  InkId,
  InscriptionDef,
  MysteryDef,
  OmenDef,
  RelicDef,
  ScriptoriumDef,
} from './types';
import { UNWRITTEN_ENEMIES } from './wardens';
import type { EnemyDef } from '@content/enemies/types';

export interface UnwrittenContent {
  inscriptions: readonly InscriptionDef[];
  illuminations: Readonly<Record<InkId, IlluminationDef>>;
  relics: readonly RelicDef[];
  blots: readonly BlotDef[];
  affixes: readonly AffixDef[];
  omens: readonly OmenDef[];
  mysteries: readonly MysteryDef[];
  scriptorium: readonly ScriptoriumDef[];
  folios: readonly FolioDef[];
  /** The Wardens and the Inkling Choristers — the only foes the campaign does not field. */
  enemies: readonly EnemyDef[];
}

const byId = <T extends { id: string }>(list: readonly T[]): Readonly<Record<string, T>> =>
  Object.fromEntries(list.map((item) => [item.id, item]));

export const UNWRITTEN: UnwrittenContent = {
  inscriptions: [...GOLD, ...CRIMSON, ...AZURE, ...VIOLET, ...BLENDS],
  illuminations: ILLUMINATIONS,
  relics: RELICS,
  blots: BLOTS,
  affixes: AFFIXES,
  omens: OMENS,
  mysteries: MYSTERIES,
  scriptorium: SCRIPTORIUM,
  folios: FOLIOS,
  enemies: UNWRITTEN_ENEMIES,
};

export const INSCRIPTION_BY_ID = byId(UNWRITTEN.inscriptions);
export const RELIC_BY_ID = byId(UNWRITTEN.relics);
export const BLOT_BY_ID = byId(UNWRITTEN.blots);
export const AFFIX_BY_ID = byId(UNWRITTEN.affixes);
export const MYSTERY_BY_ID = byId(UNWRITTEN.mysteries);
export const SCRIPTORIUM_BY_ID = byId(UNWRITTEN.scriptorium);
export const UNWRITTEN_ENEMY_BY_ID = byId(UNWRITTEN.enemies);
