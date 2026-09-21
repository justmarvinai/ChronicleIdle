/**
 * When a hall's doors are open (docs/design/BREWERY.md §4).
 *
 * The day is the player's own: `gameWeekday` takes the weekday of the game day containing `now`,
 * shifted by the same daily reset the quests use, so a hall that opens on Wednesday opens when the
 * player's Wednesday starts and closes when their Thursday does.
 */
import type { BreweryDef } from '@content/brewery/types';
import { DAILY_RESET_HOUR } from '@content/balance/economy';
import { gameWeekday, MS_PER_DAY, msUntilDailyReset } from '@engine/time/clock';

/** Whether the hall brews on a given weekday, `0` = Sunday. */
export function opensOn(def: BreweryDef, weekday: number): boolean {
  return def.openDays.includes(weekday);
}

/** Whether the hall is open at `now`. A hall with no listed days is never open. */
export function isBreweryOpen(def: BreweryDef, now: number): boolean {
  return opensOn(def, gameWeekday(now, DAILY_RESET_HOUR));
}

/** How many days ahead the hall next opens: 0 = today, 1 = tomorrow; `null` if it never does. */
export function daysUntilOpen(def: BreweryDef, now: number): number | null {
  const today = gameWeekday(now, DAILY_RESET_HOUR);
  for (let ahead = 0; ahead < 7; ahead += 1) if (opensOn(def, (today + ahead) % 7)) return ahead;
  return null;
}

/** The weekday the hall next opens on, or `null` if it never does. */
export function nextOpenWeekday(def: BreweryDef, now: number): number | null {
  const ahead = daysUntilOpen(def, now);
  const today = gameWeekday(now, DAILY_RESET_HOUR);
  return ahead === null ? null : (today + ahead) % 7;
}

/**
 * Milliseconds until the hall's doors open: `0` while it is open, and the time to the start of its
 * next open day otherwise. `null` when it has no open days at all.
 */
export function msUntilBreweryOpens(def: BreweryDef, now: number): number | null {
  const ahead = daysUntilOpen(def, now);
  if (ahead === null) return null;
  if (ahead === 0) return 0;
  // The first reset is the start of tomorrow, so `ahead` days out is that plus the days between.
  return msUntilDailyReset(now, DAILY_RESET_HOUR) + (ahead - 1) * MS_PER_DAY;
}
