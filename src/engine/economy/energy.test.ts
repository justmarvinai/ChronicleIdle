import { describe, expect, it } from 'vitest';
import { addEnergy, energyCap, msUntilNextEnergy, regenerateEnergy, spendEnergy } from './energy';

const MIN = 60_000;

describe('energy', () => {
  it('caps grow +10 per level from 60', () => {
    expect(energyCap(1)).toBe(60);
    expect(energyCap(10)).toBe(150);
    expect(energyCap(100)).toBe(1050);
  });

  it('regenerates one point per minute and keeps the remainder', () => {
    const s = regenerateEnergy({ value: 10, lastTickAt: 0 }, 1, 2.5 * MIN);
    expect(s).toEqual({ value: 12, lastTickAt: 2 * MIN });
    const capped = regenerateEnergy({ value: 59, lastTickAt: 0 }, 1, 10 * MIN);
    expect(capped).toEqual({ value: 60, lastTickAt: 10 * MIN });
    expect(regenerateEnergy({ value: 60, lastTickAt: 0 }, 1, 5 * MIN)).toEqual({
      value: 60,
      lastTickAt: 5 * MIN,
    });
  });

  it('never regenerates above the cap but rewards overflow without limit', () => {
    const over = addEnergy({ value: 50, lastTickAt: 0 }, 1500, 1, MIN);
    expect(over.value).toBe(1551);
    expect(regenerateEnergy(over, 1, 100 * MIN).value).toBe(1551);
    expect(msUntilNextEnergy(over, 1, 100 * MIN)).toBeNull();
  });

  it('spends and restarts regeneration when dropping below the cap', () => {
    const over = { value: 200, lastTickAt: 0 };
    const spent = spendEnergy(over, 150, 1, 30 * MIN);
    expect(spent.ok).toBe(true);
    if (spent.ok) {
      expect(spent.value).toEqual({ value: 50, lastTickAt: 30 * MIN });
      expect(regenerateEnergy(spent.value, 1, 31 * MIN).value).toBe(51);
    }
    const short = spendEnergy({ value: 3, lastTickAt: 0 }, 4, 1, 0);
    expect(short.ok).toBe(false);
  });

  it('reports the time to the next point', () => {
    expect(msUntilNextEnergy({ value: 10, lastTickAt: 0 }, 1, 15_000)).toBe(45_000);
  });
});
