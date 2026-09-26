/**
 * The Mine (docs/design/MINE.md): its table, its store, the carried fractions, and the gate on
 * digging deeper. Every figure is read off `balance/mine.ts`, so a retune moves these tests with it
 * — what they pin is the arithmetic, and the promises the design makes about it.
 */
import { describe, expect, it } from 'vitest';
import { MINE_LEVELS, MINE_MAX_LEVEL } from '@content/balance/mine';
import { FEATURE_UNLOCK_LEVEL, PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { CURRENCY_IDS, type CurrencyId } from '@content/currencies/types';
import { MS_PER_DAY, MS_PER_HOUR } from '@engine/time/clock';
import {
  collectMine,
  mineGain,
  mineLevel,
  mineStore,
  mineStoreMs,
  mineUpgradeBlock,
  newMine,
  nextMineLevel,
  settleMine,
  splitWhole,
  type MineState,
} from './index';

const T0 = new Date(2026, 8, 26, 9, 0).getTime();

const level = (n: number) => mineLevel(n);
const mineAt = (n: number, collectedAt = T0, carry = { gems: 0, sigils: 0 }): MineState => ({
  level: n,
  collectedAt,
  carry,
});
const plenty = (): number => Number.MAX_SAFE_INTEGER;

describe('the Mine’s table', () => {
  it('starts at level 1 with the feature and counts up one level at a time', () => {
    expect(MINE_LEVELS.map((row) => row.level)).toEqual(
      Array.from({ length: MINE_MAX_LEVEL }, (_, index) => index + 1),
    );
    expect(level(1).opensAt).toBe(FEATURE_UNLOCK_LEVEL.mine);
    expect(level(1).cost).toEqual([]);
  });

  it('opens each level later than the last, and every one inside the level cap', () => {
    for (let n = 2; n <= MINE_MAX_LEVEL; n += 1) {
      expect(level(n).opensAt, `level ${n}`).toBeGreaterThan(level(n - 1).opensAt);
      expect(level(n).opensAt).toBeLessThanOrEqual(PLAYER_MAX_LEVEL);
    }
  });

  it('digs more, holds more and waits longer at every level — an upgrade is never a step back', () => {
    for (let n = 2; n <= MINE_MAX_LEVEL; n += 1) {
      expect(level(n).gemsPerDay, `level ${n}`).toBeGreaterThan(level(n - 1).gemsPerDay);
      expect(level(n).storeGems).toBeGreaterThan(level(n - 1).storeGems);
      expect(level(n).sigilsPerDay).toBeGreaterThanOrEqual(level(n - 1).sigilsPerDay);
      expect(mineStoreMs(n)).toBeGreaterThanOrEqual(mineStoreMs(n - 1));
    }
  });

  it('keeps the store between half a day and a day, so one visit a day never loses more than half', () => {
    for (let n = 1; n <= MINE_MAX_LEVEL; n += 1) {
      expect(mineStoreMs(n), `level ${n}`).toBeGreaterThanOrEqual(12 * MS_PER_HOUR);
      expect(mineStoreMs(n)).toBeLessThanOrEqual(MS_PER_DAY);
    }
    // The deepest Mine loses nothing to a player who visits once a day.
    expect(mineStoreMs(MINE_MAX_LEVEL)).toBe(MS_PER_DAY);
  });

  it('prices every level past the first in gold and real currencies, and dearer each time', () => {
    const currencies = new Set<CurrencyId>(CURRENCY_IDS);
    const gold = (n: number) => level(n).cost.find((entry) => entry.currency === 'gold')?.amount ?? 0;
    for (let n = 2; n <= MINE_MAX_LEVEL; n += 1) {
      for (const entry of level(n).cost) {
        expect(currencies.has(entry.currency)).toBe(true);
        expect(entry.amount).toBeGreaterThan(0);
      }
      expect(gold(n), `level ${n}`).toBeGreaterThan(gold(n - 1));
      // A currency is named once per level, so a cost row cannot quietly double itself.
      const named = level(n).cost.map((entry) => entry.currency);
      expect(new Set(named).size).toBe(named.length);
    }
  });

  it('pays Glyph Sigils only from the fourth level on', () => {
    expect([1, 2, 3].map((n) => level(n).sigilsPerDay)).toEqual([0, 0, 0]);
    expect(level(4).sigilsPerDay).toBeGreaterThan(0);
  });

  it('reads a level outside the table as the nearest end of it', () => {
    expect(mineLevel(0).level).toBe(1);
    expect(mineLevel(MINE_MAX_LEVEL + 5).level).toBe(MINE_MAX_LEVEL);
    expect(nextMineLevel(MINE_MAX_LEVEL)).toBeNull();
    expect(nextMineLevel(1)?.level).toBe(2);
  });
});

describe('a new Mine', () => {
  it('is level 1 with its first store already full, so the first visit has gems to collect', () => {
    const mine = newMine(T0);
    expect(mine.level).toBe(1);
    const store = mineStore(mine, T0);
    expect(store.full).toBe(true);
    expect(store.gems).toBe(level(1).storeGems);
    expect(store.collectable).toBe(true);
  });

  it('never stamps a time before the epoch', () => {
    expect(newMine(1_000).collectedAt).toBe(0);
  });
});

describe('the store', () => {
  it('fills at the level’s rate: a quarter of a day is a quarter of the day’s gems', () => {
    const def = level(10);
    const store = mineStore(mineAt(10), T0 + MS_PER_DAY / 4);
    expect(store.gemsExact).toBeCloseTo(def.gemsPerDay / 4, 9);
    expect(store.gems).toBe(Math.floor(def.gemsPerDay / 4));
    expect(store.sigilsExact).toBeCloseTo(def.sigilsPerDay / 4, 9);
    expect(store.full).toBe(false);
  });

  it('stops when it is full, holding exactly its gems however long the Mine was left', () => {
    for (const n of [1, 4, 7, 10]) {
      const def = level(n);
      for (const days of [1, 3, 40]) {
        const store = mineStore(mineAt(n), T0 + days * MS_PER_DAY);
        expect(store.full, `level ${n}, ${days} days`).toBe(true);
        expect(store.gems).toBe(def.storeGems);
        expect(store.msToFull).toBe(0);
        expect(store.msToNextGem).toBeNull();
        // The Sigils stop with the gems: the store is a length of time, not two separate bins.
        expect(store.sigilsExact).toBeCloseTo((def.sigilsPerDay * mineStoreMs(n)) / MS_PER_DAY, 9);
      }
    }
  });

  it('holds nothing, and pays nothing, when the clock has gone backwards', () => {
    const store = mineStore(mineAt(5), T0 - 6 * MS_PER_HOUR);
    expect(store.elapsedMs).toBe(0);
    expect(store.gems).toBe(0);
    expect(store.collectable).toBe(false);
  });

  it('says when the next gem is dug, and that gem arrives on time', () => {
    const mine = mineAt(3);
    const store = mineStore(mine, T0 + MS_PER_HOUR);
    const wait = store.msToNextGem;
    expect(wait).not.toBeNull();
    const later = mineStore(mine, T0 + MS_PER_HOUR + (wait ?? 0));
    expect(later.gems).toBe(store.gems + 1);
    // A second earlier it is still being dug (the timer is shown to the second).
    expect(mineStore(mine, T0 + MS_PER_HOUR + (wait ?? 0) - 1_000).gems).toBe(store.gems);
  });

  it('names no next gem when the store fills before it — a gem past the store is never dug', () => {
    // Half a gem carried and a store of three: the fourth whole gem would need 3.5 dug.
    const mine = mineAt(1, T0, { gems: 0.5, sigils: 0 });
    const store = mineStore(mine, T0 + mineStoreMs(1) - 60_000);
    expect(store.gems).toBe(3);
    expect(store.msToNextGem).toBeNull();
    expect(store.msToFull).toBe(60_000);
  });
});

describe('collecting', () => {
  it('pays whole gems and Sigils, keeps the fractions, and starts the clock again', () => {
    const def = level(7);
    const now = T0 + MS_PER_DAY / 2;
    const result = collectMine(mineAt(7), now);
    if (!result.ok) throw new Error(result.error.message);
    const exactGems = def.gemsPerDay / 2;
    expect(result.value.gems).toBe(Math.floor(exactGems));
    expect(result.value.paid[0]).toEqual({ currency: 'gems', amount: Math.floor(exactGems) });
    expect(result.value.mine.carry.gems).toBeCloseTo(exactGems - Math.floor(exactGems), 9);
    expect(result.value.mine.collectedAt).toBe(now);
    expect(result.value.mine.level).toBe(7);
  });

  it('loses nothing to rounding: many small collections pay what one large one would', () => {
    const def = level(5);
    // Twenty collections an hour and twelve minutes apart — 24 hours, inside a 16.5-hour store
    // only because each one empties it long before it fills.
    const step = 72 * 60_000;
    let mine = mineAt(5);
    let gems = 0;
    let sigils = 0;
    for (let visit = 1; visit <= 20; visit += 1) {
      const haul = settleMine(mine, T0 + visit * step);
      gems += haul.gems;
      sigils += haul.sigils;
      mine = haul.mine;
    }
    const total = (def.gemsPerDay * 20 * step) / MS_PER_DAY;
    expect(gems + mine.carry.gems).toBeCloseTo(total, 6);
    expect(gems).toBe(Math.floor(total + 1e-9));
    expect(sigils + mine.carry.sigils).toBeCloseTo((def.sigilsPerDay * 20 * step) / MS_PER_DAY, 6);
  });

  it('pays the Sigil a representational error would otherwise hold back', () => {
    // Forty collections twelve hours apart at 0.35 a day: twenty days, seven Sigils — not six and
    // a carried 0.999… that binary arithmetic would otherwise leave behind.
    const def = level(5);
    let mine = mineAt(5);
    let sigils = 0;
    for (let visit = 1; visit <= 40; visit += 1) {
      const haul = settleMine(mine, T0 + visit * (MS_PER_DAY / 2));
      sigils += haul.sigils;
      mine = haul.mine;
    }
    expect(sigils).toBe(Math.round(def.sigilsPerDay * 20));
    expect(mine.carry.sigils).toBeLessThan(1e-6);
  });

  it('is refused while nothing in the store is whole', () => {
    const result = collectMine(mineAt(1), T0 + MS_PER_HOUR);
    expect(result.ok).toBe(false);
  });

  it('keeps its instant when the clock has gone backwards, so the gap is not paid twice', () => {
    const haul = settleMine(mineAt(4, T0, { gems: 0.25, sigils: 0.5 }), T0 - MS_PER_DAY);
    expect(haul.mine.collectedAt).toBe(T0);
    expect(haul.mine.carry).toEqual({ gems: 0.25, sigils: 0.5 });
    expect(haul.paid).toEqual([]);
  });

  it('says whether the store had filled', () => {
    expect(settleMine(mineAt(2), T0 + 2 * MS_PER_DAY).wasFull).toBe(true);
    expect(settleMine(mineAt(2), T0 + MS_PER_HOUR * 6).wasFull).toBe(false);
  });
});

describe('digging deeper', () => {
  const walletOf =
    (amounts: Partial<Record<CurrencyId, number>>) =>
    (currency: CurrencyId): number =>
      amounts[currency] ?? 0;

  it('is open when the chronicle has reached the next level’s gate and holds its cost', () => {
    expect(mineUpgradeBlock(1, level(2).opensAt, plenty)).toBeNull();
  });

  it('waits on the chronicle’s level first, naming the level it waits for', () => {
    expect(mineUpgradeBlock(1, level(2).opensAt - 1, plenty)).toEqual({
      reason: 'level',
      opensAt: level(2).opensAt,
    });
  });

  it('then names each currency it is short of, by how much', () => {
    const cost = level(3).cost;
    const gold = cost.find((entry) => entry.currency === 'gold')?.amount ?? 0;
    const block = mineUpgradeBlock(
      2,
      99,
      walletOf({ gold: gold - 1_000, mat_scrap_iron: 10_000, mat_arcane_dust: 10_000 }),
    );
    expect(block).toEqual({ reason: 'cost', missing: [{ currency: 'gold', amount: 1_000 }] });
  });

  it('is closed for good at the deepest level', () => {
    expect(mineUpgradeBlock(MINE_MAX_LEVEL, 100, plenty)).toEqual({ reason: 'max' });
    expect(mineGain(MINE_MAX_LEVEL)).toBeNull();
  });

  it('promises what the next row adds', () => {
    expect(mineGain(3)).toEqual({
      gemsPerDay: level(4).gemsPerDay - level(3).gemsPerDay,
      storeGems: level(4).storeGems - level(3).storeGems,
      sigilsPerDay: level(4).sigilsPerDay - level(3).sigilsPerDay,
    });
  });
});

describe('whole units', () => {
  it('counts a hair under a whole number as the whole number', () => {
    expect(splitWhole(6.999999999999999)).toEqual({ whole: 7, rest: 0 });
    expect(splitWhole(2.5)).toEqual({ whole: 2, rest: 0.5 });
    expect(splitWhole(0)).toEqual({ whole: 0, rest: 0 });
  });
});
