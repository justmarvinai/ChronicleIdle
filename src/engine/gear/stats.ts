/**
 * What a piece is worth (docs/design/GEAR.md §1–§3). The main stat grows linearly from its `+0`
 * value to its `+16` value on the star's row; substats only change when a roll lands on them.
 */
import {
  GEAR_MAX_LEVEL,
  GEAR_MAX_STARS,
  GEAR_POWER_REFERENCE,
  MAIN_STAT_FAMILY,
  MAIN_STAT_TABLE,
  PERCENT_GEAR_STATS,
  type GearStat,
} from '@content/balance/gear';
import type { ChampionStats, StatId } from '@content/champions/types';
import { power } from '@engine/champions/stats';
import type { GearInstance } from './instance';

export function clampGearStars(stars: number): number {
  return Math.min(GEAR_MAX_STARS, Math.max(1, Math.round(stars)));
}

export function clampGearLevel(level: number): number {
  return Math.min(GEAR_MAX_LEVEL, Math.max(0, Math.round(level)));
}

/**
 * `main(star, level) = zero + (max − zero) × level / 16`, rounded (GEAR.md §3). The `+0` and
 * `+16` ends come straight from the table, so a table edit is the only way to change a value.
 */
export function mainStatValue(stat: GearStat, stars: number, level: number): number {
  const row = MAIN_STAT_TABLE[MAIN_STAT_FAMILY[stat]][clampGearStars(stars) - 1];
  if (!row) return 0;
  const [zero, max] = row;
  return Math.round(zero + ((max - zero) * clampGearLevel(level)) / GEAR_MAX_LEVEL);
}

/** The piece's main stat at its current star and level. */
export function mainOf(piece: GearInstance): { stat: GearStat; value: number } {
  return { stat: piece.mainStat, value: mainStatValue(piece.mainStat, piece.stars, piece.level) };
}

/** Flat and percentage contributions of one piece, keyed by champion stat. */
export interface GearContribution {
  flat: Partial<Record<StatId, number>>;
  percent: Partial<Record<StatId, number>>;
}

/** The champion stat a gear stat feeds, and whether it feeds it flat or as a percentage. */
export function targetStat(stat: GearStat): { stat: StatId; percent: boolean } {
  switch (stat) {
    case 'hp':
      return { stat: 'hp', percent: false };
    case 'atk':
      return { stat: 'atk', percent: false };
    case 'def':
      return { stat: 'def', percent: false };
    case 'hpPct':
      return { stat: 'hp', percent: true };
    case 'atkPct':
      return { stat: 'atk', percent: true };
    case 'defPct':
      return { stat: 'def', percent: true };
    case 'spd':
      return { stat: 'spd', percent: false };
    // Crit, resistance and accuracy are already percentage-shaped stats: gear adds points to them.
    default:
      return { stat, percent: false };
  }
}

export function isPercentStat(stat: GearStat): boolean {
  return PERCENT_GEAR_STATS.has(stat);
}

/** Everything one piece contributes: its main stat plus every substat. */
export function contributionOf(piece: GearInstance): GearContribution {
  const out: GearContribution = { flat: {}, percent: {} };
  const add = (stat: GearStat, value: number): void => {
    const target = targetStat(stat);
    const bucket = target.percent ? out.percent : out.flat;
    bucket[target.stat] = (bucket[target.stat] ?? 0) + value;
  };
  const main = mainOf(piece);
  add(main.stat, main.value);
  for (const sub of piece.subs) add(sub.stat, sub.value);
  return out;
}

/** The contributions of a whole set of worn pieces, merged. */
export function mergeContributions(contributions: readonly GearContribution[]): GearContribution {
  const out: GearContribution = { flat: {}, percent: {} };
  for (const contribution of contributions) {
    for (const [stat, value] of Object.entries(contribution.flat))
      out.flat[stat as StatId] = (out.flat[stat as StatId] ?? 0) + (value ?? 0);
    for (const [stat, value] of Object.entries(contribution.percent))
      out.percent[stat as StatId] = (out.percent[stat as StatId] ?? 0) + (value ?? 0);
  }
  return out;
}

/** `stat → (base + flat) × (1 + percent / 100)`, the order CHAMPIONS.md §6 states. */
export function applyContribution(base: ChampionStats, contribution: GearContribution): ChampionStats {
  const out = { ...base };
  for (const stat of Object.keys(out) as StatId[]) {
    const flat = contribution.flat[stat] ?? 0;
    const percent = contribution.percent[stat] ?? 0;
    out[stat] = Math.round((base[stat] + flat) * (1 + percent / 100));
  }
  return out;
}

/**
 * What one piece is worth on its own: the power it adds to the reference champion
 * (`GEAR_POWER_REFERENCE`). It is a yardstick for sorting an armoury, not a promise about what
 * the piece will do for any particular champion.
 */
export function piecePower(piece: GearInstance): number {
  const base = { ...GEAR_POWER_REFERENCE };
  return Math.max(0, power(applyContribution(base, contributionOf(piece))) - power(base));
}
