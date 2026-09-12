import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { AtlasEntry, ImageEntry, ImageSetEntry, SvgEntry } from '@assets/manifest-types';
import { packShelves, pixiAtlasJson, type PackInput } from '../lib/atlas.ts';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listFiles, sanitize } from '../lib/util.ts';

type Encoding = 'png' | 'webp';

/**
 * Copies a kit texture into the generated tree. Painted kit art goes out as WebP (alpha kept,
 * ~70 % smaller than the PNG sources); pixel deco frames stay PNG so every pixel is exact.
 */
async function copyImage(
  ctx: BuildContext,
  id: string,
  source: string,
  relDir: string,
  key: string,
  encoding: Encoding,
): Promise<void> {
  await ctx.cached(id, [source], async () => {
    const data = await readFile(source);
    const meta = await sharp(data).metadata();
    const encoded =
      encoding === 'webp'
        ? await sharp(data).webp({ quality: 92, alphaQuality: 100, effort: 5 }).toBuffer()
        : data;
    const out = await ctx.emit(relDir, sanitize(key.split('.').pop() ?? key), encoding, encoded);
    const entry: ImageEntry = {
      kind: 'image',
      group: 'ui',
      url: out.url,
      w: meta.width ?? 0,
      h: meta.height ?? 0,
    };
    return { outputs: [out.rel], entries: { [key]: entry } };
  });
}

export async function buildUi(ctx: BuildContext): Promise<void> {
  // Kits: painted textures re-encoded as WebP (the 9-slice edges survive at quality 92).
  for (const kit of ['dark-ember', 'stone-vine']) {
    const dir = join(SOURCE_ROOT, 'ui', kit);
    for (const file of await listFiles(dir, (f) => f.endsWith('.png'))) {
      const name = sanitize(file.replace(/\.png$/, ''));
      await copyImage(
        ctx,
        `ui:webp:${kit}/${file}`,
        join(dir, file),
        `ui/${kit}`,
        `ui.${sanitize(kit)}.${name}`,
        'webp',
      );
    }
  }
  // Pixel deco frames and dividers: one packed sheet (one request at boot); frames are cut and
  // tinted at runtime by `useDecoTint` (ADR-021).
  const deco = join(SOURCE_ROOT, 'ui', 'deco-frames');
  const decoFiles = await listFiles(deco, (f) => f.endsWith('.png'));
  await ctx.cached(
    'deco:sheet',
    decoFiles.map((f) => join(deco, f)),
    async () => {
      const inputs: PackInput[] = [];
      for (const file of decoFiles) {
        const stem = file.replace(/\.png$/, '');
        // `deco-frame-07.png` is the bare outline (`line`); `-solid|-soft|-scrim` add a fill.
        const frame = /^deco-frame-(\d+)(?:-(solid|soft|scrim))?$/.exec(stem);
        const divider = /^deco-divider(-fade)?-(\d+)$/.exec(stem);
        const name = frame
          ? `${frame[1]}.${frame[2] ?? 'line'}`
          : divider
            ? `${divider[1] ? 'divider_fade' : 'divider'}.${divider[2]}`
            : `misc.${sanitize(stem)}`;
        const data = await readFile(join(deco, file));
        const meta = await sharp(data).metadata();
        inputs.push({ name, data, w: meta.width ?? 0, h: meta.height ?? 0 });
      }
      const packed = await packShelves(inputs, 2048);
      const image = await ctx.emit('ui/deco', 'sheet', 'png', packed.png);
      const json = await ctx.emit(
        'ui/deco',
        'sheet',
        'json',
        Buffer.from(pixiAtlasJson(packed.frames, {}, image.rel.split('/').pop() ?? '', packed.w, packed.h)),
      );
      const entry: AtlasEntry = {
        kind: 'atlas',
        group: 'ui',
        url: image.url,
        json: json.url,
        w: packed.w,
        h: packed.h,
        frames: packed.frames,
        animations: {},
        facing: 'left',
      };
      return { outputs: [image.rel, json.rel], entries: { 'deco.sheet': entry } };
    },
  );
  // Line glyphs: SVG copied verbatim (used as CSS masks and as Pixi textures).
  const glyphs = join(SOURCE_ROOT, 'ui', 'line-glyphs');
  for (const file of await listFiles(glyphs, (f) => f.endsWith('.svg'))) {
    const source = join(glyphs, file);
    const name = sanitize(file.replace(/^glyph-/, '').replace(/\.svg$/, ''));
    await ctx.cached(`glyph:${file}`, [source], async () => {
      const data = await readFile(source);
      const out = await ctx.emit('ui/glyphs', name, 'svg', data);
      const entry: SvgEntry = { kind: 'svg', group: 'ui', url: out.url };
      return { outputs: [out.rel], entries: { [`glyph.${name}`]: entry } };
    });
  }
  // Spell icons: full WebP as provided + 64 px thumbnail.
  const spells = join(SOURCE_ROOT, 'ui', 'spell-icons');
  for (const file of await listFiles(spells, (f) => f.endsWith('.webp'))) {
    const source = join(spells, file);
    const name = sanitize(file.replace(/\.webp$/, ''));
    await ctx.cached(`spell:${file}`, [source], async () => {
      const data = await readFile(source);
      const meta = await sharp(data).metadata();
      const full = await ctx.emit('spells', name, 'webp', data);
      const thumbData = await sharp(data).resize(64, 64, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
      const thumb = await ctx.emit('spells', `${name}-64`, 'webp', thumbData);
      const entry: ImageSetEntry = {
        kind: 'image-set',
        group: 'spells',
        sizes: {
          full: { url: full.url, w: meta.width ?? 0, h: meta.height ?? 0 },
          thumb: { url: thumb.url, w: 64, h: 64 },
        },
      };
      return { outputs: [full.rel, thumb.rel], entries: { [`spell.${name}`]: entry } };
    });
  }
}
