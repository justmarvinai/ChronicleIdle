/**
 * Lightweight particle systems for ambient layers (embers, fireflies, motes, fog). Pixi sprites
 * share a few procedurally generated textures so everything batches into one draw call per layer.
 */
import { Container, Sprite, Texture, type Renderer } from 'pixi.js';
import type { Rng } from '@engine/rng/rng';

export interface ParticleConfig {
  /** Seeded stream so a screen's ambience is reproducible (screenshots, perf runs). */
  rng: Rng;
  count: number;
  texture: Texture;
  blend: 'add' | 'screen' | 'normal';
  tint: number | number[];
  /** Spawn area in stage px. */
  area: { x: number; y: number; w: number; h: number };
  size: [number, number];
  alpha: [number, number];
  /** Velocity ranges px/s. */
  vx: [number, number];
  vy: [number, number];
  /** Lifetime seconds. */
  life: [number, number];
  /** Sinusoidal drift amplitude px and rate. */
  wobble?: { amp: number; rate: number };
  /** Alpha flicker (fireflies/lanterns). */
  flicker?: number;
  /** Scale pulse amount. */
  pulse?: number;
}

interface Particle {
  sprite: Sprite;
  age: number;
  life: number;
  vx: number;
  vy: number;
  baseAlpha: number;
  baseScale: number;
  phase: number;
  x0: number;
}

const rand = (rng: Rng, min: number, max: number): number => min + rng.next() * (max - min);

export class ParticleField {
  readonly container = new Container();
  private particles: Particle[] = [];
  private cfg: ParticleConfig;

  constructor(cfg: ParticleConfig) {
    this.cfg = cfg;
    this.container.blendMode = cfg.blend;
    for (let i = 0; i < cfg.count; i++) {
      const sprite = new Sprite(cfg.texture);
      sprite.anchor.set(0.5);
      this.container.addChild(sprite);
      const p: Particle = {
        sprite,
        age: 0,
        life: 1,
        vx: 0,
        vy: 0,
        baseAlpha: 1,
        baseScale: 1,
        phase: 0,
        x0: 0,
      };
      this.reset(p, true);
      this.particles.push(p);
    }
  }

  private reset(p: Particle, initial = false): void {
    const c = this.cfg;
    const size = rand(c.rng, c.size[0], c.size[1]);
    p.sprite.width = size;
    p.sprite.height = size;
    p.baseScale = p.sprite.scale.x;
    p.sprite.tint = Array.isArray(c.tint) ? c.rng.pick(c.tint) : c.tint;
    p.x0 = rand(c.rng, c.area.x, c.area.x + c.area.w);
    p.sprite.x = p.x0;
    p.sprite.y = rand(c.rng, c.area.y, c.area.y + c.area.h);
    p.vx = rand(c.rng, c.vx[0], c.vx[1]);
    p.vy = rand(c.rng, c.vy[0], c.vy[1]);
    p.life = rand(c.rng, c.life[0], c.life[1]);
    p.age = initial ? c.rng.next() * p.life : 0;
    p.baseAlpha = rand(c.rng, c.alpha[0], c.alpha[1]);
    p.phase = c.rng.next() * Math.PI * 2;
  }

  update(dt: number, time: number): void {
    const c = this.cfg;
    for (const p of this.particles) {
      p.age += dt;
      if (p.age >= p.life) this.reset(p);
      const t = p.age / p.life;
      // Fade in over the first 15 %, out over the last 30 %.
      const envelope = t < 0.15 ? t / 0.15 : t > 0.7 ? (1 - t) / 0.3 : 1;
      p.sprite.y += p.vy * dt;
      p.sprite.x += p.vx * dt;
      if (c.wobble) p.sprite.x += Math.sin(time * c.wobble.rate + p.phase) * c.wobble.amp * dt;
      let alpha = p.baseAlpha * envelope;
      if (c.flicker) alpha *= 1 - c.flicker * (0.5 + 0.5 * Math.sin(time * 7 + p.phase * 3));
      p.sprite.alpha = alpha;
      if (c.pulse) {
        const s = p.baseScale * (1 + c.pulse * Math.sin(time * 2 + p.phase));
        p.sprite.scale.set(s);
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

/** Soft radial dot used by embers, fireflies and motes. */
export function makeGlowTexture(renderer: Renderer, size = 64, hard = 0.15): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(hard, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = Texture.from(canvas);
  void renderer;
  return texture;
}

/** Blurry fog blob: layered noise softened with a radial falloff. */
export function makeFogTexture(size = 256, seed = 1): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    let s = seed;
    const random = (): number => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    ctx.fillStyle = 'rgba(0,0,0,0)';
    for (let i = 0; i < 90; i++) {
      const r = 24 + random() * 60;
      const x = random() * size;
      const y = random() * size;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${0.05 + random() * 0.08})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'destination-in';
    const falloff = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
    falloff.addColorStop(0, 'rgba(0,0,0,1)');
    falloff.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = falloff;
    ctx.fillRect(0, 0, size, size);
  }
  return Texture.from(canvas);
}
