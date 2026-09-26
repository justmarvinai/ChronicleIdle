/**
 * Instant clears through the store (docs/design/CAMPAIGN.md §10): what a batch spends, pays and
 * counts, what it refuses, and — the promise the feature rests on — that it pays exactly what the
 * same runs fought to three stars would have paid.
 */
import { describe, expect, it } from 'vitest';
import { STAGE_MAX_STARS } from '@content/balance/campaign';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import type { BattleOutcome } from '@engine/battle/types';
import { progressKey, stageIdOf, type StagePointer } from '@engine/campaign/progress';
import { runCost } from '@engine/campaign/run';
import { runXp } from '@engine/campaign/rewards';
import { FixedClock } from '@engine/time/clock';
import { applyRunFinish, applyRunStart, stageRefOf } from './campaign';
import { applyInstantClear, instantView } from './instant';
import { createGameStore } from './store';

/** 2026-09-26 09:00 local. */
const T0 = new Date(2026, 8, 26, 9, 0).getTime();
const OPEN = FEATURE_UNLOCK_LEVEL.instant_clear;
const STAND: StagePointer = { settlement: 1, stage: 3, difficulty: 'intro' };

function chronicle({ level = OPEN, stars = STAGE_MAX_STARS, energy = 200 } = {}) {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (!state.save) return state;
    state.save.profile.level = level;
    state.save.energy = { value: energy, lastTickAt: T0 };
    // The stands before it are cleared, as they are in any chronicle that has reached it.
    for (let stage = 1; stage <= STAND.stage; stage += 1) {
      const key = progressKey(stageIdOf(STAND.settlement, stage), STAND.difficulty);
      state.save.campaign.stars[key] = stage === STAND.stage ? stars : STAGE_MAX_STARS;
      state.save.campaign.bestTurns[key] = 11;
    }
    return state;
  });
  const save = () => {
    const current = store.getState().save;
    if (!current) throw new Error('no chronicle');
    return current;
  };
  return { clock, store, events, save, actions: store.getState().actions, party: Object.keys(save().roster) };
}

const cost = (): number => {
  const ref = stageRefOf(STAND);
  if (!ref) throw new Error('no stand');
  return runCost(ref);
};

describe('an instant clear', () => {
  it('spends a run’s energy per run, pays and counts each one, and fights nothing', () => {
    const { save, actions, party } = chronicle();
    const before = structuredClone(save());
    const result = actions.instantClear({ pointer: STAND, runs: 10, party });
    if (!result.ok) throw new Error(result.error.message);

    expect(result.value.runs).toBe(10);
    expect(result.value.energySpent).toBe(10 * cost());
    expect(save().energy.value).toBe(before.energy.value - 10 * cost());
    expect(save().wallet.gold ?? 0).toBeGreaterThan(before.wallet.gold ?? 0);
    expect(save().stats['campaign.instant']).toBe(10);
    expect(save().stats['campaign.cleared']).toBe((before.stats['campaign.cleared'] ?? 0) + 10);
    expect(save().stats['energy.spent']).toBe((before.stats['energy.spent'] ?? 0) + 10 * cost());
    // Nothing was fought: no battle is counted, and no star or record moves.
    expect(save().stats['battles.fought'] ?? 0).toBe(before.stats['battles.fought'] ?? 0);
    expect(save().campaign.stars).toEqual(before.campaign.stars);
    expect(save().campaign.bestTurns).toEqual(before.campaign.bestTurns);
  });

  it('pays the team the champion XP a fought run pays, every run', () => {
    const { save, actions, party } = chronicle();
    const [leader] = party;
    if (!leader) throw new Error('no champion');
    const result = actions.instantClear({ pointer: STAND, runs: 3, party: [leader] });
    if (!result.ok) throw new Error(result.error.message);
    const perRun = runXp({ difficulty: STAND.difficulty, energySpent: cost() }).championXp;
    expect(result.value.championXp).toBe(3 * perRun);
    const champion = save().roster[leader];
    expect((champion?.level ?? 1) > 1 || (champion?.xp ?? 0) > 0).toBe(true);
  });

  it('clears only the runs the energy pays for', () => {
    const { save, actions, party } = chronicle({ energy: 2 * cost() + 1 });
    const result = actions.instantClear({ pointer: STAND, runs: 10, party });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.runs).toBe(2);
    expect(save().energy.value).toBe(1);
  });

  it('is refused whole — nothing spent — before its level, short of stars, without a team or energy', () => {
    const cases = [
      { setup: chronicle({ level: OPEN - 1 }), party: undefined, code: 'locked' },
      { setup: chronicle({ stars: STAGE_MAX_STARS - 1 }), party: undefined, code: 'locked' },
      { setup: chronicle(), party: [] as string[], code: 'invalid_argument' },
      { setup: chronicle({ energy: 1 }), party: undefined, code: 'insufficient_energy' },
    ];
    for (const { setup, party, code } of cases) {
      const before = structuredClone(setup.save());
      const result = setup.actions.instantClear({ pointer: STAND, runs: 10, party: party ?? setup.party });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe(code);
      expect(setup.save().wallet).toEqual(before.wallet);
      expect(setup.save().energy).toEqual(before.energy);
      expect(setup.save().stats).toEqual(before.stats);
    }
  });

  it('announces what it cleared and what it paid', () => {
    const { events, actions, party } = chronicle();
    const seen: string[] = [];
    events.on((event) => seen.push(event.type));
    expect(actions.instantClear({ pointer: STAND, runs: 2, party }).ok).toBe(true);
    expect(seen).toContain('energy.changed');
    expect(seen).toContain('currency.changed');
    expect(seen).toContain('campaign.instantCleared');
  });
});

describe('what the battle setup is told', () => {
  it('offers the clear on a mastered stand once the chronicle is old enough', () => {
    const { save } = chronicle();
    const view = instantView(save(), STAND, 10);
    expect(view.available).toBe(true);
    expect(view.block).toBeNull();
    expect(view.affordable).toBe(10);
    expect(view.cost).toBe(cost());
  });

  it('hides it before the level and short of the stars, and says why when it is only the energy', () => {
    expect(instantView(chronicle({ level: OPEN - 1 }).save(), STAND, 1).available).toBe(false);
    expect(instantView(chronicle({ stars: 2 }).save(), STAND, 1).available).toBe(false);
    const poor = instantView(chronicle({ energy: 1 }).save(), STAND, 1);
    expect(poor.available).toBe(true);
    expect(poor.block).toEqual({ reason: 'energy', cost: cost() });
    expect(poor.affordable).toBe(0);
  });
});

describe('written down or fought', () => {
  /** A three-star victory, inside the turn limit with nobody down. */
  const flawless = (party: readonly string[]): BattleOutcome => ({
    kind: 'victory',
    turns: 18,
    allyTurns: 8,
    wavesCleared: 3,
    waveCount: 3,
    units: party.map((instanceId, index) => ({
      unitId: `a${index}`,
      defId: 'champ.ser_corvin',
      instanceId,
      side: 'ally',
      alive: true,
      died: false,
      damageDealt: 0,
      damageTaken: 0,
      healingDone: 0,
      kills: 0,
    })),
    enemyHpLeft: 0,
    seed: 'seed',
    decisions: [],
  });

  it('pays exactly what the same runs fought to three stars would have', () => {
    const runs = 12;
    const base = chronicle();
    // Two copies of one chronicle: one writes the runs down, the other fights them.
    const written = structuredClone(base.save());
    const fought = structuredClone(base.save());
    // A campaign stand fields three.
    const party = base.party.slice(0, 3);
    const instant = applyInstantClear(written, { pointer: STAND, runs, party, now: T0 });
    if (!instant.ok) throw new Error(instant.error.message);

    for (let run = 0; run < runs; run += 1) {
      const started = applyRunStart(fought, STAND, T0);
      if (!started.ok) throw new Error(started.error.message);
      const finished = applyRunFinish(fought, {
        pointer: STAND,
        cost: started.value.cost,
        runIndex: started.value.runIndex,
        outcome: flawless(party),
        party,
        now: T0,
      });
      if (!finished.ok) throw new Error(finished.error.message);
    }

    expect(written.wallet).toEqual(fought.wallet);
    expect(written.energy).toEqual(fought.energy);
    expect(written.profile).toEqual(fought.profile);
    expect(written.roster).toEqual(fought.roster);
    expect(written.inventory).toEqual(fought.inventory);
    expect(instant.value.gear.length + instant.value.gearLost).toBe(instant.value.rewards.gear.length);
  });
});
