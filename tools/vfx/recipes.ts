/**
 * Procedural flipbook recipes (docs/tech/ASSETS.md "generated VFX", ARCHITECTURE.md §9). Each
 * recipe paints its frames deterministically; the build renders them into a horizontal strip
 * with the same manifest shape as the owner's packs, keyed `fx.gen.<name>`. Frames are painted
 * in white-ish light so the runtime can tint them per element or status.
 */
import { type Frame, type Rgb, clamp01, lerp, mixRgb, rng } from './painter.ts';

export interface VfxRecipe {
  key: string;
  /** Square frame size in px. */
  size: number;
  frames: number;
  fps: number;
  paint: (frame: Frame, index: number) => void;
}

const WHITE: Rgb = [1, 1, 1];
const WARM: Rgb = [1, 0.86, 0.6];
const EMBER: Rgb = [1, 0.55, 0.25];
const PALE_GOLD: Rgb = [1, 0.93, 0.7];
const ASH: Rgb = [0.55, 0.52, 0.56];

/** A bright crescent sweeping across the target: the physical-hit slash. */
const slashArc: VfxRecipe = {
  key: 'fx.gen.slash_arc',
  size: 96,
  frames: 12,
  fps: 30,
  paint(frame, i) {
    const t = i / (this.frames - 1);
    const c = this.size / 2;
    // A crescent sweeps ~200° from upper-right to lower-left in the first half, then dissolves.
    const sweep = lerp(-1.9, 1.6, clamp01(t * 1.6));
    const life = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
    const trail = lerp(1.2, 2.4, clamp01(t * 1.6));
    const r = lerp(26, 38, clamp01(t * 1.6));
    frame.arc(c, c, r, 22, sweep - trail, sweep, WARM, 0.5 * life, (k) => k * k, 12);
    frame.arc(c, c, r, 11, sweep - trail, sweep, WHITE, 1 * life, (k) => Math.pow(k, 1.6), 5);
    frame.arc(c, c, r, 4, sweep - trail * 0.9, sweep, WHITE, 1 * life, (k) => Math.pow(k, 1.2), 1.5);
    // Leading tip flare.
    const tipX = c + Math.cos(sweep) * r;
    const tipY = c + Math.sin(sweep) * r;
    frame.dot(tipX, tipY, 10 * life, WHITE, 1 * life);
    frame.dot(tipX, tipY, 20 * life, WARM, 0.4 * life);
    // A thinner counter-cut a few frames later reads as a double strike.
    if (t > 0.35) {
      const k = clamp01((t - 0.35) / 0.65);
      const sweep2 = lerp(1.2, 4.2, k);
      frame.arc(c, c, r * 0.72, 8, sweep2 - 1.4, sweep2, WHITE, 0.9 * (1 - k), (q) => q * q, 3.5);
    }
  },
};

/** Radial sparks with gravity: layered over crits and physical hits. */
const sparks: VfxRecipe = {
  key: 'fx.gen.sparks',
  size: 96,
  frames: 10,
  fps: 30,
  paint(frame, i) {
    const random = rng(7);
    const t = i / (this.frames - 1);
    const c = this.size / 2;
    const count = 30;
    for (let p = 0; p < count; p++) {
      const angle = random() * Math.PI * 2;
      const speed = lerp(26, 64, random());
      const spin = random();
      const size = lerp(2.2, 4.2, random());
      const life = clamp01(1 - t * lerp(1.05, 1.6, random()));
      if (life <= 0) continue;
      const age = t * 1.1;
      const prev = Math.max(0, age - 0.16);
      const x = c + Math.cos(angle) * speed * age;
      const y = c + Math.sin(angle) * speed * age + 40 * age * age;
      const px = c + Math.cos(angle) * speed * prev;
      const py = c + Math.sin(angle) * speed * prev + 40 * prev * prev;
      const color = mixRgb(WHITE, EMBER, clamp01(t * 0.9 + spin * 0.25));
      frame.line(px, py, x, y, size * (0.5 + 0.5 * life), color, life, size * 0.5);
      frame.dot(x, y, size * 0.9, WHITE, 0.8 * life, size * 0.6);
    }
    // Core flash for the first frames.
    const flash = clamp01(1 - t * 3.2);
    if (flash > 0) {
      frame.dot(c, c, 18 * flash + 4, WHITE, 0.9 * flash);
      frame.dot(c, c, 32 * flash + 6, WARM, 0.4 * flash);
    }
  },
};

/** A breathing runic ring: turn-meter gains, buffs, empowered turns. */
const runeRing: VfxRecipe = {
  key: 'fx.gen.rune_ring',
  size: 128,
  frames: 16,
  fps: 24,
  paint(frame, i) {
    const t = i / this.frames;
    const c = this.size / 2;
    const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
    const r = lerp(38, 46, breathe);
    const glow = lerp(0.35, 0.7, breathe);
    frame.arc(c, c, r, 10, 0, Math.PI * 2, PALE_GOLD, glow * 0.45, () => 1, 6);
    frame.arc(c, c, r, 3, 0, Math.PI * 2, WHITE, glow, () => 1, 1.5);
    // Eight tick marks orbiting; four longer ones read as cardinal runes.
    const spin = t * Math.PI * 2;
    for (let k = 0; k < 8; k++) {
      const a = spin + (k * Math.PI) / 4;
      const long = k % 2 === 0;
      const inner = r - (long ? 9 : 5);
      const outer = r + (long ? 9 : 5);
      frame.line(
        c + Math.cos(a) * inner,
        c + Math.sin(a) * inner,
        c + Math.cos(a) * outer,
        c + Math.sin(a) * outer,
        long ? 3 : 2,
        WHITE,
        0.85,
        1,
      );
    }
    // Inner sigil: three dots on a slower counter-rotation.
    for (let k = 0; k < 3; k++) {
      const a = -spin * 0.5 + (k * Math.PI * 2) / 3;
      frame.dot(c + Math.cos(a) * 16, c + Math.sin(a) * 16, 3.5, PALE_GOLD, 0.8 * (0.6 + 0.4 * breathe));
    }
    frame.dot(c, c, 24, PALE_GOLD, 0.12 + 0.1 * breathe, 22);
  },
};

/** Rising ash puff: deaths and dissolves. Tinted grey at runtime by default. */
const smoke: VfxRecipe = {
  key: 'fx.gen.smoke',
  size: 96,
  frames: 12,
  fps: 20,
  paint(frame, i) {
    const random = rng(21);
    const t = i / (this.frames - 1);
    const c = this.size / 2;
    for (let p = 0; p < 9; p++) {
      const ox = lerp(-14, 14, random());
      const oy = lerp(-6, 10, random());
      const drift = lerp(-10, 10, random());
      const delay = random() * 0.25;
      const k = clamp01((t - delay) / (1 - delay));
      if (k <= 0) continue;
      const r = lerp(6, 24, Math.sqrt(k));
      const alpha = 0.55 * (1 - k) * (1 - k * 0.3);
      const x = c + ox + drift * k;
      const y = c + oy + 6 - 34 * k;
      const shade = mixRgb(ASH, WHITE, 0.25 * (1 - k));
      frame.dot(x, y, r, shade, alpha, r * 0.8);
    }
  },
};

/** Horizontal streaks for lunges and the cut-in: play flipped for right-to-left movers. */
const speedLines: VfxRecipe = {
  key: 'fx.gen.speed_lines',
  size: 128,
  frames: 8,
  fps: 30,
  paint(frame, i) {
    const random = rng(99);
    const t = i / (this.frames - 1);
    for (let p = 0; p < 12; p++) {
      const y = lerp(8, 120, random());
      const len = lerp(40, 110, random());
      const start = lerp(-20, 40, random());
      const phase = random() * 0.35;
      const width = lerp(2, 4.5, random());
      const k = clamp01((t - phase) / (1 - phase));
      if (k <= 0) continue;
      const alpha = Math.sin(k * Math.PI);
      const head = start + len * (0.5 + 0.5 * k) + 50 * k;
      const tail = head - len * (1 - 0.4 * k);
      frame.line(tail, y, head, y, width, WHITE, alpha, width * 0.5);
      frame.dot(head, y, width * 0.9, WHITE, alpha);
    }
  },
};

export const VFX_RECIPES: readonly VfxRecipe[] = [slashArc, sparks, runeRing, smoke, speedLines];
