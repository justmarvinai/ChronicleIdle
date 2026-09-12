import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';

export const REPO_ROOT = join(import.meta.dirname, '..', '..', '..');
export const SOURCE_ROOT = join(REPO_ROOT, 'game', 'assets');
export const OUTPUT_ROOT = join(REPO_ROOT, 'public', 'assets', 'generated');
export const ICONS_ROOT = join(REPO_ROOT, 'public', 'icons');
export const CACHE_ROOT = join(REPO_ROOT, '.assets-cache');
export const MANIFEST_TS = join(REPO_ROOT, 'src', 'assets', 'manifest.generated.ts');
export const MANIFEST_CSS = join(REPO_ROOT, 'src', 'assets', 'ui-assets.generated.css');
/** Public URL prefix of generated files. */
export const PUBLIC_PREFIX = '/assets/generated';

export function shortHash(data: Buffer | string): string {
  return createHash('sha1').update(data).digest('hex').slice(0, 10);
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

/** Writes atomically (temp + rename) so a crash never leaves a half-written asset. */
export async function writeAtomic(path: string, data: Buffer | string): Promise<void> {
  await ensureDir(dirname(path));
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, path);
}

export async function writeIfChanged(path: string, data: string): Promise<boolean> {
  if (existsSync(path)) {
    const current = await readFile(path, 'utf8');
    if (current === data) return false;
  }
  await writeAtomic(path, data);
  return true;
}

export async function walk(dir: string, filter?: (name: string) => boolean): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, filter)));
    else if (!filter || filter(entry.name)) out.push(full);
  }
  return out.sort();
}

export async function listDirs(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export async function listFiles(dir: string, filter?: (name: string) => boolean): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && (!filter || filter(e.name)))
    .map((e) => e.name)
    .sort();
}

export async function signature(path: string): Promise<string> {
  const s = await stat(path);
  return `${s.size}:${Math.round(s.mtimeMs)}`;
}

export function relSource(path: string): string {
  return relative(SOURCE_ROOT, path).split(sep).join('/');
}

/** `Sword Impact Hit` → `sword_impact_hit`; `deco-frame-01-solid` → `deco_frame_01_solid`. */
export function sanitize(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function pMap<T, R>(
  items: readonly T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T, index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function publicUrl(relOut: string): string {
  return `${PUBLIC_PREFIX}/${relOut}`;
}

export class Logger {
  constructor(private readonly quiet: boolean) {}
  info(message: string): void {
    if (!this.quiet) console.log(message);
  }
  warn(message: string): void {
    console.warn(`[assets] ${message}`);
  }
}
