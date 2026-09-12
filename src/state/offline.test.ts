import { describe, expect, it } from 'vitest';
import { createNewGame } from '@engine/save/new-game';
import { applyOfflineElapsed } from './offline';

describe('applyOfflineElapsed', () => {
  it('regenerates energy and flags day/week changes', () => {
    const start = new Date(2026, 8, 13, 22, 0).getTime(); // Sunday 22:00
    const save = { ...createNewGame({ name: 'A', now: start, seedRoot: 's' }), energy: { value: 10, lastTickAt: start } };
    const later = start + 3 * 3_600_000; // Monday 01:00
    const { save: next, report } = applyOfflineElapsed(save, later);
    expect(report.energyGained).toBe(50); // capped at 60
    expect(next.energy.value).toBe(60);
    expect(report.newDay).toBe(true);
    expect(report.newWeek).toBe(true);
    const again = applyOfflineElapsed(next, later);
    expect(again.report.energyGained).toBe(0);
    expect(again.report.newDay).toBe(false);
  });
});
