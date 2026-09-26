/**
 * The Eternal Tower’s state and rules (docs/design/ETERNAL_TOWER.md §2, §6, §7).
 *
 * Little is stored and everything else is read off it: the instant the tower was first entered,
 * which season the climb belongs to, how high it got, and the key pool. Floors are climbed in
 * order, so one number — the highest floor cleared — says which floors are behind the player,
 * which one is next and which boss floors may be fought again. There is no per-floor record to
 * keep in step.
 *
 * A season is anchored to the first floor the chronicle ever attempted — `firstAttemptAt` never
 * moves again — and runs in whole thirty-day steps from there. The climb carries the *index* of
 * the season it belongs to, exactly as a boss's record carries its period key, so a climb from an
 * older season reads as an empty one and nothing has to run while the game is closed (ADR-033).
 * That also keeps the season's number honest: it is the distance from the anchor, not a counter
 * that a reset could lose.
 */
import {
  TOWER_FLOORS,
  TOWER_KEY_CAP,
  TOWER_KEY_COST,
  TOWER_KEY_REGEN_SECONDS,
  TOWER_SEASON_DAYS,
} from '@content/balance/tower';
import { add, msUntilNext, regenerate, take, type Pool } from '@engine/economy/pool';
import { fail, type Result } from '@engine/errors';
import { MS_PER_DAY } from '@engine/time/clock';
import { isBossFloor } from './encounter';

/** The tower's slice of the save (v14). */
export interface TowerSave {
  /**
   * The first floor this chronicle ever attempted, and the anchor every season is measured from;
   * 0 while the tower has never been entered. A fresh chronicle must not be handed a season that
   * is already stale by the time it unlocks the tower, so this is not the save's birthday.
   */
  firstAttemptAt: number;
  /** Which season (0-based, from the anchor) the climb below belongs to. */
  climbSeason: number;
  /** Highest floor cleared in `climbSeason`; 0 before the first clear. */
  highestFloor: number;
  /** Highest floor ever cleared. This outlives the season, as boss records outlive their period. */
  bestFloor: number;
  /** Eternal Keys, as a value and the instant they last ticked. */
  keys: Pool;
}

const KEY_PERIOD_MS = TOWER_KEY_REGEN_SECONDS * 1000;
export const TOWER_SEASON_MS = TOWER_SEASON_DAYS * MS_PER_DAY;

/** A tower nobody has entered: no season, no climb, and a full ring of keys to start on. */
export function emptyTower(now = 0): TowerSave {
  return {
    firstAttemptAt: 0,
    climbSeason: 0,
    highestFloor: 0,
    bestFloor: 0,
    keys: { value: TOWER_KEY_CAP, lastTickAt: now },
  };
}

// ---------------------------------------------------------------------------------------------
// The season
// ---------------------------------------------------------------------------------------------

/**
 * Which season `now` falls in, counted from the anchor: 0 for the first thirty days, 1 for the
 * next, and −1 while the tower has never been entered.
 */
export function seasonIndex(state: TowerSave, now: number): number {
  if (state.firstAttemptAt <= 0) return -1;
  return Math.max(0, Math.floor((now - state.firstAttemptAt) / TOWER_SEASON_MS));
}

/**
 * The tower as it stands at `now`: the stored state while its season runs, and a climb reset to
 * the foot of the tower once the season it belongs to is behind us. Pure — nothing is written
 * here, so a chronicle opened after a year reads correctly without a reset ever having run.
 */
export function currentSeason(state: TowerSave, now: number): TowerSave {
  const index = seasonIndex(state, now);
  if (index < 0 || index === state.climbSeason) return state;
  return { ...state, climbSeason: index, highestFloor: 0 };
}

/** When the season `now` falls in ends, or null while the tower has never been entered. */
export function seasonEndsAt(state: TowerSave, now: number): number | null {
  const index = seasonIndex(state, now);
  return index < 0 ? null : state.firstAttemptAt + (index + 1) * TOWER_SEASON_MS;
}

/** How long this season still has to run, or null before the first climb. */
export function msUntilSeasonEnd(state: TowerSave, now: number): number | null {
  const ends = seasonEndsAt(state, now);
  return ends === null ? null : Math.max(0, ends - now);
}

/** The season number a chronicle is on, counting the first as 1; 0 before the first climb. */
export function seasonNumber(state: TowerSave, now: number): number {
  const index = seasonIndex(state, now);
  return index < 0 ? 0 : index + 1;
}

// ---------------------------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------------------------

export function regenerateKeys(keys: Pool, now: number): Pool {
  return regenerate(keys, TOWER_KEY_CAP, KEY_PERIOD_MS, now);
}

/** Milliseconds until the next key, or null at or above the cap. */
export function msUntilNextKey(keys: Pool, now: number): number | null {
  return msUntilNext(keys, TOWER_KEY_CAP, KEY_PERIOD_MS, now);
}

/**
 * A grant, which may carry the pool above the cap (16/10): regeneration stops at the cap, a grant
 * does not. The gem refill (`@state/wallet`, USER_QUESTIONS.md Q49) is the grant that uses it.
 */
export function addKeys(keys: Pool, amount: number, now: number): Pool {
  return add(keys, amount, TOWER_KEY_CAP, KEY_PERIOD_MS, now);
}

export function spendKeys(keys: Pool, amount: number, now: number): Result<Pool> {
  return take(keys, amount, TOWER_KEY_CAP, KEY_PERIOD_MS, now, 'insufficient_keys');
}

// ---------------------------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------------------------

/** The next unclimbed floor, or null when the tower's last floor is already behind the player. */
export function nextFloor(state: TowerSave): number | null {
  return state.highestFloor >= TOWER_FLOORS ? null : state.highestFloor + 1;
}

export type FloorState =
  /** Climbed this season, and an ordinary floor: nothing left to take. */
  | 'cleared'
  /** Climbed this season and a boss floor: it may be fought again for its shards. */
  | 'repeatable'
  /** The one floor the key may be spent on. */
  | 'next'
  /** Above the climb. */
  | 'locked';

export function floorState(state: TowerSave, floor: number): FloorState {
  if (floor <= state.highestFloor) return isBossFloor(floor) ? 'repeatable' : 'cleared';
  if (floor === state.highestFloor + 1 && floor <= TOWER_FLOORS) return 'next';
  return 'locked';
}

/** Whether a key may be spent on this floor at all. */
export function isFloorOpen(state: TowerSave, floor: number): boolean {
  const at = floorState(state, floor);
  return at === 'next' || at === 'repeatable';
}

/**
 * Checks a floor attempt. The key is charged by the caller *before* the fight — like the
 * campaign's energy and the boss's own keys, so a crash mid-battle cannot buy a free attempt
 * (`USER_QUESTIONS.md` Q48) — and this is the gate that decides whether it may be.
 */
export function canAttemptFloor(state: TowerSave, floor: number, now: number): Result<Pool> {
  if (floor < 1 || floor > TOWER_FLOORS)
    return fail('invalid_argument', `Floor ${floor} is outside the tower`);
  const season = currentSeason(state, now);
  if (!isFloorOpen(season, floor))
    return fail('locked', `Floor ${floor} is not open (highest cleared ${season.highestFloor})`);
  return spendKeys(season.keys, TOWER_KEY_COST, now);
}

/**
 * A floor cleared. An ordinary floor advances the climb; a boss floor fought again changes
 * nothing but the clock, because the climb is already past it.
 */
export function withFloorCleared(state: TowerSave, floor: number): TowerSave {
  if (floor <= state.highestFloor) return state;
  return { ...state, highestFloor: floor, bestFloor: Math.max(state.bestFloor, floor) };
}
