import { describe, expect, it } from 'vitest';
import type { ChampionStats } from '@content/champions/types';
import {
  baseStars,
  baseStats,
  expectedStats,
  levelCap,
  maxStars,
  power,
  statAt,
  statDeviation,
} from './stats';
import { canLevel, championXpToNext, championXpTotal } from './xp';

const ANURIA: ChampionStats = {
  hp: 13_200,
  atk: 1_480,
  def: 880,
  spd: 104,
  critRate: 15,
  critDmg: 60,
  res: 25,
  acc: 10,
};

describe('stat scaling', () => {
  it('returns the authored value at 6★ level 60 and ≈ 20 % for a fresh 3★ Rare', () => {
    expect(statAt(13_200, 6, 60)).toBe(13_200);
    expect(statAt(1_000, 3, 1)).toBe(Math.round(1_000 * 0.36 * 0.55));
    expect(statAt(1_000, 3, 1) / 1_000).toBeCloseTo(0.198, 3);
  });

  it('is monotonic in level and stars and clamps out-of-range inputs', () => {
    let previous = 0;
    for (let level = 1; level <= 40; level++) {
      const value = statAt(10_000, 4, level);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(statAt(10_000, 4, 40)).toBe(statAt(10_000, 4, 99));
    expect(statAt(10_000, 4, 40)).toBeLessThan(statAt(10_000, 5, 40));
    expect(statAt(10_000, 0, 1)).toBe(statAt(10_000, 1, 1));
    expect(levelCap(3)).toBe(30);
    expect(levelCap(6)).toBe(60);
  });

  it('keeps flat stats untouched and rates power by the documented weights', () => {
    const stats = baseStats(ANURIA, 4, 1);
    expect(stats.spd).toBe(104);
    expect(stats.critDmg).toBe(60);
    expect(stats.hp).toBe(statAt(13_200, 4, 1));
    const full = baseStats(ANURIA, 6, 60);
    expect(power(full)).toBe(
      Math.round(13_200 * 0.05 + 1_480 + 880 + 104 * 10 + 15 * 8 + 60 * 3 + 25 * 2 + 10 * 2),
    );
  });

  it('measures deviation from the role template × rarity budget', () => {
    expect(expectedStats('attack', 'epic')).toEqual({ hp: 13_500, atk: 1_450, def: 900 });
    const dev = statDeviation(ANURIA, 'attack', 'epic');
    expect(dev.hp).toBeLessThan(0.15);
    expect(dev.atk).toBeLessThan(0.15);
    expect(dev.def).toBeLessThan(0.15);
    expect(baseStars('rare')).toBe(3);
    expect(maxStars('common')).toBe(2);
  });
});

describe('champion xp', () => {
  it('follows round(25 × L^1.7) and sums to ≈ 583k at 60', () => {
    expect(championXpToNext(1)).toBe(25);
    expect(championXpToNext(10)).toBe(Math.round(25 * Math.pow(10, 1.7)));
    const total = championXpTotal(60);
    expect(total).toBeGreaterThan(560_000);
    expect(total).toBeLessThan(610_000);
    expect(canLevel(30, 3)).toBe(false);
    expect(canLevel(29, 3)).toBe(true);
  });
});
