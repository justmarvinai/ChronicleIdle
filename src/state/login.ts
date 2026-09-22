/**
 * The Login Calendar through the store (docs/design/LOGIN.md).
 *
 * The engine owns the ladder; this pays the day out. A claim is the only thing that writes, and it
 * writes exactly two numbers — which is why a chronicle can be away for a month without the board
 * owing or losing anything.
 */
import { LOGIN_DAYS } from '@content/balance/login';
import { DAILY_RESET_HOUR } from '@content/balance/economy';
import type { LoginDay } from '@content/login/index';
import { content } from '@content/registry';
import { fail, ok, type Result } from '@engine/errors';
import { boardState, canClaim, claimDay, cycle, pendingDay } from '@engine/login/index';
import { bumpCounter } from '@engine/progression/counters';
import type { SaveGame } from '@engine/schema/save';
import { dailyKey, msUntilDailyReset } from '@engine/time/clock';
import { payGrants, type GrantResult } from './grants';

export interface LoginTileView {
  day: number;
  def: LoginDay;
  taken: boolean;
  today: boolean;
}

export interface LoginView {
  tiles: readonly LoginTileView[];
  /** The day owed next, 1..30. */
  pending: number;
  /** Which time round the board this is, 1-based. */
  cycle: number;
  /** Whether today's tile is still there to take. */
  claimable: boolean;
  /** Milliseconds until the next day's tile opens. */
  nextIn: number;
}

export function loginView(save: SaveGame, now: number): LoginView {
  const today = dailyKey(now, DAILY_RESET_HOUR);
  const tiles = boardState(save.login, today).flatMap((tile) => {
    const def = content.loginDay(tile.day);
    return def ? [{ day: tile.day, def, taken: tile.taken, today: tile.today }] : [];
  });
  return {
    tiles,
    pending: pendingDay(save.login),
    cycle: cycle(save.login),
    claimable: canClaim(save.login, today),
    nextIn: msUntilDailyReset(now, DAILY_RESET_HOUR),
  };
}

export interface LoginClaim {
  day: number;
  def: LoginDay;
  got: GrantResult;
  /** True when this claim finished a round and the board starts again tomorrow. */
  cycled: boolean;
}

/** Takes today's tile. Refuses a second claim the same day rather than paying twice. */
export function applyLoginClaim(save: SaveGame, now: number): Result<LoginClaim> {
  const today = dailyKey(now, DAILY_RESET_HOUR);
  const claim = claimDay(save.login, today);
  if (!claim) return fail('invalid_argument', 'Today’s day has already been taken');
  const def = content.loginDay(claim.day);
  if (!def) return fail('invalid_argument', `The board has no day ${claim.day}`);

  save.login = claim.state;
  const got = payGrants(save, def.rewards, now);
  bumpCounter(save, 'login.claims');
  return ok({ day: claim.day, def, got, cycled: claim.day === LOGIN_DAYS });
}
