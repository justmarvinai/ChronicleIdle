import { describe, expect, it } from 'vitest';
import { createIndexedDbStorage, createMemoryMirror, createMemoryStorage } from './storage';

let dbCounter = 0;
const freshName = (): string => `chronicleidle-test-${Date.now()}-${dbCounter++}`;

describe('IndexedDB storage with the unload mirror', () => {
  it('prefers a newer unload mirror over the IndexedDB record and writes it back', async () => {
    const mirror = createMemoryMirror();
    const name = freshName();
    const storage = await createIndexedDbStorage(mirror, name);
    await storage.storeSave({ step: 1 }, 100);
    // The tab closed before the debounced write: only the synchronous mirror caught the last state.
    storage.storeSaveSync({ step: 2 }, 200);

    const reopened = await createIndexedDbStorage(mirror, name);
    expect(await reopened.loadSave()).toEqual({ step: 2 });
    expect(mirror.get()).toBeNull();
    // Reconciled into IndexedDB, so a later boot without the mirror sees the same state.
    expect(await (await createIndexedDbStorage(null, name)).loadSave()).toEqual({ step: 2 });
  });

  it('ignores and clears a mirror that is older than the record', async () => {
    const mirror = createMemoryMirror();
    const name = freshName();
    const storage = await createIndexedDbStorage(mirror, name);
    storage.storeSaveSync({ step: 1 }, 100);
    await storage.storeSave({ step: 2 }, 200);
    expect(mirror.get()).toBeNull();
    mirror.set(JSON.stringify({ savedAt: 50, data: { step: 0 } }));
    expect(await storage.loadSave()).toEqual({ step: 2 });
    expect(mirror.get()).toBeNull();
  });

  it('survives a corrupt mirror', async () => {
    const mirror = createMemoryMirror();
    const storage = await createIndexedDbStorage(mirror, freshName());
    await storage.storeSave({ step: 3 }, 300);
    mirror.set('{not json');
    expect(await storage.loadSave()).toEqual({ step: 3 });
  });

  it('clears the mirror together with everything else', async () => {
    const mirror = createMemoryMirror();
    const storage = await createIndexedDbStorage(mirror, freshName());
    storage.storeSaveSync({ step: 1 }, 100);
    await storage.clearAll();
    expect(mirror.get()).toBeNull();
    expect(await storage.loadSave()).toBeNull();
  });
});

describe('key/value storage', () => {
  it('writes synchronously and keeps rolling backups per reason', async () => {
    const storage = createMemoryStorage();
    storage.storeSaveSync({ step: 1 }, 100);
    expect(await storage.loadSave()).toEqual({ step: 1 });
    for (let i = 0; i < 5; i++) await storage.storeBackup({ i }, 1000 + i, 'autosave');
    const backups = await storage.listBackups();
    expect(backups).toHaveLength(3);
    expect(backups[0]?.savedAt).toBe(1004);
    expect(await storage.loadBackup(backups[0]!.id)).toEqual({ i: 4 });
  });
});
