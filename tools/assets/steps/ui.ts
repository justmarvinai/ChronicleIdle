import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ImageEntry, ImageSetEntry, SvgEntry } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listFiles, sanitize } from '../lib/util.ts';

async function copyImage(ctx: BuildContext, id: string, source: string, relDir: string, key: string): Promise<void> {
  await ctx.cached(id, [source], async () => {
    const data = await readFile(source);
    const meta = await sharp(data).metadata();
    const out = await ctx.emit(relDir, sanitize(key.split('.').pop() ?? key), 'png', data);
    const entry: ImageEntry = { kind: 'image', group: 'ui', url: out.url, w: meta.width ?? 0, h: meta.height ?? 0 };
    return { outputs: [out.rel], entries: { [key]: entry } };
  });
}

export async function buildUi(ctx: BuildContext): Promise<void> {
  // Kits: copied as-is (PNG keeps the crisp edges the 9-slice frames need).
  for (const kit of ['dark-ember', 'stone-vine']) {
    const dir = join(SOURCE_ROOT, 'ui', kit);
    for (const file of await listFiles(dir, (f) => f.endsWith('.png'))) {
      const name = sanitize(file.replace(/\.png$/, ''));
      await copyImage(ctx, `ui:${kit}/${file}`, join(dir, file), `ui/${kit}`, `ui.${sanitize(kit)}.${name}`);
    }
  }
  // Pixel deco frames and dividers.
  const deco = join(SOURCE_ROOT, 'ui', 'deco-frames');
  for (const file of await listFiles(deco, (f) => f.endsWith('.png'))) {
    const stem = file.replace(/\.png$/, '');
    let key: string;
    const frame = /^deco-frame-(\d+)-(solid|soft|scrim)$/.exec(stem);
    const divider = /^deco-divider(-fade)?-(\d+)$/.exec(stem);
    if (frame) key = `deco.${frame[1]}.${frame[2]}`;
    else if (divider) key = `deco.${divider[1] ? 'divider_fade' : 'divider'}.${divider[2]}`;
    else key = `deco.misc.${sanitize(stem)}`;
    await copyImage(ctx, `deco:${file}`, join(deco, file), 'ui/deco', key);
  }
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
        kind: 'image-set', group: 'spells',
        sizes: { full: { url: full.url, w: meta.width ?? 0, h: meta.height ?? 0 }, thumb: { url: thumb.url, w: 64, h: 64 } },
      };
      return { outputs: [full.rel, thumb.rel], entries: { [`spell.${name}`]: entry } };
    });
  }
}
