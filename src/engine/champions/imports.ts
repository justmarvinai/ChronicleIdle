/**
 * Single import surface for the balance tables and content types the champion module needs, so
 * the calculators read as formulas rather than import lists (CLAUDE.md §5.1: engine may import
 * `content/balance` values and `content/**\/types.ts`).
 */
export {
  LEVELS_PER_STAR,
  LEVEL_FACTOR_BASE,
  LEVEL_FACTOR_RANGE,
  MAX_STARS,
  POWER_WEIGHTS,
  RARITY_BUDGET,
  RARITY_KIT,
  RARITY_STARS,
  ROLE_TEMPLATE,
  SCALING_STATS,
  STAR_MULT,
  STAT_DEVIATION_TOLERANCE,
} from '@content/balance/stats';
export { CHAMPION_XP_BASE, CHAMPION_XP_EXPONENT } from '@content/balance/xp';
export {
  ABILITY_SLOTS,
  CHAMPION_IDS,
  ELEMENTS,
  GEAR_SLOTS,
  RARITIES,
  ROLES,
  STARTER_IDS,
  STARTING_COMPANION_IDS,
  STAT_IDS,
  STATUS_IDS,
} from '@content/champions/types';
export type {
  AbilityDef,
  AbilityUpgrade,
  ChampionDef,
  ChampionId,
  ChampionStats,
  Effect,
  PassiveEffect,
  Element,
  GearSlot,
  ObtainSource,
  Rarity,
  Role,
  StarterId,
  StatId,
  StatusId,
} from '@content/champions/types';
