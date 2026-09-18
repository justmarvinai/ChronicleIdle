/**
 * Roster sorting and filtering for the Champions index (docs/tech/UI_DESIGN.md §5.3). Pure so the
 * UI can memoise the result per (roster, view) and so a 200+ roster is tested here, not in React.
 */
import {
  ELEMENTS,
  RARITIES,
  ROLES,
  type ChampionDef,
  type ChampionId,
  type Element,
  type Rarity,
  type Role,
} from './imports';
import type { GearSetDef } from '@content/sets/types';
import { totalPower } from '@engine/gear/champion-stats';
import type { GearInstance } from '@engine/gear/instance';
import type { ChampionInstance, Roster } from './instance';
import { baseStats, power } from './stats';

export const ROSTER_SORTS = ['rank', 'level', 'power', 'element', 'recent', 'name'] as const;
export type RosterSort = (typeof ROSTER_SORTS)[number];

export interface RosterFilters {
  rarities: Rarity[];
  elements: Element[];
  roles: Role[];
  /** `null` = both. */
  locked: boolean | null;
  favourite: boolean | null;
  placeholderOnly?: boolean;
}

export interface RosterView {
  sort: RosterSort;
  descending: boolean;
  filters: RosterFilters;
}

export const DEFAULT_ROSTER_VIEW: RosterView = {
  sort: 'rank',
  descending: true,
  filters: { rarities: [], elements: [], roles: [], locked: null, favourite: null },
};

export interface RosterEntry {
  instance: ChampionInstance;
  def: ChampionDef;
  /** Power with everything worn: the number the index, the rail and the compare panel rank by. */
  power: number;
  /** The pieces the champion is wearing, in slot order; empty while the armoury is untouched. */
  worn: readonly GearInstance[];
  /** Display name resolved by the caller; kept here so name sorting is stable. */
  name: string;
}

/** How a caller resolves what a champion wears; omitted, every champion is counted bare. */
export interface GearLookup {
  worn: (instance: ChampionInstance) => readonly GearInstance[];
  setById: (id: string) => GearSetDef | undefined;
}

const NOTHING_WORN: readonly GearInstance[] = [];

const RARITY_RANK = Object.fromEntries(RARITIES.map((r, i) => [r, i])) as Record<Rarity, number>;
const ELEMENT_RANK = Object.fromEntries(ELEMENTS.map((e, i) => [e, i])) as Record<Element, number>;
const ROLE_RANK = Object.fromEntries(ROLES.map((r, i) => [r, i])) as Record<Role, number>;

/** Builds display entries (definition + power) for every owned instance. */
export function rosterEntries(
  roster: Roster,
  championById: (id: ChampionId) => ChampionDef | undefined,
  nameOf: (def: ChampionDef) => string,
  gear?: GearLookup,
): RosterEntry[] {
  const entries: RosterEntry[] = [];
  for (const instance of Object.values(roster)) {
    const def = championById(instance.defId);
    if (!def) continue;
    const worn = gear ? gear.worn(instance) : NOTHING_WORN;
    entries.push({
      instance,
      def,
      power:
        gear && worn.length > 0
          ? totalPower(def, instance, worn, gear.setById)
          : power(baseStats(def.stats, instance.stars, instance.level)),
      worn,
      name: nameOf(def),
    });
  }
  return entries;
}

/**
 * Every champion's power added together — what the header calls the chronicle's standing. Gear and
 * set bonuses are already in each entry's power, so this is the whole account in one number.
 */
export function accountPower(entries: readonly RosterEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.power, 0);
}

export function matchesFilters(entry: RosterEntry, filters: RosterFilters): boolean {
  const { instance, def } = entry;
  if (filters.rarities.length && !filters.rarities.includes(def.rarity)) return false;
  if (filters.elements.length && !filters.elements.includes(def.element)) return false;
  if (filters.roles.length && !filters.roles.includes(def.role)) return false;
  if (filters.locked !== null && instance.locked !== filters.locked) return false;
  if (filters.favourite !== null && instance.favourite !== filters.favourite) return false;
  if (filters.placeholderOnly && !def.art.placeholder) return false;
  return true;
}

/**
 * Favourites always lead; then the chosen sort; ties fall through to rarity, stars, level and
 * instance id so the order is total and stable across renders.
 */
export function compareEntries(
  a: RosterEntry,
  b: RosterEntry,
  sort: RosterSort,
  descending: boolean,
): number {
  if (a.instance.favourite !== b.instance.favourite) return a.instance.favourite ? -1 : 1;
  // `descending` is each sort's natural "best first" order: highest rank/level/power, newest,
  // first element, and A→Z for names (hence the flipped compare in `primaryKey`).
  const dir = descending ? -1 : 1;
  const primary = primaryKey(a, b, sort);
  if (primary !== 0) return primary * dir;
  return (
    RARITY_RANK[b.def.rarity] - RARITY_RANK[a.def.rarity] ||
    b.instance.stars - a.instance.stars ||
    b.instance.level - a.instance.level ||
    a.instance.instanceId.localeCompare(b.instance.instanceId)
  );
}

function primaryKey(a: RosterEntry, b: RosterEntry, sort: RosterSort): number {
  switch (sort) {
    case 'rank':
      return RARITY_RANK[a.def.rarity] - RARITY_RANK[b.def.rarity] || a.instance.stars - b.instance.stars;
    case 'level':
      return a.instance.level - b.instance.level;
    case 'power':
      return a.power - b.power;
    case 'element':
      return (
        ELEMENT_RANK[a.def.element] - ELEMENT_RANK[b.def.element] ||
        ROLE_RANK[a.def.role] - ROLE_RANK[b.def.role]
      );
    case 'recent':
      return a.instance.acquiredAt - b.instance.acquiredAt;
    case 'name':
      return b.name.localeCompare(a.name);
  }
}

export function sortAndFilter(entries: readonly RosterEntry[], view: RosterView): RosterEntry[] {
  return entries
    .filter((e) => matchesFilters(e, view.filters))
    .sort((a, b) => compareEntries(a, b, view.sort, view.descending));
}
