/**
 * Tiny deterministic raster toolkit for the procedural flipbooks (docs/tech/ASSETS.md "generated
 * VFX"). A frame is a straight-alpha RGBA float canvas; primitives are soft signed-distance
 * shapes composited "over" so the result reads like painted light on transparency.
 */
export type Rgb = readonly [number, number, number];

export class Frame {
  readonly data: Float32Array;

  constructor(readonly size: number) {
    this.data = new Float32Array(size * size * 4);
  }

  /** Composites one straight-alpha pixel over the canvas. */
  blend(x: number, y: number, color: Rgb, alpha: number): void {
    if (alpha <= 0 || x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    const i = (y * this.size + x) * 4;
    const a = Math.min(1, alpha);
    const d = this.data;
    const outA = a + (d[i + 3] as number) * (1 - a);
    if (outA <= 0) return;
    for (let c = 0; c < 3; c++) {
      const src = (color[c] as number) * a;
      const dst = (d[i + c] as number) * (d[i + 3] as number) * (1 - a);
      d[i + c] = (src + dst) / outA;
    }
    d[i + 3] = outA;
  }

  /** Soft disc: full alpha inside `r - soft`, fading to 0 at `r`. */
  dot(cx: number, cy: number, r: number, color: Rgb, alpha: number, soft = r * 0.6): void {
    const x0 = Math.max(0, Math.floor(cx - r - 1));
    const x1 = Math.min(this.size - 1, Math.ceil(cx + r + 1));
    const y0 = Math.max(0, Math.floor(cy - r - 1));
    const y1 = Math.min(this.size - 1, Math.ceil(cy + r + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        this.blend(x, y, color, alpha * coverage(d, r, soft));
      }
    }
  }

  /** Soft capsule between two points. */
  line(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    color: Rgb,
    alpha: number,
    soft = width * 0.5,
  ): void {
    const half = width / 2;
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1));
    const maxX = Math.min(this.size - 1, Math.ceil(Math.max(x0, x1) + half + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1));
    const maxY = Math.min(this.size - 1, Math.ceil(Math.max(y0, y1) + half + 1));
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len2 = dx * dx + dy * dy || 1;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;
        const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
        const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
        this.blend(x, y, color, alpha * coverage(d, half, soft));
      }
    }
  }

  /**
   * Soft arc of a ring: radius `r`, stroke `width`, from `a0` to `a1` radians (clockwise in
   * screen space). `fade(t)` scales alpha along the arc (t = 0 at `a0`).
   */
  arc(
    cx: number,
    cy: number,
    r: number,
    width: number,
    a0: number,
    a1: number,
    color: Rgb,
    alpha: number,
    fade: (t: number) => number = () => 1,
    soft = width * 0.5,
  ): void {
    const half = width / 2;
    const reach = r + half + 1;
    const x0 = Math.max(0, Math.floor(cx - reach));
    const x1 = Math.min(this.size - 1, Math.ceil(cx + reach));
    const y0 = Math.max(0, Math.floor(cy - reach));
    const y1 = Math.min(this.size - 1, Math.ceil(cy + reach));
    const span = a1 - a0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - cx;
        const py = y + 0.5 - cy;
        const d = Math.abs(Math.hypot(px, py) - r);
        if (d > half + soft) continue;
        let ang = Math.atan2(py, px) - a0;
        ang = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (ang > span) continue;
        const t = span > 0 ? ang / span : 0;
        this.blend(x, y, color, alpha * fade(t) * coverage(d, half, soft));
      }
    }
  }

  /** Straight-alpha 8-bit RGBA bytes. */
  bytes(): Uint8Array {
    const out = new Uint8Array(this.data.length);
    for (let i = 0; i < this.data.length; i++)
      out[i] = Math.round(Math.max(0, Math.min(1, this.data[i] as number)) * 255);
    return out;
  }
}

/** 1 inside `r - soft`, 0 beyond `r`, smooth in between. */
function coverage(d: number, r: number, soft: number): number {
  if (d <= r - soft) return 1;
  if (d >= r) return 0;
  const t = (r - d) / Math.max(soft, 1e-6);
  return t * t * (3 - 2 * t);
}

/** mulberry32: the same seed always paints the same particles. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
export const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
