import { describe, expect, it } from 'vitest';
import { UNWRITTEN } from '@content/unwritten/index';
import { createRng } from '@engine/rng/rng';
import { drawOffer, inkCounts } from './offers';
import { combineRules } from './rules';

const ALL = UNWRITTEN.inscriptions;
const def = (id: string) => ALL.find((d) => d.id === id);
const RULES = combineRules([]);

describe('an inscription offer (UNWRITTEN.md §7.1)', () => {
  it('shows as many cards as the rules say, never the same one twice', () => {
    for (let i = 0; i < 40; i += 1) {
      const cards = drawOffer({
        rng: createRng(`o${i}`),
        source: 'skirmish',
        rules: RULES,
        held: [],
        inscriptions: ALL,
      });
      expect(cards).toHaveLength(3);
      expect(new Set(cards.map((c) => c.id)).size).toBe(3);
    }
    const wider = combineRules([{ rule: 'offer_size', value: 1 }]);
    expect(
      drawOffer({ rng: createRng('w'), source: 'skirmish', rules: wider, held: [], inscriptions: ALL }),
    ).toHaveLength(4);
  });

  it("keeps a Warden's offer to Epic and Legendary", () => {
    for (let i = 0; i < 40; i += 1)
      for (const card of drawOffer({
        rng: createRng(`w${i}`),
        source: 'warden',
        rules: RULES,
        held: [],
        inscriptions: ALL,
      }))
        expect(['epic', 'legendary']).toContain(def(card.id)?.rarity);
  });

  it('never offers a Legendary after a Skirmish until the Master’s Hand is written', () => {
    const cards = Array.from({ length: 300 }, (_, i) =>
      drawOffer({ rng: createRng(`s${i}`), source: 'skirmish', rules: RULES, held: [], inscriptions: ALL }),
    ).flat();
    expect(cards.some((c) => def(c.id)?.rarity === 'legendary')).toBe(false);
    const master = combineRules([{ rule: 'offer_legendary_skirmish', value: 1 }]);
    const later = Array.from({ length: 600 }, (_, i) =>
      drawOffer({ rng: createRng(`m${i}`), source: 'skirmish', rules: master, held: [], inscriptions: ALL }),
    ).flat();
    expect(later.some((c) => def(c.id)?.rarity === 'legendary')).toBe(true);
  });

  it('keeps the second volume and the blends out until the Scriptorium opens them', () => {
    const cards = Array.from({ length: 200 }, (_, i) =>
      drawOffer({ rng: createRng(`v${i}`), source: 'elite', rules: RULES, held: [], inscriptions: ALL }),
    ).flat();
    expect(cards.every((c) => def(c.id)?.volume === 1 && def(c.id)?.inks.length === 1)).toBe(true);
  });

  it('offers an inscription already held as its next level, and never one already at III', () => {
    const held = [{ id: 'inscription.oath_of_iron', level: 1 }];
    const rigged = ALL.filter((d) => d.id === 'inscription.oath_of_iron' || d.id === 'inscription.bloodlust');
    const cards = drawOffer({
      rng: createRng('h'),
      source: 'skirmish',
      rules: RULES,
      held,
      inscriptions: rigged,
    });
    expect(cards.find((c) => c.id === 'inscription.oath_of_iron')?.level).toBe(2);
    const maxed = drawOffer({
      rng: createRng('x'),
      source: 'skirmish',
      rules: RULES,
      held: [{ id: 'inscription.oath_of_iron', level: 3 }],
      inscriptions: rigged,
    });
    expect(maxed.map((c) => c.id)).toEqual(['inscription.bloodlust']);
  });

  it('offers blends only to a company holding both inks, once they may be offered', () => {
    const blends = combineRules([{ rule: 'blends', value: 1 }]);
    const both = [
      { id: 'inscription.oath_of_iron', level: 1 },
      { id: 'inscription.bloodlust', level: 1 },
    ];
    const cards = Array.from({ length: 200 }, (_, i) =>
      drawOffer({ rng: createRng(`b${i}`), source: 'elite', rules: blends, held: both, inscriptions: ALL }),
    ).flat();
    const offeredBlends = cards.filter((c) => (def(c.id)?.inks.length ?? 0) > 1);
    expect(offeredBlends.length).toBeGreaterThan(0);
    expect(offeredBlends.every((c) => c.id === 'inscription.crusaders_zeal')).toBe(true);
  });

  it('counts a blend toward both of its inks', () => {
    const counts = inkCounts(
      [
        { id: 'inscription.crusaders_zeal', level: 1 },
        { id: 'inscription.oath_of_iron', level: 2 },
      ],
      def,
    );
    expect(counts).toEqual({ gold: 2, crimson: 1, azure: 0, violet: 0 });
  });
});
