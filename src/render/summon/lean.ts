/**
 * What the gate leans towards, moment by moment (docs/design/SUMMONING.md §5): how far the camera
 * pushes in, how fast the vortex and the ring turn, how brightly the runes burn, how hard light is
 * drawn in and how dark the room falls. The scene eases its layers towards the lean every frame.
 * Pure — no Pixi — so the shape of a held breath is a thing a test can read.
 */
import type { Rarity } from '@content/champions/types';
import { BURST_WEIGHT, type RitualPlan, type RitualTiming } from './choreography';
import { smooth, thump } from './easing';

/** The values the scene eases towards. */
export interface GateLean {
  /** The camera's push: 1 at rest. */
  zoom: number;
  /** How fast the vortex turns, and how strongly it shows. */
  vortexSpeed: number;
  vortexAlpha: number;
  /** How fast the rune ring turns. */
  ringSpeed: number;
  /** How brightly the kindled runes burn, and the share of them kindled (0–1). */
  runes: number;
  kindled: number;
  /** Motes drawn in a second. */
  inflow: number;
  /** How hard the crystal strains, 0–1. */
  charge: number;
  /** How dark the room falls, 0–1. */
  dim: number;
  /** The light a burst leaves behind: its rays, the halo, and a pillar for gold and rose. */
  rays: number;
  halo: number;
  pillar: number;
}

/**
 * A lean, and the two things the scene follows at once rather than easing towards: the held
 * breath's heartbeat and the wind-up's squeeze.
 */
export interface RitualLean extends GateLean {
  heart: number;
  squeeze: number;
}

/** The gate between presses: turning slowly, its runes dark, the room as it is. */
export const RESTING: Readonly<GateLean> = {
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

/** The resting lean, with no heartbeat and no squeeze. */
export const AT_REST: Readonly<RitualLean> = { ...RESTING, heart: 0, squeeze: 0 };

/** The part of a running ritual its lean is read from. */
export interface RitualState {
  rarity: Rarity;
  plan: RitualPlan;
  /** Seconds of ritual played. */
  t: number;
  /** Tells played so far. */
  told: number;
  /** When the breath being held began, while one is. */
  stallAt: number | null;
  /** When the wind-up began, once it has. */
  windupAt: number | null;
  burst: boolean;
}

/**
 * Where the gate leans while a ritual plays. In the charge it kindles the runes one after another
 * and draws the light in; between tells it builds with every tell told; in a held breath the light
 * drains, the ring all but stops and a heartbeat is all there is; in the wind-up it pulls hardest
 * and squeezes the crystal; after the burst it glows on. Reduced motion leaves the camera still.
 */
export function ritualLean(state: RitualState, timing: RitualTiming, reduced: boolean): RitualLean {
  const motion = (amount: number): number => (reduced ? 0 : amount);
  const { t } = state;
  if (state.burst)
    return {
      ...RESTING,
      vortexSpeed: 0.6,
      vortexAlpha: 0.5,
      ringSpeed: 0.12,
      runes: 0.55,
      kindled: 1,
      rays: 0.5,
      halo: 0.75,
      pillar: BURST_WEIGHT[state.rarity].pillar ? 0.5 : 0,
      heart: 0,
      squeeze: 0,
    };
  if (state.windupAt !== null) {
    const w = Math.min(1, (t - state.windupAt) / Math.max(0.01, timing.windup));
    return {
      ...RESTING,
      zoom: 1 + motion(0.1),
      vortexSpeed: 2.8,
      vortexAlpha: 0.72,
      ringSpeed: 1,
      runes: 1,
      kindled: 1,
      inflow: 380,
      charge: 1,
      dim: 0.34,
      heart: 0,
      squeeze: w * w,
    };
  }
  if (state.stallAt !== null) {
    const s = t - state.stallAt;
    return {
      ...RESTING,
      zoom: 1 + motion(0.06 + 0.02 * state.told + 0.06 * Math.min(1, s / Math.max(0.01, timing.stall))),
      vortexSpeed: 0.1,
      vortexAlpha: 0.12,
      ringSpeed: 0.01,
      runes: 0.12,
      kindled: 1,
      inflow: 0,
      charge: 0.14,
      dim: 0.46,
      heart: thump(s, 0.1) + 0.75 * thump(s, 0.34),
      squeeze: 0,
    };
  }
  if (state.told > 0) {
    const q = state.told / state.plan.beats.length;
    return {
      ...RESTING,
      zoom: 1 + motion(0.045 + 0.025 * q),
      vortexSpeed: 1.2 + 0.6 * q,
      vortexAlpha: 0.48 + 0.14 * q,
      ringSpeed: 0.35 + 0.25 * q,
      runes: 0.9,
      kindled: 1,
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
    kindled: p,
    inflow: 50 + 170 * p,
    charge: 0.08 + 0.3 * p,
    dim: 0.18 * p,
    heart: 0,
    squeeze: 0,
  };
}

/** The afterglow while the cards are up; a pillar lingers faintly over gold and rose. */
export function spentLean(rarity: Rarity | null): RitualLean {
  const heavy = rarity !== null && BURST_WEIGHT[rarity].pillar;
  return {
    ...RESTING,
    vortexSpeed: 0.12,
    vortexAlpha: 0.3,
    ringSpeed: 0.05,
    runes: 0.4,
    kindled: 1,
    rays: 0.32,
    halo: 0.5,
    pillar: heavy ? 0.2 : 0,
    heart: 0,
    squeeze: 0,
  };
}
