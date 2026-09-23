import { describe, expect, it } from 'vitest';
import type { ChampionDef, ChampionId } from '@content/champions/types';
import { createRng } from '@engine/rng/rng';
import { instanceIdFor } from './instance';
import {
  addChampion,
  countOwned,
  generateRoster,
  seedStartingRoster,
  setFavourite,
  setLocked,
} from './roster';

const STATS = { hp: 10_000, atk: 1_000, def: 900, spd: 100, critRate: 15, critDmg: 50, res: 20, acc: 0 };
const def = (id: ChampionId, rarity: ChampionDef['rarity']): ChampionDef => ({
  id,
  name: `${id}.name`,
  lore: `${id}.lore`,
  rarity,
  element: 'valor',
  role: 'attack',
  stats: STATS,
  art: {
    model: 'model.teritorial_lizard',
    avatar: 'avatar.teritorial_lizard',
    facing: 'left',
    tint: '#888888',
    placeholder: true,
  },
  obtain: ['summon'],
  abilities: [],
  version: 1,
});
const DEFS: Partial<Record<ChampionId, ChampionDef>> = {
  'champ.sister_maelis': def('champ.sister_maelis', 'rare'),
  'champ.ser_corvin': def('champ.ser_corvin', 'rare'),
  'champ.reva_ashblade': def('champ.reva_ashblade', 'rare'),
  'champ.bran_militia': def('champ.bran_militia', 'common'),
  'champ.wenna_novice': def('champ.wenna_novice', 'common'),
  'champ.gil_scrapper': def('champ.gil_scrapper', 'common'),
  'champ.anuria': def('champ.anuria', 'epic'),
};
const content = { championById: (id: ChampionId) => DEFS[id] };
const empty = { roster: {}, counters: { instances: 0 } };

describe('roster reducers', () => {
  it('adds copies with counter-based ids at the rarity base stars', () => {
    const first = addChampion(empty, content, 'champ.anuria', 'summon', 1000);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.instance).toMatchObject({ instanceId: 'anuria-1', stars: 4, level: 1, locked: false });
    const second = addChampion(first.value.state, content, 'champ.anuria', 'summon', 2000);
    if (!second.ok) throw new Error('add failed');
    expect(second.value.instance.instanceId).toBe(instanceIdFor('champ.anuria', 2));
    expect(countOwned(second.value.state.roster, 'champ.anuria')).toBe(2);
    expect(Object.keys(empty.roster)).toHaveLength(0);
    expect(addChampion(empty, content, 'champ.varkos_sundered_king', 'summon', 0).ok).toBe(false);
  });

  it('seeds the starter plus the three tutorial companions exactly once', () => {
    const seeded = seedStartingRoster(empty, content, 'champ.ser_corvin', 500);
    if (!seeded.ok) throw new Error('seed failed');
    const ids = Object.values(seeded.value.state.roster).map((i) => i.defId);
    expect(ids).toEqual([
      'champ.ser_corvin',
      'champ.bran_militia',
      'champ.wenna_novice',
      'champ.gil_scrapper',
    ]);
    expect(seeded.value.starterInstanceId).toBe('ser_corvin-1');
    expect(seeded.value.state.roster['ser_corvin-1']?.source).toBe('starter');
    // The first stand's team (TUTORIAL.md 1.5): the starter leads, Bran and Wenna fight, Gil waits.
    expect(seeded.value.firstTeam).toEqual(['ser_corvin-1', 'bran_militia-2', 'wenna_novice-3']);
    expect(seedStartingRoster(seeded.value.state, content, 'champ.ser_corvin', 500).ok).toBe(false);
    expect(seedStartingRoster(empty, content, 'champ.anuria', 500).ok).toBe(false);
  });

  it('locks and favourites by instance id', () => {
    const seeded = seedStartingRoster(empty, content, 'champ.reva_ashblade', 0);
    if (!seeded.ok) throw new Error('seed failed');
    const locked = setLocked(seeded.value.state, 'reva_ashblade-1', true);
    if (!locked.ok) throw new Error('lock failed');
    expect(locked.value.roster['reva_ashblade-1']?.locked).toBe(true);
    const fav = setFavourite(locked.value, 'bran_militia-2', true);
    if (!fav.ok) throw new Error('fav failed');
    expect(fav.value.roster['bran_militia-2']?.favourite).toBe(true);
    expect(fav.value.roster['reva_ashblade-1']?.locked).toBe(true);
    expect(setLocked(fav.value, 'nobody-9', true).ok).toBe(false);
  });

  it('generates deterministic large rosters from a seed', () => {
    const ids = Object.keys(DEFS) as ChampionId[];
    const a = generateRoster(empty, content, ids, 220, createRng('perf'), 10_000);
    const b = generateRoster(empty, content, ids, 220, createRng('perf'), 10_000);
    if (!a.ok || !b.ok) throw new Error('generate failed');
    expect(Object.keys(a.value.roster)).toHaveLength(220);
    expect(a.value).toEqual(b.value);
    for (const instance of Object.values(a.value.roster)) {
      expect(instance.level).toBeLessThanOrEqual(instance.stars * 10);
      expect(instance.stars).toBeGreaterThanOrEqual(1);
    }
  });
});
