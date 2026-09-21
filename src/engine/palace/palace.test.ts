/**
 * The Glorious Palace's engine (docs/design/GLORIOUS_PALACE.md): what a bought tree adds to a
 * champion, what a point may be spent on, and what each of the four sources owes.
 *
 * The tree itself is content, so these tests build small trees of their own — a formula tested
 * against the authored 133 nodes would only be testing the authoring.
 */
import { describe, expect, it } from 'vitest';
import { PALACE_POINT_SOURCES } from '@content/balance/palace';
import type { PalaceGrants, PalaceNodeDef } from '@content/palace/types';
import type { Element } from '@content/champions/types';
import type { PalaceSave } from '@engine/schema/save';
import {
  awardBossKill,
  awardSettlement,
  awardTowerFloor,
  isReachable,
  nodeState,
  NO_PALACE,
  palaceBonus,
  palaceLedger,
  palaceSpent,
  palaceStats,
  settlementKey,
  withPalace,
} from './index';

const node = (
  id: string,
  element: Element | null,
  cost: number,
  grants: PalaceGrants,
  requires: readonly string[] = [],
  hpPct = 0,
): PalaceNodeDef => ({
  id,
  name: `palace.node.${id}`,
  element,
  ring: 0,
  slot: 0,
  requires,
  cost,
  grants,
  hpPct,
  version: 1,
});

const TREE: readonly PalaceNodeDef[] = [
  node('core', null, 1, {}, [], 1),
  node('v1', 'valor', 1, { hp: 50 }, ['core']),
  node('v2', 'valor', 2, { hp: 75, atk: 10 }, ['v1']),
  node('v3', 'valor', 3, { critRate: 2 }, ['v2']),
  node('f1', 'faith', 1, { def: 8 }, ['core']),
];
const lookup = (id: string): PalaceNodeDef | undefined => TREE.find((n) => n.id === id);

const STATS = { hp: 10_000, atk: 1_000, def: 800, spd: 100, critRate: 15, critDmg: 50, res: 30, acc: 20 };

const emptySave = (): PalaceSave => ({
  nodes: [],
  earned: 0,
  settlementsPaid: [],
  tower: { season: 0, floorPaid: 0 },
  bossesPaid: {},
});

describe('what the Palace adds', () => {
  it('adds nothing at all when nothing is bought', () => {
    const bonus = palaceBonus([], lookup);
    expect(bonus).toBe(NO_PALACE);
    expect(palaceStats(bonus, 'valor', 10_000)).toEqual({});
    expect(withPalace(STATS, bonus, 'valor', 10_000)).toBe(STATS);
  });

  it('sums a branch onto its own element and leaves the others alone', () => {
    const bonus = palaceBonus(['core', 'v1', 'v2', 'f1'], lookup);
    expect(bonus.nodes).toBe(4);
    expect(bonus.flat.valor).toEqual({ hp: 125, atk: 10 });
    expect(bonus.flat.faith).toEqual({ def: 8 });
    expect(bonus.flat.justice).toEqual({});
    expect(bonus.flat.eclipse).toEqual({});
  });

  it('takes the core’s percentage off the champion’s own base HP, not its geared HP', () => {
    const bonus = palaceBonus(['core', 'v1'], lookup);
    expect(bonus.hpPct).toBe(1);
    // 1% of the *base* 8,000 is 80, whatever the 10,000 that gear brought it to.
    expect(palaceStats(bonus, 'valor', 8_000)).toEqual({ hp: 130 });
    expect(withPalace(STATS, bonus, 'valor', 8_000).hp).toBe(10_130);
    // Every element gets the core's HP, but only Valor gets Valor's branch.
    expect(palaceStats(bonus, 'faith', 8_000)).toEqual({ hp: 80 });
  });

  it('ignores a node the tree no longer has, rather than throwing on an old save', () => {
    const bonus = palaceBonus(['core', 'v1', 'palace.gone'], lookup);
    expect(bonus.nodes).toBe(2);
    expect(bonus.flat.valor).toEqual({ hp: 50 });
  });
});

describe('the ledger', () => {
  it('counts what is bought and what is left', () => {
    expect(palaceSpent(['core', 'v2'], lookup)).toBe(3);
    expect(palaceLedger(10, ['core', 'v2'], lookup)).toEqual({ earned: 10, spent: 3, available: 7 });
    // A tree bought past what was earned (a balance change that raised a cost) reads as nothing left.
    expect(palaceLedger(2, ['core', 'v2', 'v3'], lookup).available).toBe(0);
  });

  it('opens a node only once everything leading to it is bought', () => {
    const core = lookup('core');
    const v2 = lookup('v2');
    if (!core || !v2) throw new Error('no tree');
    expect(isReachable(core, new Set())).toBe(true);
    expect(isReachable(v2, new Set(['core']))).toBe(false);
    expect(isReachable(v2, new Set(['core', 'v1']))).toBe(true);
  });

  it('says why a node cannot be bought', () => {
    const v2 = lookup('v2');
    if (!v2) throw new Error('no tree');
    expect(nodeState(v2, new Set(['core', 'v1', 'v2']), 9)).toBe('owned');
    expect(nodeState(v2, new Set(['core']), 9)).toBe('unreachable');
    expect(nodeState(v2, new Set(['core', 'v1']), 1)).toBe('tooShort');
    expect(nodeState(v2, new Set(['core', 'v1']), 2)).toBe('ready');
  });
});

describe('where the points come from', () => {
  it('pays a settlement once per difficulty, and remembers which', () => {
    const palace = emptySave();
    const first = awardSettlement(palace, 'intro', 3);
    expect(first.points).toBe(PALACE_POINT_SOURCES.settlement);
    expect(first.paid.settlementsPaid).toEqual([settlementKey('intro', 3)]);

    const paid = { ...palace, settlementsPaid: first.paid.settlementsPaid ?? [] };
    expect(awardSettlement(paid, 'intro', 3).points).toBe(0);
    // The same settlement on another difficulty is another point (36 over the campaign).
    expect(awardSettlement(paid, 'hard', 3).points).toBe(1);
  });

  it('pays the tower every fifth floor, and never the same floor twice', () => {
    const palace = emptySave();
    expect(awardTowerFloor(palace, 1, 4).points).toBe(0);
    const five = awardTowerFloor(palace, 1, 5);
    expect(five.points).toBe(1);
    expect(five.paid.tower).toEqual({ season: 1, floorPaid: 5 });

    const at5 = { ...palace, tower: { season: 1, floorPaid: 5 } };
    expect(awardTowerFloor(at5, 1, 9).points).toBe(0);
    expect(awardTowerFloor(at5, 1, 12).points).toBe(1);
    expect(awardTowerFloor(at5, 1, 25).points).toBe(4);
  });

  it('pays the climb again when the season turns (the owner’s answer)', () => {
    const at30 = { ...emptySave(), tower: { season: 1, floorPaid: 30 } };
    // A new season starts the count over: floor 30 in season 2 is six more points.
    const again = awardTowerFloor(at30, 2, 30);
    expect(again.points).toBe(6);
    expect(again.paid.tower).toEqual({ season: 2, floorPaid: 30 });
    // Opening the screen in a new season before climbing anything pays nothing and rolls the mark.
    const fresh = awardTowerFloor(at30, 2, 0);
    expect(fresh.points).toBe(0);
    expect(fresh.paid.tower).toEqual({ season: 2, floorPaid: 0 });
  });

  it('pays each boss once a period, whatever the boss costs in keys', () => {
    const palace = emptySave();
    const daily = awardBossKill(palace, 'boss.gravemaw', '2026-09-21', 'daily');
    expect(daily.points).toBe(PALACE_POINT_SOURCES.dailyBoss);
    expect(daily.paid.bossesPaid).toEqual({ 'boss.gravemaw': '2026-09-21' });

    const paid = { ...palace, bossesPaid: { 'boss.gravemaw': '2026-09-21' } };
    expect(awardBossKill(paid, 'boss.gravemaw', '2026-09-21', 'daily').points).toBe(0);
    expect(awardBossKill(paid, 'boss.gravemaw', '2026-09-22', 'daily').points).toBe(1);
    // The weekly boss is worth three, and keeps its own mark.
    const weekly = awardBossKill(paid, 'boss.nyxara', '2026-W39', 'weekly');
    expect(weekly.points).toBe(PALACE_POINT_SOURCES.weeklyBoss);
    expect(weekly.paid.bossesPaid).toEqual({ 'boss.gravemaw': '2026-09-21', 'boss.nyxara': '2026-W39' });
  });
});
