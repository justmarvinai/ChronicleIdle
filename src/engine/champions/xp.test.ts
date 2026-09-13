import { describe, expect, it } from 'vitest';
import { addChampionXp, canLevel, championXpToNext, championXpTotal } from './xp';

describe('champion XP (ECONOMY.md §3.1)', () => {
  it('follows the documented curve', () => {
    expect(championXpToNext(1)).toBe(25);
    expect(championXpToNext(10)).toBe(1_253);
    expect(championXpToNext(59)).toBe(25_609);
    // The whole climb to 60 is about 572k XP.
    expect(championXpTotal(60)).toBe(572_463);
  });

  it('levels while the bar fills and keeps the remainder', () => {
    const one = addChampionXp({ level: 1, xp: 0, stars: 3 }, 25);
    expect(one).toEqual({ level: 2, xp: 0, levelsGained: 1, wasted: 0 });
    const partial = addChampionXp({ level: 1, xp: 0, stars: 3 }, 30);
    expect(partial).toEqual({ level: 2, xp: 5, levelsGained: 1, wasted: 0 });
    const several = addChampionXp({ level: 1, xp: 0, stars: 3 }, 1_000);
    expect(several).toEqual({ level: 6, xp: 82, levelsGained: 5, wasted: 0 });
  });

  it('stops at the star tier’s cap and reports the overflow', () => {
    const capped = addChampionXp({ level: 30, xp: 0, stars: 3 }, 50_000);
    expect(capped.level).toBe(30);
    expect(capped.levelsGained).toBe(0);
    expect(capped.xp).toBe(0);
    expect(capped.wasted).toBe(50_000);
    expect(canLevel(30, 3)).toBe(false);
    expect(canLevel(30, 4)).toBe(true);
    // A tier below the cap still climbs, and stops exactly at it.
    const climbing = addChampionXp({ level: 19, xp: 0, stars: 2 }, 1_000_000);
    expect(climbing.level).toBe(20);
    expect(climbing.wasted).toBeGreaterThan(0);
  });

  it('ignores nothing and never goes backwards', () => {
    expect(addChampionXp({ level: 5, xp: 100, stars: 6 }, 0)).toEqual({
      level: 5,
      xp: 100,
      levelsGained: 0,
      wasted: 0,
    });
    expect(addChampionXp({ level: 5, xp: 100, stars: 6 }, -50).xp).toBe(100);
  });
});
