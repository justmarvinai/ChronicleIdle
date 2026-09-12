import { describe, expect, it } from 'vitest';
import { FixedClock, dailyKey, formatDuration, msUntilDailyReset, msUntilWeeklyReset, weeklyKey } from './clock';

const local = (y: number, m: number, d: number, h = 0, min = 0): number => new Date(y, m - 1, d, h, min).getTime();

describe('clock periods', () => {
  it('daily key changes exactly at the reset hour', () => {
    expect(dailyKey(local(2026, 9, 12, 23, 59), 0)).toBe('2026-09-12');
    expect(dailyKey(local(2026, 9, 13, 0, 0), 0)).toBe('2026-09-13');
    expect(dailyKey(local(2026, 9, 13, 3, 59), 4)).toBe('2026-09-12');
  });

  it('weekly key starts on Monday 00:00', () => {
    // 2026-09-14 is a Monday.
    expect(weeklyKey(local(2026, 9, 13, 23, 59), 0, 1)).toBe('2026-09-07');
    expect(weeklyKey(local(2026, 9, 14, 0, 0), 0, 1)).toBe('2026-09-14');
    expect(weeklyKey(local(2026, 9, 20, 12, 0), 0, 1)).toBe('2026-09-14');
  });

  it('computes time until resets', () => {
    expect(msUntilDailyReset(local(2026, 9, 12, 22, 0), 0)).toBe(2 * 3_600_000);
    expect(msUntilWeeklyReset(local(2026, 9, 13, 22, 0), 0, 1)).toBe(2 * 3_600_000);
    expect(msUntilWeeklyReset(local(2026, 9, 14, 0, 0), 0, 1)).toBe(7 * 86_400_000);
  });

  it('formats durations compactly', () => {
    expect(formatDuration(45_000)).toBe('45s');
    expect(formatDuration(65_000)).toBe('1m 05s');
    expect(formatDuration(3_600_000 * 5 + 60_000 * 7)).toBe('5h 07m');
    expect(formatDuration(86_400_000 * 2 + 3_600_000 * 3)).toBe('2d 3h');
  });

  it('FixedClock advances', () => {
    const clock = new FixedClock(1000);
    clock.advance(500);
    expect(clock.now()).toBe(1500);
  });
});
