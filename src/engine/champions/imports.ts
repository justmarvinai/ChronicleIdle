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
export {
  BREW_MATCH_MULT,
  BREW_XP,
  CHAMPION_XP_BASE,
  CHAMPION_XP_EXPONENT,
  FOOD_LEVEL_BONUS,
  FOOD_XP_BASE,
  RANK_UP_GOLD,
  RARITY_FOOD_MULT,
  TAVERN_LEVEL_GOLD_PER_LEVEL,
} from '@content/balance/xp';
export { CURRENCY_IDS } from '@content/currencies/types';
export type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
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
