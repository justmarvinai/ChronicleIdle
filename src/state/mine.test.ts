/**
 * The Mine as it touches the save (docs/design/MINE.md): what a collection pays, what an upgrade
 * spends and settles, what each refuses, and what the store announces. The arithmetic of the store
 * itself is `@engine/mine`'s and tested there; this is the bookkeeping around it.
 */
import { describe, expect, it } from 'vitest';
import { MINE_MAX_LEVEL } from '@content/balance/mine';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import type { CurrencyAmount } from '@content/currencies/types';
import { mineLevel, mineStoreMs } from '@engine/mine/index';
import { FixedClock, MS_PER_HOUR } from '@engine/time/clock';
import { mineView } from './mine';
import { createGameStore } from './store';

/** 2026-09-26 09:00 local. */
const T0 = new Date(2026, 8, 26, 9, 0).getTime();

function chronicle({ level = FEATURE_UNLOCK_LEVEL.mine } = {}) {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (state.save) state.save.profile.level = level;
    return state;
  });
  return { clock, store, events, actions: store.getState().actions };
}

type Store = ReturnType<typeof chronicle>['store'];
const save = (store: Store) => {
  const current = store.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};
const held = (store: Store, id: string): number => save(store).wallet[id as 'gold'] ?? 0;

/** Fills the wallet with a level's price, and exactly that. */
function afford(store: Store, cost: readonly CurrencyAmount[]): void {
  store.setState((state) => {
    if (!state.save) return state;
    for (const { currency, amount } of cost) state.save.wallet[currency] = amount;
    return state;
  });
}

describe('a chronicle’s Mine', () => {
  it('is handed over at level 1 with its first store full', () => {
    const { store } = chronicle();
    const view = mineView(save(store), T0);
    expect(view.unlocked).toBe(true);
    expect(view.level.level).toBe(1);
    expect(view.store.full).toBe(true);
    expect(view.store.gems).toBe(mineLevel(1).storeGems);
  });

  it('is shut before the level that opens it, and says which level that is', () => {
    const { store, actions } = chronicle({ level: FEATURE_UNLOCK_LEVEL.mine - 1 });
    const gems = held(store, 'gems');
    expect(mineView(save(store), T0).unlocked).toBe(false);
    expect(mineView(save(store), T0).opensAt).toBe(FEATURE_UNLOCK_LEVEL.mine);
    const result = actions.collectMine();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('locked');
    expect(held(store, 'gems')).toBe(gems);
  });
});

describe('collecting', () => {
  it('pays the store into the wallet, starts it again and counts it', () => {
    const { store, actions } = chronicle();
    const gems = held(store, 'gems');
    const result = actions.collectMine();
    if (!result.ok) throw new Error(result.error.message);

    expect(result.value.gems).toBe(mineLevel(1).storeGems);
    expect(result.value.wasFull).toBe(true);
    expect(held(store, 'gems')).toBe(gems + mineLevel(1).storeGems);
    expect(save(store).mine.collectedAt).toBe(T0);
    expect(save(store).stats['mine.collections']).toBe(1);
    expect(save(store).stats['mine.gems']).toBe(mineLevel(1).storeGems);
    expect(mineView(save(store), T0).store.gems).toBe(0);
  });

  it('is refused while nothing in the store is whole, and changes nothing', () => {
    const { store, actions, clock } = chronicle();
    actions.collectMine();
    clock.advance(MS_PER_HOUR);
    const before = structuredClone(save(store).mine);
    expect(actions.collectMine().ok).toBe(false);
    expect(save(store).mine).toEqual(before);
    expect(save(store).stats['mine.collections']).toBe(1);
  });

  it('keeps the part-gem a collection could not pay', () => {
    const { store, actions, clock } = chronicle();
    actions.collectMine();
    // A level-1 Mine digs six a day: five hours is 1.25 gems.
    clock.advance(5 * MS_PER_HOUR);
    const result = actions.collectMine();
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.gems).toBe(1);
    expect(save(store).mine.carry.gems).toBeCloseTo(0.25, 9);
  });

  it('announces what it paid', () => {
    const { actions, events } = chronicle();
    const seen: string[] = [];
    events.on((event) => seen.push(event.type));
    expect(actions.collectMine().ok).toBe(true);
    expect(seen).toContain('currency.changed');
    expect(seen).toContain('mine.collected');
  });
});

describe('digging deeper', () => {
  it('waits for the chronicle to reach the next level’s gate', () => {
    const { store, actions } = chronicle();
    afford(store, mineLevel(2).cost);
    const result = actions.upgradeMine();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('locked');
    expect(mineView(save(store), T0).block).toEqual({ reason: 'level', opensAt: mineLevel(2).opensAt });
    expect(save(store).mine.level).toBe(1);
  });

  it('is refused when the wallet is short, and names what it is short of', () => {
    const { store, actions } = chronicle({ level: mineLevel(2).opensAt });
    store.setState((state) => {
      if (state.save) state.save.wallet.gold = 0;
      return state;
    });
    const result = actions.upgradeMine();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('insufficient_currency');
    const view = mineView(save(store), T0);
    expect(view.block?.reason).toBe('cost');
    expect(view.cost.find((line) => line.currency === 'gold')?.short).toBeGreaterThan(0);
  });

  it('spends the price, settles the old store at the old rate and opens the next level', () => {
    const { store, actions, clock } = chronicle({ level: mineLevel(2).opensAt });
    afford(store, mineLevel(2).cost);
    const gems = held(store, 'gems');
    const result = actions.upgradeMine();
    if (!result.ok) throw new Error(result.error.message);

    expect(result.value.level).toBe(2);
    expect(save(store).mine.level).toBe(2);
    // The full level-1 store came up on the way down.
    expect(result.value.collected.gems).toBe(mineLevel(1).storeGems);
    expect(held(store, 'gems')).toBe(gems + mineLevel(1).storeGems);
    for (const { currency } of mineLevel(2).cost) expect(held(store, currency)).toBe(0);
    expect(save(store).stats['mine.upgrades']).toBe(1);
    // …which is not a collection the player asked for.
    expect(save(store).stats['mine.collections'] ?? 0).toBe(0);
    // The new level digs from the moment it was opened, at its own rate.
    clock.advance(mineStoreMs(2));
    expect(mineView(save(store), clock.now()).store.gems).toBe(mineLevel(2).storeGems);
  });

  it('announces the new level', () => {
    const { store, actions, events } = chronicle({ level: mineLevel(2).opensAt });
    afford(store, mineLevel(2).cost);
    const seen: string[] = [];
    events.on((event) => seen.push(event.type));
    expect(actions.upgradeMine().ok).toBe(true);
    expect(seen).toContain('mine.upgraded');
  });

  it('stops at the deepest level', () => {
    const { store, actions } = chronicle({ level: 100 });
    store.setState((state) => {
      if (state.save) state.save.mine.level = MINE_MAX_LEVEL;
      return state;
    });
    expect(mineView(save(store), T0).next).toBeNull();
    expect(actions.upgradeMine().ok).toBe(false);
  });
});
