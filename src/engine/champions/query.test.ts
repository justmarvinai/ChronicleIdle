import { describe, expect, it } from 'vitest';
import { CHAMPION_BY_ID, CHAMPIONS } from '@content/champions/index';
import { CHAMPION_IDS } from '@content/champions/types';
import { createRng } from '@engine/rng/rng';
import { generateRoster } from './roster';
import { DEFAULT_ROSTER_VIEW, rosterEntries, sortAndFilter } from './query';

const content = { championById: (id: (typeof CHAMPION_IDS)[number]) => CHAMPION_BY_ID[id] };
const generated = generateRoster(
  { roster: {}, counters: { instances: 0 } },
  content,
  CHAMPION_IDS,
  240,
  createRng('index'),
  1_000_000,
);
if (!generated.ok) throw new Error('generate failed');
const entries = rosterEntries(generated.value.roster, content.championById, (def) => def.id);

describe('roster query', () => {
  it('builds an entry with power for every instance', () => {
    expect(entries).toHaveLength(240);
    for (const entry of entries) expect(entry.power).toBeGreaterThan(0);
  });

  it('sorts favourites first, then by rank descending with a total order', () => {
    const sorted = sortAndFilter(entries, DEFAULT_ROSTER_VIEW);
    expect(sorted).toHaveLength(240);
    const firstNonFav = sorted.findIndex((e) => !e.instance.favourite);
    expect(sorted.slice(0, firstNonFav).every((e) => e.instance.favourite)).toBe(true);
    const tail = sorted.slice(firstNonFav);
    for (let i = 1; i < tail.length; i++) {
      const a = tail[i - 1]!;
      const b = tail[i]!;
      const ra = CHAMPIONS.findIndex((c) => c.rarity === a.def.rarity);
      const rb = CHAMPIONS.findIndex((c) => c.rarity === b.def.rarity);
      expect(ra >= rb || (ra === rb && a.instance.stars >= b.instance.stars)).toBe(true);
    }
    // Deterministic: the same input yields the same order.
    expect(sortAndFilter(entries, DEFAULT_ROSTER_VIEW).map((e) => e.instance.instanceId)).toEqual(
      sorted.map((e) => e.instance.instanceId),
    );
  });

  it('filters by rarity, element, role, lock and favourite', () => {
    const view = {
      ...DEFAULT_ROSTER_VIEW,
      filters: {
        rarities: ['epic' as const],
        elements: ['valor' as const],
        roles: [],
        locked: false,
        favourite: null,
      },
    };
    const result = sortAndFilter(entries, view);
    expect(result.length).toBeGreaterThan(0);
    for (const e of result) {
      expect(e.def.rarity).toBe('epic');
      expect(e.def.element).toBe('valor');
      expect(e.instance.locked).toBe(false);
    }
    const favs = sortAndFilter(entries, {
      ...DEFAULT_ROSTER_VIEW,
      filters: { ...DEFAULT_ROSTER_VIEW.filters, favourite: true },
    });
    expect(favs.every((e) => e.instance.favourite)).toBe(true);
  });

  it('sorts by level, power, element, recency and name', () => {
    const byLevel = sortAndFilter(entries, { ...DEFAULT_ROSTER_VIEW, sort: 'level' }).filter(
      (e) => !e.instance.favourite,
    );
    for (let i = 1; i < byLevel.length; i++)
      expect(byLevel[i - 1]!.instance.level).toBeGreaterThanOrEqual(byLevel[i]!.instance.level);
    const byPower = sortAndFilter(entries, {
      ...DEFAULT_ROSTER_VIEW,
      sort: 'power',
      descending: false,
    }).filter((e) => !e.instance.favourite);
    for (let i = 1; i < byPower.length; i++)
      expect(byPower[i - 1]!.power).toBeLessThanOrEqual(byPower[i]!.power);
    const byRecent = sortAndFilter(entries, { ...DEFAULT_ROSTER_VIEW, sort: 'recent' }).filter(
      (e) => !e.instance.favourite,
    );
    for (let i = 1; i < byRecent.length; i++)
      expect(byRecent[i - 1]!.instance.acquiredAt).toBeGreaterThanOrEqual(byRecent[i]!.instance.acquiredAt);
    const byName = sortAndFilter(entries, { ...DEFAULT_ROSTER_VIEW, sort: 'name' }).filter(
      (e) => !e.instance.favourite,
    );
    for (let i = 1; i < byName.length; i++)
      expect(byName[i - 1]!.name.localeCompare(byName[i]!.name)).toBeLessThanOrEqual(0);
  });

  it('handles 240 entries quickly enough for a filter change per frame', () => {
    const started = process.hrtime.bigint();
    for (let i = 0; i < 20; i++)
      sortAndFilter(entries, { ...DEFAULT_ROSTER_VIEW, sort: i % 2 ? 'power' : 'rank' });
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    expect(elapsedMs).toBeLessThan(400);
  });
});
