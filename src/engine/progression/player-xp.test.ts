import { describe, expect, it } from 'vitest';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { addPlayerXp, xpToNextLevel } from './player-level';

describe('player XP (ECONOMY.md §4)', () => {
  it('follows the documented curve and ends at the cap', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(10)).toBe(3_981);
    expect(xpToNextLevel(PLAYER_MAX_LEVEL)).toBe(Infinity);
  });

  it('levels while the bar fills and keeps the remainder', () => {
    expect(addPlayerXp({ level: 1, xp: 0 }, 40)).toEqual({ level: 1, xp: 40, levelsGained: 0 });
    expect(addPlayerXp({ level: 1, xp: 0 }, 100)).toEqual({ level: 2, xp: 0, levelsGained: 1 });
    const jump = addPlayerXp({ level: 1, xp: 60 }, 500);
    expect(jump.level).toBe(3);
    expect(jump.levelsGained).toBe(2);
    expect(jump.xp).toBeLessThan(xpToNextLevel(jump.level));
  });

  it('never overflows the bar at the level cap', () => {
    const maxed = addPlayerXp({ level: PLAYER_MAX_LEVEL, xp: 0 }, 1_000_000);
    expect(maxed).toEqual({ level: PLAYER_MAX_LEVEL, xp: 0, levelsGained: 0 });
  });

  it('keeps the XP bar honest: the remainder is always below the next threshold', () => {
    let state = { level: 1, xp: 0 };
    for (let i = 0; i < 200; i += 1) {
      const gain = addPlayerXp(state, 137);
      state = { level: gain.level, xp: gain.xp };
      expect(state.xp).toBeLessThan(xpToNextLevel(state.level));
    }
    expect(state.level).toBeGreaterThan(5);
  });
});
