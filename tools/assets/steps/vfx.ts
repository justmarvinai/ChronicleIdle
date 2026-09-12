import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { FxEntry } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listFiles, sanitize } from '../lib/util.ts';

const VFX_ROOT = join(SOURCE_ROOT, 'music_and_sounds', 'vfx');
const DEFAULT_FPS = 24;
const ALPHA_THRESHOLD = 8;

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
    await ctx.cached(`vfx:gamefx/${file}`, [source], async () => {
      const data = await readFile(source);
      const meta = await sharp(data).metadata();
      const size = meta.height ?? 0;
      const frames = size ? Math.floor((meta.width ?? 0) / size) : 0;
      // "Explosion_2_64x64" → explosion_2; "LightCast_96" → light_cast (a bare trailing size is dropped only when it equals the frame size).
      const stem = file
        .replace(/\.png$/, '')
        .replace(/_(\d+)x\1$/, '')
        .replace(new RegExp(`_${size}$`), '');
      const name = sanitize(stem.replace(/([a-z])([A-Z])/g, '$1_$2'));
      const out = await ctx.emit('vfx/gamefx', name, 'png', data);
      const entry: FxEntry = {
        kind: 'fx',
        group: 'vfx',
        url: out.url,
        w: meta.width ?? 0,
        h: size,
        frameW: size,
        frameH: size,
        cols: frames,
        frames,
        fps: DEFAULT_FPS,
      };
      return { outputs: [out.rel], entries: { [`fx.gamefx.${name}`]: entry } };
    });
  }
}
