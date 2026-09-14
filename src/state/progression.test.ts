import { describe, expect, it } from 'vitest';
import { MILESTONE_CHESTS } from '@content/balance/campaign';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import type { BattleOutcome, UnitReport } from '@engine/battle/types';
import { energyCap } from '@engine/economy/energy';
import { levelUpReward } from '@engine/progression/level-rewards';
import { xpToNextLevel } from '@engine/progression/player-level';
import { createNewGame } from '@engine/save/new-game';
import { FixedClock } from '@engine/time/clock';
import { applyRunFinish, applyRunStart } from './campaign';
import { applyPlayerXp, canWearTitle, mergeLevelUps, titlesOf, NO_LEVEL_UP } from './progression';
import { createGameStore } from './store';

const T0 = new Date(2026, 8, 12, 12, 0).getTime();

const save = (): ReturnType<typeof createNewGame> =>
  createNewGame({ name: 'Tester', now: T0, seedRoot: 'progression' });

const walletOf = (
  s: ReturnType<typeof createNewGame>,
  currency: 'gold' | 'gems' | 'shard_ancient' | 'shard_sacred',
) => s.wallet[currency];

describe('applyPlayerXp', () => {
  it('does nothing to the level while the bar is filling', () => {
    const s = save();
    const gold = s.wallet.gold;
    const result = applyPlayerXp(s, xpToNextLevel(1) - 1, T0);
    expect(result).toEqual(NO_LEVEL_UP);
    expect(s.profile.level).toBe(1);
    expect(s.profile.xp).toBe(xpToNextLevel(1) - 1);
    expect(s.wallet.gold).toBe(gold);
  });

  it('pays the level and tops the energy up by the new cap', () => {
    const s = save();
    s.energy = { value: 12, lastTickAt: T0 };
    const gold = s.wallet.gold;
    const result = applyPlayerXp(s, xpToNextLevel(1), T0);
    expect(s.profile.level).toBe(2);
    expect(s.profile.xp).toBe(0);
    expect(result.levels).toHaveLength(1);
    expect(result.levels[0]).toEqual(levelUpReward(2));
    expect(s.wallet.gold).toBe(gold + 400);
    // The refill is the *new* cap, added on top of what was left (owner's answer Q15).
    expect(energyCap(2)).toBe(70);
    expect(s.energy.value).toBe(82);
    expect(result.changes).toContainEqual({ currency: 'energy', delta: 70, total: 82 });
  });

  it('lets a refill overflow the cap and keeps it there', () => {
    const s = save();
    expect(s.energy.value).toBe(energyCap(1));
    applyPlayerXp(s, xpToNextLevel(1), T0);
    expect(s.energy.value).toBe(60 + 70);
    expect(s.energy.value).toBeGreaterThan(energyCap(s.profile.level));
  });

  it('merges several levels crossed at once into one payout', () => {
    const s = save();
    const gold = s.wallet.gold;
    const gems = s.wallet.gems;
    let xp = 0;
    for (let level = 1; level < 10; level += 1) xp += xpToNextLevel(level);
    const result = applyPlayerXp(s, xp, T0);
    expect(s.profile.level).toBe(10);
    expect(result.levels.map((l) => l.level)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // 200 per level for levels 2..10, 50 gems at 5 and at 10, one Ancient Shard at 10.
    expect(walletOf(s, 'gold')).toBe(gold + 200 * (2 + 3 + 4 + 5 + 6 + 7 + 8 + 9 + 10));
    expect(walletOf(s, 'gems')).toBe(gems + 100);
    expect(walletOf(s, 'shard_ancient')).toBe(1);
    expect(result.changes.find((c) => c.currency === 'energy')?.delta).toBe(
      [2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((sum, level) => sum + energyCap(level), 0),
    );
  });

  it('opens the features a level reaches', () => {
    const s = save();
    let xp = 0;
    for (let level = 1; level < 5; level += 1) xp += xpToNextLevel(level);
    const result = applyPlayerXp(s, xp, T0);
    expect(result.unlocks.length).toBeGreaterThan(0);
    expect(result.unlocks).toEqual(result.levels.flatMap((l) => l.unlocks));
  });

  it('stops at the last level and pays nothing beyond it', () => {
    const s = save();
    s.profile.level = PLAYER_MAX_LEVEL;
    const gold = s.wallet.gold;
    const result = applyPlayerXp(s, 10_000_000, T0);
    expect(s.profile.level).toBe(PLAYER_MAX_LEVEL);
    expect(s.profile.xp).toBe(0);
    expect(result).toEqual(NO_LEVEL_UP);
    expect(s.wallet.gold).toBe(gold);
  });

  it('reports the titles the levels earned', () => {
    const s = save();
    expect(titlesOf(s)).toEqual(['title.chronicler']);
    s.profile.level = 24;
    const result = applyPlayerXp(s, xpToNextLevel(24), T0);
    expect(s.profile.level).toBe(25);
    expect(result.titlesEarned).toEqual(['title.seasoned']);
    expect(titlesOf(s)).toContain('title.seasoned');
  });
});

describe('titles', () => {
  it('are derived, so only earned ones can be worn', () => {
    const s = save();
    expect(canWearTitle(s, 'title.chronicler')).toBe(true);
    expect(canWearTitle(s, 'title.loremaster')).toBe(false);
    expect(canWearTitle(s, 'title.nonsense')).toBe(false);
  });

  it('follow the campaign as well as the level', () => {
    const s = save();
    expect(titlesOf(s)).not.toContain('title.gatebreaker');
    for (const stage of content.stages) s.campaign.stars[`${stage.id}|intro`] = 1;
    expect(titlesOf(s)).toContain('title.gatebreaker');
    expect(titlesOf(s)).toContain('title.wayfarer');
    // All-3★ is a harder bar than cleared.
    expect(titlesOf(s)).not.toContain('title.warden_of_veyrath');
  });
});

describe('mergeLevelUps', () => {
  it('adds the deltas and keeps the newest totals', () => {
    const a = applyPlayerXp(save(), xpToNextLevel(1), T0);
    const s = save();
    s.profile.level = 2;
    const b = applyPlayerXp(s, xpToNextLevel(2), T0);
    const merged = mergeLevelUps(a, b);
    expect(merged.levels.map((l) => l.level)).toEqual([2, 3]);
    const gold = merged.changes.find((c) => c.currency === 'gold');
    expect(gold?.delta).toBe(400 + 600);
    expect(gold?.total).toBe(b.changes.find((c) => c.currency === 'gold')?.total);
  });

  it('returns the other side untouched when one is empty', () => {
    const b = applyPlayerXp(save(), xpToNextLevel(1), T0);
    expect(mergeLevelUps(NO_LEVEL_UP, b)).toBe(b);
    expect(mergeLevelUps(b, NO_LEVEL_UP)).toBe(b);
  });
});

const ally = (instanceId: string): UnitReport => ({
  unitId: 'a0',
  defId: 'champ.ser_corvin',
  instanceId,
  side: 'ally',
  alive: true,
  died: false,
  damageDealt: 0,
  damageTaken: 0,
  healingDone: 0,
  kills: 0,
});

const victory = (party: readonly string[]): BattleOutcome => ({
  kind: 'victory',
  turns: 20,
  allyTurns: 9,
  wavesCleared: 2,
  waveCount: 2,
  units: party.map(ally),
  enemyHpLeft: 0,
  seed: 'seed',
  decisions: [],
});

function chronicle() {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Tester');
  actions.chooseStarter('champ.ser_corvin');
  return { clock, store, events, actions: store.getState().actions };
}

describe('milestone chests', () => {
  const LAST = { settlement: 12, stage: 10, difficulty: 'normal' } as const;

  /** Three stars everywhere on `difficulty` except the last stand. */
  function allButLast(store: ReturnType<typeof chronicle>['store'], difficulty: 'normal' | 'hard'): void {
    store.setState((state) => {
      if (!state.save) return state;
      for (const stage of content.stages) {
        state.save.campaign.stars[`${stage.id}|${difficulty}`] = 3;
        state.save.campaign.bestTurns[`${stage.id}|${difficulty}`] = 10;
      }
      delete state.save.campaign.stars['stage.12.10|normal'];
      delete state.save.campaign.stars['stage.12.10|hard'];
      state.save.energy.value = 2_000;
      return state;
    });
  }

  it('pays on the run that takes the difficulty to all three stars, and never again', () => {
    const { store, actions } = chronicle();
    const party = Object.keys(store.getState().save!.roster).slice(0, 3);
    actions.debugClearCampaign('intro', 3);
    allButLast(store, 'normal');
    const gemsBefore = store.getState().save!.wallet.gems;
    const sacredBefore = store.getState().save!.wallet.shard_sacred;

    const started = actions.startCampaignRun(LAST);
    if (!started.ok) throw new Error(started.error.message);
    const finished = actions.finishCampaignRun({
      pointer: LAST,
      cost: started.value.cost,
      runIndex: started.value.runIndex,
      outcome: victory(party),
      party,
      now: T0,
    });
    if (!finished.ok) throw new Error('finish');
    const chest = MILESTONE_CHESTS.normal;
    expect(chest).not.toBeNull();
    expect(finished.value.rewards?.milestone).toEqual(chest);
    // The stand's own star chests pay as well, so the chest is a floor, not the whole purse.
    expect(store.getState().save!.wallet.gems).toBeGreaterThanOrEqual(gemsBefore + (chest?.gems ?? 0));
    const sacredAfter = store.getState().save!.wallet.shard_sacred;
    expect(sacredAfter).toBeGreaterThanOrEqual(sacredBefore + 2);

    // A repeat of the same stand is just another run.
    const again = actions.startCampaignRun(LAST);
    if (!again.ok) throw new Error('start again');
    const repeat = actions.finishCampaignRun({
      pointer: LAST,
      cost: again.value.cost,
      runIndex: again.value.runIndex,
      outcome: victory(party),
      party,
      now: T0,
    });
    if (!repeat.ok) throw new Error('finish again');
    expect(repeat.value.rewards?.milestone).toBeNull();
    // Nothing in the campaign drops a Sacred Shard, so the repeat adds none.
    expect(store.getState().save!.wallet.shard_sacred).toBe(sacredAfter);
  });

  it('gives Hard its own chest and the title that comes with it', () => {
    const s = save();
    s.energy = { value: 2_000, lastTickAt: T0 };
    s.roster = {};
    for (const stage of content.stages) {
      for (const difficulty of ['intro', 'normal', 'hard'] as const) {
        s.campaign.stars[`${stage.id}|${difficulty}`] = 3;
        s.campaign.bestTurns[`${stage.id}|${difficulty}`] = 10;
      }
    }
    delete s.campaign.stars['stage.12.10|hard'];
    delete s.campaign.bestTurns['stage.12.10|hard'];
    expect(titlesOf(s)).not.toContain('title.warden_of_veyrath');

    const pointer = { settlement: 12, stage: 10, difficulty: 'hard' } as const;
    const started = applyRunStart(s, pointer, T0);
    if (!started.ok) throw new Error(started.error.message);
    const finished = applyRunFinish(s, {
      pointer,
      cost: started.value.cost,
      runIndex: started.value.runIndex,
      outcome: victory([]),
      party: [],
      now: T0,
    });
    if (!finished.ok) throw new Error('finish');
    expect(finished.value.rewards?.milestone).toEqual(MILESTONE_CHESTS.hard);
    expect(s.wallet.shard_primordial).toBeGreaterThanOrEqual(1);
    expect(titlesOf(s)).toContain('title.warden_of_veyrath');
  });
});

describe('the store surfaces a level-up', () => {
  it('queues the celebration and wears an earned title', () => {
    const { store, actions } = chronicle();
    expect(store.getState().ui.levelUp).toBeNull();
    const result = actions.grantPlayerXp(xpToNextLevel(1), 'debug');
    expect(result.levels).toHaveLength(1);
    expect(store.getState().ui.levelUp?.levels).toHaveLength(1);
    expect(store.getState().save!.profile.level).toBe(2);

    actions.grantPlayerXp(xpToNextLevel(2), 'debug');
    // Two runs of levels merge into the one celebration the player has not seen yet.
    expect(store.getState().ui.levelUp?.levels.map((l) => l.level)).toEqual([2, 3]);
    actions.clearLevelUp();
    expect(store.getState().ui.levelUp).toBeNull();

    expect(actions.setTitle('title.loremaster').ok).toBe(false);
    expect(actions.setTitle('title.chronicler').ok).toBe(true);
    expect(store.getState().save!.profile.title).toBe('title.chronicler');
    expect(actions.setTitle(null).ok).toBe(true);
    expect(store.getState().save!.profile.title).toBeNull();
  });

  it('announces the level and what it opened', () => {
    const { store, actions, events } = chronicle();
    const seen: string[] = [];
    events.on((e) => seen.push(e.type));
    actions.grantPlayerXp(xpToNextLevel(1), 'debug');
    expect(seen).toContain('player.leveled');
    expect(store.getState().ui.levelUp?.unlocks).toEqual(
      store.getState().ui.levelUp?.levels.flatMap((l) => l.unlocks),
    );
  });
});
