/**
 * The weekly period's boundary (docs/design/BOSSES.md §1, USER_QUESTIONS.md Q3): the week turns
 * over in the night from Sunday to Monday, at 00:00 local. Nothing runs at midnight — the save
 * carries the period it belongs to and an older one reads as a fresh week (ADR-033) — so these are
 * the promises that make that safe: the key is the same all week, it changes on the stroke, and
 * every number a week holds is back to zero on the other side of it while the records survive.
 */
import { describe, expect, it } from 'vitest';
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { bossPeriodKey, currentPeriod, freshPeriod, msUntilPeriodEnd } from './period';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** 2026-09-14 is a Monday; local time throughout, like every reset in the game. */
const MONDAY = new Date(2026, 8, 14, 0, 0, 0, 0).getTime();
const at = (day: number, hour = 12): number => MONDAY + day * MS_PER_DAY + hour * MS_PER_HOUR;

describe('the weekly boss period', () => {
  it('resets on Monday at midnight, local time', () => {
    expect(new Date(MONDAY).getDay()).toBe(WEEKLY_RESET_WEEKDAY);
    expect(DAILY_RESET_HOUR).toBe(0);
    // The last instant of Sunday and the first of Monday are different weeks.
    expect(bossPeriodKey('weekly', MONDAY - 1)).not.toBe(bossPeriodKey('weekly', MONDAY));
    expect(bossPeriodKey('weekly', MONDAY)).toBe('2026-09-14');
    expect(bossPeriodKey('weekly', MONDAY - 1)).toBe('2026-09-07');
  });

  it('keeps one key for every hour of the week between those strokes', () => {
    const keys = new Set<string>();
    for (let day = 0; day < 7; day += 1)
      for (let hour = 0; hour < 24; hour += 1) keys.add(bossPeriodKey('weekly', at(day, hour)));
    expect([...keys]).toEqual(['2026-09-14']);
    // …and the hour after the week ends belongs to the next one.
    expect(bossPeriodKey('weekly', at(7, 0))).toBe('2026-09-21');
  });

  it('counts down to the stroke, from any moment in the week', () => {
    expect(msUntilPeriodEnd('weekly', MONDAY)).toBe(7 * MS_PER_DAY);
    expect(msUntilPeriodEnd('weekly', at(3, 12))).toBe(3 * MS_PER_DAY + 12 * MS_PER_HOUR);
    // A second before the reset is a second of countdown, never a negative one or a whole week.
    expect(msUntilPeriodEnd('weekly', MONDAY + 7 * MS_PER_DAY - 1_000)).toBe(1_000);
  });

  it('gives back the keys, the pool and the claims on the other side of it', () => {
    const spent = {
      ...freshPeriod('2026-09-14'),
      keysUsed: 3,
      damage: { normal: 900_000, hard: 12_000 },
      claimed: ['normal:2', 'normal:5'],
      records: { normal: { damage: 900_000, at: at(2), team: ['champ.anuria'] } },
    };

    // Still Sunday night: the week's numbers stand.
    const sunday = currentPeriod(spent, 'weekly', at(6, 23));
    expect(sunday.keysUsed).toBe(3);
    expect(sunday.damage['normal']).toBe(900_000);
    expect(sunday.claimed).toEqual(['normal:2', 'normal:5']);

    // One hour later it is Monday: three keys again, an empty pool, nothing claimed — and the
    // personal best, which a reset never costs.
    const monday = currentPeriod(spent, 'weekly', at(7, 0));
    expect(monday.periodKey).toBe('2026-09-21');
    expect(monday.keysUsed).toBe(0);
    expect(monday.damage).toEqual({});
    expect(monday.claimed).toEqual([]);
    expect(monday.records['normal']?.damage).toBe(900_000);
  });
});
