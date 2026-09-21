/**
 * Time abstraction. Engine code never reads the wall clock directly; it receives a `Clock`
 * (CLAUDE.md §5.2). Period keys are computed in the device's local time zone with the reset
 * hour/weekday from `balance/economy.ts` (daily 00:00, weekly Monday 00:00 — owner's answer Q3).
 */
export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number;
}

export class FixedClock implements Clock {
  constructor(private current: number) {}
  now(): number {
    return this.current;
  }
  set(ms: number): void {
    this.current = ms;
  }
  advance(ms: number): void {
    this.current += ms;
  }
}

export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local calendar date of the "game day" containing `now`, after shifting by the reset hour. */
export function dailyKey(now: number, resetHour: number): string {
  const d = new Date(now - resetHour * MS_PER_HOUR);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Weekday of the "game day" containing `now`, `0` = Sunday … `6` = Saturday, shifted by the reset
 * hour the same way `dailyKey` is — so a hall that opens on Wednesday opens when the player's
 * Wednesday starts and closes when their Thursday does (`BREWERY.md` §4).
 */
export function gameWeekday(now: number, resetHour: number): number {
  return new Date(now - resetHour * MS_PER_HOUR).getDay();
}

/**
 * Key of the game week containing `now`. Weeks start on `resetWeekday` (0 = Sunday … 6 = Saturday)
 * at `resetHour` local time; the key is the local date of that week's start.
 */
export function weeklyKey(now: number, resetHour: number, resetWeekday: number): string {
  const d = new Date(now - resetHour * MS_PER_HOUR);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const back = (d.getDay() - resetWeekday + 7) % 7;
  start.setDate(start.getDate() - back);
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

/** Milliseconds until the next daily reset. */
export function msUntilDailyReset(now: number, resetHour: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), resetHour, 0, 0, 0);
  if (next.getTime() <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now;
}

/** Milliseconds until the next weekly reset. */
export function msUntilWeeklyReset(now: number, resetHour: number, resetWeekday: number): number {
  const d = new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), resetHour, 0, 0, 0);
  const forward = (resetWeekday - next.getDay() + 7) % 7;
  next.setDate(next.getDate() + forward);
  if (next.getTime() <= now) next.setDate(next.getDate() + 7);
  return next.getTime() - now;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${pad(minutes)}m`;
  if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
  return `${seconds}s`;
}
