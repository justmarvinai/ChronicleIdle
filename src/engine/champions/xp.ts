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
