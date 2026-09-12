import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp, { type OverlayOptions } from 'sharp';
import type { AtlasAnimation, AtlasEntry, AtlasFrame } from '@assets/manifest-types';
import { pixiAtlasJson } from '../lib/atlas.ts';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listDirs, listFiles, walk } from '../lib/util.ts';

/** Folder-name prefixes that only describe rarity and are not part of the model id. */
const RARITY_PREFIXES = ['common_', 'uncommon_', 'rare_', 'epic_', 'legendary_', 'mythic_'];
/** Source art facing, verified by inspection (docs/tech/ASSETS.md §2). Unknown models face left. */
const MODEL_FACING: Record<string, 'left' | 'right'> = { khazgor: 'right', sethlurias: 'right' };
/** Idle frames are authored at 200 ms; action animations default to 100 ms. */
const FPS: Record<string, number> = { idle: 5 };
const DEFAULT_FPS = 10;
const LOOPING = new Set(['idle', 'walk', 'run']);

export function modelId(folder: string): string {
  for (const prefix of RARITY_PREFIXES) if (folder.startsWith(prefix)) return folder.slice(prefix.length);
  return folder;
}

interface Frame {
  name: string;
  path: string;
  w: number;
  h: number;
}

async function loadFrames(dir: string, animation: string): Promise<Frame[]> {
  const files = await listFiles(dir, (f) => /^frame_\d+\.png$/i.test(f));
  const frames: Frame[] = [];
  for (const [i, file] of files.entries()) {
    const meta = await sharp(join(dir, file)).metadata();
    frames.push({
      name: `${animation}_${i}`,
      path: join(dir, file),
      w: meta.width ?? 0,
      h: meta.height ?? 0,
    });
  }
  return frames;
}

export async function buildModels(ctx: BuildContext): Promise<void> {
  const roots = ['champions', 'enemies'];
  for (const root of roots) {
    const base = join(SOURCE_ROOT, root);
    for (const folder of await listDirs(base)) {
      const dir = join(base, folder);
      const id = modelId(folder);
      const sources = (await walk(dir)).filter(
        (p) => !/_avatar\.(png|jpg|webp)$/i.test(p) && !p.endsWith('.gif'),
      );
      await ctx.cached(`model:${root}/${folder}`, sources, async () => {
        const animations: Record<string, Frame[]> = {};
        for (const sub of await listDirs(dir)) {
          if (sub === 'still') continue;
          const frames = await loadFrames(join(dir, sub), sub);
          if (frames.length) animations[sub] = frames;
        }
        const stillFiles = await listFiles(join(dir, 'still'), (f) => f.endsWith('.png'));
        const still: Frame[] = [];
        if (stillFiles[0]) {
          const path = join(dir, 'still', stillFiles[0]);
          const meta = await sharp(path).metadata();
          still.push({ name: 'still', path, w: meta.width ?? 0, h: meta.height ?? 0 });
        }
        if (!animations['idle'] && still.length === 0)
          throw new Error(`Model ${folder} has no idle frames and no still`);

        // Layout: one row per animation (frames left to right), then the still.
        const rows = [...Object.values(animations), still].filter((r) => r.length);
        const atlasW = Math.max(...rows.map((r) => r.reduce((s, f) => s + f.w, 0)));
        const atlasH = rows.reduce((s, r) => s + Math.max(...r.map((f) => f.h)), 0);
        const frames: Record<string, AtlasFrame> = {};
        const composites: OverlayOptions[] = [];
        let y = 0;
        for (const row of rows) {
          let x = 0;
          const rowH = Math.max(...row.map((f) => f.h));
          for (const f of row) {
            frames[f.name] = { x, y, w: f.w, h: f.h };
            composites.push({ input: await readFile(f.path), left: x, top: y });
            x += f.w;
          }
          y += rowH;
        }
        const png = await sharp({
          create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
        })
          .composite(composites)
          .png({ compressionLevel: 9, palette: false })
          .toBuffer();
        const image = await ctx.emit('models', id, 'png', png);
        const anims: Record<string, AtlasAnimation> = {};
        for (const [name, list] of Object.entries(animations)) {
          anims[name] = {
            frames: list.map((f) => f.name),
            fps: FPS[name] ?? DEFAULT_FPS,
            loop: LOOPING.has(name),
          };
        }
        const json = await ctx.emit(
          'models',
          id,
          'json',
          Buffer.from(pixiAtlasJson(frames, anims, image.rel.split('/').pop() ?? '', atlasW, atlasH)),
        );
        const entry: AtlasEntry = {
          kind: 'atlas',
          group: 'models',
          url: image.url,
          json: json.url,
          w: atlasW,
          h: atlasH,
          frames,
          animations: anims,
          facing: MODEL_FACING[id] ?? 'left',
        };
        return { outputs: [image.rel, json.rel], entries: { [`model.${id}`]: entry } };
      });
    }
  }
}
