import { CHAMPION_XP_BASE, CHAMPION_XP_EXPONENT } from './imports';
import { levelCap } from './stats';

/** XP needed to go from `level` to `level + 1`: `round(25 × level^1.7)` (ECONOMY.md §3.1). */
export function championXpToNext(level: number): number {
  return Math.round(CHAMPION_XP_BASE * Math.pow(Math.max(1, level), CHAMPION_XP_EXPONENT));
}

/** Total XP from level 1 to `level` (exclusive of the next step). */
export function championXpTotal(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += championXpToNext(l);
  return total;
}

/** Whether the champion has room to level at its current star tier. */
export function canLevel(level: number, stars: number): boolean {
  return level < levelCap(stars);
}

export interface XpGain {
  level: number;
  xp: number;
  levelsGained: number;
  /** XP that arrived after the star tier's cap and had nowhere to go. */
  wasted: number;
}

/**
 * Adds battle or brew XP, levelling while the bar fills (ECONOMY.md §3.1). A champion at its star
 * tier's cap keeps its level and the overflow is reported rather than hidden, so the Tavern
 * (Phase 5) can warn before it is spent.
 */
export function addChampionXp(
  champion: { level: number; xp: number; stars: number },
  amount: number,
): XpGain {
  const cap = levelCap(champion.stars);
  let level = Math.min(champion.level, cap);
  let xp = champion.xp + Math.max(0, Math.round(amount));
  let levelsGained = 0;
  while (level < cap) {
    const needed = championXpToNext(level);
    if (xp < needed) break;
    xp -= needed;
    level += 1;
    levelsGained += 1;
  }
  const wasted = level >= cap ? xp : 0;
  return { level, xp: level >= cap ? 0 : xp, levelsGained, wasted };
}
