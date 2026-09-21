/**
 * Champion experience (docs/design/ECONOMY.md §3.1). The Tavern (Phase 5) spends brews and food
 * against these numbers; Phase 1 only needs the curve for level caps and progress bars.
 */
import type { Rarity } from '@content/champions/types';

/** `xpToNext(L) = round(CHAMPION_XP_BASE × L ^ CHAMPION_XP_EXPONENT)`; sum to 60 = 572,463. */
export const CHAMPION_XP_BASE = 25;
export const CHAMPION_XP_EXPONENT = 1.7;

/**
 * XP of one elemental brew; ×BREW_MATCH_MULT when the element matches the champion. Lifted from
 * 1,500 in `0.7.2`: a matched brew is 2,550 rather than 2,250, so a champion levels 1 → 60 on 225
 * matched brews instead of 255. The Brewery pours brews by the dozen (`BREWERY.md` §4), which
 * makes this the single number deciding how fast a roster levels.
 */
export const BREW_XP = 1_700;
export const BREW_MATCH_MULT = 1.5;

/** `foodXp = FOOD_XP_BASE × RARITY_FOOD_MULT[rarity] × (1 + FOOD_LEVEL_BONUS × foodLevel)`. */
export const FOOD_XP_BASE = 150;
export const FOOD_LEVEL_BONUS = 0.15;
export const RARITY_FOOD_MULT: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 8,
  legendary: 16,
  mythic: 32,
};

/** Gold per Tavern level-up action: `TAVERN_LEVEL_GOLD_PER_LEVEL × targetLevel`. */
export const TAVERN_LEVEL_GOLD_PER_LEVEL = 50;

/** Gold to rank up from n★ to (n+1)★ (ECONOMY.md §3.2). */
export const RANK_UP_GOLD: Readonly<Record<1 | 2 | 3 | 4 | 5, number>> = {
  1: 500,
  2: 2_000,
  3: 8_000,
  4: 30_000,
  5: 100_000,
};
