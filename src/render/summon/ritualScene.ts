/**
 * The summoning ritual (docs/design/SUMMONING.md §5, UI_DESIGN.md §5.12): a Pixi scene over the
 * violet gate. The shard falls into the ring, the runes light in sequence, cracks spread and leak
 * light in the rarity's colour, and the burst opens the gate — with a gold pillar and a screen
 * flash for a Legendary, and a rose pillar, slow-motion and a shockwave for a Mythic.
 *
 * Presentation only: it is told a rarity and plays it. Nothing here reads game state, and the
 * cues it fires are sounds the caller owns.
 */
import { gsap } from 'gsap';
import { Application, Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Rarity } from '@content/champions/types';
import { createRng } from '@engine/rng/rng';
import { ParticleField, makeGlowTexture } from '@render/ambient/particles';
import { playFx } from '@render/battle/fx/flipbook';
import type { FxId } from '@render/battle/fx/registry';

export const STAGE_W = 1920;
export const STAGE_H = 1080;
/**
 * Where the ring hangs, in stage pixels. The scene covers the whole 1920×1080 stage (like the
 * ambient layer), so the ring stays a circle at every window size; it sits in the open space
 * between the shard rail and the banner column.
 */
export const RING = { x: 900, y: 470, radius: 210 } as const;

/**
 * Rarity colours as Pixi tints. The same values as `RARITY_HEX` in the UI layer (a card frame and
 * the burst that reveals it must be the same colour); `display-maps.test.ts` keeps them in step.
 */
export const RARITY_TINT: Record<Rarity, number> = {
  common: 0x9a9a9a,
  uncommon: 0x4fc267,
  rare: 0x3f8fe6,
  epic: 0xa35de3,
  legendary: 0xf2a93b,
  mythic: 0xff4d6d,
};

/** The three moments the ritual asks for a sound (SUMMONING.md §5). */
export type RitualCue = 'charge' | 'crack' | 'burst';

export interface RitualHooks {
  cue(cue: RitualCue, rarity: Rarity): void;
}

export interface RitualOptions {
  hooks: RitualHooks;
  /** Ember/mote count; 0 under reduced motion, which also shortens the ritual. */
  particles?: number;
  reducedMotion?: boolean;
}

export interface RitualHandle {
  destroy(): void;
  setPaused(paused: boolean): void;
  /**
   * Plays the ritual for one press. `shardUrl` is the shard's icon; it falls into the ring.
   * Resolves when the burst has finished — the point the card reveal takes over.
   */
  reveal(rarity: Rarity, shardUrl: string): Promise<void>;
  /** Hangs a shard in the ring while the gate waits (SUMMONING.md §5). */
  hover(shardUrl: string): Promise<void>;
  /** Cuts a running ritual to its end; the promise still resolves (SUMMONING.md §5 "skipping"). */
  skip(): void;
  /** True while a ritual is playing. */
  busy(): boolean;
}

const RUNE_COUNT = 12;
/** A Legendary and a Mythic are the only pulls that get a pillar of light. */
const PILLAR: Partial<Record<Rarity, number>> = { legendary: 0xffd37a, mythic: 0xff6f8d };

export async function createRitualScene(host: HTMLElement, options: RitualOptions): Promise<RitualHandle> {
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
  host.appendChild(app.canvas);
  app.canvas.style.width = '100%';
  app.canvas.style.height = '100%';
  app.canvas.style.display = 'block';

  const rng = createRng('summon-ritual');
  const root = new Container();
  app.stage.addChild(root);

  // Layers, back to front: the ring and its runes, the shard, the leaking light, the FX, the
  // pillar, and a full-stage flash.
  const ringLayer = new Container();
  const runeLayer = new Container();
  runeLayer.blendMode = 'add';
  const shardLayer = new Container();
  const glowLayer = new Container();
  glowLayer.blendMode = 'add';
  const fxLayer = new Container();
  const pillarLayer = new Container();
  pillarLayer.blendMode = 'add';
  const flash = new Graphics();
  flash.rect(0, 0, STAGE_W, STAGE_H).fill({ color: 0xffffff, alpha: 1 });
  flash.alpha = 0;
  root.addChild(ringLayer, runeLayer, shardLayer, glowLayer, fxLayer, pillarLayer, flash);

  // The ring: two stone circles with a hairline of gold between them.
  const ring = new Graphics();
  ring
    .circle(RING.x, RING.y, RING.radius)
    .stroke({ color: 0x2a2130, width: 22, alpha: 0.85 })
    .circle(RING.x, RING.y, RING.radius)
    .stroke({ color: 0xc9a24a, width: 2, alpha: 0.5 })
    .circle(RING.x, RING.y, RING.radius - 16)
    .stroke({ color: 0x120e16, width: 6, alpha: 0.6 });
  ringLayer.addChild(ring);

  // Twelve runes around the ring, lit one after another as the shard falls.
  const runes: Graphics[] = [];
  for (let i = 0; i < RUNE_COUNT; i += 1) {
    const angle = (i / RUNE_COUNT) * Math.PI * 2 - Math.PI / 2;
    const x = RING.x + Math.cos(angle) * RING.radius;
    const y = RING.y + Math.sin(angle) * RING.radius;
    const rune = new Graphics();
    rune.rect(-8, -22, 16, 44).fill({ color: 0xffffff, alpha: 1 });
    rune.position.set(x, y);
    rune.rotation = angle + Math.PI / 2;
    rune.alpha = 0;
    // Gold-white: the backdrop is violet, so a violet rune would vanish into it.
    rune.tint = 0xffe9b0;
    runes.push(rune);
    runeLayer.addChild(rune);
  }

  const glowTexture = makeGlowTexture(app.renderer, 256, 0.05);
  const coreGlow = new Sprite(glowTexture);
  coreGlow.anchor.set(0.5);
  coreGlow.position.set(RING.x, RING.y);
  coreGlow.scale.set(1.6);
  coreGlow.alpha = 0;
  const haloGlow = new Sprite(glowTexture);
  haloGlow.anchor.set(0.5);
  haloGlow.position.set(RING.x, RING.y);
  haloGlow.scale.set(4.2);
  haloGlow.alpha = 0;
  glowLayer.addChild(haloGlow, coreGlow);

  // Cracks: six jagged lines out of the centre, drawn from nothing as the shard fails.
  const cracks = new Graphics();
  cracks.position.set(RING.x, RING.y);
  cracks.alpha = 0;
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2 + rng.next() * 0.5;
    let x = 0;
    let y = 0;
    cracks.moveTo(0, 0);
    for (let step = 0; step < 4; step += 1) {
      const length = 26 + rng.next() * 26;
      const wobble = (rng.next() - 0.5) * 0.9;
      x += Math.cos(angle + wobble) * length;
      y += Math.sin(angle + wobble) * length;
      cracks.lineTo(x, y);
    }
    cracks.stroke({ color: 0xffffff, width: 3, alpha: 0.95 });
  }
  glowLayer.addChild(cracks);

  const pillar = new Graphics();
  pillar.rect(RING.x - 130, 0, 260, STAGE_H).fill({ color: 0xffffff, alpha: 1 });
  pillar.alpha = 0;
  pillarLayer.addChild(pillar);

  const shockwave = new Graphics();
  shockwave.circle(0, 0, 100).stroke({ color: 0xffffff, width: 10, alpha: 1 });
  shockwave.position.set(RING.x, RING.y);
  shockwave.alpha = 0;
  pillarLayer.addChild(shockwave);

  // Motes drifting up through the gate, so the scene is never still (CLAUDE.md §7.1).
  const motes =
    (options.particles ?? 40) > 0
      ? new ParticleField({
          rng: createRng('summon-ritual:motes'),
          count: options.particles ?? 40,
          texture: makeGlowTexture(app.renderer, 32),
          blend: 'add',
          tint: [0x9b5de5, 0xc9a24a, 0x6fd4ff],
          area: { x: RING.x - 320, y: RING.y - 120, w: 640, h: 420 },
          size: [3, 9],
          alpha: [0.15, 0.5],
          vx: [-8, 8],
          vy: [-26, -8],
          life: [2.4, 5],
          wobble: { amp: 12, rate: 0.4 },
          flicker: 0.35,
        })
      : null;
  if (motes) glowLayer.addChild(motes.container);

  let shard: Container | null = null;
  let hoverTween: gsap.core.Tween | null = null;
  let hovering: string | null = null;
  /** Guards the async shard load: only the newest `hover` call may take the ring. */
  let hoverSeq = 0;
  const shardCache = new Map<string, Texture>();

  /**
   * The shard as it hangs in the ring: the icon, additively blended and cut to a disc. The icon
   * pack draws on a dark square plate — additive drops most of it and the mask takes the corners,
   * so what is left is the crystal and its own glow.
   */
  async function shardSprite(url: string): Promise<Container | null> {
    try {
      const cached = shardCache.get(url);
      const texture = cached ?? (await Assets.load<Texture>(url));
      shardCache.set(url, texture);
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = 150;
      sprite.height = 150;
      sprite.blendMode = 'add';
      const mask = new Graphics().circle(0, 0, 66).fill({ color: 0xffffff });
      sprite.mask = mask;
      const holder = new Container();
      holder.addChild(sprite, mask);
      return holder;
    } catch {
      return null;
    }
  }

  let paused = false;
  let elapsed = 0;
  let timeline: gsap.core.Timeline | null = null;
  const ticker = (): void => {
    if (paused) return;
    const dt = app.ticker.deltaMS / 1000;
    elapsed += dt;
    motes?.update(dt, elapsed);
  };
  app.ticker.add(ticker);
  app.ticker.maxFPS = 60;

  /** Resting state: the runes dark, a breath of violet in the middle, the ring pulsing. */
  coreGlow.tint = 0x9b5de5;
  coreGlow.alpha = 0.14;
  const idle = gsap.to(ring, {
    alpha: 0.82,
    duration: 2.4,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut',
  });

  /** Hangs the chosen shard in the ring, bobbing, while nothing is being summoned. */
  async function hover(shardUrl: string): Promise<void> {
    if (timeline !== null || hovering === shardUrl) return;
    const seq = (hoverSeq += 1);
    hovering = shardUrl;
    const sprite = await shardSprite(shardUrl);
    // Another shard was chosen while this one loaded: that call owns the ring now.
    if (seq !== hoverSeq || timeline !== null) {
      sprite?.destroy({ children: true });
      return;
    }
    dropShard();
    shard = sprite;
    if (!shard) return;
    shard.position.set(RING.x, RING.y - 46);
    shard.alpha = 0;
    shardLayer.addChild(shard);
    gsap.to(shard, { alpha: 0.95, duration: 0.4 });
    hoverTween = gsap.to(shard, {
      y: RING.y - 22,
      duration: 2.2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  /** Takes the shard out of the ring, tweens and all: a tween on a dead sprite throws. */
  function dropShard(): void {
    hoverTween?.kill();
    hoverTween = null;
    if (shard) {
      gsap.killTweensOf(shard);
      shard.destroy({ children: true });
    }
    shard = null;
  }

  function resetStage({ keepShard = false } = {}): void {
    hoverTween?.kill();
    hoverTween = null;
    for (const rune of runes) rune.alpha = 0;
    cracks.alpha = 0;
    cracks.scale.set(1);
    coreGlow.scale.set(1.6);
    coreGlow.alpha = 0.14;
    haloGlow.alpha = 0;
    pillar.alpha = 0;
    shockwave.alpha = 0;
    shockwave.scale.set(1);
    flash.alpha = 0;
    if (!keepShard) {
      dropShard();
      hovering = null;
    }
  }

  async function reveal(rarity: Rarity, shardUrl: string): Promise<void> {
    timeline?.kill();
    const waiting = shard;
    resetStage({ keepShard: true });
    const tint = RARITY_TINT[rarity];
    const fast = options.reducedMotion === true;

    if (!waiting) {
      shard = await shardSprite(shardUrl);
      if (shard) {
        shard.position.set(RING.x, RING.y - 420);
        shard.alpha = 0;
        shardLayer.addChild(shard);
      }
    }
    hovering = null;

    const tl = gsap.timeline({ paused: true });
    timeline = tl;

    // 1. The shard drops into the ring and the runes light in sequence (0.6 s). A shard already
    // hanging there only has the last stretch to fall.
    tl.call(() => options.hooks.cue('charge', rarity));
    if (shard) {
      tl.to(shard, { alpha: 1, duration: 0.12 }, 0);
      tl.to(shard, { y: RING.y, duration: 0.42, ease: 'power2.in' }, 0);
      tl.to(shard.scale, { x: 1.1, y: 0.92, duration: 0.08, ease: 'power2.out' }, 0.42);
      tl.to(shard.scale, { x: 1, y: 1, duration: 0.14, ease: 'back.out(2)' }, 0.5);
    }
    runes.forEach((rune, i) => {
      tl.to(rune, { alpha: 0.9, duration: 0.1 }, 0.28 + (i / RUNE_COUNT) * 0.5);
      tl.to(rune, { alpha: 0.35, duration: 0.3 }, 0.38 + (i / RUNE_COUNT) * 0.5);
    });
    tl.to(coreGlow, { alpha: 0.35, duration: 0.5 }, 0.3);
    tl.call(() => {
      coreGlow.tint = tint;
      haloGlow.tint = tint;
      cracks.tint = tint;
      pillar.tint = PILLAR[rarity] ?? tint;
      shockwave.tint = tint;
    });

    // 2. Cracks spread and light leaks out — the colour is only half-told until the burst (0.5 s).
    tl.call(() => options.hooks.cue('crack', rarity), [], 0.86);
    tl.to(cracks, { alpha: 0.9, duration: 0.26 }, 0.86);
    tl.to(cracks.scale, { x: 1.35, y: 1.35, duration: 0.5, ease: 'power2.out' }, 0.86);
    tl.to(coreGlow, { alpha: 0.7, duration: 0.42 }, 0.9);
    if (shard) {
      tl.to(shard, { rotation: 0.35, duration: 0.42, ease: 'power1.inOut' }, 0.86);
      tl.to(shard.scale, { x: 1.12, y: 1.12, duration: 0.42 }, 0.86);
    }

    // 3. The burst: the gate opens in the rarity's colour.
    const burstAt = fast ? 1.0 : 1.36;
    tl.call(() => options.hooks.cue('burst', rarity), [], burstAt);
    if (shard) tl.to(shard, { alpha: 0, duration: 0.1 }, burstAt);
    tl.to(cracks, { alpha: 0, duration: 0.12 }, burstAt);
    tl.to(coreGlow, { alpha: 1, duration: 0.1 }, burstAt);
    tl.to(coreGlow.scale, { x: 3.4, y: 3.4, duration: 0.5, ease: 'power3.out' }, burstAt);
    tl.to(haloGlow, { alpha: 0.85, duration: 0.14 }, burstAt);
    tl.to(haloGlow, { alpha: 0.2, duration: 0.6 }, burstAt + 0.16);
    tl.to(coreGlow, { alpha: 0.25, duration: 0.5 }, burstAt + 0.2);
    tl.to(coreGlow.scale, { x: 1.6, y: 1.6, duration: 0.4 }, burstAt + 0.5);
    for (const rune of runes) tl.to(rune, { alpha: 0.75, duration: 0.1 }, burstAt);
    tl.call(
      () => {
        void playBurstFx(rarity, tint);
      },
      [],
      burstAt,
    );

    if (rarity === 'legendary' || rarity === 'mythic') {
      tl.to(pillar, { alpha: rarity === 'mythic' ? 0.55 : 0.4, duration: 0.12 }, burstAt);
      tl.to(pillar, { alpha: 0, duration: 0.9, ease: 'power2.in' }, burstAt + 0.18);
      tl.to(flash, { alpha: rarity === 'mythic' ? 0.85 : 0.6, duration: 0.05 }, burstAt);
      tl.to(flash, { alpha: 0, duration: 0.45 }, burstAt + 0.06);
    }
    if (rarity === 'mythic') {
      tl.to(shockwave, { alpha: 0.9, duration: 0.06 }, burstAt + 0.04);
      tl.to(shockwave.scale, { x: 9, y: 9, duration: 0.7, ease: 'power2.out' }, burstAt + 0.04);
      tl.to(shockwave, { alpha: 0, duration: 0.45 }, burstAt + 0.3);
      if (!fast) {
        // Slow-motion on the rarest thing in the game, then back to speed.
        tl.call(() => gsap.globalTimeline.timeScale(0.45), [], burstAt + 0.1);
        tl.call(() => gsap.globalTimeline.timeScale(1), [], burstAt + 0.55);
      }
    }
    tl.to({}, { duration: fast ? 0.2 : 0.45 });
    // Back to rest: the card takes over from here, and the gate must not stay mid-burst.
    const tail = burstAt + (fast ? 0.3 : 0.7);
    for (const rune of runes) tl.to(rune, { alpha: 0, duration: 0.5 }, tail);
    tl.to(coreGlow, { alpha: 0.14, duration: 0.5 }, tail);
    tl.to(coreGlow.scale, { x: 1.6, y: 1.6, duration: 0.5 }, tail);
    tl.to(haloGlow, { alpha: 0, duration: 0.5 }, tail);
    tl.call(() => {
      coreGlow.tint = 0x9b5de5;
    });

    await new Promise<void>((resolve) => {
      tl.eventCallback('onComplete', () => resolve());
      tl.play();
    });
    timeline = null;
    // The shard is spent; the gate hangs the next one when the screen says which.
    dropShard();
    hovering = null;
  }

  async function playBurstFx(rarity: Rarity, tint: number): Promise<void> {
    const ids: FxId[] = rarity === 'common' || rarity === 'uncommon' ? ['tm'] : ['tm', 'explosion'];
    if (rarity === 'legendary' || rarity === 'mythic') ids.push('ultimate');
    await Promise.all(
      ids.map((id, i) =>
        playFx(fxLayer, id, {
          x: RING.x,
          y: RING.y,
          scale: 1.6 + i * 0.4,
          tint,
          speed: 1.1,
        }),
      ),
    );
  }

  return {
    reveal,
    hover,
    skip() {
      // Everything up to and including the burst still happens; only the waiting is cut.
      timeline?.progress(1);
    },
    busy() {
      return timeline !== null;
    },
    setPaused(next) {
      paused = next;
      if (next) timeline?.pause();
      else timeline?.play();
    },
    destroy() {
      gsap.globalTimeline.timeScale(1);
      idle.kill();
      timeline?.kill();
      timeline = null;
      dropShard();
      app.ticker.remove(ticker);
      motes?.destroy();
      app.destroy(true, { children: true });
      host.replaceChildren();
    },
  };
}
