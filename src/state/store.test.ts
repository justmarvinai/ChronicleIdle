import { describe, expect, it, vi } from 'vitest';
import { FixedClock } from '@engine/time/clock';
import { createMemoryStorage } from '@platform/storage';
import { bootGame } from './boot';
import { startPersistence } from './persistence';
import { createGameStore, validateName } from './store';

const T0 = new Date(2026, 8, 12, 12, 0).getTime();

describe('game store', () => {
  it('creates a chronicle and moves to the hub', () => {
    const clock = new FixedClock(T0);
    const { store, events } = createGameStore({ clock });
    const seen: string[] = [];
    events.on((e) => seen.push(e.type));
    const result = store.getState().actions.newGame('  Marvin  ');
    expect(result.ok).toBe(true);
    const state = store.getState();
    expect(state.save?.profile.name).toBe('Marvin');
    expect(state.ui.stack).toEqual([{ name: 'hub' }]);
    expect(seen).toContain('game.created');
    expect(store.getState().actions.newGame('x').ok).toBe(false);
    expect(validateName('Bad!Name').ok).toBe(false);
  });

  it('grants, spends and tracks energy through the engine', () => {
    const clock = new FixedClock(T0);
    const { store } = createGameStore({ clock });
    const { actions } = store.getState();
    actions.newGame('Tester');
    actions.grantCurrency([{ currency: 'gems', amount: 300 }], 'test');
    expect(store.getState().save?.wallet.gems).toBe(300);
    expect(actions.spendCurrency([{ currency: 'gems', amount: 301 }]).ok).toBe(false);
    expect(actions.spendCurrency([{ currency: 'gems', amount: 300 }]).ok).toBe(true);
    expect(actions.spendEnergy(10).ok).toBe(true);
    expect(store.getState().save?.energy.value).toBe(50);
    clock.advance(5 * 60_000);
    actions.tickEnergy();
    expect(store.getState().save?.energy.value).toBe(55);
    expect(actions.claimProvision('tutorial.awakening', 500)).toBe(true);
    expect(actions.claimProvision('tutorial.awakening', 500)).toBe(false);
    expect(store.getState().save?.energy.value).toBe(555);
  });

  it('manages the screen stack and dialogs', () => {
    const { store } = createGameStore({ clock: new FixedClock(T0) });
    const { actions } = store.getState();
    actions.push({ name: 'game-modes' });
    actions.openDialog({ name: 'settings' });
    expect(store.getState().ui.dialog?.name).toBe('settings');
    actions.pop();
    expect(store.getState().ui.stack).toEqual([{ name: 'title' }]);
    expect(store.getState().ui.dialog).toBeNull();
    actions.pop();
    expect(store.getState().ui.stack).toHaveLength(1);
  });
});

describe('persistence + boot', () => {
  it('autosaves after a debounce and boots from storage with offline time applied', async () => {
    vi.useFakeTimers();
    const clock = new FixedClock(T0);
    const storage = createMemoryStorage();
    const { store } = createGameStore({ clock });
    const persistence = startPersistence({ store, storage, clock, debounceMs: 100 });
    store.getState().actions.newGame('Saver');
    store.getState().actions.spendEnergy(20);
    expect(await storage.loadSave()).toBeNull();
    await vi.advanceTimersByTimeAsync(150);
    const stored = (await storage.loadSave()) as { profile: { name: string } };
    expect(stored.profile.name).toBe('Saver');
    persistence.stop();
    vi.useRealTimers();

    const later = new FixedClock(T0 + 30 * 60_000);
    const { store: booted } = createGameStore({ clock: later });
    await bootGame({ store: booted, storage, clock: later });
    const state = booted.getState();
    expect(state.boot.status).toBe('ready');
    expect(state.boot.hasSave).toBe(true);
    expect(state.save?.energy.value).toBe(60);
    expect(state.lastOffline?.energyGained).toBe(20);
  });

  it('recovers from a corrupt save using the newest backup', async () => {
    const clock = new FixedClock(T0);
    const storage = createMemoryStorage();
    const { store } = createGameStore({ clock });
    store.getState().actions.newGame('Backup');
    const good = store.getState().save;
    await storage.storeBackup(good, T0, 'autosave');
    await storage.storeSave({ saveVersion: 1, garbage: true }, T0);
    const { store: booted } = createGameStore({ clock });
    await bootGame({ store: booted, storage, clock });
    expect(booted.getState().save?.profile.name).toBe('Backup');
    expect(booted.getState().boot.error).toBe('restored_from_backup');
  });

  it('refuses newer saves without touching them', async () => {
    const clock = new FixedClock(T0);
    const storage = createMemoryStorage();
    await storage.storeSave({ saveVersion: 42 }, T0);
    const { store } = createGameStore({ clock });
    await bootGame({ store, storage, clock });
    expect(store.getState().boot.unsupportedSaveVersion).toBe(42);
    expect(store.getState().boot.hasSave).toBe(false);
    expect(await storage.loadSave()).toEqual({ saveVersion: 42 });
  });
});
