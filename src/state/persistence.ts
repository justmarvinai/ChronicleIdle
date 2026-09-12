/**
 * Autosave (docs/tech/ARCHITECTURE.md §4.2): debounced writes after any change to the persisted
 * document, immediate flush on visibility loss, and rolling autosave backups.
 */
import type { SaveGame } from '@engine/schema/save';
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
  /** Synchronous last-chance write for `pagehide`, where async IndexedDB writes may be cut off. */
  flushSync(): void;
  stop(): void;
  /** Writes an event backup of the current save (before import, reset, new game). */
  backup(reason: 'pre-import' | 'pre-reset' | 'pre-new-game' | 'pre-migration'): Promise<void>;
  lastSavedAt(): number | null;
}

export function startPersistence({
  store,
  storage,
  clock,
  debounceMs = 2000,
  backupIntervalMs = 10 * 60_000,
}: PersistenceOptions): PersistenceHandle {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;
  let writing: Promise<void> = Promise.resolve();
  let lastSaved: number | null = null;
  let lastBackup = 0;
  /** The save object last confirmed on disk, so an unload flush knows whether anything is pending. */
  let written: SaveGame | null = null;

  const write = async (): Promise<void> => {
    const save = store.getState().save;
    dirty = false;
    if (!save) return;
    const now = clock.now();
    await storage.storeSave(save, now);
    written = save;
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
      writing = writing
        .then(write)
        .catch((error: unknown) => console.error('[persistence] autosave failed', error));
    }, debounceMs);
  };

  const writeNow = (): void => {
    dirty = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    writing = writing
      .then(write)
      .catch((error: unknown) => console.error('[persistence] save failed', error));
  };

  const unsubscribe = store.subscribe(
    (state) => state.save,
    (save, previous) => {
      if (save === previous) return;
      // Settings and profile edits are deliberate, rare player actions: write them at once.
      // Everything else (energy ticks, playtime, currency) rides the debounce.
      const explicit =
        !!save && !!previous && (save.settings !== previous.settings || save.profile !== previous.profile);
      if (explicit) writeNow();
      else schedule();
    },
  );

  const flush = async (): Promise<void> => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (dirty)
      writing = writing
        .then(write)
        .catch((error: unknown) => console.error('[persistence] flush failed', error));
    await writing;
  };

  const flushSync = (): void => {
    const save = store.getState().save;
    if (save && save !== written) storage.storeSaveSync(save, clock.now());
  };

  return {
    flush,
    flushSync,
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
