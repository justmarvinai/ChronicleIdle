import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';

/** XP needed to go from `level` to `level + 1` (docs/design/ECONOMY.md §4): round(100 × level^1.6). */
export function xpToNextLevel(level: number): number {
  if (level >= PLAYER_MAX_LEVEL) return Infinity;
  return Math.round(100 * Math.pow(level, 1.6));
}
