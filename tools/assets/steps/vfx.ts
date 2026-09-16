import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { FxEntry } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listFiles, sanitize } from '../lib/util.ts';

const VFX_ROOT = join(SOURCE_ROOT, 'music_and_sounds', 'vfx');
const DEFAULT_FPS = 24;
const ALPHA_THRESHOLD = 8;

/**
 * No texture may be wider or taller than this (CLAUDE.md §5.6, and the same number the shelf
 * packer defaults to). WebGL2 only guarantees 2048, and the GameFX export ships single-row strips
 * up to 8,544 px long — on a GPU whose `MAX_TEXTURE_SIZE` is below that the upload fails and the
 * effect silently does not draw, so a strip that long is re-packed into a grid below.
 */
const MAX_TEXTURE_SIZE = 2048;

/** Counts leading non-empty cells (row-major) in a grid sheet of square frames. */
async function countGridFrames(
  data: Buffer,
  cell: number,
): Promise<{ cols: number; rows: number; frames: number }> {
  const { data: raw, info } = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cols = Math.floor(info.width / cell);
  const rows = Math.floor(info.height / cell);
  let last = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let empty = true;
      outer: for (let y = r * cell; y < (r + 1) * cell; y += 2) {
        for (let x = c * cell; x < (c + 1) * cell; x += 2) {
          if ((raw[(y * info.width + x) * 4 + 3] as number) > ALPHA_THRESHOLD) {
            empty = false;
            break outer;
          }
        }
      }
      if (!empty) last = r * cols + c;
    }
  }
  return { cols, rows, frames: last + 1 };
}

export async function buildVfx(ctx: BuildContext): Promise<void> {
  // Free Pixel Effects Pack: grids of 100 px frames, "N_name_spritesheet.png".
  const pixel = join(VFX_ROOT, 'Free Pixel Effects Pack');
  for (const file of await listFiles(pixel, (f) => f.endsWith('.png'))) {
    const source = join(pixel, file);
    const name = sanitize(file.replace(/^\d+_/, '').replace(/_spritesheet\.png$/, ''));
    await ctx.cached(`vfx:pixel/${file}`, [source], async () => {
      const data = await readFile(source);
      const meta = await sharp(data).metadata();
      const grid = await countGridFrames(data, 100);
      const out = await ctx.emit('vfx/pixel', name, 'png', data);
      const entry: FxEntry = {
        kind: 'fx',
        group: 'vfx',
        url: out.url,
        w: meta.width ?? 0,
        h: meta.height ?? 0,
        frameW: 100,
        frameH: 100,
        cols: grid.cols,
        frames: grid.frames,
        fps: DEFAULT_FPS,
      };
      return { outputs: [out.rel], entries: { [`fx.pixel.${name}`]: entry } };
    });
  }
  // GameFX export: horizontal strips "Name_<size>x<size>.png" (frame size = image height).
  const strips = join(VFX_ROOT, 'GameFXExport', 'SPRITESHEET_Files');
  for (const file of await listFiles(strips, (f) => f.endsWith('.png'))) {
    const source = join(strips, file);
    // The texture budget is part of the key: change it and every strip is laid out again.
    await ctx.cached(`vfx:gamefx/${file}@${MAX_TEXTURE_SIZE}`, [source], async () => {
      const data = await readFile(source);
      const meta = await sharp(data).metadata();
      const size = meta.height ?? 0;
      const frames = size ? Math.floor((meta.width ?? 0) / size) : 0;
      // A strip longer than a texture may be gets laid out in rows instead. The frames keep their
      // order, so the manifest's `cols` is all the flipbook needs to read the grid.
      const sheet = await regrid(data, size, frames);
      // "Explosion_2_64x64" → explosion_2; "LightCast_96" → light_cast (a bare trailing size is dropped only when it equals the frame size).
      const stem = file
        .replace(/\.png$/, '')
        .replace(/_(\d+)x\1$/, '')
        .replace(new RegExp(`_${size}$`), '');
      const name = sanitize(stem.replace(/([a-z])([A-Z])/g, '$1_$2'));
      const out = await ctx.emit('vfx/gamefx', name, 'png', sheet.data);
      const entry: FxEntry = {
        kind: 'fx',
        group: 'vfx',
        url: out.url,
        w: sheet.width,
        h: sheet.height,
        frameW: size,
        frameH: size,
        cols: sheet.cols,
        frames,
        fps: DEFAULT_FPS,
      };
      return { outputs: [out.rel], entries: { [`fx.gamefx.${name}`]: entry } };
    });
  }
}

/**
 * Lays a horizontal strip of square frames out in rows so that neither dimension passes
 * `MAX_TEXTURE_SIZE`. A strip that already fits is returned untouched — same bytes, same hash, so
 * the asset cache and the committed manifest do not churn.
 *
 * The copy is done on the raw RGBA buffer rather than with `composite`, which premultiplies and so
 * zeroes the colour of fully transparent pixels. That is invisible under nearest filtering but
 * shows as a dark fringe under linear, because the artist's padding colour is what stops the edge
 * of a frame from sampling black. A row of memcpy keeps every byte, transparent ones included.
 */
async function regrid(
  data: Buffer,
  size: number,
  frames: number,
): Promise<{ data: Buffer; width: number; height: number; cols: number }> {
  const width = size * frames;
  if (size <= 0 || frames <= 0 || width <= MAX_TEXTURE_SIZE)
    return { data, width, height: size, cols: frames };
  const cols = Math.max(1, Math.floor(MAX_TEXTURE_SIZE / size));
  const rows = Math.ceil(frames / cols);
  const { data: raw, info } = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const gridW = cols * size;
  const gridH = rows * size;
  const out = Buffer.alloc(gridW * gridH * channels);
  const rowBytes = size * channels;
  for (let frame = 0; frame < frames; frame += 1) {
    const dstCol = (frame % cols) * size;
    const dstRow = Math.floor(frame / cols) * size;
    for (let y = 0; y < size; y += 1) {
      const from = (y * info.width + frame * size) * channels;
      const to = ((dstRow + y) * gridW + dstCol) * channels;
      raw.copy(out, to, from, from + rowBytes);
    }
  }
  const packed = await sharp(out, { raw: { width: gridW, height: gridH, channels } })
    .png()
    .toBuffer();
  return { data: packed, width: gridW, height: gridH, cols };
}
