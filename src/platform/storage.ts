/**
 * Local persistence (docs/tech/ARCHITECTURE.md §4.2). IndexedDB is the primary store; a
 * localStorage fallback keeps the game working where IndexedDB is unavailable (private windows in
 * some browsers). The Electron build later swaps this adapter for file storage.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface BackupSummary {
  id: string;
  savedAt: number;
  reason: BackupReason;
}

export type BackupReason = 'autosave' | 'pre-migration' | 'pre-import' | 'pre-reset' | 'pre-new-game';

export interface StorageAdapter {
  readonly kind: 'indexeddb' | 'localstorage' | 'memory';
  loadSave(): Promise<unknown | null>;
  storeSave(data: unknown, savedAt: number): Promise<void>;
  listBackups(): Promise<BackupSummary[]>;
  storeBackup(data: unknown, savedAt: number, reason: BackupReason): Promise<void>;
  loadBackup(id: string): Promise<unknown | null>;
  clearAll(): Promise<void>;
}

/** Rolling autosave backups kept per reason. */
export const MAX_AUTOSAVE_BACKUPS = 3;
const MAX_EVENT_BACKUPS = 2;

interface ChronicleDb extends DBSchema {
  saves: { key: string; value: { id: string; savedAt: number; data: unknown } };
  backups: { key: string; value: { id: string; savedAt: number; reason: BackupReason; data: unknown }; indexes: { bySavedAt: number } };
}

const DB_NAME = 'chronicleidle';
const DB_VERSION = 1;
const CURRENT = 'current';

class IndexedDbStorage implements StorageAdapter {
  readonly kind = 'indexeddb' as const;
  constructor(private readonly db: IDBPDatabase<ChronicleDb>) {}

  static async open(): Promise<IndexedDbStorage> {
    const db = await openDB<ChronicleDb>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        database.createObjectStore('saves', { keyPath: 'id' });
        const backups = database.createObjectStore('backups', { keyPath: 'id' });
        backups.createIndex('bySavedAt', 'savedAt');
      },
    });
    return new IndexedDbStorage(db);
  }

  async loadSave(): Promise<unknown | null> {
    return (await this.db.get('saves', CURRENT))?.data ?? null;
  }

  async storeSave(data: unknown, savedAt: number): Promise<void> {
    await this.db.put('saves', { id: CURRENT, savedAt, data });
  }

  async listBackups(): Promise<BackupSummary[]> {
    const all = await this.db.getAll('backups');
    return all.sort((a, b) => b.savedAt - a.savedAt).map(({ id, savedAt, reason }) => ({ id, savedAt, reason }));
  }

  async storeBackup(data: unknown, savedAt: number, reason: BackupReason): Promise<void> {
    const id = `${reason}-${savedAt}`;
    await this.db.put('backups', { id, savedAt, reason, data });
    await this.trim(reason);
  }

  private async trim(reason: BackupReason): Promise<void> {
    const limit = reason === 'autosave' ? MAX_AUTOSAVE_BACKUPS : MAX_EVENT_BACKUPS;
    const same = (await this.db.getAll('backups')).filter((b) => b.reason === reason).sort((a, b) => b.savedAt - a.savedAt);
    for (const old of same.slice(limit)) await this.db.delete('backups', old.id);
  }

  async loadBackup(id: string): Promise<unknown | null> {
    return (await this.db.get('backups', id))?.data ?? null;
  }

  async clearAll(): Promise<void> {
    await this.db.clear('saves');
    await this.db.clear('backups');
  }
}

class KeyValueStorage implements StorageAdapter {
  constructor(
    readonly kind: 'localstorage' | 'memory',
    private readonly get: (key: string) => string | null,
    private readonly set: (key: string, value: string) => void,
    private readonly remove: (key: string) => void,
  ) {}

  private index(): Array<{ id: string; savedAt: number; reason: BackupReason }> {
    const raw = this.get('chronicleidle.backups.index');
    return raw ? (JSON.parse(raw) as Array<{ id: string; savedAt: number; reason: BackupReason }>) : [];
  }

  async loadSave(): Promise<unknown | null> {
    const raw = this.get('chronicleidle.save');
    return raw ? (JSON.parse(raw) as unknown) : null;
  }

  async storeSave(data: unknown): Promise<void> {
    this.set('chronicleidle.save', JSON.stringify(data));
  }

  async listBackups(): Promise<BackupSummary[]> {
    return this.index().sort((a, b) => b.savedAt - a.savedAt);
  }

  async storeBackup(data: unknown, savedAt: number, reason: BackupReason): Promise<void> {
    const id = `${reason}-${savedAt}`;
    const limit = reason === 'autosave' ? MAX_AUTOSAVE_BACKUPS : MAX_EVENT_BACKUPS;
    const index = this.index().filter((b) => b.id !== id);
    index.push({ id, savedAt, reason });
    const keep = index.filter((b) => b.reason !== reason).concat(index.filter((b) => b.reason === reason).sort((a, b) => b.savedAt - a.savedAt).slice(0, limit));
    for (const dropped of index.filter((b) => !keep.includes(b))) this.remove(`chronicleidle.backup.${dropped.id}`);
    this.set(`chronicleidle.backup.${id}`, JSON.stringify(data));
    this.set('chronicleidle.backups.index', JSON.stringify(keep));
  }

  async loadBackup(id: string): Promise<unknown | null> {
    const raw = this.get(`chronicleidle.backup.${id}`);
    return raw ? (JSON.parse(raw) as unknown) : null;
  }

  async clearAll(): Promise<void> {
    for (const b of this.index()) this.remove(`chronicleidle.backup.${b.id}`);
    this.remove('chronicleidle.backups.index');
    this.remove('chronicleidle.save');
  }
}

export function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return new KeyValueStorage('memory', (k) => map.get(k) ?? null, (k, v) => void map.set(k, v), (k) => void map.delete(k));
}

export function createLocalStorage(): StorageAdapter {
  const ls = globalThis.localStorage;
  return new KeyValueStorage('localstorage', (k) => ls.getItem(k), (k, v) => ls.setItem(k, v), (k) => ls.removeItem(k));
}

/** Picks the best available adapter for this browser. */
export async function createStorage(): Promise<StorageAdapter> {
  if (typeof indexedDB !== 'undefined') {
    try {
      return await IndexedDbStorage.open();
    } catch (error) {
      console.warn('[storage] IndexedDB unavailable, falling back to localStorage', error);
    }
  }
  try {
    globalThis.localStorage.setItem('chronicleidle.probe', '1');
    globalThis.localStorage.removeItem('chronicleidle.probe');
    return createLocalStorage();
  } catch {
    console.warn('[storage] localStorage unavailable, saves will not persist');
    return createMemoryStorage();
  }
}
