/**
 * Champion stat scaling, role templates and power weights (docs/design/CHAMPIONS.md §1–2).
 * Changing these reshapes every champion at once; per-champion character lives in the content
 * files (authored 6★60 values within ±STAT_DEVIATION_TOLERANCE of template × budget).
 */
import type { ChampionStats, Rarity, Role, StatId } from '@content/champions/types';

/** Multiplier on authored (6★60) HP/ATK/DEF per star; 6★ equals the authored value. */
export const STAR_MULT: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, number>> = {
  1: 0.18,
  2: 0.26,
  3: 0.36,
  4: 0.5,
  5: 0.7,
  6: 1,
};

/**
 * Level factor: `LEVEL_FACTOR_BASE + LEVEL_FACTOR_RANGE × (level − 1) / (cap − 1)`, so level 1 of a
 * star tier has 55 % of that tier's cap value and the cap has 100 %.
 */
export const LEVEL_FACTOR_BASE = 0.55;
export const LEVEL_FACTOR_RANGE = 0.45;

/** Level cap per star: `stars × LEVELS_PER_STAR` (3★ → 30, 6★ → 60). */
export const LEVELS_PER_STAR = 10;
export const MAX_STARS = 6;

/** Stats that scale with stars and level; the others are flat and only change through gear/buffs. */
export const SCALING_STATS: readonly StatId[] = ['hp', 'atk', 'def'];

/** Base and maximum stars per rarity (CHAMPIONS.md rarity table). */
export const RARITY_STARS: Readonly<Record<Rarity, { base: number; max: number }>> = {
  common: { base: 1, max: 2 },
  uncommon: { base: 2, max: 4 },
  rare: { base: 3, max: 6 },
  epic: { base: 4, max: 6 },
  legendary: { base: 5, max: 6 },
  mythic: { base: 6, max: 6 },
};

/** Stat budget multiplier applied to the role template per rarity. */
export const RARITY_BUDGET: Readonly<Record<Rarity, number>> = {
  common: 0.7,
  uncommon: 0.8,
  rare: 0.9,
  epic: 1,
  legendary: 1.1,
  mythic: 1.2,
};

/** Number of active abilities per rarity (A1 + …) and whether a passive/aura exists. */
export const RARITY_KIT: Readonly<Record<Rarity, { abilities: number; passive: boolean; aura: boolean }>> = {
  common: { abilities: 1, passive: false, aura: false },
  uncommon: { abilities: 2, passive: false, aura: false },
  rare: { abilities: 2, passive: true, aura: false },
  epic: { abilities: 3, passive: true, aura: false },
  legendary: { abilities: 4, passive: true, aura: true },
  mythic: { abilities: 4, passive: true, aura: true },
};

/** Role templates at budget 1.00 (Epic); only the scaling stats and SPD are templated. */
export const ROLE_TEMPLATE: Readonly<Record<Role, Pick<ChampionStats, 'hp' | 'atk' | 'def' | 'spd'>>> = {
  attack: { hp: 13_500, atk: 1_450, def: 900, spd: 100 },
  defense: { hp: 16_500, atk: 950, def: 1_400, spd: 96 },
  health: { hp: 21_000, atk: 1_000, def: 1_000, spd: 94 },
  support: { hp: 15_000, atk: 1_100, def: 1_100, spd: 104 },
};

/** Allowed deviation of authored HP/ATK/DEF from template × budget before the validator warns. */
export const STAT_DEVIATION_TOLERANCE = 0.15;

/** Display-only power rating weights (CHAMPIONS.md §2). */
export const POWER_WEIGHTS: Readonly<Record<StatId, number>> = {
  hp: 0.05,
  atk: 1,
  def: 1,
  spd: 10,
  critRate: 8,
  critDmg: 3,
  res: 2,
  acc: 2,
};
