/**
 * Drawing a folio's map (docs/design/UNWRITTEN.md §5).
 *
 * Four walks climb eight rows over four lanes, each step going straight up or one lane aside; a
 * step that would cross another walk's goes straight instead, so roads never cross. The passages
 * are every place a walk stood, the roads every step one took, and every last-row passage leads to
 * the Warden. Kinds are fixed on three rows and drawn on the rest, under the rules that keep a
 * folio fair: no two Elites, Peddlers or Shrines joined by a road, at least one Elite and one
 * Peddler in every folio. A pure function of the seed, the folio and the rules.
 */
import {
  BARRED_ROWS,
  DRAWN_WEIGHTS,
  ELITE_AFFIXES,
  EVERY_FOLIO_HOLDS,
  FIXED_ROWS,
  FOLIO_LANES,
  FOLIO_ROWS,
  FOLIO_WALKS,
  NO_TWO_IN_A_ROW,
} from '@content/balance/unwritten';
import type { AffixDef, FolioDef, PassageKind } from '@content/unwritten/types';
import { createRng, type Rng } from '@engine/rng/rng';
import type { Passage } from '@engine/schema/unwritten-save';
import type { Rules } from './rules';

export const WARDEN_PASSAGE = 'warden';
/** The Warden's row: one above the last. */
export const WARDEN_ROW = FOLIO_ROWS + 1;

const passageId = (row: number, lane: number): string => `p${row}.${lane}`;

interface Sketch {
  row: number;
  lane: number;
  next: Set<string>;
  prev: Set<string>;
}

/** The walks: where the passages stand and which roads join them. */
function walk(rng: Rng): Map<string, Sketch> {
  const nodes = new Map<string, Sketch>();
  const roads = new Set<string>();
  const node = (row: number, lane: number): Sketch => {
    const id = passageId(row, lane);
    let found = nodes.get(id);
    if (!found) {
      found = { row, lane, next: new Set(), prev: new Set() };
      nodes.set(id, found);
    }
    return found;
  };
  let firstStart = -1;
  for (let w = 0; w < FOLIO_WALKS; w += 1) {
    let lane = rng.int(0, FOLIO_LANES - 1);
    // Two ways in at least: the second walk never starts where the first did.
    if (w === 1 && lane === firstStart) lane = (lane + 1 + rng.int(0, FOLIO_LANES - 2)) % FOLIO_LANES;
    if (w === 0) firstStart = lane;
    for (let row = 1; row <= FOLIO_ROWS; row += 1) {
      const here = node(row, lane);
      if (row === FOLIO_ROWS) break;
      let to = Math.max(0, Math.min(FOLIO_LANES - 1, lane + rng.int(-1, 1)));
      // A step aside that would cross another walk's step the other way goes straight up instead.
      if (to !== lane && roads.has(`${row}:${to}>${lane}`)) to = lane;
      roads.add(`${row}:${lane}>${to}`);
      const there = node(row + 1, to);
      here.next.add(passageId(row + 1, to));
      there.prev.add(passageId(row, lane));
      lane = to;
    }
  }
  return nodes;
}

/** Whether `kind` may stand on this passage, given the kinds already drawn around it. */
function allowed(
  kind: PassageKind,
  sketch: Sketch,
  kinds: ReadonlyMap<string, PassageKind>,
  rules: Rules,
): boolean {
  if (kind === 'echo' && rules.echo_passages < 1) return false;
  if (BARRED_ROWS[kind]?.includes(sketch.row)) return false;
  if (!NO_TWO_IN_A_ROW.includes(kind)) return true;
  for (const id of [...sketch.prev, ...sketch.next]) if (kinds.get(id) === kind) return false;
  return true;
}

/** The affixes a marked foe carries, drawn without repeat. */
export function drawAffixes(rng: Rng, pool: readonly AffixDef[], count: number): string[] {
  return rng.shuffle(pool.map((affix) => affix.id)).slice(0, Math.max(0, Math.min(pool.length, count)));
}

export interface FolioInput {
  seed: string;
  folio: FolioDef;
  rules: Rules;
  affixes: readonly AffixDef[];
}

/** A folio's map, passages in row then lane order, the Warden last. */
export function drawFolio(input: FolioInput): Passage[] {
  const { folio, rules } = input;
  const rng = createRng(`${input.seed}:map:${folio.index}`);
  const nodes = walk(rng);
  const order = [...nodes.entries()].sort(([, a], [, b]) => a.row - b.row || a.lane - b.lane);
  const kinds = new Map<string, PassageKind>();
  const weights = Object.entries(DRAWN_WEIGHTS) as [PassageKind, number][];
  for (const [id, sketch] of order) {
    const fixed = FIXED_ROWS[sketch.row];
    if (fixed) {
      kinds.set(id, fixed);
      continue;
    }
    const open = weights.filter(([kind]) => allowed(kind, sketch, kinds, rules));
    kinds.set(id, open.length ? rng.weighted(open.map(([item, weight]) => ({ item, weight }))) : 'skirmish');
  }
  // Every folio holds an Elite and a Peddler: a draw that left one out gets it placed.
  for (const kind of EVERY_FOLIO_HOLDS) {
    if ([...kinds.values()].includes(kind)) continue;
    const spots = order.filter(
      ([id, sketch]) =>
        !FIXED_ROWS[sketch.row] && kinds.get(id) === 'skirmish' && allowed(kind, sketch, kinds, rules),
    );
    const spot = spots.length ? rng.pick(spots) : null;
    if (spot) kinds.set(spot[0], kind);
  }

  const eliteAffixes = ELITE_AFFIXES + rules.elite_affixes;
  const passages: Passage[] = order.map(([id, sketch]) => {
    const kind = kinds.get(id) ?? 'skirmish';
    const fights = kind === 'skirmish' || kind === 'elite';
    return {
      id,
      row: sketch.row,
      lane: sketch.lane,
      kind,
      next: sketch.row === FOLIO_ROWS ? [WARDEN_PASSAGE] : [...sketch.next].sort(),
      faction: fights ? rng.pick(folio.factions) : null,
      affixes: kind === 'elite' ? drawAffixes(rng, input.affixes, eliteAffixes) : [],
    };
  });
  passages.push({
    id: WARDEN_PASSAGE,
    row: WARDEN_ROW,
    lane: 0,
    kind: 'warden',
    next: [],
    faction: null,
    affixes: drawAffixes(rng, input.affixes, rules.warden_affixes),
  });
  return passages;
}

/** The passages the company may enter next: any first-row one at a folio's start, else the roads out. */
export function reachable(map: readonly Passage[], walked: readonly string[]): Passage[] {
  const last = walked[walked.length - 1];
  if (last === undefined) return map.filter((p) => p.row === 1);
  const from = map.find((p) => p.id === last);
  return from ? map.filter((p) => from.next.includes(p.id)) : [];
}
