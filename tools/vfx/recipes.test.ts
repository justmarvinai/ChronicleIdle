import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { Frame } from './painter.ts';
import { renderStrip } from './build.ts';
import { VFX_RECIPES } from './recipes.ts';

describe('generated flipbooks', () => {
  it('paints most frames of every recipe with visible pixels inside the frame', () => {
    for (const recipe of VFX_RECIPES) {
      const visible: number[] = [];
      for (let i = 0; i < recipe.frames; i++) {
        const frame = new Frame(recipe.size);
        recipe.paint(frame, i);
        const bytes = frame.bytes();
        let count = 0;
        for (let p = 3; p < bytes.length; p += 4) if ((bytes[p] as number) > 8) count++;
        visible.push(count);
      }
      // Effects may start on a delay and fade out; at least 60 % of the frames must show something.
      const painted = visible.filter((v) => v > 20).length;
      expect(painted, `${recipe.key} ${visible.join(' ')}`).toBeGreaterThanOrEqual(
        Math.ceil(recipe.frames * 0.6),
      );
      expect(Math.max(...visible), recipe.key).toBeGreaterThan(200);
    }
  });

  it('renders deterministic strips with the manifest dimensions', async () => {
    const recipe = VFX_RECIPES.find((r) => r.key === 'fx.gen.sparks');
    if (!recipe) throw new Error('missing recipe');
    const [a, b] = await Promise.all([renderStrip(recipe), renderStrip(recipe)]);
    expect(a.equals(b)).toBe(true);
    const meta = await sharp(a).metadata();
    expect(meta.width).toBe(recipe.size * recipe.frames);
    expect(meta.height).toBe(recipe.size);
    expect(meta.channels).toBe(4);
  });
});
