import { extname, join } from 'node:path';
import type { AssetEntry, AssetGroup, AssetManifest } from '@assets/manifest-types';
import type { AssetCache, CacheRecord } from './cache.ts';
import { type Logger, OUTPUT_ROOT, publicUrl, shortHash, signature, writeAtomic } from './util.ts';

export interface Produced {
  outputs: string[];
  entries: Record<string, AssetEntry>;
}

export class BuildContext {
  readonly entries = new Map<string, AssetEntry>();
  readonly groups: Record<AssetGroup, string[]> = {
    ui: [],
    hub: [],
    title: [],
    models: [],
    avatars: [],
    backdrops: [],
    spells: [],
    audio: [],
    ambience: [],
    music: [],
    vfx: [],
    logos: [],
  };
  processed = 0;
  reused = 0;

  constructor(
    readonly cache: AssetCache,
    readonly log: Logger,
  ) {}

  /**
   * Runs `produce` unless the cache already holds outputs for `sources` with the same signature.
   * `id` must be stable across runs (e.g. the source path relative to /game/assets).
   */
  async cached(id: string, sources: string[], produce: () => Promise<Produced>): Promise<void> {
    const sig = (await Promise.all(sources.map(signature))).join('|');
    const hit = this.cache.hit(id, sig);
    if (hit) {
      this.reused++;
      this.adopt(hit);
      return;
    }
    const produced = await produce();
    const record: CacheRecord = { sig, outputs: produced.outputs, entries: produced.entries };
    this.cache.put(id, record);
    this.processed++;
    this.adopt(record);
  }

  private adopt(record: CacheRecord): void {
    for (const [key, entry] of Object.entries(record.entries)) {
      if (this.entries.has(key)) throw new Error(`Duplicate asset key ${key}`);
      this.entries.set(key, entry);
      this.groups[entry.group].push(key);
    }
  }

  /** Writes `data` as `<relDir>/<base>.<hash>.<ext>` under the output root and returns { rel, url }. */
  async emit(relDir: string, base: string, ext: string, data: Buffer): Promise<{ rel: string; url: string }> {
    const rel = `${relDir}/${base}.${shortHash(data)}${ext.startsWith('.') ? ext : `.${ext}`}`;
    await writeAtomic(join(OUTPUT_ROOT, rel), data);
    return { rel, url: publicUrl(rel) };
  }

  manifest(): AssetManifest {
    const entries: Record<string, AssetEntry> = {};
    for (const key of [...this.entries.keys()].sort()) entries[key] = this.entries.get(key) as AssetEntry;
    for (const group of Object.keys(this.groups) as AssetGroup[]) this.groups[group].sort();
    const version = shortHash(JSON.stringify(entries));
    return { version, generatedAt: new Date().toISOString(), entries, groups: this.groups };
  }
}

export function extOf(name: string): string {
  return extname(name).toLowerCase();
}
