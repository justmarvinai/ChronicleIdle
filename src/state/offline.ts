/**
 * Applies everything that should have happened while the game was closed (docs/tech/ARCHITECTURE.md
 * §2 step 5): energy regeneration and period-key bookkeeping. Idempotent — running it twice for
 * the same `now` changes nothing. Later phases add boss keys, quests and chest accrual here.
 */
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { regenerateEnergy } from '@engine/economy/energy';
import type { SaveGame } from '@engine/schema/save';
import { dailyKey, weeklyKey } from '@engine/time/clock';

export interface OfflineReport {
  elapsedMs: number;
  energyGained: number;
  newDay: boolean;
  newWeek: boolean;
}

export function applyOfflineElapsed(save: SaveGame, now: number): { save: SaveGame; report: OfflineReport } {
  const energy = regenerateEnergy(save.energy, save.profile.level, now);
  const daily = dailyKey(now, DAILY_RESET_HOUR);
  const weekly = weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
  const report: OfflineReport = {
    elapsedMs: Math.max(0, now - save.updatedAt),
    energyGained: energy.value - save.energy.value,
    newDay: daily !== save.periods.lastDailyKey,
    newWeek: weekly !== save.periods.lastWeeklyKey,
  };
  const next: SaveGame = { ...save, energy, periods: { lastDailyKey: daily, lastWeeklyKey: weekly } };
  return { save: next, report };
}
