/**
 * The summoning ritual (docs/design/SUMMONING.md §5, UI_DESIGN.md §5.12): a Pixi scene over the
 * violet gate.
 *
 * The chosen shard hangs in the rune ring as a crystal, turning. A press charges the gate: the runes
 * kindle one by one, light spirals in out of the dark and the crystal strains. Then the gate *tells*
 * — one pulse for every rarity from the shard's floor up to the answer, each a new colour and a
 * higher note — and before gold, and again before rose, it holds its breath: the light drains, the
 * ring all but stops, and a heartbeat is all there is. Then the crystal gives. The burst is weighed
 * by what it found (`BURST_WEIGHT`): rings, sparks, a flash, the camera's kick, a pillar of light
 * for a Legendary or a Mythic, and slow motion for a Mythic alone.
 *
 * Presentation only: it is told a shard and a rarity and plays them. Nothing here reads game state,
 * and the cues it fires are sounds the caller owns. The ceremony runs off its own clock and the beat
 * sheet in `choreography.ts`, so skipping, pausing and a starved frame rate are arithmetic on one
 * number rather than surgery on a timeline.
 */
import { Application, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { ShardId } from '@content/balance/summon';
import type { Rarity } from '@content/champions/types';
import { createRng } from '@engine/rng/rng';
import { ParticleField, makeGlowTexture } from '@render/ambient/particles';
import {
  BURST_WEIGHT,
  RITUAL_TIMING,
  ritualPlan,
  shardFloor,
  type RitualBeat,
  type RitualPlan,
} from './choreography';
import { mixColor } from './color';
import { Crystal, SHARD_CRYSTALS } from './crystal';
import {
  RuneRing,
  makeBeamTexture,
  makeRaysTexture,
  makeStreakTexture,
  makeSwirlTexture,
  makeWaveTexture,
} from './gate';
import { Fragments, Inflow, Sparks, Waves } from './sparks';

export const STAGE_W = 1920;
export const STAGE_H = 1080;
/**
 * Where the ring hangs, in stage pixels. The scene covers the whole 1920×1080 stage (like the
 * ambient layer), so the ring stays a circle at every window size; it hangs in the open middle of
 * the Portal, between the shard rail and the banner column, above the shard's nameplate.
 */
export const RING = { x: 908, y: 440, radius: 236 } as const;

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

/** The gate's own violet: the vortex leans to it whatever the shard. */
const GATE_VIOLET = 0x9b5de5;
/** The pillars of gold and rose (a Legendary, a Mythic) run a shade paler than the cards. */
const PILLAR_TINT: Partial<Record<Rarity, number>> = { legendary: 0xffd37a, mythic: 0xff8aa0 };
/**
 * Seconds past the beat sheet's end that a ritual may run before it is landed anyway. The scene's
 * clock only moves when frames come, so on a starved machine the ceremony crawls; the shards are
 * spent before the gate lights, and the cards are owed either way.
 */
const RITUAL_SLACK_S = 3;
/** A Mythic's burst plays at this speed for `SLOW_SECONDS` of real time, then eases back. */
const SLOW_SPEED = 0.3;
const SLOW_SECONDS = 0.55;
/** The veins a crystal shows before any tell, and how far the tells spread them. */
const VEINS_AT_REST = 0.25;
const VEINS_TOLD = 0.65;
/** Runes round the ring (`RuneRing`), kindled one after another by the charge. */
const RUNE_COUNT = 24;

/** The moments the ritual asks for a sound (SUMMONING.md §5). */
export type RitualCue = 'charge' | 'stall' | 'tell' | 'windup' | 'burst';

export interface RitualCueInfo {
  /** The rarity told (for a stall, the one it holds back; for the burst, the answer). */
  rarity: Rarity;
  /** Its place in the climb, from 0. */
  index: number;
}

export interface RitualHooks {
  cue(cue: RitualCue, info: RitualCueInfo): void;
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
  /** Hangs this shard's crystal in the ring: at once while the gate rests, after the cards otherwise. */
  setShard(shard: ShardId): void;
  /**
   * Plays the ritual for one press of `shard` that answered with `rarity`. Resolves when the burst
   * has settled — the point the cards take over — or when a starved ritual is landed at its cap.
   */
  reveal(rarity: Rarity, shard: ShardId): Promise<void>;
  /** The cards are put away: the afterglow fades and the next crystal forms in the ring. */
  rest(): void;
  /** Cuts a running ritual to its burst and lands it; the promise still resolves (SUMMONING.md §5). */
  skip(): void;
  /** True while a ritual is playing. */
  busy(): boolean;
}

type Mode = 'resting' | 'ritual' | 'spent';

interface Moment {
  at: number;
  kind: 'charge' | 'stall' | 'tell' | 'windup' | 'burst' | 'end';
  beat: RitualBeat | null;
  index: number;
}

interface Run {
  rarity: Rarity;
  plan: RitualPlan;
  moments: Moment[];
  next: number;
  /** Seconds of ritual played. */
  t: number;
  told: number;
  /** When the breath being held began, while one is. */
  stallAt: number | null;
  windupAt: number | null;
  burst: boolean;
  resolve: () => void;
  cap: ReturnType<typeof setTimeout> | undefined;
}

/** What the gate leans towards this frame; the scene eases every value to it. */
interface Targets {
  zoom: number;
  vortexSpeed: number;
  vortexAlpha: number;
  ringSpeed: number;
  /** Brightness of the kindled runes, and how many are kindled. */
  runes: number;
  kindled: number;
  /** Motes drawn in a second. */
  inflow: number;
  charge: number;
  dim: number;
  rays: number;
  halo: number;
  pillar: number;
}

const RESTING: Targets = {
  zoom: 1,
  vortexSpeed: 0.07,
  vortexAlpha: 0.2,
  ringSpeed: 0.025,
  runes: 0,
  kindled: 0,
  inflow: 0,
  charge: 0,
  dim: 0,
  rays: 0,
  halo: 0,
  pillar: 0,
};

/** The build of a curve: quick out of the start, easing in to its end. */
const smooth = (x: number): number => x * x * (3 - 2 * x);
const backOut = (x: number): number => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
/** Moves `value` towards `target` at `rate` per second, frame-rate independent. */
const ease = (value: number, target: number, rate: number, dt: number): number =>
  value + (target - value) * (1 - Math.exp(-rate * dt));
/** A heartbeat's thump: a narrow swell centred on `at` seconds. */
const thump = (s: number, at: number): number => Math.exp(-Math.pow((s - at) / 0.055, 2));

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

  const { hooks } = options;
  const reduced = options.reducedMotion === true;
  const timing = reduced ? RITUAL_TIMING.reduced : RITUAL_TIMING.full;
  const rng = createRng('summon-ritual');
  const jitter = (): number => rng.next() * 2 - 1;
  /** Camera motion is the first thing reduced motion gives up. */
  const motion = (amount: number): number => (reduced ? 0 : amount);
  const scaled = (count: number): number => (reduced ? Math.round(count * 0.4) : count);

  // Painted once, tinted per use.
  const glowTexture = makeGlowTexture(app.renderer, 256, 0.05);
  const moteTexture = makeGlowTexture(app.renderer, 32);
  const swirlTexture = makeSwirlTexture(512, 3, 3.4);
  const raysTexture = makeRaysTexture(1024, 30, createRng('summon-ritual:rays'));
  const beamTexture = makeBeamTexture(128, 512);
  const streakTexture = makeStreakTexture(64, 12);
  const waveTexture = makeWaveTexture(512);
  const textures: Texture[] = [
    glowTexture,
    moteTexture,
    swirlTexture,
    raysTexture,
    beamTexture,
    streakTexture,
    waveTexture,
  ];

  // Back to front: a dimmer over the whole stage, the camera's world, and a full-stage flash.
  const dim = new Graphics().rect(0, 0, STAGE_W, STAGE_H).fill({ color: 0x05030a });
  dim.alpha = 0;
  const camera = new Container();
  camera.pivot.set(RING.x, RING.y);
  camera.position.set(RING.x, RING.y);
  // The flash adds light rather than laying a sheet over the scene, so gold is gold, not beige.
  const flash = new Graphics().rect(0, 0, STAGE_W, STAGE_H).fill({ color: 0xffffff });
  flash.blendMode = 'add';
  flash.alpha = 0;
  app.stage.addChild(dim, camera, flash);

  const centred = (texture: Texture): Sprite => {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(RING.x, RING.y);
    sprite.blendMode = 'add';
    return sprite;
  };
  const swirlBack = centred(swirlTexture);
  swirlBack.scale.set(1.9);
  const swirlFront = centred(swirlTexture);
  swirlFront.scale.set(1.25);
  swirlFront.rotation = 1.3;
  const rays = centred(raysTexture);
  rays.alpha = 0;
  const pillar = new Sprite(beamTexture);
  pillar.anchor.set(0.5, 1);
  pillar.position.set(RING.x, RING.y + 150);
  pillar.blendMode = 'add';
  pillar.alpha = 0;
  const pillarCore = new Sprite(beamTexture);
  pillarCore.anchor.set(0.5, 1);
  pillarCore.position.set(RING.x, RING.y + 110);
  pillarCore.blendMode = 'add';
  pillarCore.alpha = 0;
  const ring = new RuneRing(RING.radius, glowTexture);
  ring.container.position.set(RING.x, RING.y);
  const runeLights = ring.inOrder();
  const runeAlpha = runeLights.map(() => 0);
  const glints = runeLights.map(() => 0);
  const halo = centred(glowTexture);
  halo.scale.set(3.6);
  halo.alpha = 0;
  const bloom = centred(glowTexture);
  bloom.alpha = 0;
  const crystalLayer = new Container();
  const inflow = new Inflow(
    streakTexture,
    reduced ? 50 : 160,
    RING,
    { from: RING.radius + 80, to: RING.radius + 320 },
    createRng('summon-ritual:inflow'),
  );
  const waves = new Waves(waveTexture, 10, RING, 0.9);
  const fragments = new Fragments(createRng('summon-ritual:fragments'));
  const sparks = new Sparks(streakTexture, reduced ? 180 : 460, createRng('summon-ritual:sparks'));
  // Motes drifting up through the gate, so the scene is never still (CLAUDE.md §7.1).
  const moteCount = options.particles ?? 40;
  const motes =
    moteCount > 0
      ? new ParticleField({
          rng: createRng('summon-ritual:motes'),
          count: moteCount,
          texture: moteTexture,
          blend: 'add',
          tint: [0x9b5de5, 0xc9a24a, 0x6fd4ff],
          area: { x: RING.x - 320, y: RING.y - 120, w: 640, h: 440 },
          size: [3, 9],
          alpha: [0.15, 0.5],
          vx: [-8, 8],
          vy: [-26, -8],
          life: [2.4, 5],
          wobble: { amp: 12, rate: 0.4 },
          flicker: 0.35,
        })
      : null;
  camera.addChild(
    swirlBack,
    swirlFront,
    rays,
    pillar,
    pillarCore,
    ring.container,
    inflow.container,
    halo,
    crystalLayer,
    bloom,
    waves.container,
    fragments.container,
    sparks.container,
    ...(motes ? [motes.container] : []),
  );

  // The crystals, one a shard, built the first time each is shown.
  const crystals = new Map<ShardId, Crystal>();
  const crystalFor = (shard: ShardId): Crystal => {
    const known = crystals.get(shard);
    if (known) return known;
    const made = new Crystal(SHARD_CRYSTALS[shard], glowTexture, createRng(`summon-ritual:crystal:${shard}`));
    made.container.position.set(RING.x, RING.y);
    made.container.visible = false;
    crystalLayer.addChild(made.container);
    crystals.set(shard, made);
    return made;
  };

  let mode: Mode = 'resting';
  let run: Run | null = null;
  /** The shard in the ring, and the one the screen has chosen since (hung when the gate rests). */
  let shard: ShardId | null = null;
  let chosen: ShardId | null = null;
  let crystal: Crystal | null = null;
  let leaving: Crystal | null = null;
  /** Materialise and dissolve progress, 0–1. */
  let appear = 1;
  let appearFor = 0.45;
  let leave = 1;
  let crystalFlash = 0;
  let veins = VEINS_AT_REST;
  let spentRarity: Rarity | null = null;

  // Colour: the light the gate is burning with, eased from one tell to the next.
  let colorFrom = GATE_VIOLET;
  let colorTo = GATE_VIOLET;
  let colorMix = 1;
  const currentColor = (): number => mixColor(colorFrom, colorTo, smooth(colorMix));
  const tintTo = (color: number, instant = false): void => {
    colorFrom = instant ? color : currentColor();
    colorTo = color;
    colorMix = instant ? 1 : 0;
  };

  // Eased values and the impulses the moments kick.
  const now: Targets = { ...RESTING };
  let kick = 0;
  let shake = 0;
  let flashLevel = 0;
  let bloomLevel = 0;
  let raysScale = 0.35;
  let pillarOpen = 0;
  let runeFlare = 0;
  let glintIn = 0.4;
  let realClock = 0;
  let clock = 0;
  let speed = 1;
  let slowUntil = -1;

  function flashTo(color: number, amount: number): void {
    flash.tint = color;
    flashLevel = Math.max(flashLevel, reduced ? Math.min(0.15, amount) : amount);
  }

  /** Forms `next`'s crystal in the ring out of light; the old one, if any, dissolves. */
  function materialise(next: ShardId, seconds = 0.45): void {
    const incoming = crystalFor(next);
    if (crystal && crystal !== incoming && crystal.container.visible) {
      leaving = crystal;
      leave = 0;
    }
    crystal = incoming;
    shard = next;
    incoming.reset();
    incoming.container.visible = true;
    appear = 0;
    appearFor = seconds;
    crystalFlash = 1;
    veins = VEINS_AT_REST;
    tintTo(incoming.look.light);
    waves.emit({ color: incoming.look.light, from: 30, to: RING.radius * 1.15, life: 0.6, peak: 0.5 });
    inflow.rush(scaled(24), incoming.look.light);
  }

  function momentsOf(plan: RitualPlan): Moment[] {
    const moments: Moment[] = [{ at: 0, kind: 'charge', beat: null, index: 0 }];
    plan.beats.forEach((beat, index) => {
      if (beat.stalled) moments.push({ at: beat.at - timing.stall, kind: 'stall', beat, index });
      moments.push({ at: beat.at, kind: 'tell', beat, index });
    });
    const last = plan.beats.length - 1;
    moments.push({ at: plan.burstAt - timing.windup, kind: 'windup', beat: null, index: last });
    moments.push({ at: plan.burstAt, kind: 'burst', beat: null, index: last });
    moments.push({ at: plan.total, kind: 'end', beat: null, index: last });
    return moments.sort((a, b) => a.at - b.at);
  }

  function tell(current: Run, beat: RitualBeat, index: number): void {
    current.stallAt = null;
    current.told = index + 1;
    const color = RARITY_TINT[beat.rarity];
    const held = beat.stalled;
    tintTo(color);
    hooks.cue('tell', { rarity: beat.rarity, index });
    crystalFlash = held ? 1 : 0.8;
    veins = VEINS_AT_REST + (VEINS_TOLD * current.told) / current.plan.beats.length;
    runeFlare = 1;
    const white = mixColor(color, 0xffffff, 0.5);
    waves.emit({
      color,
      from: 60,
      to: RING.radius * (held ? 1.9 : 1.45),
      life: held ? 0.8 : 0.55,
      peak: held ? 1 : 0.75,
    });
    if (held) {
      // Gold, after the held breath: the whole screen catches it.
      waves.emit({ color: white, from: 30, to: RING.radius * 2.8, life: 1, peak: 0.6, delay: 0.08 });
      flashTo(color, 0.22);
    }
    sparks.emit({
      x: RING.x,
      y: RING.y,
      count: scaled(held ? 64 : 16 + index * 6),
      speed: held ? [380, 900] : [240, 560],
      life: [0.35, 0.85],
      colors: [color, white],
      size: [0.45, 0.8],
      scatter: 26,
      gravity: 140,
    });
    kick += motion(held ? 0.035 : 0.014);
    shake += motion(held ? 9 : 3);
  }

  function burst(current: Run): void {
    current.burst = true;
    current.stallAt = null;
    current.windupAt = null;
    const { rarity } = current;
    const weight = BURST_WEIGHT[rarity];
    const color = RARITY_TINT[rarity];
    const white = mixColor(color, 0xffffff, 0.6);
    tintTo(color, true);
    hooks.cue('burst', { rarity, index: current.plan.beats.length - 1 });
    if (crystal) {
      fragments.shatter(crystal.facetsIn(camera), RING, color, 1 + weight.kick * 5);
      crystal.container.visible = false;
    }
    const heavy = weight.pillar;
    sparks.emit({
      x: RING.x,
      y: RING.y,
      count: scaled(weight.sparks),
      speed: heavy ? [600, 1800] : [480, 1350],
      life: [0.6, 1.5],
      colors: [color, white, 0xffffff],
      size: [0.55, 1],
      scatter: 24,
      gravity: 260,
    });
    // The slower half: embers that hang in the air after the flash is gone.
    sparks.emit({
      x: RING.x,
      y: RING.y,
      count: scaled(Math.round(weight.sparks / 2)),
      speed: [120, 420],
      life: [1.2, 2.4],
      colors: [color, white],
      size: [0.35, 0.6],
      scatter: 40,
      gravity: heavy ? -50 : 80,
    });
    for (let i = 0; i < weight.rings; i += 1)
      waves.emit({
        color: i === 0 ? white : color,
        from: 40,
        to: 720 + i * 280,
        life: 0.75 + i * 0.15,
        peak: 1,
        delay: i * 0.09,
      });
    flashTo(mixColor(0xffffff, color, 0.25), weight.flash);
    bloomLevel = 1;
    now.rays = 1;
    raysScale = 0.35;
    rays.tint = color;
    if (heavy) {
      pillar.tint = PILLAR_TINT[rarity] ?? color;
      pillarCore.tint = mixColor(PILLAR_TINT[rarity] ?? color, 0xffffff, 0.6);
      now.pillar = 1;
      pillarOpen = 0;
    }
    kick += motion(weight.kick);
    shake += motion(weight.kick * 260);
    runeFlare = 1;
    if (rarity === 'mythic' && !reduced) slowUntil = realClock + SLOW_SECONDS;
  }

  function play(current: Run, moment: Moment): void {
    switch (moment.kind) {
      case 'charge':
        hooks.cue('charge', { rarity: current.plan.beats[0]?.rarity ?? current.rarity, index: 0 });
        break;
      case 'stall':
        current.stallAt = moment.at;
        if (moment.beat) hooks.cue('stall', { rarity: moment.beat.rarity, index: moment.index });
        break;
      case 'tell':
        if (moment.beat) tell(current, moment.beat, moment.index);
        break;
      case 'windup':
        current.windupAt = moment.at;
        hooks.cue('windup', { rarity: current.rarity, index: moment.index });
        inflow.rush(scaled(80), currentColor());
        break;
      case 'burst':
        burst(current);
        break;
      case 'end':
        settle(current);
        break;
    }
  }

  /** The ritual is over: the cards take it from here, and the gate glows on behind them. */
  function settle(current: Run): void {
    if (run !== current) return;
    clearTimeout(current.cap);
    run = null;
    mode = 'spent';
    spentRarity = current.rarity;
    current.resolve();
  }

  /** Lets go of a ritual without its burst: its promise resolves and the gate carries on. */
  function abandon(current: Run): void {
    if (run !== current) return;
    clearTimeout(current.cap);
    run = null;
    current.resolve();
  }

  /** Jumps a running ritual to its burst (still seen and heard) and lands it. */
  function land(current: Run): void {
    if (run !== current) return;
    if (!current.burst) {
      const at = current.moments.findIndex((moment) => moment.kind === 'burst');
      current.t = current.plan.burstAt;
      current.next = at + 1;
      burst(current);
    }
    settle(current);
  }

  function advance(current: Run, dt: number): void {
    current.t += dt;
    while (run === current) {
      const moment = current.moments[current.next];
      if (!moment || moment.at > current.t) break;
      current.next += 1;
      play(current, moment);
    }
  }

  /** Where the gate leans while a ritual plays, read off the beat sheet and the moment it is at. */
  function ritualTargets(current: Run): Targets & { heart: number; squeeze: number } {
    const { t, plan } = current;
    const beats = plan.beats.length;
    const heavy = BURST_WEIGHT[current.rarity].pillar;
    if (current.burst)
      return {
        ...RESTING,
        vortexSpeed: 0.6,
        vortexAlpha: 0.5,
        ringSpeed: 0.12,
        runes: 0.55,
        kindled: RUNE_COUNT,
        rays: 0.5,
        halo: 0.75,
        pillar: heavy ? 0.5 : 0,
        heart: 0,
        squeeze: 0,
      };
    if (current.windupAt !== null) {
      const w = Math.min(1, (t - current.windupAt) / Math.max(0.01, timing.windup));
      return {
        ...RESTING,
        zoom: 1 + motion(0.1),
        vortexSpeed: 2.8,
        vortexAlpha: 0.72,
        ringSpeed: 1,
        runes: 1,
        kindled: RUNE_COUNT,
        inflow: 380,
        charge: 1,
        dim: 0.34,
        heart: 0,
        squeeze: w * w,
      };
    }
    if (current.stallAt !== null) {
      const s = t - current.stallAt;
      return {
        ...RESTING,
        zoom: 1 + motion(0.06 + 0.02 * current.told + 0.06 * Math.min(1, s / Math.max(0.01, timing.stall))),
        vortexSpeed: 0.1,
        vortexAlpha: 0.12,
        ringSpeed: 0.01,
        runes: 0.12,
        kindled: RUNE_COUNT,
        inflow: 0,
        charge: 0.14,
        dim: 0.46,
        heart: thump(s, 0.1) + 0.75 * thump(s, 0.34),
        squeeze: 0,
      };
    }
    if (current.told > 0) {
      const q = current.told / beats;
      return {
        ...RESTING,
        zoom: 1 + motion(0.045 + 0.025 * q),
        vortexSpeed: 1.2 + 0.6 * q,
        vortexAlpha: 0.48 + 0.14 * q,
        ringSpeed: 0.35 + 0.25 * q,
        runes: 0.9,
        kindled: RUNE_COUNT,
        inflow: 220 + 90 * q,
        charge: 0.38 + 0.42 * q,
        dim: 0.2 + 0.08 * q,
        heart: 0,
        squeeze: 0,
      };
    }
    const p = Math.min(1, t / Math.max(0.01, timing.charge));
    return {
      ...RESTING,
      zoom: 1 + motion(0.045 * smooth(p)),
      vortexSpeed: 0.07 + 1.1 * p,
      vortexAlpha: 0.2 + 0.28 * p,
      ringSpeed: 0.025 + 0.3 * p,
      runes: 0.85,
      kindled: p * RUNE_COUNT,
      inflow: 50 + 170 * p,
      charge: 0.08 + 0.3 * p,
      dim: 0.18 * p,
      heart: 0,
      squeeze: 0,
    };
  }

  function spentTargets(): Targets {
    const heavy = spentRarity !== null && BURST_WEIGHT[spentRarity].pillar;
    return {
      ...RESTING,
      vortexSpeed: 0.12,
      vortexAlpha: 0.3,
      ringSpeed: 0.05,
      runes: 0.4,
      kindled: RUNE_COUNT,
      rays: 0.32,
      halo: 0.5,
      pillar: heavy ? 0.2 : 0,
    };
  }

  const frame = (): void => {
    const realDt = app.ticker.deltaMS / 1000;
    realClock += realDt;
    speed = realClock < slowUntil ? SLOW_SPEED : Math.min(1, speed + realDt / 0.35);
    const dt = realDt * speed;
    clock += dt;

    if (run) advance(run, dt);
    const current = run;
    const winding = current !== null && current.windupAt !== null && !current.burst;
    const lean = current
      ? ritualTargets(current)
      : { ...(mode === 'spent' ? spentTargets() : RESTING), heart: 0, squeeze: 0 };

    now.zoom = ease(now.zoom, lean.zoom, winding ? 7 : 2.6, dt);
    now.vortexSpeed = ease(now.vortexSpeed, lean.vortexSpeed, 3.5, dt);
    now.vortexAlpha = ease(now.vortexAlpha, lean.vortexAlpha, 5, dt);
    now.ringSpeed = ease(now.ringSpeed, lean.ringSpeed, 3, dt);
    now.runes = ease(now.runes, lean.runes, 8, dt);
    now.kindled = lean.kindled;
    now.charge = ease(now.charge, lean.charge, 6, dt);
    now.dim = ease(now.dim, lean.dim, 5, dt);
    now.rays = ease(now.rays, lean.rays, 2.4, dt);
    now.halo = ease(now.halo, lean.halo, 3, dt);
    now.pillar = ease(now.pillar, lean.pillar, 2, dt);
    colorMix = Math.min(1, colorMix + dt * 7);
    kick *= Math.exp(-9 * dt);
    shake *= Math.exp(-7 * dt);
    flashLevel *= Math.exp(-6 * dt);
    bloomLevel *= Math.exp(-4 * dt);
    runeFlare *= Math.exp(-4 * dt);
    crystalFlash *= Math.exp(-5 * dt);
    const color = currentColor();

    // The camera: pushed in by the ritual, kicked by the tells and the burst, shaken by both.
    camera.scale.set(now.zoom + kick);
    camera.position.set(RING.x + jitter() * shake, RING.y + jitter() * shake);
    dim.alpha = now.dim;
    flash.alpha = flashLevel;

    // The vortex turns behind everything, drawn in as the charge builds.
    const vortexTint = mixColor(color, GATE_VIOLET, 0.45);
    swirlBack.tint = vortexTint;
    swirlFront.tint = vortexTint;
    swirlBack.rotation += now.vortexSpeed * 0.55 * dt;
    swirlFront.rotation += now.vortexSpeed * dt;
    swirlBack.alpha = now.vortexAlpha * 0.75;
    swirlFront.alpha = now.vortexAlpha;
    swirlFront.scale.set(1.25 - now.charge * 0.18 - lean.squeeze * 0.12);

    // The ring and its runes: kindled in turn by the charge, flared by every tell.
    ring.container.rotation += now.ringSpeed * dt;
    glintIn -= dt;
    if (mode === 'resting' && glintIn <= 0) {
      glints[rng.int(0, glints.length - 1)] = 0.55;
      glintIn = 0.3 + rng.next() * 0.4;
    }
    const runeTint = mixColor(color, 0xffffff, runeFlare * 0.5);
    runeLights.forEach((light, i) => {
      const lit = i < now.kindled ? 1 : 0;
      glints[i] = (glints[i] ?? 0) * Math.exp(-2.5 * dt);
      const want = Math.max(lit * (now.runes + lean.heart * 0.3), lit * runeFlare, glints[i] ?? 0);
      const alpha = ease(runeAlpha[i] ?? 0, want, 14, dt);
      runeAlpha[i] = alpha;
      light.alpha = alpha;
      light.tint = runeTint;
    });

    // The light it all leaves behind: rays, a halo, a pillar for gold and rose.
    raysScale = ease(raysScale, 1.25, 6, dt);
    rays.scale.set(raysScale);
    rays.rotation += 0.12 * dt;
    rays.alpha = now.rays;
    halo.tint = color;
    halo.alpha = now.halo * (0.85 + 0.15 * Math.sin(clock * 2));
    bloom.tint = mixColor(color, 0xffffff, 0.5);
    bloom.alpha = bloomLevel;
    bloom.scale.set(1.2 + (1 - bloomLevel) * 7);
    pillarOpen = ease(pillarOpen, 1, 16, dt);
    const pillarWidth = (0.9 + 1.7 * Math.sqrt(now.pillar)) * pillarOpen;
    pillar.scale.set(pillarWidth, 1.45);
    pillar.alpha = Math.min(1, now.pillar * 0.85);
    pillarCore.scale.set(pillarWidth * 0.3, 1.35);
    pillarCore.alpha = Math.min(1, now.pillar * 0.6);

    // The crystal: formed out of light, bobbing while it waits, straining when it is called on.
    if (crystal?.container.visible) {
      appear = Math.min(1, appear + dt / appearFor);
      const bob = mode === 'resting' ? Math.sin(clock * 1.6) * 7 : -6 * now.charge;
      crystal.container.y = RING.y + bob;
      crystal.container.scale.set(backOut(appear) * (1 + lean.heart * 0.07) * (1 - lean.squeeze * 0.12));
      crystal.container.alpha = Math.min(1, appear * 2.5);
      crystal.setLight(color);
      crystal.setCharge(Math.min(1, now.charge + lean.heart * 0.25));
      crystal.setCracks(winding ? 1 : veins);
      crystal.setFlash(Math.max(crystalFlash, lean.heart * 0.35));
      crystal.update(dt, jitter);
    }
    if (leaving) {
      leave = Math.min(1, leave + dt / 0.22);
      leaving.container.scale.set(1 - leave * 0.4);
      leaving.container.alpha = 1 - leave;
      leaving.update(dt, jitter);
      if (leave >= 1) {
        leaving.container.visible = false;
        leaving = null;
      }
    }

    // Whatever has gone out is not drawn at all: the big layers are most of the frame's fill.
    for (const layer of [dim, flash, rays, halo, bloom, pillar, pillarCore])
      layer.visible = layer.alpha > 0.004;

    inflow.update(dt, lean.inflow * (reduced ? 0.3 : 1), color);
    waves.update(dt);
    fragments.update(dt);
    sparks.update(dt);
    motes?.update(dt, clock);
  };
  app.ticker.add(frame);
  app.ticker.maxFPS = 60;

  return {
    setShard(next) {
      chosen = next;
      if (mode === 'resting' && (next !== shard || !crystal)) materialise(next);
    },
    reveal(rarity, pressed) {
      // A second press over a running one (React replays effects in development) replaces it
      // quietly: the old promise resolves, the crystal stays whole, nothing bursts twice.
      if (run) abandon(run);
      if (pressed !== shard || !crystal?.container.visible) materialise(pressed, 0.3);
      chosen = pressed;
      mode = 'ritual';
      const plan = ritualPlan(shardFloor(pressed), rarity, reduced);
      return new Promise<void>((resolve) => {
        const current: Run = {
          rarity,
          plan,
          moments: momentsOf(plan),
          next: 0,
          t: 0,
          told: 0,
          stallAt: null,
          windupAt: null,
          burst: false,
          resolve,
          cap: undefined,
        };
        current.cap = setTimeout(() => land(current), (plan.total + RITUAL_SLACK_S) * 1000);
        run = current;
      });
    },
    rest() {
      if (mode !== 'spent') return;
      mode = 'resting';
      spentRarity = null;
      const next = chosen ?? shard;
      if (next) materialise(next);
    },
    skip() {
      if (run) land(run);
    },
    busy() {
      return run !== null;
    },
    setPaused(paused) {
      if (paused) app.ticker.stop();
      else app.ticker.start();
    },
    destroy() {
      if (run) {
        clearTimeout(run.cap);
        run.resolve();
        run = null;
      }
      app.ticker.remove(frame);
      fragments.clear();
      motes?.destroy();
      app.destroy(true, { children: true });
      for (const texture of textures) texture.destroy(true);
      host.replaceChildren();
    },
  };
}
