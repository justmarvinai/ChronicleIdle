/**
 * Gear set art (docs/tech/ASSETS.md §2, *Gear set art*): a painting for every piece of every set,
 * and the emblem that names the set on everything it makes.
 *
 *   gear_sets/<set>/<set>_<slot>.png                           → gear.<set>.<slot>   256 · 128 WebP
 *   gear_sets/!gear_set_identifier_icons/<set>_identifier.png  → emblem.<set>        256 · 128 · 64 WebP
 *
 * The paintings are square scenes and are only resized. The emblems arrive as flat shapes on black,
 * and a black square laid on a piece's painting would read as a hole in it, so the black is keyed
 * out (`keyBlack`) and each emblem is trimmed to its shape and re-centred — all fourteen then fill
 * their badge alike, however much margin their source happened to have.
 */
import { join } from 'node:path';
import sharp from 'sharp';
import type { ImageSetEntry, ImageVariant } from '@assets/manifest-types';
import { GEAR_SLOTS, type GearSlot } from '@content/champions/types.ts';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listDirs, listFiles, pMap } from '../lib/util.ts';

const ROOT = join(SOURCE_ROOT, 'gear_sets');
/** The one folder under `gear_sets/` that holds emblems rather than a set's pieces. */
const EMBLEM_FOLDER = '!gear_set_identifier_icons';
const EMBLEM_FILE = /^(.+)_identifier\.(png|jpg|jpeg|webp)$/i;
const IMAGE_FILE = /\.(png|jpg|jpeg|webp)$/i;

/** A piece is drawn at 96–128 px (a card) and ~90 px (the Armoury's detail): 256 covers 2× scale. */
const PIECE_SIZES = [256, 128] as const;
/** An emblem runs from a ~22 px badge on a card up to the Index's ~88 px plate. */
const EMBLEM_SIZES = [256, 128, 64] as const;
/** Clear space kept around a trimmed emblem, as a share of its side, so no edge sits on the rim. */
const EMBLEM_MARGIN = 0.04;
/** Bumped whenever the processing below changes, so cached outputs are not reused across it. */
const STEP_VERSION = 1;

/**
 * What the owner's file names call each slot. The folders are not uniform — `boot`, `gauntlet`,
 * `gauntlents` and `sword` all occur — and /game is read-only, so the variants are read here rather
 * than renamed there. A spelling this table does not know is skipped with a warning naming the
 * file, never guessed at.
 */
const SLOT_SPELLINGS: Readonly<Record<string, GearSlot>> = {
  weapon: 'weapon',
  sword: 'weapon',
  helmet: 'helmet',
  shield: 'shield',
  gauntlets: 'gauntlets',
  gauntlet: 'gauntlets',
  gauntlents: 'gauntlets',
  chestplate: 'chestplate',
  boots: 'boots',
  boot: 'boots',
};

/**
 * The emblem keying. A pixel's brightest channel says how much of it is emblem: at the emblem's own
 * fill level it is all emblem, at black it is none, and the anti-aliased rim between is part of
 * each. Background noise in the sources peaks at 5, so anything at or under `KEY_FLOOR` is clear.
 */
const KEY_FLOOR = 8;
/** Pixels brighter than this are plainly emblem, and are the ones its fill level is measured on. */
const KEY_SOLID = 48;
/**
 * The fill level is the brightness a quarter of those pixels fall under — measured per emblem,
 * because the fourteen are not equally bright: Executioner's blood red peaks at 157 where the rest
 * reach 253, and keyed against white it would have come out two-thirds transparent.
 */
const KEY_FILL_PERCENTILE = 0.25;

export function slotOf(folder: string, file: string): GearSlot | null {
  const stem = file.replace(IMAGE_FILE, '').toLowerCase();
  const spelled = stem.startsWith(`${folder}_`) ? stem.slice(folder.length + 1) : stem.split('_').pop();
  return spelled ? (SLOT_SPELLINGS[spelled] ?? null) : null;
}

async function pieceSet(ctx: BuildContext, set: string, slot: GearSlot, source: string): Promise<void> {
  const key = `gear.${set}.${slot}`;
  await ctx.cached(`gear:v${STEP_VERSION}:${key}`, [source], async () => {
    const sizes: Record<string, ImageVariant> = {};
    const outputs: string[] = [];
    for (const size of PIECE_SIZES) {
      const data = await sharp(source)
        .resize(size, size, { fit: 'cover' })
        .webp({ quality: size >= 256 ? 84 : 88 })
        .toBuffer();
      const out = await ctx.emit('gear', `${set}-${slot}-${size}`, 'webp', data);
      sizes[String(size)] = { url: out.url, w: size, h: size };
      outputs.push(out.rel);
    }
    const entry: ImageSetEntry = { kind: 'image-set', group: 'gear', sizes };
    return { outputs, entries: { [key]: entry } };
  });
}

/** Flat colour on black → the same colour on nothing (see `KEY_FLOOR` and friends). */
export function keyBlack(rgb: Uint8Array, pixels: number): Uint8Array {
  const brightest = (i: number): number =>
    Math.max(rgb[i * 3] ?? 0, rgb[i * 3 + 1] ?? 0, rgb[i * 3 + 2] ?? 0);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < pixels; i++) {
    const level = brightest(i);
    histogram[level] = (histogram[level] ?? 0) + 1;
  }
  let solid = 0;
  for (let level = KEY_SOLID + 1; level < 256; level++) solid += histogram[level] ?? 0;
  let fill = 255;
  for (let level = KEY_SOLID + 1, seen = 0; level < 256; level++) {
    seen += histogram[level] ?? 0;
    if (seen >= solid * KEY_FILL_PERCENTILE) {
      fill = level;
      break;
    }
  }
  const out = new Uint8Array(pixels * 4);
  for (let i = 0; i < pixels; i++) {
    const level = brightest(i);
    const alpha = Math.min(1, Math.max(0, (level - KEY_FLOOR) / (fill - KEY_FLOOR)));
    // A rim pixel is the fill colour faded towards black; lifting it back keeps the edge from
    // darkening into a black fringe once the black behind it is gone.
    const lift = level > 0 && level < fill ? fill / level : 1;
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.min(255, Math.round((rgb[i * 3 + c] ?? 0) * lift));
    out[i * 4 + 3] = Math.round(alpha * 255);
  }
  return out;
}

/** The smallest box holding every pixel that is visibly there. */
function opaqueBounds(rgba: Uint8Array, width: number, height: number) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if ((rgba[(y * width + x) * 4 + 3] ?? 0) > 4) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  if (right < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function emblemSet(ctx: BuildContext, set: string, source: string): Promise<void> {
  const key = `emblem.${set}`;
  await ctx.cached(`gear:v${STEP_VERSION}:${key}`, [source], async () => {
    const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = keyBlack(data, info.width * info.height);
    const bounds = opaqueBounds(rgba, info.width, info.height);
    if (!bounds) throw new Error(`gear_sets/${EMBLEM_FOLDER}: the emblem for ${set} is empty`);
    const raw = { raw: { width: info.width, height: info.height, channels: 4 as const } };
    const clear = { r: 0, g: 0, b: 0, alpha: 0 };
    const sizes: Record<string, ImageVariant> = {};
    const outputs: string[] = [];
    for (const size of EMBLEM_SIZES) {
      const margin = Math.max(1, Math.round(size * EMBLEM_MARGIN));
      const inner = size - margin * 2;
      const encoded = await sharp(Buffer.from(rgba), raw)
        .extract(bounds)
        .resize(inner, inner, { fit: 'contain', background: clear })
        .extend({ top: margin, bottom: margin, left: margin, right: margin, background: clear })
        .webp({ quality: 92, alphaQuality: 100 })
        .toBuffer();
      const out = await ctx.emit('gear', `emblem-${set}-${size}`, 'webp', encoded);
      sizes[String(size)] = { url: out.url, w: size, h: size };
      outputs.push(out.rel);
    }
    const entry: ImageSetEntry = { kind: 'image-set', group: 'gear', sizes };
    return { outputs, entries: { [key]: entry } };
  });
}

export async function buildGear(ctx: BuildContext): Promise<void> {
  const jobs: Array<() => Promise<void>> = [];
  for (const folder of await listDirs(ROOT)) {
    if (folder.startsWith('!')) continue;
    const found = new Map<GearSlot, string>();
    for (const file of await listFiles(join(ROOT, folder), (f) => IMAGE_FILE.test(f))) {
      const slot = slotOf(folder, file);
      if (!slot) {
        ctx.log.warn(`gear_sets/${folder}/${file}: no slot is spelled that way — skipped`);
        continue;
      }
      if (found.has(slot)) {
        ctx.log.warn(`gear_sets/${folder}/${file}: a second ${slot} (kept ${found.get(slot)}) — skipped`);
        continue;
      }
      found.set(slot, file);
    }
    const missing = GEAR_SLOTS.filter((slot) => !found.has(slot));
    if (missing.length) ctx.log.warn(`gear_sets/${folder}: no painting for ${missing.join(', ')}`);
    for (const [slot, file] of found) jobs.push(() => pieceSet(ctx, folder, slot, join(ROOT, folder, file)));
  }
  const emblems = join(ROOT, EMBLEM_FOLDER);
  for (const file of await listFiles(emblems, (f) => EMBLEM_FILE.test(f))) {
    const set = file.replace(EMBLEM_FILE, '$1').toLowerCase();
    jobs.push(() => emblemSet(ctx, set, join(emblems, file)));
  }
  // libvips threads each resize itself; a few at once keeps the pool busy without a queue of 98.
  await pMap(jobs, (job) => job(), 4);
}
