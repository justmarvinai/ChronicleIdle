import { describe, expect, it } from 'vitest';
import type { Roster } from '@engine/champions/instance';
import { createRng } from '@engine/rng/rng';
import { generateGear } from './generate';
import type { GearInstance, Inventory } from './instance';
import {
  DEFAULT_GEAR_VIEW,
  compareGearEntries,
  equipCandidates,
  gearEntries,
  matchesGearFilters,
  sortAndFilterGear,
  type GearEntry,
} from './query';

const T0 = Date.UTC(2026, 8, 12);

function piece(serial: number, patch: Partial<GearInstance> = {}): GearInstance {
  const rolled = generateGear(
    {
      serial,
      slot: 'weapon',
      setId: 'gear_set.warcry',
      rarity: 'rare',
      stars: 4,
      source: 'campaign_drop',
      now: T0 + serial,
    },
    createRng(`piece-${serial}`),
  );
  return { ...rolled, ...patch };
}

function armoury(pieces: readonly GearInstance[]): Inventory {
  return Object.fromEntries(pieces.map((p) => [p.instanceId, p]));
}

describe('the armoury query', () => {
  it('weighs every piece and names its wearer', () => {
    const worn = piece(1, { equippedTo: 'champion-1' });
    const spare = piece(2);
    const roster = {
      'champion-1': { instanceId: 'champion-1' },
    } as unknown as Roster;
    const entries = gearEntries(armoury([worn, spare]), roster);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.power > 0)).toBe(true);
    expect(entries.find((e) => e.piece.instanceId === worn.instanceId)?.wearer).toBeTruthy();
    expect(entries.find((e) => e.piece.instanceId === spare.instanceId)?.wearer).toBeNull();
  });

  it('forgets a wearer the roster no longer has', () => {
    const orphan = piece(3, { equippedTo: 'champion-gone' });
    const [entry] = gearEntries(armoury([orphan]), {} as Roster);
    expect(entry?.wearer).toBeNull();
  });

  it('filters by slot, rarity, set, stars, worn and locked', () => {
    const entry: GearEntry = {
      piece: piece(4, { equippedTo: 'champion-1', locked: true }),
      power: 100,
      wearer: null,
    };
    const { filters } = DEFAULT_GEAR_VIEW;
    expect(matchesGearFilters(entry, filters)).toBe(true);
    expect(matchesGearFilters(entry, { ...filters, slots: ['helmet'] })).toBe(false);
    expect(matchesGearFilters(entry, { ...filters, slots: ['weapon'] })).toBe(true);
    expect(matchesGearFilters(entry, { ...filters, rarities: ['epic'] })).toBe(false);
    expect(matchesGearFilters(entry, { ...filters, sets: ['gear_set.ironhide'] })).toBe(false);
    expect(matchesGearFilters(entry, { ...filters, minStars: 5 })).toBe(false);
    expect(matchesGearFilters(entry, { ...filters, minStars: 4 })).toBe(true);
    expect(matchesGearFilters(entry, { ...filters, worn: false })).toBe(false);
    expect(matchesGearFilters(entry, { ...filters, worn: true })).toBe(true);
    expect(matchesGearFilters(entry, { ...filters, locked: false })).toBe(false);
    expect(matchesGearFilters(entry, { ...filters, mainStats: ['spd'] })).toBe(false);
    expect(matchesGearFilters(entry, { ...filters, mainStats: ['atk'] })).toBe(true);
  });

  it('sorts by the chosen key and stays total', () => {
    const a: GearEntry = { piece: piece(5, { level: 3 }), power: 50, wearer: null };
    const b: GearEntry = { piece: piece(6, { level: 9 }), power: 90, wearer: null };
    expect(compareGearEntries(a, b, 'power', true)).toBeGreaterThan(0);
    expect(compareGearEntries(a, b, 'power', false)).toBeLessThan(0);
    expect(compareGearEntries(a, b, 'level', true)).toBeGreaterThan(0);
    // Same key on both sides: the tie-breakers decide, and never return 0 for different pieces.
    const twin: GearEntry = { piece: piece(7, { level: 3 }), power: 50, wearer: null };
    expect(compareGearEntries(a, twin, 'power', true)).not.toBe(0);
  });

  it('orders a whole armoury by power, best first', () => {
    const entries = gearEntries(armoury([piece(8), piece(9), piece(10)]), {} as Roster);
    const sorted = sortAndFilterGear(entries, DEFAULT_GEAR_VIEW);
    expect(sorted).toHaveLength(3);
    for (let i = 1; i < sorted.length; i += 1)
      expect(sorted[i - 1]!.power).toBeGreaterThanOrEqual(sorted[i]!.power);
  });

  it('offers a slot only pieces of that slot, minus the one already on', () => {
    const worn = piece(11, { equippedTo: 'champion-1' });
    const spare = piece(12);
    const helmet = {
      ...piece(13),
      slot: 'helmet' as const,
      instanceId: 'gear-13',
    };
    const entries = gearEntries(armoury([worn, spare, helmet]), {} as Roster);
    const candidates = equipCandidates(entries, 'weapon', 'champion-1');
    expect(candidates.map((e) => e.piece.instanceId)).toEqual([spare.instanceId]);
  });
});
