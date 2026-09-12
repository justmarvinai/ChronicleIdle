/**
 * Pixi ambient layer: fog, embers, fireflies, motes, light rays and lantern glows over a screen
 * backdrop (CLAUDE.md §7.1 "nothing is a flat colour"). Pure presentation; no game state.
 */
import { Application, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { createRng } from '@engine/rng/rng';
import { ParticleField, makeFogTexture, makeGlowTexture } from './particles';
import { AMBIENT_PRESETS, type AmbientPreset, type GlowPoint } from './presets';

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export interface AmbientHandle {
  destroy(): void;
  setPaused(paused: boolean): void;
  setGlows(glows: GlowPoint[]): void;
}

interface FogLayer {
  sprites: { sprite: Sprite; speed: number; phase: number }[];
}

export async function createAmbientScene(
  host: HTMLElement,
  presetName: keyof typeof AMBIENT_PRESETS,
  glows: GlowPoint[] = [],
): Promise<AmbientHandle> {
  const preset: AmbientPreset = AMBIENT_PRESETS[presetName];
  // Presentation-only randomness, still seeded so a given screen always looks the same on load.
  const rng = createRng(`ambient:${presetName}`);
  const app = new Application();
  await app.init({
    width: STAGE_W,
    height: STAGE_H,
    backgroundAlpha: 0,
    antialias: true,
    resolution: 1,
    autoDensity: false,
    preference: 'webgl',
    powerPreference: 'low-power',
  });
  // Ambient motion is slow (fog drift, flicker); 30 fps halves the fill-rate cost on iGPUs.
  app.ticker.maxFPS = 30;
  host.appendChild(app.canvas);
  app.canvas.style.width = '100%';
  app.canvas.style.height = '100%';
  app.canvas.style.display = 'block';

  const root = new Container();
  app.stage.addChild(root);
  const glowTexture = makeGlowTexture(app.renderer, 64);
  const softTexture = makeGlowTexture(app.renderer, 128, 0.02);
  const fields: ParticleField[] = [];
  let fog: FogLayer | null = null;
  const glowSprites: { sprite: Sprite; base: GlowPoint; phase: number }[] = [];
  const glowLayer = new Container();
  glowLayer.blendMode = 'add';

  // Light rays (title/interior): long translucent wedges slowly swaying.
  const rays: { g: Graphics; phase: number }[] = [];
  if (preset.rays) {
    const rayLayer = new Container();
    rayLayer.blendMode = 'add';
    for (let i = 0; i < preset.rays.count; i++) {
      const g = new Graphics();
      const x = 300 + (i / preset.rays.count) * 1300;
      g.moveTo(x, -50)
        .lineTo(x + 120, -50)
        .lineTo(x + 520, STAGE_H + 50)
        .lineTo(x + 40, STAGE_H + 50)
        .closePath()
        .fill({ color: preset.rays.tint, alpha: preset.rays.alpha });
      rayLayer.addChild(g);
      rays.push({ g, phase: i * 1.3 });
    }
    root.addChild(rayLayer);
  }

  // Fog: large soft blobs drifting sideways within a vertical band.
  if (preset.fog) {
    const fogTexture: Texture = makeFogTexture(256, 7);
    const layer = new Container();
    layer.blendMode = 'screen';
    const sprites: FogLayer['sprites'] = [];
    for (let i = 0; i < preset.fog.count; i++) {
      const sprite = new Sprite(fogTexture);
      sprite.anchor.set(0.5);
      const scale = 2.5 + rng.next() * 3;
      sprite.scale.set(scale, scale * 0.55);
      sprite.tint = preset.fog.tint;
      sprite.alpha = preset.fog.alpha * (0.6 + rng.next() * 0.6);
      sprite.x = rng.next() * STAGE_W;
      sprite.y = preset.fog.band[0] + rng.next() * (preset.fog.band[1] - preset.fog.band[0]);
      layer.addChild(sprite);
      sprites.push({ sprite, speed: preset.fog.speed * (0.5 + rng.next()), phase: rng.next() * 6 });
    }
    root.addChild(layer);
    fog = { sprites };
  }

  if (preset.embers) {
    const [x, y, w, h] = preset.embers.area;
    fields.push(
      new ParticleField({
        rng: rng.fork('embers'),
        count: preset.embers.count,
        texture: glowTexture,
        blend: 'add',
        tint: preset.embers.tint,
        area: { x, y, w, h },
        size: [3, 9],
        alpha: [0.35, 0.9],
        vx: [-8, 8],
        vy: [-42, -14],
        life: [4, 9],
        wobble: { amp: 26, rate: 1.4 },
        flicker: 0.5,
      }),
    );
  }
  if (preset.fireflies) {
    const [x, y, w, h] = preset.fireflies.area;
    fields.push(
      new ParticleField({
        rng: rng.fork('fireflies'),
        count: preset.fireflies.count,
        texture: glowTexture,
        blend: 'add',
        tint: preset.fireflies.tint,
        area: { x, y, w, h },
        size: [4, 8],
        alpha: [0.2, 0.75],
        vx: [-14, 14],
        vy: [-10, 10],
        life: [5, 11],
        wobble: { amp: 40, rate: 0.9 },
        flicker: 0.9,
        pulse: 0.3,
      }),
    );
  }
  if (preset.motes) {
    fields.push(
      new ParticleField({
        rng: rng.fork('motes'),
        count: preset.motes.count,
        texture: softTexture,
        blend: 'screen',
        tint: preset.motes.tint,
        area: { x: 0, y: 0, w: STAGE_W, h: STAGE_H },
        size: [2, 5],
        alpha: [0.15, 0.5],
        vx: [-6, 6],
        vy: [-6, 3],
        life: [8, 16],
        wobble: { amp: 18, rate: 0.6 },
      }),
    );
  }
  for (const field of fields) root.addChild(field.container);
  root.addChild(glowLayer);

  const applyGlows = (points: GlowPoint[]): void => {
    for (const g of glowSprites) g.sprite.destroy();
    glowSprites.length = 0;
    for (const base of points) {
      const sprite = new Sprite(softTexture);
      sprite.anchor.set(0.5);
      sprite.x = base.x;
      sprite.y = base.y;
      sprite.width = base.size;
      sprite.height = base.size;
      sprite.tint = base.color;
      sprite.alpha = 0.55;
      glowLayer.addChild(sprite);
      glowSprites.push({ sprite, base, phase: rng.next() * 10 });
    }
  };
  applyGlows(glows.length ? glows : preset.glows);

  let paused = false;
  let time = 0;
  app.ticker.add((ticker) => {
    if (paused) return;
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    time += dt;
    for (const field of fields) field.update(dt, time);
    if (fog) {
      for (const f of fog.sprites) {
        f.sprite.x += f.speed * dt;
        f.sprite.y += Math.sin(time * 0.2 + f.phase) * 2 * dt;
        if (f.sprite.x > STAGE_W + 400) f.sprite.x = -400;
      }
    }
    for (const r of rays) {
      r.g.alpha = 0.7 + 0.3 * Math.sin(time * 0.35 + r.phase);
      r.g.x = Math.sin(time * 0.12 + r.phase) * 30;
    }
    for (const g of glowSprites) {
      const flick =
        1 -
        g.base.flicker * (0.5 + 0.5 * Math.sin(time * 9 + g.phase) * Math.sin(time * 2.3 + g.phase * 0.7));
      g.sprite.alpha = 0.55 * flick;
      const s = g.base.size * (0.95 + 0.05 * Math.sin(time * 3 + g.phase));
      g.sprite.width = s;
      g.sprite.height = s;
    }
  });

  return {
    destroy() {
      for (const field of fields) field.destroy();
      app.destroy(true, { children: true, texture: true });
    },
    setPaused(value) {
      paused = value;
      if (value) app.ticker.stop();
      else app.ticker.start();
    },
    setGlows: applyGlows,
  };
}
