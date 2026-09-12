/**
 * Stat calculators (docs/design/CHAMPIONS.md §2). Pure functions over content values and the
 * balance tables; gear, set and aura layers are added by later phases on top of `baseStats`.
 */
import {
  LEVELS_PER_STAR,
  LEVEL_FACTOR_BASE,
  LEVEL_FACTOR_RANGE,
  MAX_STARS,
  POWER_WEIGHTS,
  RARITY_BUDGET,
  RARITY_STARS,
  ROLE_TEMPLATE,
  SCALING_STATS,
  STAR_MULT,
  STAT_IDS,
  type ChampionStats,
  type Rarity,
  type Role,
  type StatId,
} from './imports';

/** Highest level a champion can reach at `stars` (3★ → 30, 6★ → 60). */
export function levelCap(stars: number): number {
  return clampStars(stars) * LEVELS_PER_STAR;
}

export function clampStars(stars: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const s = Math.min(MAX_STARS, Math.max(1, Math.round(stars)));
  return s as 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * One scaling stat at a star tier and level:
 * `round(base × STAR_MULT[star] × (LEVEL_FACTOR_BASE + LEVEL_FACTOR_RANGE × (level − 1) / (cap − 1)))`.
 * A 6★ level-60 champion equals its authored value; a 3★ level-1 Rare has ≈ 20 % of it.
 */
export function statAt(base: number, stars: number, level: number): number {
  const s = clampStars(stars);
  const cap = levelCap(s);
  const lv = Math.min(cap, Math.max(1, Math.round(level)));
  const levelFactor = cap === 1 ? 1 : LEVEL_FACTOR_BASE + LEVEL_FACTOR_RANGE * ((lv - 1) / (cap - 1));
  return Math.round(base * STAR_MULT[s] * levelFactor);
}

/** All eight stats of a champion at `stars`/`level` without gear (flat stats pass through). */
export function baseStats(authored: ChampionStats, stars: number, level: number): ChampionStats {
  const out = { ...authored };
  for (const stat of SCALING_STATS) out[stat] = statAt(authored[stat], stars, level);
  return out;
}

/** Display-only power rating: Σ stat × weight (CHAMPIONS.md §2). */
export function power(stats: ChampionStats): number {
  let total = 0;
  for (const stat of STAT_IDS) total += stats[stat] * POWER_WEIGHTS[stat];
  return Math.round(total);
}

/** Template × budget for a role and rarity — the value authored stats should orbit. */
export function expectedStats(role: Role, rarity: Rarity): Pick<ChampionStats, 'hp' | 'atk' | 'def'> {
  const t = ROLE_TEMPLATE[role];
  const b = RARITY_BUDGET[rarity];
  return { hp: t.hp * b, atk: t.atk * b, def: t.def * b };
}

/** Relative deviation of each scaling stat from the expected value (0.1 = 10 % above or below). */
export function statDeviation(
  stats: ChampionStats,
  role: Role,
  rarity: Rarity,
): Record<'hp' | 'atk' | 'def', number> {
  const expected = expectedStats(role, rarity);
  return {
    hp: Math.abs(stats.hp - expected.hp) / expected.hp,
    atk: Math.abs(stats.atk - expected.atk) / expected.atk,
    def: Math.abs(stats.def - expected.def) / expected.def,
  };
}

/** Stars a freshly obtained champion of `rarity` has. */
export function baseStars(rarity: Rarity): number {
  return RARITY_STARS[rarity].base;
}

export function maxStars(rarity: Rarity): number {
  return RARITY_STARS[rarity].max;
}

export type { StatId };
