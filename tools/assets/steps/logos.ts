import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { ImageEntry, SvgEntry } from '@assets/manifest-types';
import type { BuildContext } from '../lib/context.ts';
import { ICONS_ROOT, SOURCE_ROOT, listFiles, sanitize, writeAtomic } from '../lib/util.ts';

const DARK = { r: 11, g: 10, b: 13, alpha: 1 };

/** Wraps the logo's filled paths into a square SVG on the game's dark ground. */
function squareSvg(logoSvg: string, size: number, safeFraction: number): string {
  const viewBox = /viewBox="([\d.\s-]+)"/.exec(logoSvg)?.[1]?.split(/\s+/).map(Number) ?? [0, 0, 1, 1];
  const [vx = 0, vy = 0, vw = 1, vh = 1] = viewBox;
  const paths = [...logoSvg.matchAll(/<path class="st0" d="([^"]+)"\/>/g)]
    .map((m) => `<path fill="#f3ecdc" d="${m[1]}"/>`)
    .join('');
  const scale = (size * safeFraction) / Math.max(vw, vh);
  const tx = (size - vw * scale) / 2 - vx * scale;
  const ty = (size - vh * scale) / 2 - vy * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#0b0a0d"/><rect x="${size * 0.06}" y="${size * 0.06}" width="${size * 0.88}" height="${size * 0.88}" fill="none" stroke="#c9a24a" stroke-width="${size * 0.012}"/><g transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)})">${paths}</g></svg>`;
}

export async function buildLogos(ctx: BuildContext): Promise<void> {
  const dir = join(SOURCE_ROOT, 'logos');
  const svgFile = (await listFiles(dir, (f) => f.endsWith('.svg')))[0];
  const pngFile = (await listFiles(dir, (f) => f.endsWith('.png')))[0];
  if (svgFile) {
    const source = join(dir, svgFile);
    const name = sanitize(svgFile.replace(/\.svg$/, ''));
    await ctx.cached(`logo:${svgFile}`, [source], async () => {
      const svg = await readFile(source, 'utf8');
      const out = await ctx.emit('logos', name, 'svg', Buffer.from(svg));
      // PWA icons and favicon live at stable paths (referenced by the web manifest and index.html).
      const icon = squareSvg(svg, 512, 0.8);
      const maskable = squareSvg(svg, 512, 0.58);
      const favicon = squareSvg(svg, 64, 0.84);
      const icon192 = await sharp(Buffer.from(icon)).resize(192, 192).png().toBuffer();
      const icon512 = await sharp(Buffer.from(icon)).png().toBuffer();
      const icon512m = await sharp(Buffer.from(maskable)).png().toBuffer();
      const favicon32 = await sharp(Buffer.from(favicon)).resize(32, 32).png().toBuffer();
      const outputs: string[] = [out.rel];
      for (const [file, data] of [
        ['icon-192.png', icon192],
        ['icon-512.png', icon512],
        ['icon-512-maskable.png', icon512m],
        ['favicon-32.png', favicon32],
        ['favicon.svg', Buffer.from(favicon)],
      ] as const) {
        const path = join(ICONS_ROOT, file);
        await writeAtomic(path, data);
        outputs.push(path);
      }
      const entry: SvgEntry = { kind: 'svg', group: 'logos', url: out.url };
      return { outputs, entries: { [`logo.${name}`]: entry } };
    });
  }
  if (pngFile) {
    const source = join(dir, pngFile);
    const name = sanitize(pngFile.replace(/\.png$/, ''));
    await ctx.cached(`logo:${pngFile}`, [source], async () => {
      // 6848 px wide source → a 1600 px WebP is plenty for the title screen at 1920 virtual px.
      const data = await sharp(source)
        .resize(1600, null, { fit: 'inside', background: DARK })
        .webp({ quality: 90, alphaQuality: 100 })
        .toBuffer();
      const meta = await sharp(data).metadata();
      const out = await ctx.emit('logos', `${name}-1600`, 'webp', data);
      const entry: ImageEntry = {
        kind: 'image',
        group: 'logos',
        url: out.url,
        w: meta.width ?? 0,
        h: meta.height ?? 0,
      };
      return { outputs: [out.rel], entries: { [`logo.${name}_png`]: entry } };
    });
  }
}
