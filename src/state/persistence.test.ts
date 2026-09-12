import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FixedClock } from '@engine/time/clock';
import { createMemoryStorage, type StorageAdapter } from '@platform/storage';
import { startPersistence } from './persistence';
import { createGameStore } from './store';

const T0 = new Date(2026, 8, 12, 12, 0).getTime();

function spyStorage(): StorageAdapter & { syncWrites(): number } {
  const inner = createMemoryStorage();
  let syncWrites = 0;
  return {
    kind: inner.kind,
    loadSave: () => inner.loadSave(),
    storeSave: (data, savedAt) => inner.storeSave(data, savedAt),
    storeSaveSync: (data, savedAt) => {
      syncWrites++;
      inner.storeSaveSync(data, savedAt);
    },
    listBackups: () => inner.listBackups(),
    storeBackup: (data, savedAt, reason) => inner.storeBackup(data, savedAt, reason),
    loadBackup: (id) => inner.loadBackup(id),
    clearAll: () => inner.clearAll(),
    syncWrites: () => syncWrites,
  };
}

describe('persistence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('writes settings and profile edits at once but debounces everything else', async () => {
    const clock = new FixedClock(T0);
    const storage = spyStorage();
    const { store } = createGameStore({ clock });
    const persistence = startPersistence({ store, storage, clock, debounceMs: 100 });
    const { actions } = store.getState();
    actions.newGame('Saver');
    await persistence.flush();

    actions.spendEnergy(5);
    await vi.advanceTimersByTimeAsync(1);
    expect((await storage.loadSave())!).toMatchObject({ energy: { value: 60 } });
    await vi.advanceTimersByTimeAsync(150);
    expect((await storage.loadSave())!).toMatchObject({ energy: { value: 55 } });

    actions.updateSettings({ reducedMotion: true });
    await vi.advanceTimersByTimeAsync(1);
    expect((await storage.loadSave())!).toMatchObject({ settings: { reducedMotion: true } });

    actions.rename('Renamed');
    await vi.advanceTimersByTimeAsync(1);
    expect((await storage.loadSave())!).toMatchObject({ profile: { name: 'Renamed' } });
    persistence.stop();
  });

  it('flushSync mirrors only unsaved state (the pagehide last chance)', async () => {
    const clock = new FixedClock(T0);
    const storage = spyStorage();
    const { store } = createGameStore({ clock });
    const persistence = startPersistence({ store, storage, clock, debounceMs: 100 });
    const { actions } = store.getState();
    actions.newGame('Saver');
    await persistence.flush();
    persistence.flushSync();
    expect(storage.syncWrites()).toBe(0);

    actions.spendEnergy(5);
    persistence.flushSync();
    expect(storage.syncWrites()).toBe(1);
    expect((await storage.loadSave())!).toMatchObject({ energy: { value: 55 } });
    persistence.stop();
  });
});
