import { join } from 'node:path';
import sharp from 'sharp';
import type { ImageSetEntry, ImageVariant } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listDirs, listFiles } from '../lib/util.ts';
import { modelId } from './models.ts';

const SIZES = [1024, 512, 256, 128] as const;

async function avatarSet(ctx: BuildContext, id: string, source: string): Promise<void> {
  await ctx.cached(`avatar:${id}`, [source], async () => {
    const sizes: Record<string, ImageVariant> = {};
    const outputs: string[] = [];
    for (const size of SIZES) {
      const data = await sharp(source).resize(size, size, { fit: 'cover', position: 'attention' }).webp({ quality: size >= 512 ? 82 : 86 }).toBuffer();
      const out = await ctx.emit('avatars', `${id}-${size}`, 'webp', data);
      sizes[String(size)] = { url: out.url, w: size, h: size };
      outputs.push(out.rel);
    }
    const entry: ImageSetEntry = { kind: 'image-set', group: 'avatars', sizes };
    return { outputs, entries: { [`avatar.${id}`]: entry } };
  });
}

export async function buildAvatars(ctx: BuildContext): Promise<void> {
  for (const root of ['champions', 'enemies']) {
    const base = join(SOURCE_ROOT, root);
    for (const folder of await listDirs(base)) {
      const files = await listFiles(join(base, folder), (f) => /_avatar\.(png|jpg|jpeg|webp)$/i.test(f));
      if (files[0]) await avatarSet(ctx, modelId(folder), join(base, folder, files[0]));
    }
  }
  const misc = join(SOURCE_ROOT, 'ui', 'misc_avatars');
  for (const file of await listFiles(misc, (f) => /\.(png|jpg|jpeg|webp)$/i.test(f))) {
    const id = file.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/_avatar$/, '');
    await avatarSet(ctx, id, join(misc, file));
  }
}
