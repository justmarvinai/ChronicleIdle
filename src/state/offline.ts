/**
 * Applies everything that should have happened while the game was closed (docs/tech/ARCHITECTURE.md
 * §2 step 5): energy regeneration, period-key bookkeeping and the tribute a spent boss period
 * still owed. Idempotent — running it twice for the same `now` changes nothing. Later phases add
 * quest periods here.
 *
 * The Idle Chest deliberately does *not* appear: it stores when it was last emptied and derives
 * what it holds from that instant and the clock (`ECONOMY.md` §6), so there is nothing to apply
 * on load and nothing that can be applied twice.
 */
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { regenerateEnergy } from '@engine/economy/energy';
import type { SaveGame } from '@engine/schema/save';
import { dailyKey, weeklyKey } from '@engine/time/clock';
import { applyBossRollover, type BossTribute } from './bosses';

export interface OfflineReport {
  elapsedMs: number;
  energyGained: number;
  newDay: boolean;
  newWeek: boolean;
  /** Boss chests a spent period still owed, paid on this load (BOSSES.md §1). */
  bossTributes: BossTribute[];
}

export function applyOfflineElapsed(save: SaveGame, now: number): { save: SaveGame; report: OfflineReport } {
  const energy = regenerateEnergy(save.energy, save.profile.level, now);
  const daily = dailyKey(now, DAILY_RESET_HOUR);
  const weekly = weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
  // The save handed in may be frozen (immer freezes what the store produced), so everything the
  // tribute below writes to is copied first: it pays into the wallet, the racks and the counters.
  const next: SaveGame = {
    ...save,
    energy,
    periods: { lastDailyKey: daily, lastWeeklyKey: weekly },
    bosses: { ...save.bosses },
    inventory: { ...save.inventory },
    counters: { ...save.counters },
    stats: { ...save.stats },
  };
  // A boss period that has turned over still owes every chest its damage earned and nobody took.
  const bossTributes = applyBossRollover(next, now);
  const report: OfflineReport = {
    elapsedMs: Math.max(0, now - save.updatedAt),
    energyGained: energy.value - save.energy.value,
    newDay: daily !== save.periods.lastDailyKey,
    newWeek: weekly !== save.periods.lastWeeklyKey,
    bossTributes,
  };
  return { save: next, report };
}
