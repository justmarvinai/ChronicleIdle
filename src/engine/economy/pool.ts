/**
 * A pool that refills on a clock: energy (`ECONOMY.md` §5) and the Eternal Tower's keys
 * (`ETERNAL_TOWER.md` §5) are the same mechanism with different numbers.
 *
 * Stored as a value plus the instant it last ticked, never as a countdown (CLAUDE.md §5.5), so a
 * chronicle that was closed for a week is refilled by arithmetic on load rather than by anything
 * having had to run while it was away.
 *
 * Regeneration stops at the cap; a *grant* may carry the pool above it and simply freezes the
 * clock until spending drops it back under (an energy purse of 1,240/160, a tower at 16/10).
 */
import { fail, ok, type GameErrorCode, type Result } from '@engine/errors';

export interface Pool {
  value: number;
  lastTickAt: number;
}

/** Applies regeneration up to `now`: one point per `periodMs` while below `cap`. */
export function regenerate(pool: Pool, cap: number, periodMs: number, now: number): Pool {
  if (now <= pool.lastTickAt) return pool;
  if (pool.value >= cap) return { value: pool.value, lastTickAt: now };
  const ticks = Math.floor((now - pool.lastTickAt) / periodMs);
  if (ticks <= 0) return pool;
  const value = Math.min(cap, pool.value + ticks);
  // Keep the remainder so partial progress towards the next point is not lost — unless we hit the cap.
  const lastTickAt = value >= cap ? now : pool.lastTickAt + ticks * periodMs;
  return { value, lastTickAt };
}

/** Milliseconds until the next point, or null when at or above the cap. */
export function msUntilNext(pool: Pool, cap: number, periodMs: number, now: number): number | null {
  if (pool.value >= cap) return null;
  const elapsed = Math.max(0, now - pool.lastTickAt);
  return periodMs - (elapsed % periodMs);
}

/** Rewards always add, without an upper limit. */
export function add(pool: Pool, amount: number, cap: number, periodMs: number, now: number): Pool {
  const regenerated = regenerate(pool, cap, periodMs, now);
  const wasBelowCap = regenerated.value < cap;
  const value = regenerated.value + Math.max(0, amount);
  // Crossing the cap freezes regeneration; the tick clock restarts when we drop below it again.
  return { value, lastTickAt: wasBelowCap && value >= cap ? now : regenerated.lastTickAt };
}

/** Spends from the pool, or fails with `reason` when it does not cover `amount`. */
export function take(
  pool: Pool,
  amount: number,
  cap: number,
  periodMs: number,
  now: number,
  reason: GameErrorCode,
): Result<Pool> {
  const regenerated = regenerate(pool, cap, periodMs, now);
  if (regenerated.value < amount)
    return fail(reason, `Need ${amount}, have ${regenerated.value}`, {
      needed: amount,
      have: regenerated.value,
    });
  const value = regenerated.value - amount;
  // If we were above the cap and just dropped below it, regeneration starts counting from now.
  const lastTickAt = regenerated.value >= cap && value < cap ? now : regenerated.lastTickAt;
  return ok({ value, lastTickAt });
}
