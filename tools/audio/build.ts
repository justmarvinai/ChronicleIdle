/**
 * Renders the generated sound recipes into the asset pipeline. Recipes are source; the rendered
 * Ogg files are build artifacts (docs/tech/CONTENT_AUTHORING.md §10).
 */
import { join } from 'node:path';
import type { AudioEntry } from '@assets/manifest-types';
import type { BuildContext } from '../assets/lib/context.ts';
import { encodeOgg } from '../assets/lib/ogg.ts';
import { rmsDb } from '../assets/lib/wav.ts';
import { SR } from './synth.ts';
import { RECIPES } from './recipes.ts';

const RECIPE_SOURCES = [join(import.meta.dirname, 'recipes.ts'), join(import.meta.dirname, 'synth.ts')];

export async function buildGeneratedAudio(ctx: BuildContext): Promise<void> {
  for (const recipe of RECIPES) {
    await ctx.cached(`generated-audio:${recipe.key}`, RECIPE_SOURCES, async () => {
      const [left, right] = recipe.render();
      const level = rmsDb([left, right]);
      const data = await encodeOgg([left, right], SR, recipe.quality);
      const out = await ctx.emit('audio/generated', recipe.key.replace(/\./g, '-'), 'ogg', data);
      const entry: AudioEntry = {
        kind: 'audio',
        group: recipe.key.startsWith('ambience.') ? 'ambience' : 'audio',
        loop: recipe.loop,
        variants: [
          {
            url: out.url,
            duration: Math.round((left.length / SR) * 1000) / 1000,
            rmsDb: Math.round(level * 10) / 10,
          },
        ],
      };
      return { outputs: [out.rel], entries: { [recipe.key]: entry } };
    });
  }
}
