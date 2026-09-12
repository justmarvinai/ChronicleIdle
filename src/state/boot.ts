/**
 * Boot sequence (docs/tech/ARCHITECTURE.md §2, steps 4–6): load, migrate, apply offline time.
 * Never throws — every failure becomes a boot state the Title screen can explain.
 */
import { SaveError } from '@engine/errors';
import type { Clock } from '@engine/time/clock';
import type { StorageAdapter } from '@platform/storage';
import { migrateSave } from './migrations';
import { applyOfflineElapsed } from './offline';
import type { GameStoreApi } from './store';

export interface BootDeps {
  store: GameStoreApi;
  storage: StorageAdapter;
  clock: Clock;
}

export async function bootGame({ store, storage, clock }: BootDeps): Promise<void> {
  const { actions } = store.getState();
  actions.setBoot({ storageKind: storage.kind });
  let raw: unknown;
  try {
    raw = await storage.loadSave();
  } catch (error) {
    console.error('[boot] could not read storage', error);
    actions.setBoot({ status: 'ready', hasSave: false, error: 'storage_unreadable' });
    return;
  }
  if (raw === null) {
    actions.setBoot({ status: 'ready', hasSave: false });
    return;
  }
  const loaded = await tryLoad(raw, storage, clock);
  if (loaded.kind === 'ok') {
    const { save, report } = applyOfflineElapsed(loaded.save, clock.now());
    actions.loadSave(save, report);
    actions.setBoot({ status: 'ready', hasSave: true });
    return;
  }
  if (loaded.kind === 'unsupported') {
    actions.setBoot({
      status: 'ready',
      hasSave: false,
      unsupportedSaveVersion: loaded.version,
      corruptSaveText: JSON.stringify(raw),
    });
    return;
  }
  // Corrupt: try the newest backup before giving up.
  const backups = await storage.listBackups().catch(() => []);
  for (const summary of backups) {
    const backupRaw = await storage.loadBackup(summary.id).catch(() => null);
    if (backupRaw === null) continue;
    const attempt = await tryLoad(backupRaw, storage, clock);
    if (attempt.kind === 'ok') {
      const { save, report } = applyOfflineElapsed(attempt.save, clock.now());
      actions.loadSave(save, report);
      actions.setBoot({
        status: 'ready',
        hasSave: true,
        error: 'restored_from_backup',
        corruptSaveText: JSON.stringify(raw),
      });
      return;
    }
  }
  actions.setBoot({
    status: 'ready',
    hasSave: false,
    error: 'save_corrupt',
    corruptSaveText: JSON.stringify(raw),
  });
}

type LoadOutcome =
  | { kind: 'ok'; save: ReturnType<typeof migrateSave>['save'] }
  | { kind: 'unsupported'; version: number }
  | { kind: 'corrupt' };

async function tryLoad(raw: unknown, storage: StorageAdapter, clock: Clock): Promise<LoadOutcome> {
  try {
    const result = migrateSave(raw);
    if (result.migrated) await storage.storeBackup(raw, clock.now(), 'pre-migration').catch(() => undefined);
    return { kind: 'ok', save: result.save };
  } catch (error) {
    if (error instanceof SaveError && error.code === 'save_version_unsupported') {
      return { kind: 'unsupported', version: Number(error.details?.['version'] ?? 0) };
    }
    console.error('[boot] save could not be loaded', error);
    return { kind: 'corrupt' };
  }
}
