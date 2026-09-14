import { describe, expect, it } from 'vitest';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import type { BattleOutcome, UnitReport } from '@engine/battle/types';
import { nextStage } from '@engine/campaign/progress';
import { saveSchema } from '@engine/schema/save';
import { FixedClock } from '@engine/time/clock';
import { createMemoryStorage } from '@platform/storage';
import { bootGame } from './boot';
import { availableDifficulties, currentPointer, pointerCost, runsAffordable } from './campaign';
import { startPersistence } from './persistence';
import { createGameStore } from './store';

const T0 = new Date(2026, 8, 12, 12, 0).getTime();
const STAGE_1 = { settlement: 1, stage: 1, difficulty: 'intro' } as const;

function chronicle(now = T0) {
  const clock = new FixedClock(now);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Tester');
  actions.chooseStarter('champ.ser_corvin');
  return { clock, store, events, actions: store.getState().actions };
}

const ally = (instanceId: string, over: Partial<UnitReport> = {}): UnitReport => ({
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
  ...over,
});

const victory = (party: readonly string[], over: Partial<BattleOutcome> = {}): BattleOutcome => ({
  kind: 'victory',
  turns: 20,
  allyTurns: 9,
  wavesCleared: 2,
  waveCount: 2,
  units: party.map((id) => ally(id)),
  enemyHpLeft: 0,
  seed: 'seed',
  decisions: [],
  ...over,
});

describe('campaign runs through the store', () => {
  it('charges the run once, pays on the clear and opens the next stage', () => {
    const { store, actions, events } = chronicle();
    const seen: string[] = [];
    events.on((e) => seen.push(e.type));
    const before = store.getState().save!;
    const party = Object.keys(before.roster).slice(0, 3);
    expect(before.energy.value).toBe(60);

    const started = actions.startCampaignRun(STAGE_1);
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.value.encounterId).toBe('encounter.stage.01.01.intro');
    expect(started.value.cost).toBe(4);
    expect(store.getState().save?.energy.value).toBe(56);
    expect(store.getState().save?.campaign.selected).toEqual(STAGE_1);

    const finished = actions.finishCampaignRun({
      pointer: STAGE_1,
      cost: started.value.cost,
      runIndex: started.value.runIndex,
      outcome: victory(party),
      party,
      now: T0,
    });
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.value.stars).toBe(3);
    expect(finished.value.firstClear).toBe(true);
    expect(finished.value.rewards?.gems).toBe(5);
    const save = store.getState().save!;
    expect(save.campaign.stars['stage.01.01|intro']).toBe(3);
    expect(save.campaign.bestTurns['stage.01.01|intro']).toBe(9);
    // Gold, materials and the first-clear gems and energy all landed.
    expect(save.wallet.gold).toBeGreaterThan(before.wallet.gold);
    expect(save.wallet.gems).toBe(before.wallet.gems + 5);
    expect(save.energy.value).toBe(56 + 15);
    // Champions that fought took the run's 120 XP: level 1 → 3 with 14 left over.
    for (const id of party) {
      expect(save.roster[id]?.level, id).toBe(3);
      expect(save.roster[id]?.xp, id).toBe(14);
    }
    // The player's 40 XP is not yet a level (the first costs 100).
    expect(save.profile).toMatchObject({ level: 1, xp: 40 });
    expect(seen).toContain('campaign.runFinished');
    expect(saveSchema.safeParse(save).success).toBe(true);
    // Stage 2 is now open and the campaign points at it.
    expect(nextStage({ stars: save.campaign.stars, bestTurns: save.campaign.bestTurns })).toEqual({
      settlement: 1,
      stage: 2,
      difficulty: 'intro',
    });
  });

  it('refuses a locked stage and a run the energy cannot pay for', () => {
    const { store, actions } = chronicle();
    const locked = actions.startCampaignRun({ settlement: 1, stage: 3, difficulty: 'intro' });
    expect(locked.ok).toBe(false);
    if (!locked.ok) expect(locked.error.code).toBe('locked');
    expect(actions.startCampaignRun({ settlement: 2, stage: 1, difficulty: 'intro' }).ok).toBe(false);
    expect(actions.startCampaignRun({ settlement: 1, stage: 1, difficulty: 'normal' }).ok).toBe(false);
    expect(actions.startCampaignRun({ settlement: 99, stage: 1, difficulty: 'intro' }).ok).toBe(false);
    // Energy unchanged by any refusal.
    expect(store.getState().save?.energy.value).toBe(60);
    actions.spendEnergy(58);
    const broke = actions.startCampaignRun(STAGE_1);
    expect(broke.ok).toBe(false);
    if (!broke.ok) expect(broke.error.code).toBe('insufficient_energy');
    expect(store.getState().save?.energy.value).toBe(2);
  });

  it('pays nothing for a defeat, and the energy stays spent', () => {
    const { store, actions } = chronicle();
    const party = Object.keys(store.getState().save!.roster).slice(0, 3);
    const started = actions.startCampaignRun(STAGE_1);
    if (!started.ok) throw new Error('start');
    const goldBefore = store.getState().save!.wallet.gold;
    const finished = actions.finishCampaignRun({
      pointer: STAGE_1,
      cost: started.value.cost,
      runIndex: started.value.runIndex,
      outcome: victory(party, { kind: 'defeat', wavesCleared: 1 }),
      party,
      now: T0,
    });
    expect(finished.ok && finished.value.stars).toBe(0);
    expect(finished.ok && finished.value.rewards).toBeNull();
    const save = store.getState().save!;
    expect(save.wallet.gold).toBe(goldBefore);
    expect(save.campaign.stars).toEqual({});
    expect(save.energy.value).toBe(56);
  });

  it('does not double-spend across a reload mid-fight', async () => {
    const storage = createMemoryStorage();
    const { store, actions, clock } = chronicle();
    const persistence = startPersistence({ store, storage, clock, debounceMs: 0 });
    const started = actions.startCampaignRun(STAGE_1);
    if (!started.ok) throw new Error('start');
    await new Promise((resolve) => setTimeout(resolve, 10));
    persistence.stop();
    // The energy left the wallet before the battle, so the reloaded chronicle is already charged
    // and the abandoned run pays nothing at all.
    const { store: booted } = createGameStore({ clock });
    await bootGame({ store: booted, storage, clock });
    expect(booted.getState().save?.energy.value).toBe(56);
    expect(booted.getState().save?.campaign.selected).toEqual(STAGE_1);
    expect(booted.getState().save?.campaign.stars).toEqual({});
  });

  it('repeats a stage with fresh drops until the energy runs out', () => {
    const { store, actions } = chronicle();
    // A maxed chronicle so the batch is bounded by the energy alone; the level-up refill has its
    // own test below.
    store.setState((state) => {
      if (state.save) state.save.profile.level = PLAYER_MAX_LEVEL;
      return state;
    });
    const party = Object.keys(store.getState().save!.roster).slice(0, 3);
    actions.setAutoRepeat(10);
    expect(store.getState().save?.campaign.autoRepeat).toBe(10);
    expect(runsAffordable(store.getState().save!, STAGE_1, 10)).toBe(10);
    const goldGains: number[] = [];
    let runs = 0;
    for (let i = 0; i < 40; i += 1) {
      const started = actions.startCampaignRun(STAGE_1);
      if (!started.ok) break;
      runs += 1;
      const before = store.getState().save!.wallet.gold;
      actions.finishCampaignRun({
        pointer: STAGE_1,
        cost: started.value.cost,
        runIndex: started.value.runIndex,
        outcome: victory(party),
        party,
        now: T0,
      });
      goldGains.push(store.getState().save!.wallet.gold - before);
    }
    // 60 energy at 4 a run, plus the 15 the first clear pays back: 18 runs, 3 energy left over.
    expect(runs).toBe(18);
    expect(store.getState().save!.energy.value).toBeLessThan(4);
    // Gold per run is fixed by the stage, but the material rolls are not identical every time.
    expect(new Set(goldGains).size).toBe(1);
    const stats = store.getState().save!.stats;
    expect(stats['campaign.cleared']).toBe(runs);
    expect(stats['campaign.runs']).toBe(runs);
  });

  it('keeps a batch going when a level-up refills the energy', () => {
    const { store, actions } = chronicle();
    const party = Object.keys(store.getState().save!.roster).slice(0, 3);
    let levelUps = 0;
    let runs = 0;
    for (let i = 0; i < 30; i += 1) {
      const started = actions.startCampaignRun(STAGE_1);
      if (!started.ok) break;
      runs += 1;
      const finished = actions.finishCampaignRun({
        pointer: STAGE_1,
        cost: started.value.cost,
        runIndex: started.value.runIndex,
        outcome: victory(party),
        party,
        now: T0,
      });
      if (!finished.ok) throw new Error('finish');
      levelUps += finished.value.levelUp.levels.length;
      if (finished.value.levelUp.levels.length > 0) {
        // The refill is the new cap, added on top of what was left (Q15).
        expect(finished.value.playerLevelsGained).toBe(finished.value.levelUp.levels.length);
        expect(finished.value.changes.some((c) => c.currency === 'energy')).toBe(true);
      }
    }
    const save = store.getState().save!;
    expect(runs).toBe(30);
    expect(levelUps).toBeGreaterThan(0);
    expect(save.profile.level).toBe(1 + levelUps);
    // The stage costs 4 and the chronicle started with 60: without the refills the batch would
    // have stopped at 18 runs.
    expect(save.energy.value).toBeGreaterThan(60);
  });

  it('announces the difficulty and the speed a completed difficulty opens', () => {
    const { store, actions } = chronicle();
    const party = Object.keys(store.getState().save!.roster).slice(0, 3);
    // One stage short of a complete Intro…
    actions.debugClearCampaign('intro', 1);
    const last = { settlement: 12, stage: 10, difficulty: 'intro' } as const;
    store.setState((state) => {
      if (state.save) delete state.save.campaign.stars['stage.12.10|intro'];
      return state;
    });
    const started = actions.startCampaignRun(last);
    if (!started.ok) throw new Error(started.error.message);
    const finished = actions.finishCampaignRun({
      pointer: last,
      cost: started.value.cost,
      runIndex: started.value.runIndex,
      outcome: victory(party),
      party,
      now: T0,
    });
    expect(finished.ok && finished.value.completedDifficulty).toBe(true);
    const toasts = store.getState().ui.toasts.map((toast) => toast.textKey);
    expect(toasts).toContain('campaign.difficultyOpen');
    expect(toasts).toContain('campaign.speedUnlocked');
    expect(availableDifficulties(store.getState().save!)).toEqual(['intro', 'normal']);
  });

  it('exposes the pointer, the cost and the difficulties a chronicle may choose', () => {
    const { store, actions } = chronicle();
    const save = store.getState().save!;
    expect(currentPointer(save)).toEqual(nextStage({ stars: {}, bestTurns: {} }));
    expect(pointerCost(STAGE_1)).toBe(4);
    expect(pointerCost({ settlement: 12, stage: 10, difficulty: 'hard' })).toBe(11);
    expect(availableDifficulties(save)).toEqual(['intro']);
    // A selection the player made is where the screens reopen.
    actions.selectStage(STAGE_1);
    expect(currentPointer(store.getState().save!)).toEqual(STAGE_1);
    expect(content.stages).toHaveLength(120);
  });
});
