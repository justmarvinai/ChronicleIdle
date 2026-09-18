/**
 * The Eternal Tower through the store (docs/design/ETERNAL_TOWER.md): the gate that opens it, the
 * key charged before the fight, what a floor pays, and a season read at the door rather than run
 * at midnight.
 */
import { describe, expect, it } from 'vitest';
import {
  TOWER_FLOORS,
  TOWER_KEY_CAP,
  TOWER_KEY_REGEN_SECONDS,
  TOWER_SEASON_DAYS,
} from '@content/balance/tower';
import { STAGES_PER_SETTLEMENT, SETTLEMENT_COUNT } from '@content/balance/campaign';
import type { BattleOutcome } from '@engine/battle/types';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { FixedClock, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from '@engine/time/clock';
import { towerView } from './tower';
import { createGameStore } from './store';

/** 2026-09-15 12:00 local — noon, so a few hours either way is the same day. */
const T0 = new Date(2026, 8, 15, 12, 0).getTime();

/**
 * A chronicle with the whole Intro campaign behind it, which is the only thing the tower asks for.
 * `stars` is written directly because a hundred and twenty simulated runs would test the campaign,
 * not the tower.
 */
function climber({ intro = true } = {}) {
  const clock = new FixedClock(T0);
  const { store } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Climber');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (!state.save) return state;
    state.save.seedRoot = 'test-seed';
    state.save.profile.level = 40;
    if (intro)
      for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
        for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1)
          state.save.campaign.stars[progressKey(stageIdOf(settlement, stage), 'intro')] = 3;
    return state;
  });
  return { clock, store, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof climber>['store']) => {
  const current = store.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};
const held = (store: ReturnType<typeof climber>['store'], id: string): number =>
  save(store).wallet[id as 'gold'] ?? 0;

/** A finished floor: one wave of four, won or lost. */
function fought(kind: BattleOutcome['kind']): BattleOutcome {
  return {
    kind,
    turns: 12,
    allyTurns: 6,
    wavesCleared: kind === 'victory' ? 1 : 0,
    waveCount: 1,
    units: [],
    enemyHpLeft: kind === 'victory' ? 0 : 0.4,
    seed: 'x',
    decisions: [],
  };
}

describe('the gate', () => {
  it('opens on the whole Intro campaign, not on a level', () => {
    const shut = climber({ intro: false });
    shut.store.setState((state) => {
      if (state.save) state.save.profile.level = 100;
      return state;
    });
    expect(towerView(save(shut.store), T0).unlocked).toBe(false);
    expect(shut.actions.startTowerFloor(1).ok).toBe(false);

    const open = climber();
    expect(towerView(save(open.store), T0).unlocked).toBe(true);
    expect(open.actions.startTowerFloor(1).ok).toBe(true);
  });

  it('refuses a floor above the climb, and a floor that does not exist', () => {
    const { actions } = climber();
    expect(actions.startTowerFloor(2).ok).toBe(false);
    expect(actions.startTowerFloor(TOWER_FLOORS + 1).ok).toBe(false);
    expect(actions.startTowerFloor(0).ok).toBe(false);
  });
});

describe('the key', () => {
  it('is charged before the fight, and ten of them is ten attempts', () => {
    const { store, actions } = climber();
    expect(towerView(save(store), T0).keys).toBe(TOWER_KEY_CAP);

    const started = actions.startTowerFloor(1);
    if (!started.ok) throw new Error(started.error.message);
    expect(started.value.encounterId).toBe('encounter.tower.001');
    expect(started.value.keysLeft).toBe(TOWER_KEY_CAP - 1);
    // Charged now, not on the way out: a reload mid-battle cannot buy a free attempt.
    expect(save(store).tower.keys.value).toBe(TOWER_KEY_CAP - 1);
  });

  it('is spent by a defeat too, and the defeat pays nothing', () => {
    const { store, actions } = climber();
    const goldBefore = held(store, 'gold');
    actions.startTowerFloor(1);
    const lost = actions.finishTowerFloor({ floor: 1, outcome: fought('defeat'), party: [] });
    if (!lost.ok) throw new Error(lost.error.message);
    expect(lost.value.cleared).toBe(false);
    expect(lost.value.changes).toEqual([]);
    expect(held(store, 'gold')).toBe(goldBefore);
    expect(save(store).tower.keys.value).toBe(TOWER_KEY_CAP - 1);
    // The climb has not moved, so the same floor is still the one a key opens.
    expect(towerView(save(store), T0).next).toBe(1);
    expect(save(store).stats['tower.attempts']).toBe(1);
    expect(save(store).stats['tower.cleared']).toBeUndefined();
  });

  it('runs out after ten floors, and one returns every fifteen minutes', () => {
    const { clock, store, actions } = climber();
    for (let floor = 1; floor <= TOWER_KEY_CAP; floor += 1) {
      const started = actions.startTowerFloor(floor);
      if (!started.ok) throw new Error(`floor ${floor}: ${started.error.message}`);
      actions.finishTowerFloor({ floor, outcome: fought('victory'), party: [] });
    }
    expect(save(store).tower.keys.value).toBe(0);
    expect(actions.startTowerFloor(TOWER_KEY_CAP + 1).ok).toBe(false);

    clock.set(T0 + TOWER_KEY_REGEN_SECONDS * 1000);
    const view = towerView(save(store), clock.now());
    expect(view.keys).toBe(1);
    expect(actions.startTowerFloor(TOWER_KEY_CAP + 1).ok).toBe(true);
  });

  it('stops regenerating at the cap', () => {
    const { clock, store } = climber();
    clock.set(T0 + 30 * MS_PER_HOUR);
    const view = towerView(save(store), clock.now());
    expect(view.keys).toBe(TOWER_KEY_CAP);
    expect(view.msToKey).toBeNull();
  });
});

describe('a cleared floor', () => {
  it('advances the climb, pays gold, brews and energy, and opens the next floor', () => {
    const { store, actions } = climber();
    const goldBefore = held(store, 'gold');
    const brewsBefore = held(store, 'brew_universal');
    const energyBefore = save(store).energy.value;

    actions.startTowerFloor(1);
    const won = actions.finishTowerFloor({ floor: 1, outcome: fought('victory'), party: [] });
    if (!won.ok) throw new Error(won.error.message);
    expect(won.value.cleared).toBe(true);
    expect(won.value.boss).toBe(false);
    expect(won.value.highestFloor).toBe(1);
    expect(won.value.newBest).toBe(true);
    expect(won.value.shards).toEqual([]);

    expect(held(store, 'gold')).toBe(goldBefore + 600);
    expect(held(store, 'brew_universal')).toBeGreaterThan(brewsBefore);
    // Energy is not a wallet row: it goes through `addEnergy`, so the pool moves instead.
    expect(save(store).energy.value).toBeGreaterThan(energyBefore);
    expect(held(store, 'energy')).toBe(0);

    const view = towerView(save(store), T0);
    expect(view.highestFloor).toBe(1);
    expect(view.next).toBe(2);
    expect(view.floors[0]?.state).toBe('cleared');
    expect(view.floors[1]?.state).toBe('next');
    expect(save(store).stats['tower.cleared']).toBe(1);
    expect(save(store).stats['tower.best']).toBe(1);
  });

  it('pays champion and chronicle XP to the party that fought', () => {
    const { store, actions } = climber();
    const [instanceId] = Object.keys(save(store).roster);
    if (!instanceId) throw new Error('no roster');
    const xpBefore = save(store).profile.xp;

    actions.startTowerFloor(1);
    const won = actions.finishTowerFloor({
      floor: 1,
      outcome: fought('victory'),
      party: [instanceId],
    });
    if (!won.ok) throw new Error(won.error.message);
    expect(won.value.championXp).toBeGreaterThan(0);
    expect(won.value.playerXp).toBeGreaterThan(0);
    expect(save(store).profile.xp).not.toBe(xpBefore);
  });

  it('cannot be fought again — unless it is a boss floor', () => {
    const { clock, store, actions } = climber();
    for (let floor = 1; floor <= 10; floor += 1) {
      actions.startTowerFloor(floor);
      actions.finishTowerFloor({ floor, outcome: fought('victory'), party: [] });
    }
    // Ten floors is the whole ring of keys, so wait one out before knocking again.
    clock.set(T0 + TOWER_KEY_REGEN_SECONDS * 1000);
    const view = towerView(save(store), clock.now());
    expect(view.highestFloor).toBe(10);
    expect(view.floors[8]?.state).toBe('cleared');
    expect(view.floors[9]?.state).toBe('repeatable');

    expect(actions.startTowerFloor(9).ok).toBe(false);
    const again = actions.startTowerFloor(10);
    expect(again.ok).toBe(true);

    // A boss floor fought again pays in full, which is what makes it worth a key.
    const goldBefore = held(store, 'gold');
    const repeat = actions.finishTowerFloor({ floor: 10, outcome: fought('victory'), party: [] });
    if (!repeat.ok) throw new Error(repeat.error.message);
    expect(repeat.value.boss).toBe(true);
    expect(repeat.value.newBest).toBe(false);
    expect(held(store, 'gold')).toBeGreaterThan(goldBefore);
    expect(save(store).stats['tower.bosses']).toBe(2);
    expect(save(store).stats['tower.floor.10']).toBe(2);
  });
});

describe('the season', () => {
  it('does not start until the first floor is attempted', () => {
    const { clock, store, actions } = climber();
    expect(save(store).tower.firstAttemptAt).toBe(0);
    let view = towerView(save(store), T0);
    expect(view.season).toBe(0);
    expect(view.msToSeasonEnd).toBeNull();

    // Thirty-one days of not walking in must not have burned a season.
    clock.set(T0 + (TOWER_SEASON_DAYS + 1) * MS_PER_DAY);
    actions.startTowerFloor(1);
    view = towerView(save(store), clock.now());
    expect(view.season).toBe(1);
    expect(view.msToSeasonEnd).toBe(TOWER_SEASON_DAYS * MS_PER_DAY);
  });

  it('resets the climb after thirty days but keeps the best floor ever', () => {
    const { clock, store, actions } = climber();
    for (let floor = 1; floor <= 3; floor += 1) {
      actions.startTowerFloor(floor);
      actions.finishTowerFloor({ floor, outcome: fought('victory'), party: [] });
    }
    expect(towerView(save(store), T0).highestFloor).toBe(3);

    // Read at the door: nothing had to run while the game was closed.
    clock.set(T0 + TOWER_SEASON_DAYS * MS_PER_DAY + MS_PER_MINUTE);
    const view = towerView(save(store), clock.now());
    expect(view.season).toBe(2);
    expect(view.highestFloor).toBe(0);
    expect(view.bestFloor).toBe(3);
    expect(view.next).toBe(1);
    expect(save(store).stats['tower.best']).toBe(3);
  });

  it('resumes a three-month absence on a season boundary', () => {
    const { clock, store, actions } = climber();
    actions.startTowerFloor(1);
    actions.finishTowerFloor({ floor: 1, outcome: fought('victory'), party: [] });

    clock.set(T0 + 95 * MS_PER_DAY);
    const view = towerView(save(store), clock.now());
    // 95 days is three whole seasons and five days into the fourth.
    expect(view.season).toBe(4);
    expect(view.msToSeasonEnd).toBe((TOWER_SEASON_DAYS - 5) * MS_PER_DAY);
    expect(view.highestFloor).toBe(0);
    expect(view.bestFloor).toBe(1);
  });
});

describe('the ladder the screen draws', () => {
  it('has one rung per floor, every tenth a boss floor with the owner’s odds', () => {
    const { store } = climber();
    const view = towerView(save(store), T0);
    expect(view.floors).toHaveLength(TOWER_FLOORS);
    expect(view.floors.filter((floor) => floor.boss)).toHaveLength(TOWER_FLOORS / 10);

    const odds = (floor: number) => view.floors[floor - 1]?.shards;
    expect(odds(10)).toEqual({ ancient: 0.1, sacred: 0 });
    expect(odds(50)).toEqual({ ancient: 1, sacred: 0.05 });
    expect(odds(100)).toEqual({ ancient: 5, sacred: 0.65 });
    expect(odds(11)).toEqual({ ancient: 0, sacred: 0 });
  });

  it('seals every floor above the climb', () => {
    const { store } = climber();
    const view = towerView(save(store), T0);
    expect(view.floors[0]?.state).toBe('next');
    expect(view.floors.slice(1).every((floor) => floor.state === 'locked')).toBe(true);
  });
});
