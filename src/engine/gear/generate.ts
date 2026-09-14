/**
 * Rolling a piece of gear (docs/design/GEAR.md §1–§3). Drops and the Forge both come through
 * here, so a crafted piece is exactly as good as a dropped one of the same rarity and star.
 * Every roll goes through the injected `Rng`, so a drop replays from its seed.
 */
import {
  FIXED_MAIN_STAT,
  MAIN_STAT_WEIGHTS,
  MAX_SUBSTATS,
  SUBSTATS_AT_ZERO,
  SUB_ROLL_MULT,
  SUB_STAT_FAMILY,
  SUB_STAT_TABLE,
  SUBSTAT_ROLL_LEVELS,
  GEAR_STATS,
  starBand,
  type GearSource,
  type GearStat,
} from '@content/balance/gear';
import type { GearSlot, Rarity } from '@content/champions/types';
import { fail, ok, type Result } from '@engine/errors';
import type { Rng } from '@engine/rng/rng';
import { clampGearLevel, clampGearStars } from './stats';
import { gearInstanceIdFor, type GearInstance, type GearSubStat } from './instance';

/** The main stat a slot carries: fixed for weapon/helmet/shield, rolled for the other three. */
export function rollMainStat(slot: GearSlot, rng: Rng): GearStat {
  const fixed = FIXED_MAIN_STAT[slot];
  if (fixed) return fixed;
  const weights = MAIN_STAT_WEIGHTS[slot];
  if (!weights) throw new RangeError(`No main-stat pool for ${slot}`);
  return rng.weighted(Object.entries(weights).map(([stat, weight]) => ({ item: stat as GearStat, weight })));
}

/** One substat roll on the star's band, enlarged by the rarity's multiplier (GEAR.md §2–§3). */
export function rollSubValue(stat: GearStat, stars: number, rarity: Rarity, rng: Rng): number {
  const row = SUB_STAT_TABLE[SUB_STAT_FAMILY[stat]][starBand(clampGearStars(stars))];
  if (!row) return 0;
  const [min, max] = row;
  return Math.round(rng.int(min, max) * SUB_ROLL_MULT[rarity]);
}

/** Substats a piece may still take: never the main stat, never one it already carries. */
export function availableSubStats(main: GearStat, taken: readonly GearStat[]): GearStat[] {
  const used = new Set<GearStat>([main, ...taken]);
  return GEAR_STATS.filter((stat) => !used.has(stat));
}

export interface GenerateInput {
  serial: number;
  slot: GearSlot;
  setId: string;
  rarity: Rarity;
  stars: number;
  source: GearSource;
  now: number;
  /** Pieces start at +0 unless a caller (a test, a debug grant) asks otherwise. */
  level?: number;
}

/** Rolls one piece: main stat, then the rarity's substats, then any levels already on it. */
export function generateGear(input: GenerateInput, rng: Rng): GearInstance {
  const stars = clampGearStars(input.stars);
  const mainStat = rollMainStat(input.slot, rng);
  const subs: GearSubStat[] = [];
  for (let i = 0; i < SUBSTATS_AT_ZERO[input.rarity]; i += 1) {
    const stat = pickSubStat(mainStat, subs, rng);
    if (!stat) break;
    subs.push({ stat, value: rollSubValue(stat, stars, input.rarity, rng), rolls: 1 });
  }
  const piece: GearInstance = {
    instanceId: gearInstanceIdFor(input.serial),
    slot: input.slot,
    setId: input.setId,
    rarity: input.rarity,
    stars,
    level: 0,
    mainStat,
    subs,
    equippedTo: null,
    locked: false,
    acquiredAt: input.now,
    source: input.source,
  };
  const level = clampGearLevel(input.level ?? 0);
  return level > 0 ? levelTo(piece, level, rng) : piece;
}

function pickSubStat(main: GearStat, subs: readonly GearSubStat[], rng: Rng): GearStat | undefined {
  const pool = availableSubStats(
    main,
    subs.map((s) => s.stat),
  );
  return pool.length ? rng.pick(pool) : undefined;
}

/** What one level does: a roll at +4/+8/+12/+16, nothing but the main stat otherwise. */
export interface LevelRoll {
  level: number;
  /** The substat the roll landed on, and whether it was new. */
  stat: GearStat;
  added: boolean;
  value: number;
}

export interface LevelUpResult {
  piece: GearInstance;
  rolls: LevelRoll[];
}

/**
 * Takes a piece up by `levels` (GEAR.md §3): the main stat follows the table, and each roll level
 * either adds a fourth substat or enlarges one the piece already has.
 */
export function levelGear(piece: GearInstance, levels: number, rng: Rng): Result<LevelUpResult> {
  const target = clampGearLevel(piece.level + Math.max(0, Math.round(levels)));
  if (target === piece.level) return fail('invalid_argument', `${piece.instanceId} is at +${piece.level}`);
  const rolls: LevelRoll[] = [];
  const current: GearInstance = { ...piece, subs: piece.subs.map((sub) => ({ ...sub })) };
  for (let level = piece.level + 1; level <= target; level += 1) {
    current.level = level;
    if (!SUBSTAT_ROLL_LEVELS.includes(level)) continue;
    const roll = rollAtLevel(current, level, rng);
    if (roll) rolls.push(roll);
  }
  return ok({ piece: current, rolls });
}

/** The same, for a caller that knows the level it wants (the generator's pre-levelled pieces). */
export function levelTo(piece: GearInstance, level: number, rng: Rng): GearInstance {
  const result = levelGear(piece, clampGearLevel(level) - piece.level, rng);
  return result.ok ? result.value.piece : piece;
}

function rollAtLevel(piece: GearInstance, level: number, rng: Rng): LevelRoll | null {
  if (piece.subs.length < MAX_SUBSTATS) {
    const stat = pickSubStat(piece.mainStat, piece.subs, rng);
    if (!stat) return null;
    const value = rollSubValue(stat, piece.stars, piece.rarity, rng);
    piece.subs.push({ stat, value, rolls: 1 });
    return { level, stat, added: true, value };
  }
  const index = rng.int(0, piece.subs.length - 1);
  const sub = piece.subs[index];
  if (!sub) return null;
  const value = rollSubValue(sub.stat, piece.stars, piece.rarity, rng);
  sub.value += value;
  sub.rolls += 1;
  return { level, stat: sub.stat, added: false, value };
}
