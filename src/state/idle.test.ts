import { describe, expect, it } from 'vitest';
import { IDLE_ENERGY_PER_FILL, IDLE_GOLD_BASE } from '@content/balance/idle';
import { content } from '@content/registry';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { MS_PER_HOUR, MS_PER_MINUTE, FixedClock } from '@engine/time/clock';
import { createGameStore } from './store';
import { idleView } from './idle';

/** 2026-09-15 12:00 local. */
const T0 = new Date(2026, 8, 15, 12, 0).getTime();

function chronicle({ level = 10 } = {}) {
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

const save = (store: ReturnType<typeof chronicle>['store']) => store.getState().save!;
const held = (store: ReturnType<typeof chronicle>['store'], id: string): number =>
  save(store).wallet[id as 'gold'] ?? 0;

/** Clears the boss stand of `settlement` on `difficulty`, which is what sets the farm tier. */
function clearBoss(
  store: ReturnType<typeof chronicle>['store'],
  settlement: number,
  difficulty: 'intro' | 'normal' | 'hard' = 'intro',
): void {
  store.setState((state) => {
    if (state.save) state.save.campaign.stars[progressKey(stageIdOf(settlement, 10), difficulty)] = 3;
    return state;
  });
}

describe('the Idle Chest — what it holds', () => {
  it('starts empty and fills against the level band', () => {
    const { store } = chronicle({ level: 10 });
    const fresh = idleView(save(store), T0);
    expect(fresh.capacityHours).toBe(6);
    expect(fresh.fill.hours).toBe(0);
    expect(fresh.fill.claimable).toBe(false);
    expect(fresh.tier).toBe(0);

    clearBoss(store, 4);
    const later = idleView(save(store), T0 + 3 * MS_PER_HOUR + 30 * MS_PER_MINUTE);
    expect(later.tier).toBe(4);
    expect(later.settlementIndex).toBe(4);
    expect(later.fill.hours).toBe(3.5);
    expect(later.fill.full).toBe(false);
    expect(later.guaranteed.currencies.find((c) => c.currency === 'gold')?.amount).toBeGreaterThan(0);
  });

  it('previews the brews of the settlements it farms', () => {
    const { store } = chronicle();
    clearBoss(store, 5);
    const view = idleView(save(store), T0 + 6 * MS_PER_HOUR);
    const brews = view.guaranteed.currencies.filter((c) => c.currency.startsWith('brew_'));
    const elements = [5, 4, 3].map((index) => content.settlementByIndex(index)?.element);
    for (const brew of brews) expect(elements.map((element) => `brew_${element}`)).toContain(brew.currency);
  });
});

describe('the Idle Chest — opening it', () => {
  it('pays the hours it held, then starts again from empty', () => {
    const { store, actions, clock } = chronicle({ level: 10 });
    clearBoss(store, 1);
    clock.set(T0 + 3 * MS_PER_HOUR);
    const goldBefore = held(store, 'gold');

    const result = actions.claimIdleChest();
    if (!result.ok) throw new Error(result.error.message);

    expect(result.value.hours).toBe(3);
    expect(result.value.tier).toBe(1);
    expect(held(store, 'gold')).toBe(goldBefore + Math.floor(IDLE_GOLD_BASE * 3));
    expect(save(store).idle.lastClaimAt).toBe(T0 + 3 * MS_PER_HOUR);
    expect(save(store).stats['idle.claims']).toBe(1);
    expect(idleView(save(store), T0 + 3 * MS_PER_HOUR).fill.hours).toBe(0);
  });

  it('refuses an empty chest and a chronicle with no boss behind it', () => {
    const { store, actions, clock } = chronicle();
    clock.set(T0 + 4 * MS_PER_HOUR);
    // Four hours, but no boss has fallen: nothing farms.
    expect(actions.claimIdleChest().ok).toBe(false);

    clearBoss(store, 2);
    actions.claimIdleChest();
    // Straight after a claim there is nothing to take.
    expect(actions.claimIdleChest().ok).toBe(false);
  });

  it('loses everything past capacity', () => {
    const { store, actions, clock } = chronicle({ level: 10 });
    clearBoss(store, 6);
    clock.set(T0 + 26 * MS_PER_HOUR);
    const result = actions.claimIdleChest();
    if (!result.ok) throw new Error(result.error.message);
    // Level 10 holds six hours, however long the player was away.
    expect(result.value.hours).toBe(6);
    expect(result.value.wasFull).toBe(true);
  });

  it('is the same chest however many times it is looked at', () => {
    const first = chronicle({ level: 20 });
    const second = chronicle({ level: 20 });
    clearBoss(first.store, 8);
    clearBoss(second.store, 8);
    first.clock.set(T0 + 12 * MS_PER_HOUR);
    second.clock.set(T0 + 12 * MS_PER_HOUR);
    // The second chronicle reads its chest a dozen times before opening it.
    for (let i = 0; i < 12; i += 1) idleView(save(second.store), T0 + 12 * MS_PER_HOUR);

    const a = first.actions.claimIdleChest();
    const b = second.actions.claimIdleChest();
    if (!a.ok || !b.ok) throw new Error('claim failed');
    expect(b.value.rewards).toEqual(a.value.rewards);
    expect(b.value.procs).toEqual(a.value.procs);
    expect(b.value.gear.length).toBe(a.value.gear.length);
  });

  it('pays energy into the pool, not the purse', () => {
    const { store, actions, clock } = chronicle({ level: 30 });
    clearBoss(store, 10);
    store.setState((state) => {
      // Room in the pool for what the chest pays.
      if (state.save) state.save.energy = { value: 10, lastTickAt: T0 };
      return state;
    });
    clock.set(T0 + 16 * MS_PER_HOUR);
    const result = actions.claimIdleChest();
    if (!result.ok) throw new Error(result.error.message);

    const energy = result.value.rewards.find((entry) => entry.currency === 'energy')?.amount ?? 0;
    expect(energy).toBe(IDLE_ENERGY_PER_FILL);
    expect(held(store, 'energy')).toBe(0);
    expect(save(store).energy.value).toBeGreaterThanOrEqual(10 + IDLE_ENERGY_PER_FILL);
  });

  it('announces what it paid', () => {
    const { store, actions, clock, events } = chronicle({ level: 10 });
    clearBoss(store, 3);
    clock.set(T0 + 6 * MS_PER_HOUR);
    const seen: string[] = [];
    events.on((event) => seen.push(event.type));

    expect(actions.claimIdleChest().ok).toBe(true);
    expect(seen).toContain('currency.changed');
    expect(seen).toContain('idle.claimed');
  });

  it('carries a chronicle over a level and queues the celebration', () => {
    const { store, actions, clock } = chronicle({ level: 1 });
    clearBoss(store, 12);
    clearBoss(store, 12, 'normal');
    clock.set(T0 + 3 * MS_PER_HOUR);
    const result = actions.claimIdleChest();
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.playerXp).toBeGreaterThan(0);
    expect(save(store).profile.level).toBeGreaterThan(1);
    expect(store.getState().ui.levelUp).not.toBeNull();
  });
});
