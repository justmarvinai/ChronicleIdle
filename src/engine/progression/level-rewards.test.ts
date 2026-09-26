import { describe, expect, it } from 'vitest';
import { LEVEL_GEMS_AMOUNT, LEVEL_GOLD_PER_LEVEL, LEVEL_SACRED_SHARD_LEVELS } from '@content/balance/levels';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { energyCap } from '@engine/economy/energy';
import { levelUpReward, levelUpRewards, mergeLevelRewards } from './level-rewards';

const amount = (reward: { currencies: { currency: string; amount: number }[] }, id: string): number =>
  reward.currencies.find((c) => c.currency === id)?.amount ?? 0;

describe('level rewards (ECONOMY.md §4)', () => {
  it('pays gold every level and the new cap in energy', () => {
    const second = levelUpReward(2);
    expect(amount(second, 'gold')).toBe(LEVEL_GOLD_PER_LEVEL * 2);
    expect(second.energy).toBe(energyCap(2));
    expect(amount(second, 'gems')).toBe(0);
    expect(levelUpReward(37).energy).toBe(energyCap(37));
    expect(amount(levelUpReward(37), 'gold')).toBe(7_400);
  });

  it('pays gems every fifth level, an Ancient Shard every tenth and a Sacred Shard at the milestones', () => {
    expect(amount(levelUpReward(5), 'gems')).toBe(LEVEL_GEMS_AMOUNT);
    expect(amount(levelUpReward(10), 'gems')).toBe(LEVEL_GEMS_AMOUNT);
    expect(amount(levelUpReward(10), 'shard_ancient')).toBe(1);
    expect(amount(levelUpReward(9), 'shard_ancient')).toBe(0);
    for (const level of LEVEL_SACRED_SHARD_LEVELS) {
      expect(amount(levelUpReward(level), 'shard_sacred'), `level ${level}`).toBe(1);
      expect(amount(levelUpReward(level), 'shard_ancient'), `level ${level}`).toBe(1);
    }
    expect(amount(levelUpReward(21), 'shard_sacred')).toBe(0);
  });

  it('names the features a level opens', () => {
    expect(levelUpReward(2).unlocks).toEqual(['tavern_level']);
    expect(levelUpReward(5).unlocks.sort()).toEqual(['auto_repeat_10', 'idle_chest', 'quests_daily']);
    expect(levelUpReward(11).unlocks).toEqual(['instant_clear']);
    expect(levelUpReward(13).unlocks).toEqual(['deeds']);
    expect(levelUpReward(14).unlocks).toEqual([]);
  });

  it('lists every level gained, and never level 1 or past the cap', () => {
    expect(levelUpRewards(1, 1)).toEqual([]);
    expect(levelUpRewards(1, 3).map((r) => r.level)).toEqual([2, 3]);
    expect(levelUpRewards(PLAYER_MAX_LEVEL - 1, PLAYER_MAX_LEVEL + 5).map((r) => r.level)).toEqual([
      PLAYER_MAX_LEVEL,
    ]);
    expect(levelUpRewards(8, 7)).toEqual([]);
  });

  it('merges several levels into one payout', () => {
    const merged = mergeLevelRewards(levelUpRewards(3, 6));
    // Levels 4, 5 and 6: gold for each, gems once (level 5), and three energy refills.
    expect(amount(merged, 'gold')).toBe(LEVEL_GOLD_PER_LEVEL * (4 + 5 + 6));
    expect(amount(merged, 'gems')).toBe(LEVEL_GEMS_AMOUNT);
    expect(merged.energy).toBe(energyCap(4) + energyCap(5) + energyCap(6));
    expect(merged.unlocks).toContain('summoning');
    // The missions are not here: they open with the chronicle at level 1, not at 6.
    expect(merged.unlocks).toContain('quests_daily');
    expect(merged.unlocks).not.toContain('missions');
    expect(mergeLevelRewards([])).toEqual({ energy: 0, currencies: [], unlocks: [] });
  });
});
