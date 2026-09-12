import { describe, expect, it } from 'vitest';
import { featuresUnlockedAt, isFeatureUnlocked, unlockLevel } from './unlocks';

describe('unlocks', () => {
  it('follows the unlock table', () => {
    expect(isFeatureUnlocked('campaign', 1)).toBe(true);
    expect(isFeatureUnlocked('tavern_level', 1)).toBe(false);
    expect(isFeatureUnlocked('tavern_level', 2)).toBe(true);
    expect(unlockLevel('weekly_boss')).toBe(15);
    expect(featuresUnlockedAt(5).sort()).toEqual(['auto_repeat_10', 'idle_chest', 'quests_daily']);
  });
});
