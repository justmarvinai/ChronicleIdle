import { join } from 'node:path';
import sharp from 'sharp';
import type { ImageSetEntry } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listFiles, sanitize } from '../lib/util.ts';

export async function buildBackdrops(ctx: BuildContext): Promise<void> {
  const dir = join(SOURCE_ROOT, 'wallpapers');
  for (const file of await listFiles(dir, (f) => /\.(png|jpe?g|webp)$/i.test(f))) {
    const source = join(dir, file);
    const name = sanitize(file.replace(/\.(png|jpe?g|webp)$/i, ''));
    await ctx.cached(`backdrop:${file}`, [source], async () => {
      const image = sharp(source);
      const meta = await image.metadata();
      const full = await sharp(source).webp({ quality: 80, effort: 5 }).toBuffer();
      const out = await ctx.emit('backdrops', name, 'webp', full);
      const tiny = await sharp(source)
        .resize(32, null, { fit: 'inside' })
        .blur(1.5)
        .webp({ quality: 50 })
        .toBuffer();
      const entry: ImageSetEntry = {
        kind: 'image-set',
        group: 'backdrops',
        sizes: { full: { url: out.url, w: meta.width ?? 0, h: meta.height ?? 0 } },
        placeholder: `data:image/webp;base64,${tiny.toString('base64')}`,
      };
      return { outputs: [out.rel], entries: { [`bg.${name}`]: entry } };
    });
  }
}
