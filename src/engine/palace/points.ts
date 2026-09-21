/**
 * Where the Palace's skill points come from (docs/design/GLORIOUS_PALACE.md §3).
 *
 * Each source is a pure function from progress to "what is owed that has not been paid", and each
 * returns the watermark to store alongside it. Nothing here mutates: the state layer takes the
 * award, adds the points and writes the watermark back, so a reducer can be replayed and a source
 * can never pay the same thing twice.
 */
import { PALACE_POINT_SOURCES } from '@content/balance/palace';
import type { Difficulty } from '@content/balance/battle';
import type { PalaceSave } from '@engine/schema/save';

export interface PalaceAward {
  /** Points to add to `earned`; 0 when nothing is owed. */
  points: number;
  /** What to store so this is not paid again. */
  paid: Partial<PalaceSave>;
}

const NOTHING: PalaceAward = { points: 0, paid: {} };

/** `hard.7` — the key a settlement's clear is remembered by. */
export function settlementKey(difficulty: Difficulty, settlement: number): string {
  return `${difficulty}.${settlement}`;
}

/**
 * A settlement's boss stand fell. One point, once per settlement per difficulty — 36 over the
 * whole campaign, and the one-time backbone of the tree.
 */
export function awardSettlement(palace: PalaceSave, difficulty: Difficulty, settlement: number): PalaceAward {
  const key = settlementKey(difficulty, settlement);
  if (palace.settlementsPaid.includes(key)) return NOTHING;
  return {
    points: PALACE_POINT_SOURCES.settlement,
    paid: { settlementsPaid: [...palace.settlementsPaid, key] },
  };
}

/**
 * The tower reached `floor` in `season`. Every fifth floor pays one point, and a new season pays
 * the whole climb again (the owner's answer) — which is what makes the tower the engine that keeps
 * the tree moving after the campaign has run out of settlements.
 */
export function awardTowerFloor(palace: PalaceSave, season: number, floor: number): PalaceAward {
  const step = PALACE_POINT_SOURCES.towerFloorStep;
  const fresh = season !== palace.tower.season;
  const alreadyPaid = fresh ? 0 : palace.tower.floorPaid;
  if (floor <= alreadyPaid)
    return fresh ? { points: 0, paid: { tower: { season, floorPaid: alreadyPaid } } } : NOTHING;
  const steps = Math.floor(floor / step) - Math.floor(alreadyPaid / step);
  return {
    points: steps * PALACE_POINT_SOURCES.towerFloor,
    paid: { tower: { season, floorPaid: floor } },
  };
}

/**
 * A boss's pool is empty for the period `periodKey`. The daily boss pays one, the weekly three,
 * and each pays once per period however many keys it took to get there.
 */
export function awardBossKill(
  palace: PalaceSave,
  bossId: string,
  periodKey: string,
  period: 'daily' | 'weekly',
): PalaceAward {
  if (palace.bossesPaid[bossId] === periodKey) return NOTHING;
  const points = period === 'weekly' ? PALACE_POINT_SOURCES.weeklyBoss : PALACE_POINT_SOURCES.dailyBoss;
  return { points, paid: { bossesPaid: { ...palace.bossesPaid, [bossId]: periodKey } } };
}
