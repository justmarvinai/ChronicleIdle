import { describe, expect, it, vi } from 'vitest';
import { STARTING_COMPANION_IDS } from '@content/champions/types';
import { saveSchema } from '@engine/schema/save';
import { FixedClock } from '@engine/time/clock';
import { createMemoryStorage } from '@platform/storage';
import { bootGame } from './boot';
import { startPersistence } from './persistence';
import { createGameStore, validateName } from './store';

const T0 = new Date(2026, 8, 12, 12, 0).getTime();

describe('game store', () => {
  it('creates a chronicle and moves to the starter choice', () => {
    const clock = new FixedClock(T0);
    const { store, events } = createGameStore({ clock });
    const seen: string[] = [];
    events.on((e) => seen.push(e.type));
    const result = store.getState().actions.newGame('  Marvin  ');
    expect(result.ok).toBe(true);
    const state = store.getState();
    expect(state.save?.profile.name).toBe('Marvin');
    expect(state.ui.stack).toEqual([{ name: 'starter' }]);
    expect(state.save?.roster).toEqual({});
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

describe('roster actions', () => {
  it('binds a starter, seeds the companions and opens the hub', () => {
    const clock = new FixedClock(T0);
    const { store, events } = createGameStore({ clock });
    const seen: string[] = [];
    events.on((e) => seen.push(e.type));
    const { actions } = store.getState();
    actions.newGame('Binder');
    expect(actions.chooseStarter('champ.anuria').ok).toBe(false);
    const bound = actions.chooseStarter('champ.ser_corvin');
    expect(bound.ok).toBe(true);
    const state = store.getState();
    expect(state.ui.stack).toEqual([{ name: 'hub' }]);
    expect(Object.keys(state.save?.roster ?? {})).toHaveLength(1 + STARTING_COMPANION_IDS.length);
    expect(state.save?.profile.avatarChampionId).toBe('champ.ser_corvin');
    expect(state.save?.counters.instances).toBe(4);
    if (bound.ok) expect(state.ui.roster.selected).toBe(bound.value);
    expect(seen.filter((type) => type === 'champion.added')).toHaveLength(4);
    expect(seen).toContain('starter.chosen');
    expect(actions.chooseStarter('champ.reva_ashblade').ok).toBe(false);
  });

  it('grants, locks, favourites and re-avatars owned champions only', () => {
    const clock = new FixedClock(T0);
    const { store } = createGameStore({ clock });
    const { actions } = store.getState();
    actions.newGame('Keeper');
    expect(actions.grantChampion('champ.anuria', 'summon', 'test').ok).toBe(false);
    actions.chooseStarter('champ.sister_maelis');
    expect(actions.setAvatar('champ.anuria').ok).toBe(false);
    const granted = actions.grantChampion('champ.anuria', 'summon', 'test');
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    expect(granted.value).toBe('anuria-5');
    expect(actions.setAvatar('champ.anuria').ok).toBe(true);
    expect(store.getState().save?.profile.avatarChampionId).toBe('champ.anuria');
    expect(actions.setAvatar(null).ok).toBe(true);
    expect(actions.setChampionLocked('nope-1', true).ok).toBe(false);
    expect(actions.setChampionLocked(granted.value, true).ok).toBe(true);
    expect(actions.setChampionFavourite(granted.value, true).ok).toBe(true);
    const instance = store.getState().save?.roster[granted.value];
    expect(instance?.locked).toBe(true);
    expect(instance?.favourite).toBe(true);
    expect(saveSchema.safeParse(store.getState().save).success).toBe(true);
  });

  it('generates a deterministic debug roster', () => {
    const clock = new FixedClock(T0);
    const { store } = createGameStore({ clock });
    const { actions } = store.getState();
    actions.newGame('Generator');
    actions.chooseStarter('champ.reva_ashblade');
    expect(actions.generateDebugRoster(200, 'perf').ok).toBe(true);
    const roster = store.getState().save?.roster ?? {};
    expect(Object.keys(roster)).toHaveLength(204);
    const other = createGameStore({ clock });
    other.store.getState().actions.newGame('Generator');
    other.store.getState().actions.chooseStarter('champ.reva_ashblade');
    other.store.getState().actions.generateDebugRoster(200, 'perf');
    expect(other.store.getState().save?.roster).toEqual(roster);
    actions.setRosterView({ sort: 'power', descending: false });
    actions.selectChampion('reva_ashblade-1');
    expect(store.getState().ui.roster.view.sort).toBe('power');
    expect(store.getState().ui.roster.selected).toBe('reva_ashblade-1');
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
