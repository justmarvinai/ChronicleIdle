import { join } from 'node:path';
import sharp from 'sharp';
import type { ImageSetEntry } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { SOURCE_ROOT, listFiles, sanitize } from '../lib/util.ts';

/**
 * The width of a backdrop's card cut: the art a mode draws on a card or a hall (the Brewery's
 * stages, a settlement on the campaign map) rather than across the whole screen. A 2752 px
 * wallpaper decoded nine times over for thumbnails is memory the budget does not have (CLAUDE.md
 * §5.6); this is a sixth of the pixels and looks the same at card size.
 */
const CARD_WIDTH = 640;

export async function buildBackdrops(ctx: BuildContext): Promise<void> {
  const dir = join(SOURCE_ROOT, 'wallpapers');
  for (const file of await listFiles(dir, (f) => /\.(png|jpe?g|webp)$/i.test(f))) {
    const source = join(dir, file);
    const name = sanitize(file.replace(/\.(png|jpe?g|webp)$/i, ''));
    // The id names the step's output shape, so adding the card cut rebuilt every cached backdrop.
    await ctx.cached(`backdrop:card:${file}`, [source], async () => {
      const image = sharp(source);
      const meta = await image.metadata();
      const full = await sharp(source).webp({ quality: 80, effort: 5 }).toBuffer();
      const out = await ctx.emit('backdrops', name, 'webp', full);
      const cardImage = sharp(source).resize(CARD_WIDTH, null, { fit: 'inside' });
      const card = await cardImage.webp({ quality: 78, effort: 5 }).toBuffer();
      const cardOut = await ctx.emit('backdrops', `${name}-${CARD_WIDTH}`, 'webp', card);
      const cardHeight = Math.round(
        ((meta.height ?? 0) * CARD_WIDTH) / Math.max(1, meta.width ?? CARD_WIDTH),
      );
      const tiny = await sharp(source)
        .resize(32, null, { fit: 'inside' })
        .blur(1.5)
        .webp({ quality: 50 })
        .toBuffer();
      const entry: ImageSetEntry = {
        kind: 'image-set',
        group: 'backdrops',
        sizes: {
          full: { url: out.url, w: meta.width ?? 0, h: meta.height ?? 0 },
          [String(CARD_WIDTH)]: { url: cardOut.url, w: CARD_WIDTH, h: cardHeight },
        },
        placeholder: `data:image/webp;base64,${tiny.toString('base64')}`,
      };
      return { outputs: [out.rel, cardOut.rel], entries: { [`bg.${name}`]: entry } };
    });
  }
}
