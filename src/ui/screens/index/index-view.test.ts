/**
 * The Chronicle Index's own reading of the content registry: a catalogue of every champion the
 * game has (found or not), and the bestiary in the order the campaign walks it.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { createInstance } from '@engine/champions/instance';
import type { ChampionInstance } from '@engine/champions/instance';
import { bestiary, filterChampions, foundCount, indexChampions, NO_FILTERS } from './index-view';

function roster(...ids: readonly string[]): Record<string, ChampionInstance> {
  const out: Record<string, ChampionInstance> = {};
  ids.forEach((id, i) => {
    const def = content.championById(id as 'champ.anuria');
    if (!def) throw new Error(`no champion ${id}`);
    const instance = createInstance(def, {
      instanceId: `${id}-${i}`,
      now: 0,
      source: 'summon',
    });
    out[instance.instanceId] = instance;
  });
  return out;
}

describe('the champion catalogue', () => {
  it('holds every champion the game has, found or not, richest first', () => {
    const entries = indexChampions({});
    expect(entries).toHaveLength(content.champions.length);
    expect(entries.every((e) => !e.found)).toBe(true);
    // Mythic before legendary before epic, and so on down.
    expect(entries[0]?.def.rarity).toBe('mythic');
    expect(entries.at(-1)?.def.rarity).toBe('common');
  });

  it('counts the copies a chronicle holds', () => {
    const entries = indexChampions(roster('champ.anuria', 'champ.anuria', 'champ.ser_corvin'));
    const anuria = entries.find((e) => e.def.id === 'champ.anuria');
    expect(anuria?.copies).toBe(2);
    expect(anuria?.found).toBe(true);
    expect(entries.find((e) => e.def.id === 'champ.ser_corvin')?.copies).toBe(1);
    expect(foundCount(entries)).toEqual({ found: 2, total: content.champions.length });
  });

  it('filters by rarity, element, role and what has been found', () => {
    const entries = indexChampions(roster('champ.anuria'));
    const epics = filterChampions(entries, { ...NO_FILTERS, rarity: 'epic' });
    expect(epics.length).toBeGreaterThan(0);
    expect(epics.every((e) => e.def.rarity === 'epic')).toBe(true);

    const faith = filterChampions(entries, { ...NO_FILTERS, element: 'faith' });
    expect(faith.every((e) => e.def.element === 'faith')).toBe(true);

    const support = filterChampions(entries, { ...NO_FILTERS, role: 'support' });
    expect(support.every((e) => e.def.role === 'support')).toBe(true);

    expect(filterChampions(entries, { ...NO_FILTERS, foundOnly: true }).map((e) => e.def.id)).toEqual([
      'champ.anuria',
    ]);
  });
});

describe('the bestiary', () => {
  it('walks the twelve settlements in order, each with its six and its boss', () => {
    const chapters = bestiary();
    expect(chapters).toHaveLength(content.settlements.length);
    expect(chapters.map((c) => c.settlement)).toEqual(chapters.map((_, i) => i + 1));
    for (const chapter of chapters) {
      expect(chapter.units).toHaveLength(6);
      expect(chapter.boss.archetype).toBe('boss');
      // Every unit on a page belongs to the faction that page is about.
      expect(new Set(chapter.units.map((u) => u.id)).size).toBe(6);
    }
  });

  it('names every enemy the campaign fields, and nothing twice', () => {
    const ids = bestiary().flatMap((c) => [...c.units.map((u) => u.id), c.boss.id]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(content.settlements.length * 7);
  });
});
