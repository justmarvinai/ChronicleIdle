/**
 * The boards are the promise (docs/design/QUESTS_MISSIONS.md §2–§3, ROADMAP Phase 12 acceptance):
 * ten dailies and eight weeklies as the design prints them, a hundred points reachable at every
 * unlock state, and a chest ladder that ends on the full board. The generic shape checks live in
 * the content validator; these are the numbers.
 */
import { describe, expect, it } from 'vitest';
import { FEATURE_IDS, FEATURE_UNLOCK_LEVEL, PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import { visibleQuests } from '@engine/quests/board';
import { QUEST_BOARDS } from './index';

const daily = content.questBoard('daily');
const weekly = content.questBoard('weekly');

describe('the daily board', () => {
  it('is ten quests of ten points, on the ladder the design prints', () => {
    expect(daily.quests).toHaveLength(10);
    expect(daily.quests.map((quest) => quest.points)).toEqual(Array.from({ length: 10 }, () => 10));
    expect(daily.chests.map((chest) => chest.points)).toEqual([20, 40, 60, 80, 100]);
    expect(daily.feature).toBe('quests_daily');
  });

  it('pays a shard on every third full board instead of the gems', () => {
    const last = daily.chests[daily.chests.length - 1];
    expect(last?.cycle).toEqual({ every: 3, instead: [{ currency: 'shard_ancient', amount: 1 }] });
  });

  it('asks for the day the design asks for', () => {
    const goals = new Map(daily.quests.map((quest) => [quest.id, quest.goal]));
    expect(goals.get('quest.daily.login')).toEqual({ type: 'login' });
    expect(goals.get('quest.daily.clear_stages')).toEqual({ type: 'clear_stages', count: 5 });
    expect(goals.get('quest.daily.spend_energy')).toEqual({ type: 'spend_energy', amount: 60 });
    expect(goals.get('quest.daily.daily_boss')).toEqual({
      type: 'boss_fights',
      boss: 'boss.gravemaw',
      count: 2,
    });
    // Either bench of the Forge answers the last one.
    expect(goals.get('quest.daily.forge')).toEqual({
      type: 'any',
      goals: [
        { type: 'craft', count: 1 },
        { type: 'dismantle', count: 1 },
      ],
    });
  });
});

describe('the weekly board', () => {
  it('is eight quests worth a hundred between them', () => {
    expect(weekly.quests).toHaveLength(8);
    expect(weekly.quests.reduce((sum, quest) => sum + quest.points, 0)).toBe(100);
    expect(weekly.chests.map((chest) => chest.points)).toEqual([25, 50, 75, 100]);
    expect(weekly.feature).toBe('quests_weekly');
  });

  it('counts each gate’s keys separately', () => {
    const goals = weekly.quests.map((quest) => quest.goal);
    expect(goals).toContainEqual({ type: 'boss_fights', boss: 'boss.gravemaw', count: 10 });
    expect(goals).toContainEqual({ type: 'boss_fights', boss: 'boss.nyxara', count: 3 });
  });

  it('asks for a piece at +12 as a state, not as levels spent', () => {
    expect(weekly.quests.map((quest) => quest.goal)).toContainEqual({
      type: 'gear_reach_level',
      level: 12,
      count: 1,
    });
  });
});

describe('a hundred points, whatever is unlocked', () => {
  // Every level a feature opens at, the board's own level and the cap: the states a chronicle
  // actually passes through.
  const levels = [...new Set(FEATURE_IDS.map((feature) => FEATURE_UNLOCK_LEVEL[feature]))]
    .concat(PLAYER_MAX_LEVEL)
    .sort((a, b) => a - b);

  for (const board of QUEST_BOARDS) {
    it(`${board.period}: the board always totals a hundred`, () => {
      const open = FEATURE_UNLOCK_LEVEL[board.feature];
      for (const level of levels.filter((level) => level >= open)) {
        const total = visibleQuests(board, level).reduce((sum, quest) => sum + quest.points, 0);
        expect(total, `level ${level}`).toBe(100);
      }
    });

    it(`${board.period}: a chronicle that has just unlocked it sees the replacement`, () => {
      const open = FEATURE_UNLOCK_LEVEL[board.feature];
      const visible = visibleQuests(board, open);
      const replacement = visible.find((quest) => quest.id === board.replacement.id);
      expect(replacement, 'the replacement stands in').toBeDefined();
      // It carries exactly what the hidden quests were worth, and no quest it replaces is shown.
      const hidden = board.quests.filter(
        (quest) => quest.feature !== null && FEATURE_UNLOCK_LEVEL[quest.feature] > open,
      );
      expect(replacement?.points).toBe(hidden.reduce((sum, quest) => sum + quest.points, 0));
      for (const quest of hidden) expect(visible.map((v) => v.id)).not.toContain(quest.id);
    });

    it(`${board.period}: a finished chronicle sees every quest and no replacement`, () => {
      const visible = visibleQuests(board, PLAYER_MAX_LEVEL);
      expect(visible.map((quest) => quest.id)).toEqual(board.quests.map((quest) => quest.id));
    });
  }
});
