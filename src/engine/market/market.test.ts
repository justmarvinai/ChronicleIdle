import { describe, expect, it } from 'vitest';
import { BOOST_MULTIPLIER, boostDurationMs } from '@content/balance/boosts';
import { GOLD_MARKET_POOL, GOLD_MARKET_ROTATION_MS, GOLD_MARKET_SLOTS } from '@content/balance/market';
import { LOGIN_DAYS } from '@content/balance/login';
import {
  NO_BOOSTS,
  activeBoosts,
  applyBoost,
  boostMultiplier,
  boostRemaining,
  isBoostActive,
  pruneBoosts,
} from '@engine/boosts/index';
import { EMPTY_BAG, addToBag, bagRows, bagSize, held, holds, takeFromBag } from '@engine/bag/index';
import { affordableFromSlot, goldShelf, marketHour, msUntilRotation, slotLeft } from '@engine/market/index';
import { NEW_LOGIN, boardState, canClaim, claimDay, cycle, pendingDay } from '@engine/login/index';

const HOUR = 3_600_000;
/** 2026-09-22 09:00 UTC, an instant exactly on an hour so the rotation maths is readable. */
const T0 = Date.UTC(2026, 8, 22, 9, 0, 0);

describe('boosts', () => {
  it('is not running before anything is used', () => {
    expect(isBoostActive(NO_BOOSTS, 'player_xp', T0)).toBe(false);
    expect(boostMultiplier(NO_BOOSTS, 'player_xp', T0)).toBe(1);
    expect(boostRemaining(NO_BOOSTS, 'player_xp', T0)).toBe(0);
  });

  it('runs for its own duration and then stops', () => {
    const after = applyBoost(NO_BOOSTS, 'player_xp', T0);
    const span = boostDurationMs('player_xp');
    expect(boostMultiplier(after, 'player_xp', T0)).toBe(BOOST_MULTIPLIER.player_xp);
    expect(boostMultiplier(after, 'player_xp', T0 + span - 1)).toBe(BOOST_MULTIPLIER.player_xp);
    // The instant it runs out it is over — an expiry is exclusive.
    expect(boostMultiplier(after, 'player_xp', T0 + span)).toBe(1);
  });

  it('stacks in time, never in strength — three of them is 72 hours at ×2', () => {
    let boosts = applyBoost(NO_BOOSTS, 'player_xp', T0);
    boosts = applyBoost(boosts, 'player_xp', T0);
    boosts = applyBoost(boosts, 'player_xp', T0);
    expect(boostRemaining(boosts, 'player_xp', T0)).toBe(3 * boostDurationMs('player_xp'));
    expect(boostMultiplier(boosts, 'player_xp', T0)).toBe(2);
    expect(boostMultiplier(boosts, 'player_xp', T0 + 71 * HOUR)).toBe(2);
    expect(boostMultiplier(boosts, 'player_xp', T0 + 73 * HOUR)).toBe(1);
  });

  it('keeps every minute a running boost had left when another is used', () => {
    const first = applyBoost(NO_BOOSTS, 'brewery', T0);
    // Twelve hours in, with twelve left: a second should make it thirty-six, not twenty-four.
    const second = applyBoost(first, 'brewery', T0 + 12 * HOUR);
    expect(boostRemaining(second, 'brewery', T0 + 12 * HOUR)).toBe(36 * HOUR);
  });

  it('starts from now again once it has lapsed', () => {
    const first = applyBoost(NO_BOOSTS, 'brewery', T0);
    const late = T0 + 100 * HOUR;
    const second = applyBoost(first, 'brewery', late);
    expect(boostRemaining(second, 'brewery', late)).toBe(boostDurationMs('brewery'));
  });

  it('keeps the three apart', () => {
    const boosts = applyBoost(NO_BOOSTS, 'champion_xp', T0);
    expect(boostMultiplier(boosts, 'champion_xp', T0)).toBe(2);
    expect(boostMultiplier(boosts, 'player_xp', T0)).toBe(1);
    expect(boostMultiplier(boosts, 'brewery', T0)).toBe(1);
  });

  it('lists what is live, and prunes what is not', () => {
    let boosts = applyBoost(NO_BOOSTS, 'champion_xp', T0);
    boosts = applyBoost(boosts, 'brewery', T0);
    expect(activeBoosts(boosts, T0).map((row) => row.boost)).toEqual(['champion_xp', 'brewery']);
    const later = T0 + 100 * HOUR;
    expect(activeBoosts(boosts, later)).toEqual([]);
    expect(pruneBoosts(boosts, later)).toEqual({});
    // Pruning a live one keeps it.
    expect(pruneBoosts(boosts, T0)).toEqual(boosts);
  });
});

describe('the Bag', () => {
  it('holds nothing to start with', () => {
    expect(held(EMPTY_BAG, 'item.brewery_token')).toBe(0);
    expect(holds(EMPTY_BAG, 'item.brewery_token')).toBe(false);
    expect(bagSize(EMPTY_BAG)).toBe(0);
  });

  it('adds and stacks', () => {
    let bag = addToBag(EMPTY_BAG, 'item.brewery_token');
    bag = addToBag(bag, 'item.brewery_token', 3);
    expect(held(bag, 'item.brewery_token')).toBe(4);
    expect(bagSize(bag)).toBe(4);
  });

  it('refuses to take what is not held, rather than going negative', () => {
    const bag = addToBag(EMPTY_BAG, 'item.brewery_token', 1);
    expect(takeFromBag(bag, 'item.brewery_token', 2)).toBeNull();
    expect(takeFromBag(bag, 'item.mission_skip')).toBeNull();
    // The bag it refused is untouched.
    expect(held(bag, 'item.brewery_token')).toBe(1);
  });

  it('drops the row rather than leaving a zero behind', () => {
    const bag = addToBag(EMPTY_BAG, 'item.brewery_token', 1);
    const after = takeFromBag(bag, 'item.brewery_token');
    expect(after).toEqual({});
    expect(Object.keys(after ?? {})).toHaveLength(0);
  });

  it('draws rows in the order it is given, skipping what is not held', () => {
    const bag = addToBag(addToBag(EMPTY_BAG, 'item.a', 2), 'item.c', 1);
    expect(bagRows(bag, ['item.a', 'item.b', 'item.c'])).toEqual([
      { item: 'item.a', count: 2 },
      { item: 'item.c', count: 1 },
    ]);
  });
});

describe('the Gold Market', () => {
  it('is the same shelf all hour, and a different one the next', () => {
    const a = goldShelf('seed', T0);
    const b = goldShelf('seed', T0 + HOUR - 1);
    const c = goldShelf('seed', T0 + HOUR);
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });

  it('gives two chronicles different stalls in the same hour', () => {
    expect(goldShelf('one', T0)).not.toEqual(goldShelf('two', T0));
  });

  it('fills every slot with something different', () => {
    const shelf = goldShelf('seed', T0);
    expect(shelf).toHaveLength(GOLD_MARKET_SLOTS);
    expect(new Set(shelf.map((slot) => slot.currency)).size).toBe(GOLD_MARKET_SLOTS);
  });

  it('stocks each slot inside its row’s band, and prices it at the row’s rate', () => {
    const byCurrency = new Map(GOLD_MARKET_POOL.map((row) => [row.currency, row]));
    // Twenty hours is enough to see most of the pool without the test taking any time.
    for (let hour = 0; hour < 20; hour += 1) {
      for (const slot of goldShelf('seed', T0 + hour * HOUR)) {
        const row = byCurrency.get(slot.currency);
        expect(row).toBeDefined();
        expect(slot.stock).toBeGreaterThanOrEqual(row?.min ?? 0);
        expect(slot.stock).toBeLessThanOrEqual(row?.max ?? 0);
        expect(slot.unitGold).toBe(row?.unitGold);
      }
    }
  });

  it('counts the hour down to the turn of the stall', () => {
    expect(marketHour(T0)).toBe(marketHour(T0 + HOUR - 1));
    expect(marketHour(T0 + HOUR)).toBe(marketHour(T0) + 1);
    expect(msUntilRotation(T0)).toBe(GOLD_MARKET_ROTATION_MS);
    expect(msUntilRotation(T0 + HOUR - 1)).toBe(1);
  });

  it('sells what is left, and only what the purse covers', () => {
    const slot = { index: 0, currency: 'gold' as const, stock: 10, unitGold: 100 };
    expect(slotLeft(slot, 4)).toBe(6);
    expect(affordableFromSlot(slot, 0, 10_000)).toBe(10);
    expect(affordableFromSlot(slot, 0, 550)).toBe(5);
    expect(affordableFromSlot(slot, 8, 10_000)).toBe(2);
    expect(affordableFromSlot(slot, 10, 10_000)).toBe(0);
    expect(affordableFromSlot(slot, 0, 99)).toBe(0);
  });
});

describe('the Login Calendar', () => {
  const DAY1 = '2026-09-22';
  const DAY2 = '2026-09-23';

  it('owes day 1 to a chronicle that has never claimed', () => {
    expect(pendingDay(NEW_LOGIN)).toBe(1);
    expect(cycle(NEW_LOGIN)).toBe(1);
    expect(canClaim(NEW_LOGIN, DAY1)).toBe(true);
  });

  it('pays once a day, however often the game is opened', () => {
    const first = claimDay(NEW_LOGIN, DAY1);
    expect(first?.day).toBe(1);
    expect(claimDay(first?.state ?? NEW_LOGIN, DAY1)).toBeNull();
    expect(claimDay(first?.state ?? NEW_LOGIN, DAY2)?.day).toBe(2);
  });

  it('loses nothing to a missed day — there is no streak to break', () => {
    let state = NEW_LOGIN;
    for (const key of ['d1', 'd2', 'd3']) state = claimDay(state, key)?.state ?? state;
    expect(pendingDay(state)).toBe(4);
    // Three weeks away, and the board is still exactly where it was.
    expect(pendingDay(state)).toBe(4);
    expect(claimDay(state, 'much-later')?.day).toBe(4);
  });

  it('loops forever, the same thirty days', () => {
    let state = NEW_LOGIN;
    for (let day = 0; day < LOGIN_DAYS; day += 1) state = claimDay(state, `d${day}`)?.state ?? state;
    expect(state.claimed).toBe(LOGIN_DAYS);
    expect(pendingDay(state)).toBe(1);
    expect(cycle(state)).toBe(2);
    // And round again.
    for (let day = 0; day < LOGIN_DAYS; day += 1) state = claimDay(state, `e${day}`)?.state ?? state;
    expect(pendingDay(state)).toBe(1);
    expect(cycle(state)).toBe(3);
  });

  it('marks the board: what is behind, what is today, what is ahead', () => {
    let state = NEW_LOGIN;
    for (const key of ['d1', 'd2', 'd3']) state = claimDay(state, key)?.state ?? state;
    const board = boardState(state, 'd4');
    expect(board).toHaveLength(LOGIN_DAYS);
    expect(board.filter((tile) => tile.taken).map((tile) => tile.day)).toEqual([1, 2, 3]);
    expect(board.filter((tile) => tile.today).map((tile) => tile.day)).toEqual([4]);
    // Once today's is taken, day 4 reads as taken and nothing is today.
    const after = boardState(claimDay(state, 'd4')?.state ?? state, 'd4');
    expect(after.filter((tile) => tile.taken).map((tile) => tile.day)).toEqual([1, 2, 3, 4]);
    expect(after.filter((tile) => tile.today)).toEqual([]);
  });

  it('starts the next round with a clean board', () => {
    let state = NEW_LOGIN;
    for (let day = 0; day < LOGIN_DAYS; day += 1) state = claimDay(state, `d${day}`)?.state ?? state;
    const board = boardState(state, 'next');
    expect(board.filter((tile) => tile.taken)).toEqual([]);
    expect(board.filter((tile) => tile.today).map((tile) => tile.day)).toEqual([1]);
  });
});
