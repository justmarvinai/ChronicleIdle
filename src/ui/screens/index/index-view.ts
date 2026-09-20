/**
 * What the Chronicle Index shows, derived from the content registry and the roster
 * (docs/tech/UI_DESIGN.md §5.20). Pure: the screen renders these, the tests read them.
 */
import type { ChampionDef, ChampionId, Element, Rarity, Role } from '@content/champions/types';
import type { EnemyDef } from '@content/enemies/types';
import { content } from '@content/registry';
import { ELEMENTS, RARITIES, ROLES } from '@content/champions/types';
import type { ChampionInstance } from '@engine/champions/instance';

/** One champion in the catalogue: its definition, and how many copies the chronicle has. */
export interface IndexChampion {
  def: ChampionDef;
  copies: number;
  found: boolean;
}

/** `RARITIES` runs poorest to richest, so a rarity's own index is its rank. */
const RARITY_RANK: Readonly<Record<Rarity, number>> = Object.fromEntries(
  RARITIES.map((rarity, i) => [rarity, i]),
) as Record<Rarity, number>;

/**
 * Every champion the game has, found or not, richest rarity first and alphabetical within it. The
 * index is a catalogue rather than a roster: an unfound champion still has a page, because seeing
 * what is missing is the point of one.
 */
export function indexChampions(roster: Readonly<Record<string, ChampionInstance>>): IndexChampion[] {
  const copies = new Map<ChampionId, number>();
  for (const instance of Object.values(roster))
    copies.set(instance.defId, (copies.get(instance.defId) ?? 0) + 1);
  return content.champions
    .map((def): IndexChampion => {
      const owned = copies.get(def.id) ?? 0;
      return { def, copies: owned, found: owned > 0 };
    })
    .sort(
      (a, b) => RARITY_RANK[b.def.rarity] - RARITY_RANK[a.def.rarity] || a.def.id.localeCompare(b.def.id),
    );
}

export interface IndexFilters {
  rarity: Rarity | null;
  element: Element | null;
  role: Role | null;
  /** Only the ones the chronicle has found. */
  foundOnly: boolean;
}

export const NO_FILTERS: IndexFilters = { rarity: null, element: null, role: null, foundOnly: false };

export function filterChampions(entries: readonly IndexChampion[], filters: IndexFilters): IndexChampion[] {
  return entries.filter(
    ({ def, found }) =>
      (!filters.rarity || def.rarity === filters.rarity) &&
      (!filters.element || def.element === filters.element) &&
      (!filters.role || def.role === filters.role) &&
      (!filters.foundOnly || found),
  );
}

/** One role's cards inside an element's section. */
export interface IndexRoleGroup {
  role: Role;
  entries: IndexChampion[];
}

/** One element's section of the catalogue, its roles in `ROLES` order. */
export interface IndexSection {
  element: Element;
  groups: IndexRoleGroup[];
}

/**
 * The catalogue as it is read rather than as it is stored: a section per element, and inside each
 * one a group per role. A flat grid of 23 cards is a wall; the element a champion answers to and
 * the job it does are the two things a player sorts by, so they are the two headings.
 */
export function championSections(entries: readonly IndexChampion[]): IndexSection[] {
  const sections: IndexSection[] = [];
  for (const element of ELEMENTS) {
    const groups: IndexRoleGroup[] = [];
    for (const role of ROLES) {
      const inGroup = entries.filter((e) => e.def.element === element && e.def.role === role);
      if (inGroup.length > 0) groups.push({ role, entries: inGroup });
    }
    if (groups.length > 0) sections.push({ element, groups });
  }
  return sections;
}

/** How much of the roster the chronicle has found, for the header's tally. */
export function foundCount(entries: readonly IndexChampion[]): { found: number; total: number } {
  return { found: entries.filter((e) => e.found).length, total: entries.length };
}

/** One faction's page in the bestiary: the settlement it holds and everything that stands in it. */
export interface BestiaryChapter {
  /** 1..12, the settlement's own index. */
  settlement: number;
  /** i18n key of the settlement's name. */
  name: string;
  factionId: string;
  units: readonly EnemyDef[];
  boss: EnemyDef;
}

/**
 * The bestiary, in the order the campaign walks: each settlement's faction, its six rank-and-file
 * and the boss that holds the last stand. The period bosses are not here — they have their own
 * gate and their own sheet (`BOSSES.md` §4).
 */
export function bestiary(): BestiaryChapter[] {
  const chapters: BestiaryChapter[] = [];
  for (const settlement of content.settlements) {
    const faction = content.factionById(settlement.faction);
    if (!faction) continue;
    chapters.push({
      settlement: settlement.index,
      name: settlement.name,
      factionId: faction.id,
      units: faction.units,
      boss: faction.boss,
    });
  }
  return chapters.sort((a, b) => a.settlement - b.settlement);
}
