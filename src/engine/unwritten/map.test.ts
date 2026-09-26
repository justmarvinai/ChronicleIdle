import { describe, expect, it } from 'vitest';
import { FIXED_ROWS, FOLIO_ROWS, NO_TWO_IN_A_ROW } from '@content/balance/unwritten';
import { UNWRITTEN } from '@content/unwritten/index';
import type { Passage } from '@engine/schema/unwritten-save';
import { drawFolio, reachable, WARDEN_PASSAGE } from './map';
import { combineRules } from './rules';

const RULES = combineRules([]);
const [FOLIO] = UNWRITTEN.folios;
if (!FOLIO) throw new Error('no folio');

const draw = (seed: string, rules = RULES) =>
  drawFolio({ seed, folio: FOLIO, rules, affixes: UNWRITTEN.affixes });
const byId = (map: readonly Passage[]) => new Map(map.map((p) => [p.id, p]));
const SEEDS = Array.from({ length: 60 }, (_, i) => `seed-${i}`);

describe("a folio's map (UNWRITTEN.md §5)", () => {
  it('is a pure function of the seed', () => {
    expect(draw('same')).toEqual(draw('same'));
    expect(draw('same')).not.toEqual(draw('other'));
  });

  it('keeps its fixed rows and ends every road at the Warden', () => {
    for (const seed of SEEDS) {
      const map = draw(seed);
      const warden = map.find((p) => p.id === WARDEN_PASSAGE);
      expect(warden?.kind).toBe('warden');
      for (const passage of map.filter((p) => p.id !== WARDEN_PASSAGE)) {
        const fixed = FIXED_ROWS[passage.row];
        if (fixed) expect(passage.kind, `${seed} ${passage.id}`).toBe(fixed);
        if (passage.row === FOLIO_ROWS) expect(passage.next).toEqual([WARDEN_PASSAGE]);
        else expect(passage.next.length).toBeGreaterThan(0);
      }
    }
  });

  it('never joins two Elites, Peddlers or Shrines by a road, and always holds an Elite and a Peddler', () => {
    for (const seed of SEEDS) {
      const map = draw(seed);
      const index = byId(map);
      for (const passage of map)
        for (const id of passage.next) {
          const next = index.get(id);
          if (next && NO_TWO_IN_A_ROW.includes(passage.kind))
            expect(next.kind, `${seed} ${passage.id}→${id}`).not.toBe(passage.kind);
        }
      expect(
        map.some((p) => p.kind === 'elite'),
        seed,
      ).toBe(true);
      expect(
        map.some((p) => p.kind === 'peddler'),
        seed,
      ).toBe(true);
    }
  });

  it('never crosses two roads, and every passage lies on a way from the first row to the Warden', () => {
    for (const seed of SEEDS) {
      const map = draw(seed);
      const roads = map.flatMap((p) =>
        p.id === WARDEN_PASSAGE
          ? []
          : p.next.filter((id) => id !== WARDEN_PASSAGE).map((id) => [p, byId(map).get(id)] as const),
      );
      for (const [a, b] of roads)
        for (const [c, d] of roads) {
          if (!b || !d || a.row !== c.row) continue;
          // Two steps out of one row cross when their lanes swap order.
          expect(
            (a.lane - c.lane) * (b.lane - d.lane),
            `${seed}: ${a.id}→${b.id} × ${c.id}→${d.id}`,
          ).toBeGreaterThanOrEqual(0);
        }
      // Walk forward from the first row: every passage is reached.
      const seen = new Set<string>();
      let frontier = reachable(map, []);
      while (frontier.length) {
        for (const p of frontier) seen.add(p.id);
        frontier = map.filter((p) => frontier.some((f) => f.next.includes(p.id)) && !seen.has(p.id));
      }
      expect(seen.size, seed).toBe(map.length);
    }
  });

  it('draws Echo passages only once the Scriptorium calls them', () => {
    const plain = SEEDS.flatMap((seed) => draw(seed));
    expect(plain.some((p) => p.kind === 'echo')).toBe(false);
    const calling = combineRules([{ rule: 'echo_passages', value: 1 }]);
    expect(SEEDS.flatMap((seed) => draw(seed, calling)).some((p) => p.kind === 'echo')).toBe(true);
  });

  it('marks every Elite with its affixes, and more of them as the Omens add', () => {
    const marked = combineRules([{ rule: 'elite_affixes', value: 2 }]);
    for (const seed of SEEDS.slice(0, 10)) {
      for (const elite of draw(seed).filter((p) => p.kind === 'elite')) expect(elite.affixes).toHaveLength(1);
      for (const elite of draw(seed, marked).filter((p) => p.kind === 'elite')) {
        expect(elite.affixes).toHaveLength(3);
        expect(new Set(elite.affixes).size).toBe(3);
      }
    }
  });

  it('opens the first row, then only the roads out of the last passage walked', () => {
    const map = draw('walk');
    const first = reachable(map, []);
    expect(first.every((p) => p.row === 1)).toBe(true);
    const step = first[0];
    if (!step) throw new Error('no first passage');
    expect(reachable(map, [step.id]).map((p) => p.id)).toEqual(step.next);
  });
});
