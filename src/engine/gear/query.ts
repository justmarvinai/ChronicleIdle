/**
 * Sorting and filtering an armoury (docs/design/GEAR.md §7). Pure, like the roster's own query,
 * so four hundred pieces are ordered here and tested here rather than inside a React memo.
 */
import { RARITIES, type GearSlot, type Rarity } from '@content/champions/types';
import type { GearStat } from '@content/balance/gear';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import type { GearInstance, Inventory } from './instance';
import { piecePower } from './stats';

export const GEAR_SORTS = ['power', 'level', 'rarity', 'stars', 'recent'] as const;
export type GearSort = (typeof GEAR_SORTS)[number];

export interface GearFilters {
  slots: GearSlot[];
  rarities: Rarity[];
  /** Set ids; empty means every set. */
  sets: string[];
  /** Lowest star rank shown; 0 means every piece. */
  minStars: number;
  mainStats: GearStat[];
  /** `null` = worn and spare alike. */
  worn: boolean | null;
  locked: boolean | null;
}

export interface GearView {
  sort: GearSort;
  descending: boolean;
  filters: GearFilters;
}

export const DEFAULT_GEAR_VIEW: GearView = {
  sort: 'power',
  descending: true,
  filters: { slots: [], rarities: [], sets: [], minStars: 0, mainStats: [], worn: null, locked: null },
};

export interface GearEntry {
  piece: GearInstance;
  /** Power against the reference champion, so pieces of different slots can share one column. */
  power: number;
  /** The champion wearing it, when the roster still has them. */
  wearer: ChampionInstance | null;
}

const RARITY_RANK = Object.fromEntries(RARITIES.map((r, i) => [r, i])) as Record<Rarity, number>;

/** Display entries for every piece the chronicle owns. */
export function gearEntries(inventory: Inventory, roster: Roster): GearEntry[] {
  const entries: GearEntry[] = [];
  for (const piece of Object.values(inventory))
    entries.push({
      piece,
      power: piecePower(piece),
      wearer: piece.equippedTo ? (roster[piece.equippedTo] ?? null) : null,
    });
  return entries;
}

export function matchesGearFilters(entry: GearEntry, filters: GearFilters): boolean {
  const { piece } = entry;
  if (filters.slots.length && !filters.slots.includes(piece.slot)) return false;
  if (filters.rarities.length && !filters.rarities.includes(piece.rarity)) return false;
  if (filters.sets.length && !filters.sets.includes(piece.setId)) return false;
  if (filters.minStars > 0 && piece.stars < filters.minStars) return false;
  if (filters.mainStats.length && !filters.mainStats.includes(piece.mainStat)) return false;
  if (filters.worn !== null && (piece.equippedTo !== null) !== filters.worn) return false;
  if (filters.locked !== null && piece.locked !== filters.locked) return false;
  return true;
}

/**
 * The chosen sort, then rarity, stars, level and instance id — a total order, so the grid never
 * reshuffles a row under the cursor between renders.
 */
export function compareGearEntries(a: GearEntry, b: GearEntry, sort: GearSort, descending: boolean): number {
  const dir = descending ? -1 : 1;
  const primary = primaryKey(a, b, sort);
  if (primary !== 0) return primary * dir;
  return (
    RARITY_RANK[b.piece.rarity] - RARITY_RANK[a.piece.rarity] ||
    b.piece.stars - a.piece.stars ||
    b.piece.level - a.piece.level ||
    a.piece.instanceId.localeCompare(b.piece.instanceId)
  );
}

function primaryKey(a: GearEntry, b: GearEntry, sort: GearSort): number {
  switch (sort) {
    case 'power':
      return a.power - b.power;
    case 'level':
      return a.piece.level - b.piece.level;
    case 'rarity':
      return RARITY_RANK[a.piece.rarity] - RARITY_RANK[b.piece.rarity];
    case 'stars':
      return a.piece.stars - b.piece.stars;
    case 'recent':
      return a.piece.acquiredAt - b.piece.acquiredAt;
  }
}

export function sortAndFilterGear(entries: readonly GearEntry[], view: GearView): GearEntry[] {
  return entries
    .filter((entry) => matchesGearFilters(entry, view.filters))
    .sort((a, b) => compareGearEntries(a, b, view.sort, view.descending));
}

/** The pieces that may go on a slot: the slot's own, and never one already worn there. */
export function equipCandidates(
  entries: readonly GearEntry[],
  slot: GearSlot,
  championId: string,
): GearEntry[] {
  return entries.filter((entry) => entry.piece.slot === slot && entry.piece.equippedTo !== championId);
}
