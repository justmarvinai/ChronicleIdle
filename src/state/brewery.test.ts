/**
 * The Brewery through the store (docs/design/BREWERY.md): the level that opens it, the run charged
 * before the fight, the twenty runs every hall shares, the calendar the Waning Cellar keeps, and
 * the stage ladder that only opens one step at a time.
 */
import { describe, expect, it } from 'vitest';
import { BREWERY_DAILY_RUNS, BREWERY_STAGES } from '@content/balance/brewery';
import type { BattleOutcome } from '@engine/battle/types';
import { FixedClock, MS_PER_DAY } from '@engine/time/clock';
import { breweryView } from './brewery';
import { createGameStore } from './store';

/** 2026-09-16 12:00 local — a Wednesday at noon, so the Waning Cellar is open. */
const WEDNESDAY = new Date(2026, 8, 16, 12, 0).getTime();
/** The Monday after it: three halls brewing, the fourth barred. */
const MONDAY = new Date(2026, 8, 21, 12, 0).getTime();

function brewer({ level = 20, now = WEDNESDAY } = {}) {
  const clock = new FixedClock(now);
  const { store } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Brewer');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (!state.save) return state;
    state.save.seedRoot = 'test-seed';
    state.save.profile.level = level;
    return state;
  });
  return { clock, store, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof brewer>['store']) => {
  const current = store.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};
const held = (store: ReturnType<typeof brewer>['store'], id: string): number =>
  save(store).wallet[id as 'gold'] ?? 0;

/** A finished run: one wave, won or lost. */
function fought(kind: BattleOutcome['kind']): BattleOutcome {
  return {
    kind,
    turns: 10,
    allyTurns: 5,
    wavesCleared: kind === 'victory' ? 1 : 0,
    waveCount: 1,
    units: [],
    enemyHpLeft: kind === 'victory' ? 0 : 0.5,
    seed: 'x',
    decisions: [],
  };
}

/** Wins `stage` so the one after it opens. */
function clear(store: ReturnType<typeof brewer>['store'], stage: number): void {
  const { actions } = store.getState();
  const started = actions.startBreweryRun('valor', stage);
  if (!started.ok) throw new Error(`stage ${stage}: ${started.error.message}`);
  const done = actions.finishBreweryRun({ element: 'valor', stage, outcome: fought('victory') });
  if (!done.ok) throw new Error(`stage ${stage}: ${done.error.message}`);
}

describe('the gate', () => {
  it('opens at level 3, not before', () => {
    const shut = brewer({ level: 2 });
    expect(breweryView(save(shut.store), WEDNESDAY).unlocked).toBe(false);
    expect(shut.actions.startBreweryRun('valor', 1).ok).toBe(false);

    const open = brewer({ level: 3 });
    expect(breweryView(save(open.store), WEDNESDAY).unlocked).toBe(true);
    expect(open.actions.startBreweryRun('valor', 1).ok).toBe(true);
  });

  it('refuses a stage that is not open yet, and one that does not exist', () => {
    const { actions } = brewer();
    expect(actions.startBreweryRun('valor', 2).ok).toBe(false);
    expect(actions.startBreweryRun('valor', BREWERY_STAGES + 1).ok).toBe(false);
    expect(actions.startBreweryRun('valor', 0).ok).toBe(false);
  });
});

describe("the day's runs", () => {
  it('are charged before the fight and shared by every hall', () => {
    const { store, actions } = brewer();
    expect(breweryView(save(store), WEDNESDAY).runsLeft).toBe(BREWERY_DAILY_RUNS);

    const started = actions.startBreweryRun('valor', 1);
    if (!started.ok) throw new Error(started.error.message);
    expect(started.value.encounterId).toBe('encounter.brewery.valor.1');
    expect(started.value.runsLeft).toBe(BREWERY_DAILY_RUNS - 1);
    // Spent now, not on the way out: a reload mid-battle cannot buy a free attempt.
    expect(save(store).brewery.runs).toBe(1);

    // A different hall draws on the same twenty.
    actions.finishBreweryRun({ element: 'valor', stage: 1, outcome: fought('victory') });
    const other = actions.startBreweryRun('faith', 1);
    if (!other.ok) throw new Error(other.error.message);
    expect(other.value.runsLeft).toBe(BREWERY_DAILY_RUNS - 2);
  });

  it('run out after twenty, and come back at the next reset', () => {
    const { clock, store, actions } = brewer();
    for (let run = 0; run < BREWERY_DAILY_RUNS; run += 1) {
      const started = actions.startBreweryRun('valor', 1);
      if (!started.ok) throw new Error(`run ${run}: ${started.error.message}`);
      actions.finishBreweryRun({ element: 'valor', stage: 1, outcome: fought('victory') });
    }
    expect(breweryView(save(store), clock.now()).runsLeft).toBe(0);
    const refused = actions.startBreweryRun('valor', 1);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe('insufficient_keys');

    clock.advance(MS_PER_DAY);
    expect(breweryView(save(store), clock.now()).runsLeft).toBe(BREWERY_DAILY_RUNS);
    expect(actions.startBreweryRun('valor', 1).ok).toBe(true);
  });

  it('are spent by a defeat too, and the defeat pays nothing', () => {
    const { store, actions } = brewer();
    const before = held(store, 'brew_valor');
    actions.startBreweryRun('valor', 1);
    const lost = actions.finishBreweryRun({ element: 'valor', stage: 1, outcome: fought('defeat') });
    if (!lost.ok) throw new Error(lost.error.message);
    expect(lost.value.cleared).toBe(false);
    expect(lost.value.brews).toEqual([]);
    expect(held(store, 'brew_valor')).toBe(before);
    expect(save(store).brewery.runs).toBe(1);
    // The ladder has not moved, so stage 2 is still shut.
    expect(actions.startBreweryRun('valor', 2).ok).toBe(false);
    expect(save(store).stats['brewery.runs']).toBe(1);
    expect(save(store).stats['brewery.cleared']).toBeUndefined();
  });
});

describe('the ladder', () => {
  it('pays the stage its own number in brews, every time', () => {
    const { store } = brewer();
    const before = held(store, 'brew_valor');
    clear(store, 1);
    expect(held(store, 'brew_valor')).toBe(before + 1);
    // A stage already cleared pays in full again: that is what the Brewery is for.
    clear(store, 1);
    expect(held(store, 'brew_valor')).toBe(before + 2);

    clear(store, 2);
    expect(held(store, 'brew_valor')).toBe(before + 4);
    expect(save(store).stats['brewery.brews']).toBe(4);
  });

  it('opens one step at a time and remembers how deep the hall has been taken', () => {
    const { store } = brewer();
    expect(breweryView(save(store), WEDNESDAY).halls.map((hall) => hall.cleared)).toEqual([0, 0, 0, 0]);
    for (let stage = 1; stage <= BREWERY_STAGES; stage += 1) clear(store, stage);

    const view = breweryView(save(store), WEDNESDAY);
    const valor = view.halls.find((hall) => hall.def.element === 'valor');
    expect(valor?.cleared).toBe(BREWERY_STAGES);
    expect(valor?.stages.map((entry) => entry.state)).toEqual(Array(BREWERY_STAGES).fill('cleared'));
    // The other halls are untouched: a hall's ladder is its own.
    expect(view.halls.find((hall) => hall.def.element === 'faith')?.cleared).toBe(0);
    expect(save(store).stats['brewery.cleared']).toBe(BREWERY_STAGES);
    expect(save(store).stats['brewery.runs.brewery.valor']).toBe(BREWERY_STAGES);
  });

  it('keeps what it has cleared when the day rolls over', () => {
    const { clock, store, actions } = brewer();
    clear(store, 1);
    clock.advance(MS_PER_DAY);
    const view = breweryView(save(store), clock.now());
    expect(view.runsLeft).toBe(BREWERY_DAILY_RUNS);
    expect(view.halls.find((hall) => hall.def.element === 'valor')?.cleared).toBe(1);
    expect(actions.startBreweryRun('valor', 2).ok).toBe(true);
  });
});

describe("the Waning Cellar's calendar", () => {
  it('brews on Wednesday and takes no run on a Monday', () => {
    const wednesday = brewer({ now: WEDNESDAY });
    const open = breweryView(save(wednesday.store), WEDNESDAY);
    expect(open.openHalls).toBe(4);
    expect(open.halls.find((hall) => hall.def.element === 'eclipse')?.open).toBe(true);
    expect(wednesday.actions.startBreweryRun('eclipse', 1).ok).toBe(true);

    const monday = brewer({ now: MONDAY });
    const shut = breweryView(save(monday.store), MONDAY);
    expect(shut.openHalls).toBe(3);
    const eclipse = shut.halls.find((hall) => hall.def.element === 'eclipse');
    expect(eclipse?.open).toBe(false);
    // Wednesday is the next of its days, two days out, and no run is spent trying.
    expect(eclipse?.nextDay).toBe(3);
    const refused = monday.actions.startBreweryRun('eclipse', 1);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe('locked');
    expect(save(monday.store).brewery.runs).toBe(0);
  });

  it('leaves the other three halls open every day', () => {
    const { store } = brewer({ now: MONDAY });
    for (const hall of breweryView(save(store), MONDAY).halls)
      expect(hall.open).toBe(hall.def.element !== 'eclipse');
  });
});
