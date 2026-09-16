/**
 * Every goal type the quests use, measured (docs/design/QUESTS_MISSIONS.md §1, ROADMAP Phase 12
 * acceptance). Two promises run through all of them: a counter goal measures only what happened
 * *this* period, and a state predicate reads the chronicle as it stands. Yesterday's play must
 * never complete today's quest, and a quest must never un-complete itself.
 */
import { describe, expect, it } from 'vitest';
import type { Goal } from '@content/quests/types';
import { COUNTER_KEYS, isCounterKey } from '@engine/progression/counters';
import { GOAL_COUNTERS, evaluateGoal, goalCounterKeys, type GoalContext } from './goals';

/** A chronicle with the given counters and nothing in the racks. */
function ctx(stats: Record<string, number>, baseline: Record<string, number> = {}): GoalContext {
  return {
    save: { stats, inventory: {}, profile: { level: 1 } as GoalContext['save']['profile'] },
    baseline,
  };
}

describe('counter goals measure the period, not the chronicle', () => {
  const goal: Goal = { type: 'clear_stages', count: 5 };

  it('starts at zero however much came before', () => {
    // Four hundred stages cleared in the past; the period began with all of them behind it.
    const view = evaluateGoal(goal, ctx({ 'campaign.cleared': 400 }, { 'campaign.cleared': 400 }));
    expect(view).toEqual({ progress: 0, target: 5, done: false });
  });

  it('counts what the period added', () => {
    expect(evaluateGoal(goal, ctx({ 'campaign.cleared': 403 }, { 'campaign.cleared': 400 }))).toEqual({
      progress: 3,
      target: 5,
      done: false,
    });
  });

  it('completes on the target and never reports past it', () => {
    const view = evaluateGoal(goal, ctx({ 'campaign.cleared': 411 }, { 'campaign.cleared': 400 }));
    expect(view).toEqual({ progress: 5, target: 5, done: true });
  });

  it('never goes negative, whatever a baseline says', () => {
    // A save edited by hand, or a counter that was renamed: the row reads zero, not minus.
    expect(evaluateGoal(goal, ctx({ 'campaign.cleared': 1 }, { 'campaign.cleared': 9 })).progress).toBe(0);
  });
});

describe('each goal type reads the counter it names', () => {
  const cases: { goal: Goal; stats: Record<string, number>; progress: number; target: number }[] = [
    { goal: { type: 'win_battles', count: 3 }, stats: { 'battles.victory': 2 }, progress: 2, target: 3 },
    { goal: { type: 'win_manual', count: 1 }, stats: { 'battles.won.manual': 1 }, progress: 1, target: 1 },
    { goal: { type: 'spend_energy', amount: 60 }, stats: { 'energy.spent': 44 }, progress: 44, target: 60 },
    {
      goal: { type: 'level_champion_times', count: 3 },
      stats: { 'tavern.levelUps': 3 },
      progress: 3,
      target: 3,
    },
    { goal: { type: 'rank_up_times', count: 1 }, stats: { 'tavern.rankUps': 0 }, progress: 0, target: 1 },
    {
      goal: { type: 'skill_upgrades', count: 2 },
      stats: { 'tavern.skillUpgrades': 5 },
      progress: 2,
      target: 2,
    },
    { goal: { type: 'gear_levels', count: 5 }, stats: { 'gear.levels': 4 }, progress: 4, target: 5 },
    { goal: { type: 'craft', count: 1 }, stats: { 'forge.crafts': 1 }, progress: 1, target: 1 },
    { goal: { type: 'dismantle', count: 1 }, stats: { 'forge.dismantles': 2 }, progress: 1, target: 1 },
    { goal: { type: 'summon', count: 10 }, stats: { 'summon.pulls': 10 }, progress: 10, target: 10 },
    { goal: { type: 'claim_idle', count: 7 }, stats: { 'idle.claims': 3 }, progress: 3, target: 7 },
    {
      goal: { type: 'complete_daily_quests_days', count: 5 },
      stats: { 'quests.daily.days': 2 },
      progress: 2,
      target: 5,
    },
  ];

  for (const { goal, stats, progress, target } of cases) {
    it(`${goal.type}`, () => {
      expect(evaluateGoal(goal, ctx(stats))).toEqual({ progress, target, done: progress >= target });
    });
  }

  it('counts a boss by its own id, so one gate does not feed the other', () => {
    const goal: Goal = { type: 'boss_fights', boss: 'boss.nyxara', count: 3 };
    const stats = { 'boss.fights': 12, 'boss.fights.boss.gravemaw': 10, 'boss.fights.boss.nyxara': 2 };
    expect(evaluateGoal(goal, ctx(stats))).toEqual({ progress: 2, target: 3, done: false });
  });
});

describe('goals that read a state rather than a count', () => {
  it('login is its own proof', () => {
    expect(evaluateGoal({ type: 'login' }, ctx({}))).toEqual({ progress: 1, target: 1, done: true });
  });

  it('gear_reach_level looks at the racks, not at what was levelled', () => {
    const goal: Goal = { type: 'gear_reach_level', level: 12, count: 1 };
    const inventory = {
      a: { level: 8 },
      b: { level: 12 },
    } as unknown as GoalContext['save']['inventory'];
    const withPiece: GoalContext = {
      save: { stats: {}, inventory, profile: { level: 1 } as never },
      baseline: {},
    };
    expect(evaluateGoal(goal, withPiece).done).toBe(true);
    // And it does not care that the levelling happened before the period began.
    expect(evaluateGoal(goal, { ...withPiece, baseline: { 'gear.levels': 999 } }).done).toBe(true);
    expect(evaluateGoal(goal, ctx({})).done).toBe(false);
  });
});

describe('a goal with several ways to finish', () => {
  const either: Goal = {
    type: 'any',
    goals: [
      { type: 'craft', count: 1 },
      { type: 'dismantle', count: 1 },
    ],
  };

  it('reports the closest of them', () => {
    expect(evaluateGoal(either, ctx({ 'forge.dismantles': 1 }))).toEqual({
      progress: 1,
      target: 1,
      done: true,
    });
    expect(evaluateGoal(either, ctx({}))).toEqual({ progress: 0, target: 1, done: false });
  });

  it('is done when either side is', () => {
    expect(evaluateGoal(either, ctx({ 'forge.crafts': 3 })).done).toBe(true);
  });
});

describe('the counters a period has to snapshot', () => {
  it('names one key per counter goal, boss keys included', () => {
    const goals: Goal[] = [
      { type: 'login' },
      { type: 'clear_stages', count: 5 },
      { type: 'boss_fights', boss: 'boss.gravemaw', count: 2 },
      { type: 'gear_reach_level', level: 12, count: 1 },
      {
        type: 'any',
        goals: [
          { type: 'craft', count: 1 },
          { type: 'dismantle', count: 1 },
        ],
      },
    ];
    expect(goalCounterKeys(goals)).toEqual([
      'boss.fights.boss.gravemaw',
      'campaign.cleared',
      'forge.crafts',
      'forge.dismantles',
    ]);
  });

  it('only ever names counters the game writes', () => {
    for (const key of Object.values(GOAL_COUNTERS)) {
      expect(isCounterKey(key), key).toBe(true);
      expect(COUNTER_KEYS).toContain(key);
    }
  });
});
