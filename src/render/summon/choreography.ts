/**
 * The shape of a summon (docs/design/SUMMONING.md §5), as numbers: which colours the gate tells on
 * its way to the answer, where it holds its breath, and when it bursts. Pure — no Pixi — so the
 * rhythm of the rarest pull in the game is a thing a test can read.
 *
 * The tells climb from the shard's own floor to the rarity it answered with: an Ancient Shard always
 * shows blue, and every step past it is a better pull than the shard promised. The gate stalls — a
 * heartbeat with the light held back — before it dares gold, and again before rose, so the moment
 * the player hopes for is the moment it makes them wait.
 */
import { SHARD_RATES, type ShardId } from '@content/balance/summon';
import { RARITIES, type Rarity } from '@content/champions/types';

/** The rarities worth a held breath: the gate stalls before telling either. */
const STALLED: ReadonlySet<Rarity> = new Set(['legendary', 'mythic']);

/** The lengths of a ritual's parts, in seconds. */
export interface RitualTiming {
  /** From the press to the first tell. */
  charge: number;
  /** From one tell to the next. */
  step: number;
  /** The held breath before gold, and before rose. */
  stall: number;
  /** The last draw before the crystal gives. */
  windup: number;
  /** From the burst to the cards. */
  tail: number;
}

/** At full ceremony and under reduced motion. */
export const RITUAL_TIMING: Readonly<Record<'full' | 'reduced', RitualTiming>> = {
  full: { charge: 1.15, step: 0.46, stall: 0.62, windup: 0.3, tail: 0.75 },
  reduced: { charge: 0.4, step: 0.18, stall: 0, windup: 0.1, tail: 0.3 },
};

export interface RitualBeat {
  rarity: Rarity;
  /** When this tell lands, in seconds from the press. */
  at: number;
  /** Whether the gate held its breath before it (the stall ends at `at`). */
  stalled: boolean;
}

export interface RitualPlan {
  beats: RitualBeat[];
  /** The crystal gives way. */
  burstAt: number;
  /** The gate is at rest again and the cards may land. */
  total: number;
}

/** The least a shard can answer with: the lowest rarity its table gives any chance to. */
export function shardFloor(shard: ShardId): Rarity {
  const table = SHARD_RATES[shard];
  return RARITIES.find((rarity) => (table[rarity] ?? 0) > 0) ?? 'common';
}

/** The rarities from `floor` up to `rarity`, in order; just the answer when it is below the floor. */
export function tellsFor(floor: Rarity, rarity: Rarity): Rarity[] {
  const from = RARITIES.indexOf(floor);
  const to = RARITIES.indexOf(rarity);
  if (from < 0 || to < from) return [rarity];
  return RARITIES.slice(from, to + 1);
}

/**
 * The beat sheet of one press: the charge, one tell per rarity climbed (a stall before gold and
 * before rose, unless motion is reduced), the wind-up, the burst, the settle.
 */
export function ritualPlan(floor: Rarity, rarity: Rarity, reduced = false): RitualPlan {
  const timing = reduced ? RITUAL_TIMING.reduced : RITUAL_TIMING.full;
  const beats: RitualBeat[] = [];
  let at = timing.charge;
  for (const tell of tellsFor(floor, rarity)) {
    const stalled = !reduced && STALLED.has(tell) && beats.length > 0;
    if (stalled) at += timing.stall;
    beats.push({ rarity: tell, at, stalled });
    at += timing.step;
  }
  const burstAt = at + timing.windup;
  return { beats, burstAt, total: burstAt + timing.tail };
}

/** A point on the beat sheet where the scene acts: a sound, a tell, the burst, the end. */
export interface RitualMoment {
  at: number;
  kind: 'charge' | 'stall' | 'tell' | 'windup' | 'burst' | 'end';
  /** The tell a stall holds back, or the tell played; null for the rest. */
  beat: RitualBeat | null;
  /** Its tell's place in the climb; the last tell's for the wind-up, the burst and the end. */
  index: number;
}

/**
 * The beat sheet as the scene plays it, in order: the charge at the press, a stall `timing.stall`
 * before each held tell, the tells, the wind-up `timing.windup` before the burst, and the end.
 */
export function ritualMoments(plan: RitualPlan, timing: RitualTiming): RitualMoment[] {
  const moments: RitualMoment[] = [{ at: 0, kind: 'charge', beat: null, index: 0 }];
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

/**
 * How much of the ceremony a rarity gets at the burst: shockwave rings, how hard the camera kicks,
 * how many sparks fly and whether a pillar of light stands over the gate.
 */
export interface BurstWeight {
  rings: number;
  kick: number;
  sparks: number;
  pillar: boolean;
  flash: number;
}

export const BURST_WEIGHT: Record<Rarity, BurstWeight> = {
  common: { rings: 1, kick: 0.02, sparks: 40, pillar: false, flash: 0.12 },
  uncommon: { rings: 1, kick: 0.025, sparks: 55, pillar: false, flash: 0.15 },
  rare: { rings: 1, kick: 0.035, sparks: 80, pillar: false, flash: 0.25 },
  epic: { rings: 2, kick: 0.05, sparks: 110, pillar: false, flash: 0.4 },
  legendary: { rings: 2, kick: 0.07, sparks: 150, pillar: true, flash: 0.7 },
  mythic: { rings: 3, kick: 0.09, sparks: 180, pillar: true, flash: 0.85 },
};

/** The pitch each tell's chime plays at: a rising whole-tone climb, one step per rarity told. */
export function tellRate(index: number): number {
  return Math.pow(2, (index * 2) / 12);
}
