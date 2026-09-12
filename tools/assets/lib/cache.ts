import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AssetEntry } from '@assets/manifest-types';
import { CACHE_ROOT, OUTPUT_ROOT, writeAtomic } from './util.ts';

/** Bump when the pipeline's output format changes so every source is reprocessed. */
export const TOOL_VERSION = 3;

export interface CacheRecord {
  /** `size:mtime` signature(s) of every source file that produced this record. */
  sig: string;
  /** Output files relative to OUTPUT_ROOT (or absolute for icons). */
  outputs: string[];
  /** Manifest entries produced (key → entry). */
  entries: Record<string, AssetEntry>;
}

interface CacheFile {
  toolVersion: number;
  records: Record<string, CacheRecord>;
}

export class AssetCache {
  private records: Record<string, CacheRecord> = {};
  private touched = new Set<string>();
  readonly file = join(CACHE_ROOT, 'index.json');

  async load(force: boolean): Promise<void> {
    if (force || !existsSync(this.file)) return;
    try {
      const parsed = JSON.parse(await readFile(this.file, 'utf8')) as CacheFile;
      if (parsed.toolVersion === TOOL_VERSION) this.records = parsed.records;
    } catch {
      this.records = {};
    }
  }

  /** Returns the cached record when the signature matches and every output still exists. */
  hit(id: string, sig: string): CacheRecord | undefined {
    const record = this.records[id];
    if (!record || record.sig !== sig) return undefined;
    for (const out of record.outputs) {
      const path = out.startsWith('/') ? out : join(OUTPUT_ROOT, out);
      if (!existsSync(path)) return undefined;
    }
    this.touched.add(id);
    return record;
  }

  put(id: string, record: CacheRecord): void {
    this.records[id] = record;
    this.touched.add(id);
  }

  /** Drop records for sources that no longer exist. */
  prune(): void {
    for (const id of Object.keys(this.records)) if (!this.touched.has(id)) delete this.records[id];
  }

  outputs(): Set<string> {
    const all = new Set<string>();
    for (const record of Object.values(this.records)) for (const out of record.outputs) all.add(out);
    return all;
  }

  async save(): Promise<void> {
    const data: CacheFile = { toolVersion: TOOL_VERSION, records: this.records };
    await writeAtomic(this.file, JSON.stringify(data));
  }
}
