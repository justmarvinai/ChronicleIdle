/**
 * The quest boards through the store (docs/design/QUESTS_MISSIONS.md §2–§3, ROADMAP Phase 12
 * acceptance): a claim pays once and only once, the points track fills as quests are claimed, the
 * chests pay at their thresholds with the daily hundred's cadence, and a period that turned over
 * while the game was closed lands exactly one fresh board.
 */
import { describe, expect, it } from 'vitest';
import type { GoalType, QuestPeriod } from '@content/quests/types';
import { bumpCounterId, counter } from '@engine/progression/counters';
import { GOAL_COUNTERS } from '@engine/quests/goals';
import { FixedClock, MS_PER_HOUR } from '@engine/time/clock';
import { applyOfflineElapsed } from './offline';
import { questBoardState, questsClaimable } from './quests';
import { createGameStore } from './store';

/** 2026-09-15 12:00 local — a Tuesday at noon, so both boards are mid-period. */
const T0 = new Date(2026, 8, 15, 12, 0).getTime();

function chronicle({ level = 20 } = {}) {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (state.save) state.save.profile.level = level;
    return state;
  });
  return { clock, store, events, actions: store.getState().actions };
}

type Chronicle = ReturnType<typeof chronicle>;

const save = (c: Chronicle) => c.store.getState().save!;
const held = (c: Chronicle, id: string): number => save(c).wallet[id as 'gold'] ?? 0;
/** The board as the game would show it right now — read against the chronicle's own clock. */
const board = (c: Chronicle, period: QuestPeriod = 'daily') =>
  questBoardState(save(c), period, c.clock.now());

/** Plays the counter a goal reads, without fighting the battle behind it. */
function played(c: Chronicle, key: string, by = 1): void {
  c.store.setState((state) => {
    if (state.save) state.save.stats[key] = (state.save.stats[key] ?? 0) + by;
    return state;
  });
}

/** The counter a goal type measures — the engine's own map, so a test cannot drift from it. */
function counterKeyOf(type: GoalType): string {
  const key = GOAL_COUNTERS[type];
  if (!key) throw new Error(`no counter for ${type}`);
  return key;
}

/** Plays whatever every quest on the board asks for, so the day can be finished in one go. */
function playTheWholeBoard(c: Chronicle): void {
  for (const row of board(c).quests) {
    const goal = row.quest.goal;
    if (goal.type === 'login') continue;
    if (goal.type === 'any' || goal.type === 'gear_reach_level') {
      played(c, 'forge.crafts');
      continue;
    }
    if (goal.type === 'boss_fights') {
      c.store.setState((state) => {
        if (state.save) bumpCounterId(state.save, 'boss.fights.', goal.boss, goal.count);
        return state;
      });
      continue;
    }
    // Every remaining daily goal asks for a count of something, or an amount of energy.
    const asked = 'amount' in goal ? goal.amount : 'count' in goal ? goal.count : 1;
    played(c, counterKeyOf(goal.type), asked);
  }
}

/** Closes the game, opens it a day later: the clock moves and the load rolls the board over. */
function nextDay(c: Chronicle): void {
  const now = c.clock.now() + 24 * MS_PER_HOUR;
  c.clock.set(now);
  const rolled = applyOfflineElapsed(save(c), now);
  c.actions.loadSave(rolled.save, rolled.report);
}

describe('the board a chronicle sees', () => {
  it('opens with the login quest done and nothing else', () => {
    const c = chronicle();
    const view = board(c);
    expect(view.pointsPossible).toBe(100);
    expect(view.points).toBe(0);
    expect(view.claimableQuests).toBe(1);
    expect(view.quests.find((row) => row.quest.goal.type === 'login')?.claimable).toBe(true);
    expect(view.msUntilReset).toBeGreaterThan(0);
    expect(view.msUntilReset).toBeLessThanOrEqual(24 * MS_PER_HOUR);
  });

  it('is closed before the chronicle reaches the level that opens it', () => {
    const c = chronicle({ level: 4 });
    expect(board(c).unlocked).toBe(false);
    expect(board(c).unlockLevel).toBe(5);
    expect(questsClaimable(save(c), T0)).toBe(0);
    const refused = c.actions.claimQuest('daily');
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe('locked');
  });

  it('measures a count goal from the period, not from the chronicle’s whole life', () => {
    const c = chronicle();
    // Five stages cleared *before* the board's baseline was taken finish nothing on it.
    played(c, 'campaign.cleared', 5);
    c.store.setState((state) => {
      if (state.save) state.save.quests.daily.baseline = { ...state.save.stats };
      return state;
    });
    const stages = () => board(c).quests.find((row) => row.quest.goal.type === 'clear_stages')?.progress;
    expect(stages()).toEqual({ progress: 0, target: 5, done: false });
    played(c, 'campaign.cleared', 3);
    expect(stages()).toEqual({ progress: 3, target: 5, done: false });
    played(c, 'campaign.cleared', 2);
    expect(stages()?.done).toBe(true);
  });
});

describe('claiming', () => {
  it('pays the reward and the points once, and refuses the second press', () => {
    const c = chronicle();
    const seen: string[] = [];
    c.events.on((event) => seen.push(event.type));
    const shardsBefore = held(c, 'shard_faded');

    const first = c.actions.claimQuest('daily', 'quest.daily.login');
    if (!first.ok) throw new Error(first.error.message);
    expect(first.value.points).toBe(10);
    expect(first.value.questIds).toEqual(['quest.daily.login']);
    expect(held(c, 'shard_faded')).toBe(shardsBefore + 1);
    expect(board(c).points).toBe(10);
    expect(counter(save(c), 'quests.claimed')).toBe(1);
    expect(seen).toContain('quests.claimed');
    expect(seen).toContain('currency.changed');

    const again = c.actions.claimQuest('daily', 'quest.daily.login');
    expect(again.ok).toBe(false);
    expect(held(c, 'shard_faded')).toBe(shardsBefore + 1);
    expect(board(c).points).toBe(10);
    expect(counter(save(c), 'quests.claimed')).toBe(1);
  });

  it('refuses a quest that is not finished, and one that is not on the board', () => {
    const c = chronicle();
    const gold = held(c, 'gold');
    expect(c.actions.claimQuest('daily', 'quest.daily.clear_stages').ok).toBe(false);
    expect(c.actions.claimQuest('daily', 'quest.daily.nonsense').ok).toBe(false);
    expect(held(c, 'gold')).toBe(gold);
  });

  it('pays energy into the pool rather than into the wallet', () => {
    const c = chronicle();
    const before = save(c).energy.value;
    played(c, 'energy.spent', 60);
    const claim = c.actions.claimQuest('daily', 'quest.daily.spend_energy');
    if (!claim.ok) throw new Error(claim.error.message);
    expect(save(c).energy.value).toBe(before + 40);
    expect(claim.value.changes).toEqual([{ currency: 'energy', delta: 40, total: save(c).energy.value }]);
  });

  it('claims every finished quest at once and leaves the unfinished ones alone', () => {
    const c = chronicle();
    played(c, 'campaign.cleared', 5);
    const all = c.actions.claimQuest('daily');
    if (!all.ok) throw new Error(all.error.message);
    // Login and the five stages; the rest of the day is still to play.
    expect(all.value.questIds).toEqual(['quest.daily.login', 'quest.daily.clear_stages']);
    expect(all.value.points).toBe(20);
    expect(all.value.boardCompleted).toBe(false);
    expect(board(c).points).toBe(20);
    expect(board(c).claimableQuests).toBe(0);
    expect(c.actions.claimQuest('daily').ok).toBe(false);
  });

  it('pays the replacement quest that stands in for what is still locked', () => {
    // At level 5 the board has just opened; the Forge (8) and the Gargoyle (10) are still to
    // come, so the replacement quest carries their twenty points (QUESTS_MISSIONS.md §2).
    const c = chronicle({ level: 5 });
    const replacement = board(c).quests.find((row) => row.quest.id === 'quest.daily.win_battles');
    expect(replacement?.quest.points).toBe(20);
    expect(board(c).pointsPossible).toBe(100);
    expect(board(c).quests.map((row) => row.quest.id)).not.toContain('quest.daily.forge');

    played(c, 'battles.victory', 3);
    const claim = c.actions.claimQuest('daily', 'quest.daily.win_battles');
    if (!claim.ok) throw new Error(claim.error.message);
    expect(claim.value.points).toBe(20);
    expect(board(c).points).toBe(20);
    // Twenty points is the first chest, and the locked quests cost the board nothing.
    expect(
      board(c)
        .chests.filter((chest) => chest.claimable)
        .map((chest) => chest.chest.points),
    ).toEqual([20]);
  });
});

describe('the points track', () => {
  it('pays a chest at its threshold, once, and not before', () => {
    const c = chronicle();
    expect(c.actions.claimQuestChest('daily', 20).ok).toBe(false);

    played(c, 'campaign.cleared', 5);
    c.actions.claimQuest('daily');
    expect(board(c).points).toBe(20);

    const gold = held(c, 'gold');
    const chest = c.actions.claimQuestChest('daily', 20);
    if (!chest.ok) throw new Error(chest.error.message);
    expect(chest.value.cycled).toBe(false);
    expect(held(c, 'gold')).toBe(gold + 3_000);
    expect(counter(save(c), 'quests.chests')).toBe(1);

    expect(c.actions.claimQuestChest('daily', 20).ok).toBe(false);
    expect(held(c, 'gold')).toBe(gold + 3_000);
    // The next rung is still out of reach, and a rung that does not exist is refused outright.
    expect(c.actions.claimQuestChest('daily', 40).ok).toBe(false);
    expect(c.actions.claimQuestChest('daily', 35).ok).toBe(false);
  });

  it('hands over a shard on every third full daily board instead of the gems', () => {
    const c = chronicle();
    for (let day = 1; day <= 3; day += 1) {
      playTheWholeBoard(c);
      const claim = c.actions.claimQuest('daily');
      if (!claim.ok) throw new Error(claim.error.message);
      expect(claim.value.boardCompleted).toBe(true);
      expect(board(c).points).toBe(100);

      const gems = held(c, 'gems');
      const shards = held(c, 'shard_ancient');
      const chest = c.actions.claimQuestChest('daily', 100);
      if (!chest.ok) throw new Error(chest.error.message);
      // Days one and two pay the gems and the tomes; the third pays a shard instead.
      expect(chest.value.cycled).toBe(day % 3 === 0);
      expect(held(c, 'gems')).toBe(day % 3 === 0 ? gems : gems + 30);
      expect(held(c, 'shard_ancient')).toBe(day % 3 === 0 ? shards + 1 : shards);
      // A finished board is the day the weekly quest counts.
      expect(counter(save(c), 'quests.daily.days')).toBe(day);
      nextDay(c);
    }
  });
});

describe('a chronicle that levels up mid-period', () => {
  it('counts the finished day once, even when a new quest appears on it', () => {
    // Level 5: the Forge (8) and the Gargoyle (10) are hidden, so nine rows make the hundred.
    const c = chronicle({ level: 5 });
    playTheWholeBoard(c);
    played(c, 'battles.victory', 3);
    const first = c.actions.claimQuest('daily');
    if (!first.ok) throw new Error(first.error.message);
    expect(first.value.boardCompleted).toBe(true);
    expect(counter(save(c), 'quests.daily.days')).toBe(1);

    // The Forge opens, and with it a quest on a board that was already finished.
    c.store.setState((state) => {
      if (state.save) state.save.profile.level = 8;
      return state;
    });
    played(c, 'forge.crafts');
    const forge = board(c).quests.find((row) => row.quest.id === 'quest.daily.forge');
    expect(forge?.claimable).toBe(true);
    const second = c.actions.claimQuest('daily', 'quest.daily.forge');
    if (!second.ok) throw new Error(second.error.message);
    expect(second.value.boardCompleted).toBe(true);
    // One day is one day: the weekly quest that counts days is not paid twice for it.
    expect(counter(save(c), 'quests.daily.days')).toBe(1);
  });
});

describe('a period that turns over', () => {
  it('lands exactly once when the game was closed across the reset', () => {
    const c = chronicle();
    c.actions.claimQuest('daily', 'quest.daily.login');
    played(c, 'campaign.cleared', 5);
    expect(save(c).quests.daily.claimed).toEqual(['quest.daily.login']);

    // A day later, on load: the board is fresh and baselined against yesterday's play.
    const tomorrow = T0 + 24 * MS_PER_HOUR;
    const weeklyBefore = save(c).quests.weekly;
    const first = applyOfflineElapsed(save(c), tomorrow);
    expect(first.report.questsRolled).toEqual(['daily']);
    expect(first.save.quests.daily.claimed).toEqual([]);
    expect(first.save.quests.daily.periodKey).toBe('2026-09-16');
    expect(first.save.quests.daily.baseline['campaign.cleared']).toBe(5);
    // The weekly board is still the same week, so its record is carried over untouched.
    expect(first.save.quests.weekly).toEqual(weeklyBefore);

    // Running the pass again changes nothing: the stored key already says today.
    const second = applyOfflineElapsed(first.save, tomorrow);
    expect(second.report.questsRolled).toEqual([]);
    expect(second.save.quests.daily).toEqual(first.save.quests.daily);
  });

  it('turns both boards over when a week has passed, and pays the new day’s login again', () => {
    const c = chronicle();
    c.actions.claimQuest('daily', 'quest.daily.login');
    const nextWeek = T0 + 8 * 24 * MS_PER_HOUR;
    const rolled = applyOfflineElapsed(save(c), nextWeek);
    expect(rolled.report.questsRolled).toEqual(['daily', 'weekly']);
    c.clock.set(nextWeek);
    c.actions.loadSave(rolled.save, rolled.report);
    const view = board(c);
    expect(view.points).toBe(0);
    expect(view.quests.find((row) => row.quest.goal.type === 'login')?.claimable).toBe(true);
    const claim = c.actions.claimQuest('daily', 'quest.daily.login');
    expect(claim.ok).toBe(true);
    expect(counter(save(c), 'quests.claimed')).toBe(2);
  });

  it('reads a stale board as a fresh one even before anything writes', () => {
    const c = chronicle();
    c.actions.claimQuest('daily', 'quest.daily.login');
    // Nothing has run the rollover; the read alone must not show yesterday's claim.
    const view = questBoardState(save(c), 'daily', T0 + 24 * MS_PER_HOUR);
    expect(view.points).toBe(0);
    expect(view.periodKey).toBe('2026-09-16');
    expect(save(c).quests.daily.periodKey).toBe('2026-09-15');
    expect(save(c).quests.daily.claimed).toEqual(['quest.daily.login']);
  });

  it('writes the new period on the first claim of the new day', () => {
    const c = chronicle();
    c.actions.claimQuest('daily', 'quest.daily.login');
    c.clock.set(T0 + 24 * MS_PER_HOUR);
    const claim = c.actions.claimQuest('daily', 'quest.daily.login');
    if (!claim.ok) throw new Error(claim.error.message);
    expect(save(c).quests.daily.claimed).toEqual(['quest.daily.login']);
    expect(save(c).quests.daily.periodKey).toBe('2026-09-16');
    expect(counter(save(c), 'quests.claimed')).toBe(2);
  });
});

describe('the dot on the hub', () => {
  it('counts what both boards owe, and nothing once it is all taken', () => {
    const c = chronicle();
    expect(questsClaimable(save(c), T0)).toBe(1);
    c.actions.claimQuest('daily', 'quest.daily.login');
    // Ten points is not a chest yet; the daily board owes nothing until the next quest lands.
    expect(questsClaimable(save(c), T0)).toBe(0);
    played(c, 'campaign.cleared', 60);
    // Five stages on the daily board, sixty on the weekly one.
    expect(questsClaimable(save(c), T0)).toBe(2);
    c.actions.claimQuest('daily');
    c.actions.claimQuest('weekly');
    // Twenty daily points is the first chest; fifteen weekly ones are not enough for its 25.
    expect(questsClaimable(save(c), T0)).toBe(1);
  });
});
