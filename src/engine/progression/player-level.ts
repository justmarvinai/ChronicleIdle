import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';

/** XP needed to go from `level` to `level + 1` (docs/design/ECONOMY.md §4): round(100 × level^1.6). */
export function xpToNextLevel(level: number): number {
  if (level >= PLAYER_MAX_LEVEL) return Infinity;
  return Math.round(100 * Math.pow(level, 1.6));
}

export interface PlayerXpGain {
  level: number;
  xp: number;
  levelsGained: number;
}

/**
 * Adds player XP and levels while the bar fills (ECONOMY.md §4). The level-up *moment* — the
 * energy refill, the rewards and the celebration — belongs to the player-level phase; this is the
 * curve itself, so no XP a run pays is ever lost.
 */
export function addPlayerXp(profile: { level: number; xp: number }, amount: number): PlayerXpGain {
  let level = Math.min(profile.level, PLAYER_MAX_LEVEL);
  let xp = profile.xp + Math.max(0, Math.round(amount));
  let levelsGained = 0;
  while (level < PLAYER_MAX_LEVEL) {
    const needed = xpToNextLevel(level);
    if (xp < needed) break;
    xp -= needed;
    level += 1;
    levelsGained += 1;
  }
  return { level, xp: level >= PLAYER_MAX_LEVEL ? 0 : xp, levelsGained };
}
