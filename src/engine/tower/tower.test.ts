import { describe, expect, it } from 'vitest';
import {
  TOWER_FLOORS,
  TOWER_KEY_CAP,
  TOWER_KEY_REGEN_SECONDS,
  TOWER_SHARD_ODDS,
  towerEnergy,
  towerGold,
  towerScale,
} from '@content/balance/tower';
import { DIFFICULTY_MULT, stageScale } from '@content/balance/battle';
import { createRng } from '@engine/rng/rng';
import { MS_PER_DAY, MS_PER_MINUTE } from '@engine/time/clock';
import {
  TOWER_SEASON_MS,
  addKeys,
  bossFloorsUpTo,
  canAttemptFloor,
  currentSeason,
  emptyTower,
  floorState,
  isBossFloor,
  msUntilNextKey,
  msUntilSeasonEnd,
  nextFloor,
  parseTowerEncounterId,
  repeatableFloors,
  rollTowerShards,
  seasonNumber,
  shardOdds,
  spendKeys,
  towerEncounterId,
  towerFloorRewards,
  withFloorCleared,
  type TowerSave,
} from './index';

const T0 = Date.UTC(2026, 8, 18);

/** A tower at a given climb, keys full as of `T0`. */
const at = (highestFloor: number, patch: Partial<TowerSave> = {}): TowerSave => ({
  seasonStartedAt: T0,
  highestFloor,
  bestFloor: highestFloor,
  keys: { value: TOWER_KEY_CAP, lastTickAt: T0 },
  ...patch,
});

describe('the tower floor', () => {
  it('round-trips its encounter id and nothing else', () => {
    expect(towerEncounterId(7)).toBe('encounter.tower.007');
    expect(towerEncounterId(100)).toBe('encounter.tower.100');
    expect(parseTowerEncounterId('encounter.tower.007')).toBe(7);
    expect(parseTowerEncounterId('encounter.stage.01.01.intro')).toBeNull();
    expect(parseTowerEncounterId('encounter.tower.000')).toBeNull();
  });

  it('marks every tenth floor a boss floor', () => {
    expect([10, 20, 50, 100].every(isBossFloor)).toBe(true);
    expect([1, 9, 11, 99].some(isBossFloor)).toBe(false);
    expect(bossFloorsUpTo(35)).toEqual([10, 20, 30]);
    expect(bossFloorsUpTo(9)).toEqual([]);
  });

  it('starts just past the campaign and ends far above it', () => {
    // The encounter is pitched at Intro × stage 0, so `towerScale` is the whole curve.
    const introCeiling = DIFFICULTY_MULT.intro * stageScale(119);
    const hardCeiling = DIFFICULTY_MULT.hard * stageScale(119);
    expect(towerScale(1)).toBeGreaterThan(introCeiling);
    expect(towerScale(1)).toBeLessThan(hardCeiling);
    // Floor 100 is several times the campaign's hardest stand, and the climb never dips.
    expect(towerScale(TOWER_FLOORS)).toBeGreaterThan(hardCeiling * 3);
    for (let floor = 2; floor <= TOWER_FLOORS; floor += 1)
      expect(towerScale(floor)).toBeGreaterThan(towerScale(floor - 1));
  });
});

describe('the tower climb', () => {
  it('opens exactly one new floor, and keeps its boss floors open', () => {
    const state = at(12);
    expect(nextFloor(state)).toBe(13);
    expect(floorState(state, 13)).toBe('next');
    expect(floorState(state, 14)).toBe('locked');
    // An ordinary cleared floor is spent; a cleared boss floor may be fought again.
    expect(floorState(state, 11)).toBe('cleared');
    expect(floorState(state, 10)).toBe('repeatable');
    expect(repeatableFloors(state)).toEqual([10]);
  });

  it('has nothing above its last floor', () => {
    const topped = at(TOWER_FLOORS);
    expect(nextFloor(topped)).toBeNull();
    expect(floorState(topped, TOWER_FLOORS + 1)).toBe('locked');
    expect(canAttemptFloor(topped, TOWER_FLOORS + 1, T0).ok).toBe(false);
  });

  it('advances on a new floor and stands still on a repeat', () => {
    const climbed = withFloorCleared(at(9), 10);
    expect(climbed.highestFloor).toBe(10);
    expect(climbed.bestFloor).toBe(10);
    // Fighting floor 10 again changes nothing: the climb is already past it.
    expect(withFloorCleared(climbed, 10)).toBe(climbed);
  });

  it('refuses a floor the climb has not reached, and takes a key for one it has', () => {
    const state = at(5);
    expect(canAttemptFloor(state, 7, T0).ok).toBe(false);
    const spent = canAttemptFloor(state, 6, T0);
    expect(spent.ok).toBe(true);
    if (spent.ok) expect(spent.value.value).toBe(TOWER_KEY_CAP - 1);
  });
});

describe('the tower key', () => {
  it('regenerates one every fifteen minutes up to the cap', () => {
    const empty = { value: 0, lastTickAt: T0 };
    const quarter = TOWER_KEY_REGEN_SECONDS * 1000;
    expect(msUntilNextKey(empty, T0)).toBe(quarter);
    const later = canAttemptFloor(at(1, { keys: empty }), 2, T0 + quarter * 3);
    expect(later.ok).toBe(true);
    // Three keys regenerated, one spent on the attempt.
    if (later.ok) expect(later.value.value).toBe(2);
    // The cap holds however long the chronicle was away.
    const away = canAttemptFloor(at(1, { keys: empty }), 2, T0 + MS_PER_DAY * 7);
    if (away.ok) expect(away.value.value).toBe(TOWER_KEY_CAP - 1);
  });

  it('lets a grant carry a chronicle above the cap, and stops regenerating there', () => {
    const full = { value: TOWER_KEY_CAP, lastTickAt: T0 };
    const granted = addKeys(full, 6, T0);
    expect(granted.value).toBe(16);
    expect(msUntilNextKey(granted, T0)).toBeNull();
    // Spending back down to the cap does not regenerate anything on the way.
    let keys = granted;
    for (let i = 0; i < 6; i += 1) {
      const taken = spendKeys(keys, 1, T0 + MS_PER_MINUTE * 20 * i);
      expect(taken.ok).toBe(true);
      if (taken.ok) keys = taken.value;
    }
    expect(keys.value).toBe(TOWER_KEY_CAP);
  });

  it('refuses a floor with no key left', () => {
    const state = at(3, { keys: { value: 0, lastTickAt: T0 } });
    const result = canAttemptFloor(state, 4, T0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('insufficient_keys');
  });
});

describe('the tower season', () => {
  it('runs thirty days from the first climb and then starts the tower again', () => {
    const state = at(42);
    expect(seasonNumber(state, T0)).toBe(1);
    expect(msUntilSeasonEnd(state, T0)).toBe(TOWER_SEASON_MS);
    // A day before the turn: still season one, still at floor 42.
    expect(currentSeason(state, T0 + TOWER_SEASON_MS - MS_PER_DAY).highestFloor).toBe(42);
    // Past it: the climb is back at the foot of the tower, the best ever is kept.
    const turned = currentSeason(state, T0 + TOWER_SEASON_MS);
    expect(turned.highestFloor).toBe(0);
    expect(turned.bestFloor).toBe(42);
    expect(seasonNumber(state, T0 + TOWER_SEASON_MS)).toBe(2);
  });

  it('resumes on a season boundary after a long absence, not mid-season', () => {
    // Away for 95 days: three whole seasons have passed and the fourth is five days old.
    const state = at(60);
    const now = T0 + MS_PER_DAY * 95;
    const turned = currentSeason(state, now);
    expect(seasonNumber(state, now)).toBe(4);
    expect(turned.seasonStartedAt).toBe(T0 + TOWER_SEASON_MS * 3);
    expect(msUntilSeasonEnd(state, now)).toBe(TOWER_SEASON_MS - MS_PER_DAY * 5);
  });

  it('has no season at all until the tower is first entered', () => {
    const fresh = emptyTower(T0);
    expect(fresh.seasonStartedAt).toBe(0);
    expect(seasonNumber(fresh, T0 + MS_PER_DAY * 400)).toBe(0);
    expect(msUntilSeasonEnd(fresh, T0)).toBeNull();
    // And a chronicle that unlocks the tower a year later still gets a full season.
    expect(currentSeason(fresh, T0 + MS_PER_DAY * 400).highestFloor).toBe(0);
  });
});

describe('what a floor pays', () => {
  it('prints the owner’s shard table, and holds it flat above the last row', () => {
    expect(TOWER_SHARD_ODDS.map((row) => [row.floor, row.ancient, row.sacred])).toEqual([
      [10, 0.1, 0],
      [20, 0.25, 0],
      [30, 0.5, 0],
      [40, 0.75, 0],
      [50, 1, 0.05],
      [60, 1.5, 0.1],
      [70, 2, 0.15],
      [80, 2.5, 0.25],
      [90, 4, 0.5],
      [100, 5, 0.65],
    ]);
    // A row holds until the next boss floor, and floor 100's odds hold above it for ever.
    expect(shardOdds(50)).toEqual({ ancient: 1, sacred: 0.05 });
    expect(shardOdds(110)).toEqual({ ancient: 5, sacred: 0.65 });
    expect(shardOdds(200)).toEqual({ ancient: 5, sacred: 0.65 });
    // Ordinary floors never drop a shard, whatever their number.
    expect(shardOdds(99)).toEqual({ ancient: 0, sacred: 0 });
  });

  it('rolls shards at about the printed rate', () => {
    // Floor 100: 5 % Ancient, 0.65 % Sacred over ten thousand clears.
    let ancient = 0;
    let sacred = 0;
    for (let i = 0; i < 10_000; i += 1) {
      for (const shard of rollTowerShards(100, createRng(`tower-100-${i}`))) {
        if (shard.currency === 'shard_ancient') ancient += 1;
        if (shard.currency === 'shard_sacred') sacred += 1;
      }
    }
    expect(ancient / 10_000).toBeGreaterThan(0.035);
    expect(ancient / 10_000).toBeLessThan(0.065);
    expect(sacred / 10_000).toBeGreaterThan(0.002);
    expect(sacred / 10_000).toBeLessThan(0.012);
  });

  it('pays gold, energy and brews on every floor, and more on a boss floor', () => {
    const rng = createRng('tower-rewards');
    const ordinary = towerFloorRewards({ floor: 9, element: 'valor' }, rng);
    expect(ordinary.boss).toBe(false);
    expect(ordinary.energy).toBe(1);
    expect(ordinary.currencies.map((c) => c.currency)).toEqual(['gold', 'brew_universal']);
    // A boss floor pays three times the gold and the faction's own brew beside the Universal.
    const boss = towerFloorRewards({ floor: 10, element: 'valor' }, rng);
    expect(boss.boss).toBe(true);
    expect(boss.currencies.find((c) => c.currency === 'gold')?.amount).toBe(towerGold(10, true));
    expect(boss.currencies.some((c) => c.currency === 'brew_valor')).toBe(true);
    // Three times the floor's gold, rounded once rather than twice, so it may differ by a coin.
    expect(towerGold(10, true) / towerGold(10, false)).toBeCloseTo(3, 2);
    // Energy climbs one to five in bands of twenty, and gold never dips.
    expect([1, 21, 41, 61, 81, 100].map(towerEnergy)).toEqual([1, 2, 3, 4, 5, 5]);
    for (let floor = 2; floor <= TOWER_FLOORS; floor += 1)
      expect(towerGold(floor, false)).toBeGreaterThan(towerGold(floor - 1, false));
  });
});
