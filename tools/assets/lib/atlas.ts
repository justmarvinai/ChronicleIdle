import sharp, { type OverlayOptions } from 'sharp';
import type { AtlasAnimation, AtlasFrame } from '@assets/manifest-types';

export interface PackInput {
  name: string;
  data: Buffer;
  w: number;
  h: number;
}

export interface Packed {
  frames: Record<string, AtlasFrame>;
  w: number;
  h: number;
  png: Buffer;
}

/**
 * Shelf-packs frames (tallest first) into rows no wider than `maxWidth`. Good enough for the
 * uniform pixel deco frames; the model atlases keep their one-row-per-animation layout.
 */
export async function packShelves(inputs: PackInput[], maxWidth = 2048): Promise<Packed> {
  const sorted = [...inputs].sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
  const frames: Record<string, AtlasFrame> = {};
  const composites: OverlayOptions[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  let w = 0;
  for (const f of sorted) {
    if (x > 0 && x + f.w > maxWidth) {
      y += rowH;
      x = 0;
      rowH = 0;
    }
    frames[f.name] = { x, y, w: f.w, h: f.h };
    composites.push({ input: f.data, left: x, top: y });
    x += f.w;
    rowH = Math.max(rowH, f.h);
    w = Math.max(w, x);
  }
  const h = y + rowH;
  const png = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
  return { frames, w, h, png };
}

/** Pixi-compatible spritesheet JSON so any atlas can also be loaded on the battle stage. */
export function pixiAtlasJson(
  frames: Record<string, AtlasFrame>,
  animations: Record<string, AtlasAnimation>,
  imageName: string,
  w: number,
  h: number,
): string {
  return JSON.stringify({
    frames: Object.fromEntries(
      Object.entries(frames).map(([name, r]) => [
        name,
        {
          frame: r,
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: r.w, h: r.h },
          sourceSize: { w: r.w, h: r.h },
        },
      ]),
    ),
    animations: Object.fromEntries(Object.entries(animations).map(([n, a]) => [n, a.frames])),
    meta: {
      app: 'chronicleidle-assets',
      version: '1',
      image: imageName,
      format: 'RGBA8888',
      size: { w, h },
      scale: '1',
    },
  });
}
