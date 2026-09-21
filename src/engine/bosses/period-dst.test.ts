/**
 * The keys come back at midnight *local* time, on the long night and the short one too
 * (docs/design/BOSSES.md §1, ROADMAP Phase 10 acceptance).
 *
 * The suite runs in UTC, which never shifts, so this file asks for a zone that does. `TZ` is set
 * before anything constructs a `Date`, and Vitest isolates the file, so no other test sees it.
 */
process.env['TZ'] = 'Europe/Berlin';

import { describe, expect, it } from 'vitest';
import { BOSS_BY_ID } from '@content/bosses/index';
import { FixedClock, MS_PER_HOUR } from '@engine/time/clock';
import { bossPeriodKey, currentPeriod, freshPeriod, msUntilPeriodEnd, withKeySpent } from './period';

const gargoyle = BOSS_BY_ID['boss.gargoyle'];
if (!gargoyle) throw new Error('no daily boss');

const at = (y: number, m: number, d: number, h: number, min = 0): number =>
  new Date(y, m - 1, d, h, min).getTime();

/** 2027-03-28: the clocks jump 02:00 → 03:00, so the day is 23 hours long. */
const SPRING_FORWARD = { y: 2027, m: 3, d: 28 };
/** 2026-10-25: 03:00 → 02:00, so the day is 25 hours long. */
const FALL_BACK = { y: 2026, m: 10, d: 25 };

describe('a boss period across a daylight-saving change', () => {
  it('is one day long whatever the clocks do', () => {
    const { y, m, d } = SPRING_FORWARD;
    // Every hour of the short day belongs to it, including the one on the far side of the jump.
    expect(bossPeriodKey('daily', at(y, m, d, 1))).toBe('2027-03-28');
    expect(bossPeriodKey('daily', at(y, m, d, 4))).toBe('2027-03-28');
    expect(bossPeriodKey('daily', at(y, m, d, 23, 59))).toBe('2027-03-28');
    expect(bossPeriodKey('daily', at(y, m, d + 1, 0))).toBe('2027-03-29');

    const long = FALL_BACK;
    expect(bossPeriodKey('daily', at(long.y, long.m, long.d, 1))).toBe('2026-10-25');
    expect(bossPeriodKey('daily', at(long.y, long.m, long.d, 23, 59))).toBe('2026-10-25');
    expect(bossPeriodKey('daily', at(long.y, long.m, long.d + 1, 0))).toBe('2026-10-26');
  });

  it('counts down to midnight, not to a fixed 24 hours', () => {
    // The short day: 01:00 to the next midnight is 22 hours of real time, not 23.
    const short = at(SPRING_FORWARD.y, SPRING_FORWARD.m, SPRING_FORWARD.d, 1);
    expect(msUntilPeriodEnd('daily', short)).toBe(22 * MS_PER_HOUR);
    // The long day: the same hour is 24 hours from its midnight.
    const long = at(FALL_BACK.y, FALL_BACK.m, FALL_BACK.d, 1);
    expect(msUntilPeriodEnd('daily', long)).toBe(24 * MS_PER_HOUR);
  });

  it('gives the keys back when the clock passes midnight', () => {
    const clock = new FixedClock(at(SPRING_FORWARD.y, SPRING_FORWARD.m, SPRING_FORWARD.d, 23, 0));
    const spent = withKeySpent(withKeySpent(freshPeriod(bossPeriodKey('daily', clock.now()))));
    expect(currentPeriod(spent, gargoyle.period, clock.now()).keysUsed).toBe(2);

    // An hour later it is the next day: the same stored record reads as a fresh period.
    clock.advance(MS_PER_HOUR);
    const fresh = currentPeriod(spent, gargoyle.period, clock.now());
    expect(fresh.keysUsed).toBe(0);
    expect(fresh.periodKey).toBe('2027-03-29');
    // And it is not the *fight* that resets it: the stored record is untouched.
    expect(spent.keysUsed).toBe(2);
  });
});
