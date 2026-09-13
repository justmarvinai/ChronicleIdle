/**
 * Renders the procedural flipbook recipes into the asset pipeline as horizontal PNG strips with
 * the same manifest shape as the owner's packs (`FxEntry`). Recipes are source; the strips are
 * build artifacts (docs/tech/CONTENT_AUTHORING.md §10).
 */
import { join } from 'node:path';
import sharp from 'sharp';
import type { FxEntry } from '@assets/manifest-types';
import type { BuildContext } from '../assets/lib/context.ts';
import { Frame } from './painter.ts';
import { VFX_RECIPES, type VfxRecipe } from './recipes.ts';

const RECIPE_SOURCES = [join(import.meta.dirname, 'recipes.ts'), join(import.meta.dirname, 'painter.ts')];

/** Paints every frame side by side into one straight-alpha RGBA strip and encodes it as PNG. */
export async function renderStrip(recipe: VfxRecipe): Promise<Buffer> {
  const { size, frames } = recipe;
  const width = size * frames;
  const strip = new Uint8Array(width * size * 4);
  for (let i = 0; i < frames; i++) {
    const frame = new Frame(size);
    recipe.paint(frame, i);
    const bytes = frame.bytes();
    for (let y = 0; y < size; y++) {
      const src = y * size * 4;
      const dst = (y * width + i * size) * 4;
      strip.set(bytes.subarray(src, src + size * 4), dst);
    }
  }
  return sharp(Buffer.from(strip.buffer, strip.byteOffset, strip.byteLength), {
    raw: { width, height: size, channels: 4 },
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

export async function buildGeneratedVfx(ctx: BuildContext): Promise<void> {
  for (const recipe of VFX_RECIPES) {
    await ctx.cached(`generated-vfx:${recipe.key}`, RECIPE_SOURCES, async () => {
      const data = await renderStrip(recipe);
      const out = await ctx.emit('vfx/generated', recipe.key.replace(/^fx\.gen\./, ''), 'png', data);
      const entry: FxEntry = {
        kind: 'fx',
        group: 'vfx',
        url: out.url,
        w: recipe.size * recipe.frames,
        h: recipe.size,
        frameW: recipe.size,
        frameH: recipe.size,
        cols: recipe.frames,
        frames: recipe.frames,
        fps: recipe.fps,
      };
      return { outputs: [out.rel], entries: { [recipe.key]: entry } };
    });
  }
}
