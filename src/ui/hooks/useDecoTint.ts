/**
 * Tints the ivory pixel deco frames at runtime (canvas `source-in`) so one asset serves every
 * rarity and accent colour without shipping tinted copies (ADR-021). All frames live in one
 * packed sheet that is decoded once at boot; a tint is a synchronous copy of a 96 px frame and
 * the resulting data URL is cached for the session, so frames never flash their source colour.
 */
import { decoSheet } from '@assets/manifest';
import type { DecoKey } from '@assets/manifest.generated';

const PREFIX = 'deco.';
const EMPTY = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

let sheet: HTMLImageElement | null = null;
const tints = new Map<string, string>();
let scratch: HTMLCanvasElement | null = null;

/** Decodes the deco sheet once; app bootstrap awaits this before the first screen renders. */
export async function loadDecoImages(): Promise<void> {
  if (sheet) return;
  const image = new Image();
  image.decoding = 'async';
  image.src = decoSheet().url;
  try {
    await image.decode();
    sheet = image;
  } catch {
    // Frames render empty until the next boot; the rest of the UI is unaffected.
  }
}

/** Data URL of a deco frame, tinted with `color` (or untinted for `null`); cached per pair. */
export function decoTintUrl(key: DecoKey, color: string | null): string {
  const id = `${key}|${color ?? ''}`;
  const hit = tints.get(id);
  if (hit) return hit;
  const frame = decoSheet().frames[key.slice(PREFIX.length)];
  if (!sheet || !frame) return EMPTY;
  scratch ??= document.createElement('canvas');
  scratch.width = frame.w;
  scratch.height = frame.h;
  const ctx = scratch.getContext('2d');
  if (!ctx) return EMPTY;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, frame.w, frame.h);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, frame.x, frame.y, frame.w, frame.h, 0, 0, frame.w, frame.h);
  if (color) {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, frame.w, frame.h);
  }
  const url = scratch.toDataURL('image/png');
  tints.set(id, url);
  return url;
}

/** Hook-shaped alias for components; the work is synchronous and memoised per (frame, colour). */
export function useDecoTint(key: DecoKey, color: string | null): string {
  return decoTintUrl(key, color);
}
