/**
 * The Login Calendar's ladder (docs/design/LOGIN.md §3).
 *
 * The whole system is **two values**: how many days have ever been claimed, and the day key of the
 * last claim. Everything else follows.
 *
 * - Which day is owed next is `(claimed mod 30) + 1`, so the board loops forever with no cycle
 *   counter to keep in step (the owner's answer).
 * - Whether today's is still there is `lastKey !== todayKey`, which is why **missing a day costs
 *   nothing**: there is no streak to reset, and a chronicle that comes back after a fortnight is
 *   simply owed the day it was always owed (the owner's brief).
 *
 * A player who plays twice in one day cannot claim twice, because the second claim's `todayKey`
 * matches the one just written — the same "a record from an older period reads as a fresh one"
 * rule the boss gates and the Brewery's runs use, in reverse.
 */
import { LOGIN_DAYS, loginCycle, loginDayFor } from '@content/balance/login';

export interface LoginState {
  /** Days ever claimed, across every cycle. Never resets. */
  claimed: number;
  /** The day key of the last claim, or `''` before the first. */
  lastKey: string;
}

export const NEW_LOGIN: LoginState = { claimed: 0, lastKey: '' };

/** The board day a chronicle is owed next — 1..30. */
export function pendingDay(state: LoginState): number {
  return loginDayFor(state.claimed);
}

/** Which time round the board this is, 1-based; what the screen prints beside the day. */
export function cycle(state: LoginState): number {
  return loginCycle(state.claimed);
}

/** Whether today's day is still waiting to be taken. */
export function canClaim(state: LoginState, todayKey: string): boolean {
  return state.lastKey !== todayKey;
}

/**
 * Takes today's day. Returns the day claimed and the state after, or `null` when today's has
 * already been taken — which a screen shows as a taken tile rather than an error.
 */
export function claimDay(state: LoginState, todayKey: string): { day: number; state: LoginState } | null {
  if (!canClaim(state, todayKey)) return null;
  const day = pendingDay(state);
  return { day, state: { claimed: state.claimed + 1, lastKey: todayKey } };
}

/**
 * Where each of the thirty tiles stands for this chronicle, in board order.
 *
 * `taken` is the days behind the player **in this cycle**: with 34 claims the player is on day 5,
 * and days 1–4 of this round are taken while 5 is today and 6–30 are still ahead. A tile is never
 * "locked" in the sense of unreachable — every one of them comes round again.
 */
export function boardState(
  state: LoginState,
  todayKey: string,
): readonly { day: number; taken: boolean; today: boolean }[] {
  const pending = pendingDay(state);
  const open = canClaim(state, todayKey);
  return Array.from({ length: LOGIN_DAYS }, (_, index) => {
    const day = index + 1;
    return {
      day,
      /*
       * `pending` has *already* advanced once today's claim is in, so "behind the player" is
       * simply everything before it — in both cases. Reading `pending` as still-owed after a
       * claim would mark tomorrow's tile as taken, which is the bug this comment exists to stop
       * anyone reintroducing.
       */
      taken: day < pending,
      today: open && day === pending,
    };
  });
}
