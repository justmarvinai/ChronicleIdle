/**
 * Runtime access to the generated asset manifest (docs/tech/ARCHITECTURE.md §8). The manifest is
 * fetched once at boot; every layer then resolves typed keys to URLs and metadata synchronously.
 */
import type {
  AssetEntry,
  AssetGroup,
  AssetManifest,
  AtlasEntry,
  AudioVariant,
  FxEntry,
  ImageVariant,
} from './manifest-types';
import {
  MANIFEST_URL,
  MANIFEST_VERSION,
  type AssetKey,
  type AvatarKey,
  type BackdropKey,
  type FxKey,
  type ModelKey,
} from './manifest.generated';

let manifest: AssetManifest | null = null;

export async function loadManifest(fetchImpl: typeof fetch = fetch): Promise<AssetManifest> {
  if (manifest) return manifest;
  const response = await fetchImpl(`${MANIFEST_URL}?v=${MANIFEST_VERSION}`, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Asset manifest failed to load (${response.status})`);
  const parsed = (await response.json()) as AssetManifest;
  if (parsed.version !== MANIFEST_VERSION) {
    // A stale service-worker cache can serve an older manifest; refetch bypassing caches once.
    const fresh = await fetchImpl(`${MANIFEST_URL}?v=${MANIFEST_VERSION}&reload=1`, { cache: 'reload' });
    if (fresh.ok) {
      const freshParsed = (await fresh.json()) as AssetManifest;
      manifest = freshParsed;
      return freshParsed;
    }
  }
  manifest = parsed;
  return parsed;
}

/** Test hook: install a manifest without fetching. */
export function setManifestForTests(value: AssetManifest | null): void {
  manifest = value;
}

export function isManifestLoaded(): boolean {
  return manifest !== null;
}

export function getManifest(): AssetManifest {
  if (!manifest) throw new Error('Asset manifest not loaded yet');
  return manifest;
}

export function entry(key: AssetKey): AssetEntry {
  const found = getManifest().entries[key];
  if (!found) throw new Error(`Unknown asset key ${key}`);
  return found;
}

export function hasAsset(key: string): key is AssetKey {
  return manifest !== null && key in manifest.entries;
}

export function groupKeys(group: AssetGroup): AssetKey[] {
  return (getManifest().groups[group] ?? []) as AssetKey[];
}

/** URL of an image or of one size of an image set (nearest available size at or above `size`). */
export function imageUrl(key: AssetKey, size?: number | string): string {
  const e = entry(key);
  if (e.kind === 'image' || e.kind === 'svg') return e.url;
  if (e.kind === 'image-set') return pickSize(e.sizes, size).url;
  if (e.kind === 'atlas' || e.kind === 'fx') return e.url;
  throw new Error(`Asset ${key} is not an image`);
}

function pickSize(sizes: Record<string, ImageVariant>, size?: number | string): ImageVariant {
  if (typeof size === 'string' && sizes[size]) return sizes[size] as ImageVariant;
  const numeric = Object.entries(sizes)
    .map(([k, v]) => ({ n: Number(k), v }))
    .filter((s) => Number.isFinite(s.n))
    .sort((a, b) => a.n - b.n);
  if (typeof size === 'number' && numeric.length) {
    const candidate = numeric.find((s) => s.n >= size) ?? numeric[numeric.length - 1];
    if (candidate) return candidate.v;
  }
  return (sizes['full'] ?? sizes['1024'] ?? Object.values(sizes)[0]) as ImageVariant;
}

export function avatarUrl(key: AvatarKey, size: 128 | 256 | 512 | 1024): string {
  return imageUrl(key, size);
}

export function backdrop(key: BackdropKey): {
  url: string;
  placeholder: string | null;
  w: number;
  h: number;
} {
  const e = entry(key);
  if (e.kind !== 'image-set') throw new Error(`Backdrop ${key} is not an image set`);
  const full = e.sizes['full'] as ImageVariant;
  return { url: full.url, placeholder: e.placeholder ?? null, w: full.w, h: full.h };
}

/** The packed pixel deco frames (cut and tinted at runtime, ADR-021). */
export function decoSheet(): AtlasEntry {
  const e = entry('deco.sheet');
  if (e.kind !== 'atlas') throw new Error('deco.sheet is not an atlas');
  return e;
}

export function atlas(key: ModelKey): AtlasEntry {
  const e = entry(key);
  if (e.kind !== 'atlas') throw new Error(`${key} is not an atlas`);
  return e;
}

export function fx(key: FxKey): FxEntry {
  const e = entry(key);
  if (e.kind !== 'fx') throw new Error(`${key} is not a visual effect`);
  return e;
}

export function audioVariants(key: AssetKey): { loop: boolean; variants: AudioVariant[] } {
  const e = entry(key);
  if (e.kind !== 'audio') throw new Error(`${key} is not audio`);
  return { loop: e.loop, variants: e.variants };
}

/** Decodes images ahead of time so screens do not pop in. Progress is reported as 0..1. */
export async function preloadImages(
  keys: readonly AssetKey[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const urls: string[] = [];
  for (const key of keys) {
    const e = entry(key);
    if (e.kind === 'image' || e.kind === 'svg' || e.kind === 'atlas' || e.kind === 'fx') urls.push(e.url);
    else if (e.kind === 'image-set') urls.push(pickSize(e.sizes).url);
  }
  let done = 0;
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          const finish = (): void => {
            done++;
            onProgress?.(done, urls.length);
            resolve();
          };
          image.onload = finish;
          image.onerror = finish;
          image.decoding = 'async';
          image.src = url;
        }),
    ),
  );
}
