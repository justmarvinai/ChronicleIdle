/**
 * Autosave (docs/tech/ARCHITECTURE.md §4.2): debounced writes after any change to the persisted
 * document, immediate flush on visibility loss, and rolling autosave backups.
 */
import type { Clock } from '@engine/time/clock';
import type { StorageAdapter } from '@platform/storage';
import type { GameStoreApi } from './store';

export interface PersistenceOptions {
  store: GameStoreApi;
  storage: StorageAdapter;
  clock: Clock;
  debounceMs?: number;
  backupIntervalMs?: number;
}

export interface PersistenceHandle {
  flush(): Promise<void>;
  stop(): void;
  /** Writes an event backup of the current save (before import, reset, new game). */
  backup(reason: 'pre-import' | 'pre-reset' | 'pre-new-game' | 'pre-migration'): Promise<void>;
  lastSavedAt(): number | null;
}

export function startPersistence({ store, storage, clock, debounceMs = 2000, backupIntervalMs = 10 * 60_000 }: PersistenceOptions): PersistenceHandle {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let writing: Promise<void> = Promise.resolve();
  let lastSaved: number | null = null;
  let lastBackup = 0;

  const write = async (): Promise<void> => {
    const save = store.getState().save;
    dirty = false;
    if (!save) return;
    const now = clock.now();
    await storage.storeSave(save, now);
    lastSaved = now;
    if (now - lastBackup >= backupIntervalMs) {
      lastBackup = now;
      await storage.storeBackup(save, now, 'autosave');
    }
  };

  const schedule = (): void => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      writing = writing.then(write).catch((error: unknown) => console.error('[persistence] autosave failed', error));
    }, debounceMs);
  };

  const unsubscribe = store.subscribe(
    (state) => state.save,
    (save, previous) => {
      if (save !== previous) schedule();
    },
  );

  const flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (dirty) writing = writing.then(write).catch((error: unknown) => console.error('[persistence] flush failed', error));
    await writing;
  };

  return {
    flush,
    stop() {
      unsubscribe();
      if (timer) clearTimeout(timer);
    },
    async backup(reason) {
      const save = store.getState().save;
      if (save) await storage.storeBackup(save, clock.now(), reason);
    },
    lastSavedAt: () => lastSaved,
  };
}
