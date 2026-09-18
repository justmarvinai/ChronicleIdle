/**
 * The Eternal Tower's state and rules (docs/design/ETERNAL_TOWER.md §2, §5, §6).
 *
 * Three facts are stored and everything else is read off them: when this season began, how high
 * the climb has got, and the key pool. Floors are climbed in order, so one number — the highest
 * floor cleared — says which floors are behind the player, which one is next and which boss floors
 * may be fought again. There is no per-floor record to keep in step.
 *
 * A season is anchored to the first floor the chronicle ever attempted, and turns over in whole
 * thirty-day steps from there, so a chronicle closed for three months resumes on a season boundary
 * rather than mid-season (the same discipline as the boss period and the Idle Chest, ADR-033).
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
import { bossFloorsUpTo, isBossFloor } from './encounter';

/** The tower's slice of the save (v14). */
export interface TowerSave {
  /**
   * When the current season began, or 0 while the tower has never been entered. A fresh chronicle
   * must not be handed a season that is already stale by the time it unlocks the tower.
   */
  seasonStartedAt: number;
  /** Highest floor cleared this season; 0 before the first clear. */
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
    seasonStartedAt: 0,
    highestFloor: 0,
    bestFloor: 0,
    keys: { value: TOWER_KEY_CAP, lastTickAt: now },
  };
}

// ---------------------------------------------------------------------------------------------
// The season
// ---------------------------------------------------------------------------------------------

/** How many whole seasons have passed since this one began; 0 while it is still running. */
export function seasonsElapsed(state: TowerSave, now: number): number {
  if (state.seasonStartedAt <= 0) return 0;
  return Math.max(0, Math.floor((now - state.seasonStartedAt) / TOWER_SEASON_MS));
}

/**
 * The tower as it stands at `now`: the stored state while the season runs, and a climb reset to
 * the foot of the tower once thirty days have passed. Pure — nothing is written here.
 */
export function currentSeason(state: TowerSave, now: number): TowerSave {
  const elapsed = seasonsElapsed(state, now);
  if (elapsed === 0) return state;
  return {
    ...state,
    seasonStartedAt: state.seasonStartedAt + elapsed * TOWER_SEASON_MS,
    highestFloor: 0,
  };
}

/** When this season ends, or null while the tower has never been entered. */
export function seasonEndsAt(state: TowerSave): number | null {
  return state.seasonStartedAt > 0 ? state.seasonStartedAt + TOWER_SEASON_MS : null;
}

/** How long this season still has to run, or null before the first climb. */
export function msUntilSeasonEnd(state: TowerSave, now: number): number | null {
  const season = currentSeason(state, now);
  const ends = seasonEndsAt(season);
  return ends === null ? null : Math.max(0, ends - now);
}

/** The season number a chronicle is on, counting the first as 1; 0 before the first climb. */
export function seasonNumber(state: TowerSave, now: number): number {
  return state.seasonStartedAt > 0 ? seasonsElapsed(state, now) + 1 : 0;
}

// ---------------------------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------------------------

export const towerKeyCap = (): number => TOWER_KEY_CAP;

export function regenerateKeys(keys: Pool, now: number): Pool {
  return regenerate(keys, TOWER_KEY_CAP, KEY_PERIOD_MS, now);
}

/** Milliseconds until the next key, or null at or above the cap. */
export function msUntilNextKey(keys: Pool, now: number): number | null {
  return msUntilNext(keys, TOWER_KEY_CAP, KEY_PERIOD_MS, now);
}

/** A grant, which may carry the pool above the cap (16/10). */
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

/** The boss floors the climb has opened for repeat runs, lowest first. */
export function repeatableFloors(state: TowerSave): number[] {
  return bossFloorsUpTo(state.highestFloor);
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
