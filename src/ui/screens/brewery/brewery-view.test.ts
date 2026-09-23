/**
 * What the Brewery screen reads off its content (docs/tech/UI_DESIGN.md §5.23): a hall's week from
 * the game's own week start, a stage's guards and their power, how they stand on a card, and how
 * the roster's best three measure up to them.
 */
import { describe, expect, it } from 'vitest';
import { BREWERY_STAGES } from '@content/balance/brewery';
import { WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { content } from '@content/registry';
import type { EnemyDef } from '@content/enemies/types';
import { bestTeamPower, formation, hallGuards, powerStanding, weekStrip } from './brewery-view';

/** 2026-09-21 12:00, a Monday. */
const MONDAY = new Date(2026, 8, 21, 12, 0).getTime();

const hall = (element: string) => {
  const def = content.breweries.find((one) => one.element === element);
  if (!def) throw new Error(`no ${element} hall`);
  return def;
};

describe('the Brewery’s view of its content', () => {
  it('draws a week from the game’s own week start, with the open days and today', () => {
    const week = weekStrip(hall('eclipse'), MONDAY);
    expect(week).toHaveLength(7);
    expect(week[0]?.weekday).toBe(WEEKLY_RESET_WEEKDAY);
    expect(week.filter((day) => day.open).map((day) => day.weekday)).toEqual(
      [3, 6, 0].sort((a, b) => ((a - WEEKLY_RESET_WEEKDAY + 7) % 7) - ((b - WEEKLY_RESET_WEEKDAY + 7) % 7)),
    );
    expect(week.filter((day) => day.today).map((day) => day.weekday)).toEqual([1]);
    expect(weekStrip(hall('valor'), MONDAY).every((day) => day.open)).toBe(true);
  });

  it('builds every stage’s guards, the captain leading the last, with power rising stage by stage', () => {
    const stages = hallGuards('valor');
    expect(stages).toHaveLength(BREWERY_STAGES);
    const powers = stages.map((stage) => stage?.power ?? 0);
    for (let i = 1; i < powers.length; i += 1) expect(powers[i]).toBeGreaterThan(powers[i - 1] ?? 0);
    const last = stages.at(-1);
    expect(last?.guards.some((guard) => guard.def.boss)).toBe(true);
    expect(stages[0]?.guards.some((guard) => guard.def.boss)).toBe(false);
  });

  it('stands a captain alone at the front, or the first two guards, and everyone else behind', () => {
    const soldier = content.enemies.find((one) => !one.boss);
    const leader = content.enemies.find((one) => one.boss);
    if (!soldier || !leader) throw new Error('no guards to stand');
    const guard = (id: string, from: EnemyDef = soldier): { def: EnemyDef } => ({ def: { ...from, id } });
    const four = [guard('a'), guard('b'), guard('c'), guard('d')];
    expect(formation(four).front.map((one) => one.def.id)).toEqual(['a', 'b']);
    expect(formation(four).back.map((one) => one.def.id)).toEqual(['c', 'd']);
    const led = [guard('cap', leader), guard('x'), guard('y')];
    expect(formation(led).front.map((one) => one.def.id)).toEqual(['cap']);
    expect(formation(led).back.map((one) => one.def.id)).toEqual(['x', 'y']);
  });

  it('measures the best team by its strongest members, and reads it against a stage', () => {
    expect(bestTeamPower([100, 900, 300, 700], 3)).toBe(1900);
    expect(bestTeamPower([500], 3)).toBe(500);
    expect(powerStanding(1200, 1000)).toBe('ahead');
    expect(powerStanding(1000, 1000)).toBe('close');
    expect(powerStanding(800, 1000)).toBe('behind');
  });
});
