/**
 * The Wallet through the store (docs/design/ECONOMY.md §2, §5): a holding is read from wherever the
 * currency lives — the pools and the boss allowances as well as the wallet's own rows — and energy
 * is bought with gems, as often as a chronicle can pay for it.
 */
import { describe, expect, it } from 'vitest';
import { ENERGY_REFILL_AMOUNT, ENERGY_REFILL_GEMS } from '@content/balance/energy';
import { TOWER_KEY_CAP, TOWER_KEY_REFILL_AMOUNT, TOWER_KEY_REFILL_GEMS } from '@content/balance/tower';
import { content } from '@content/registry';
import { energyCap } from '@engine/economy/energy';
import { FixedClock } from '@engine/time/clock';
import { createGameStore } from './store';
import { holdingOf } from './wallet';

/** 2026-09-16 12:00 local. */
const T0 = new Date(2026, 8, 16, 12, 0).getTime();

function chronicle({ gems = 0, energy = 40, level = 20 } = {}) {
  const clock = new FixedClock(T0);
  const { store } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Purse');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (!state.save) return state;
    state.save.profile.level = level;
    state.save.wallet.gems = gems;
    state.save.energy = { value: energy, lastTickAt: T0 };
    return state;
  });
  const save = () => {
    const current = store.getState().save;
    if (!current) throw new Error('no chronicle');
    return current;
  };
  return { clock, store, save, actions: store.getState().actions };
}

describe('what the Wallet says a chronicle holds', () => {
  it('reads energy from its pool, with its cap, not from the wallet’s empty row', () => {
    const { save } = chronicle({ energy: 140 });
    expect(save().wallet.energy).toBe(0);
    expect(holdingOf(save(), 'energy', T0)).toMatchObject({
      amount: 140,
      cap: energyCap(20),
      regenerates: true,
      msToReset: null,
    });
  });

  it('reads a boss key as the period’s allowance less what it has spent, with the reset', () => {
    const { save } = chronicle();
    const gargoyle = content.bosses.find((boss) => boss.keyCurrency === 'key_daily');
    const held = holdingOf(save(), 'key_daily', T0);
    expect(held.amount).toBe(gargoyle?.keysPerPeriod);
    expect(held.cap).toBe(gargoyle?.keysPerPeriod);
    expect(held.msToReset).toBeGreaterThan(0);
  });

  it('reads the Eternal Key from the tower’s own pool', () => {
    const { save } = chronicle();
    expect(holdingOf(save(), 'key_eternal', T0)).toMatchObject({ cap: TOWER_KEY_CAP });
    expect(holdingOf(save(), 'key_eternal', T0).amount).toBe(save().tower.keys.value);
  });

  it('reads every other currency from its row', () => {
    const { save } = chronicle({ gems: 75 });
    expect(holdingOf(save(), 'gems', T0)).toEqual({
      amount: 75,
      cap: null,
      regenerates: false,
      msToNext: null,
      msToReset: null,
    });
  });
});

describe('an energy refill', () => {
  it('trades gems for energy, past the cap if need be, and counts it', () => {
    const { save, actions } = chronicle({ gems: ENERGY_REFILL_GEMS * 2 + 5, energy: energyCap(20) });
    const result = actions.refillEnergy();
    expect(result.ok).toBe(true);
    expect(save().wallet.gems).toBe(ENERGY_REFILL_GEMS + 5);
    expect(save().energy.value).toBe(energyCap(20) + ENERGY_REFILL_AMOUNT);
    expect(save().stats['energy.refills']).toBe(1);
    // No daily limit: a second one goes through as long as the gems are there.
    expect(actions.refillEnergy().ok).toBe(true);
    expect(save().wallet.gems).toBe(5);
  });

  it('is refused without the gems, and writes nothing', () => {
    const { save, actions } = chronicle({ gems: ENERGY_REFILL_GEMS - 1, energy: 12 });
    const result = actions.refillEnergy();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('insufficient_currency');
    expect(save().wallet.gems).toBe(ENERGY_REFILL_GEMS - 1);
    expect(save().energy.value).toBe(12);
    expect(save().stats['energy.refills']).toBeUndefined();
  });
});

describe('an Eternal Key refill (USER_QUESTIONS.md Q49)', () => {
  it('trades gems for five keys, carrying the pool past the ten the clock stops at', () => {
    const { save, store, actions } = chronicle({ gems: TOWER_KEY_REFILL_GEMS * 2 });
    store.setState((state) => {
      if (state.save) state.save.tower.keys = { value: TOWER_KEY_CAP, lastTickAt: T0 };
      return state;
    });
    const result = actions.refillTowerKeys();
    expect(result.ok).toBe(true);
    expect(save().wallet.gems).toBe(TOWER_KEY_REFILL_GEMS);
    // 15 / 10: a grant is not the clock, and the owner asked for exactly this.
    expect(save().tower.keys.value).toBe(TOWER_KEY_CAP + TOWER_KEY_REFILL_AMOUNT);
    expect(holdingOf(save(), 'key_eternal', T0).amount).toBe(TOWER_KEY_CAP + TOWER_KEY_REFILL_AMOUNT);
    expect(save().stats['tower.key_refills']).toBe(1);
    if (result.ok)
      expect(result.value.changes).toContainEqual({
        currency: 'key_eternal',
        delta: TOWER_KEY_REFILL_AMOUNT,
        total: TOWER_KEY_CAP + TOWER_KEY_REFILL_AMOUNT,
      });
  });

  it('is refused without the gems, and writes nothing', () => {
    const { save, actions } = chronicle({ gems: TOWER_KEY_REFILL_GEMS - 1 });
    const before = save().tower.keys;
    const result = actions.refillTowerKeys();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('insufficient_currency');
    expect(save().wallet.gems).toBe(TOWER_KEY_REFILL_GEMS - 1);
    expect(save().tower.keys).toEqual(before);
  });
});
