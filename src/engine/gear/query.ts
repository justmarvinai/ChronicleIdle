/**
 * Sorting and filtering an armoury (docs/design/GEAR.md §7). Pure, like the roster's own query,
 * so four hundred pieces are ordered here and tested here rather than inside a React memo.
 */
import { RARITIES, type GearSlot, type Rarity } from '@content/champions/types';
import type { GearStat } from '@content/balance/gear';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import type { GearInstance, Inventory } from './instance';
import { piecePower } from './stats';

export const GEAR_SORTS = ['set', 'power', 'level', 'rarity', 'stars', 'recent'] as const;
export type GearSort = (typeof GEAR_SORTS)[number];

export interface GearFilters {
  slots: GearSlot[];
  rarities: Rarity[];
  /** Set ids; empty means every set. */
  sets: string[];
  /** Lowest star rank shown; 0 means every piece. */
  minStars: number;
  mainStats: GearStat[];
  locked: boolean | null;
}

export interface GearView {
  sort: GearSort;
  descending: boolean;
  filters: GearFilters;
}

export const DEFAULT_GEAR_VIEW: GearView = {
  // The racks open grouped by set, the way a collector reads them: every Ember Guard piece
  // together, so a set being assembled is visible rather than scattered (the owner's first batch).
  sort: 'set',
  descending: false,
  filters: { slots: [], rarities: [], sets: [], minStars: 0, mainStats: [], locked: null },
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
    // Ids are `gear_set.<slug>`, so comparing them groups each set's pieces together and keeps the
    // groups in a stable order without the engine having to read the set's display name.
    case 'set':
      return a.piece.setId.localeCompare(b.piece.setId);
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

/**
 * A piece is in the armoury only while nobody is wearing it (the owner's first batch).
 *
 * Worn gear used to be listed everywhere, which read as "look how much armour I have" when most of
 * it was already on someone — and made the racks a list of things you mostly could not take. A
 * piece now lives in exactly one place: the armoury until it is equipped, then the champion
 * wearing it, whose rack is also where it is upgraded from.
 */
export const inArmoury = (entry: GearEntry): boolean => entry.piece.equippedTo === null;

/**
 * The pieces that may go on a slot: the slot's own, and only those no champion is wearing. Offering
 * another champion's gear here is what made the picker look fuller than the armoury really was;
 * taking it would have stripped that champion silently.
 */
export function equipCandidates(entries: readonly GearEntry[], slot: GearSlot): GearEntry[] {
  return entries.filter((entry) => entry.piece.slot === slot && inArmoury(entry));
}

/** One set's pieces, in the order the sort put them. */
export interface GearSetGroup {
  setId: string;
  entries: GearEntry[];
}

/**
 * The racks cut into one run per set, the way a collector reads them (the owner's first batch):
 * every Ember Guard piece together, under its own crest, so a set half-assembled is visible at a
 * glance instead of scattered down the grid.
 *
 * Sets appear in the order their first piece does, so the chosen sort still decides the shape of
 * the page; on the `set` sort — the racks' default — that is one contiguous run each.
 */
export function groupBySet(entries: readonly GearEntry[]): GearSetGroup[] {
  const groups = new Map<string, GearSetGroup>();
  for (const entry of entries) {
    const group = groups.get(entry.piece.setId);
    if (group) group.entries.push(entry);
    else groups.set(entry.piece.setId, { setId: entry.piece.setId, entries: [entry] });
  }
  return [...groups.values()];
}
