import { describe, expect, it } from 'vitest';
import { DIFFICULTY_MULT } from '@content/balance/battle';
import {
  BREW_DROP_CHANCE,
  FIRST_CLEAR,
  GEAR_DROP_CHANCE,
  GEAR_DROP_CHANCE_BOSS,
  GEAR_SET_FROM_POOL_CHANCE,
  MATERIAL_DROPS,
  MILESTONE_CHESTS,
  SHARD_DROP_CHANCE,
  STAR_CHESTS,
  STAR_CHEST_THRESHOLDS,
  globalStageIndex,
} from '@content/balance/campaign';
import type { CurrencyId } from '@content/currencies/types';
import { createRng } from '@engine/rng/rng';
import { mergeRunRewards, rollRunRewards, runGold, runXp, type RunRewardInput } from './rewards';

const input = (over: Partial<RunRewardInput> = {}): RunRewardInput => ({
  settlementIndex: 1,
  stageNumber: 1,
  globalIndex: 0,
  difficulty: 'intro',
  boss: false,
  element: 'valor',
  energySpent: 4,
  firstClear: false,
  chestThresholds: [],
  ...over,
});

const amountOf = (
  rewards: { currencies: { currency: CurrencyId; amount: number }[] },
  currency: CurrencyId,
): number => rewards.currencies.find((c) => c.currency === currency)?.amount ?? 0;

describe('per-victory rewards (CAMPAIGN.md §7)', () => {
  it('pays gold by stage index and difficulty, doubled on a boss stand', () => {
    expect(runGold({ globalIndex: 0, difficulty: 'intro', boss: false })).toBe(120);
    expect(runGold({ globalIndex: 119, difficulty: 'intro', boss: false })).toBe(977);
    expect(runGold({ globalIndex: 0, difficulty: 'normal', boss: false })).toBe(264);
    expect(runGold({ globalIndex: 0, difficulty: 'hard', boss: false })).toBe(480);
    expect(runGold({ globalIndex: 9, difficulty: 'intro', boss: true })).toBe(
      2 * runGold({ globalIndex: 9, difficulty: 'intro', boss: false }),
    );
  });

  it('pays XP for the energy the run cost', () => {
    expect(runXp({ difficulty: 'intro', energySpent: 4 })).toEqual({ championXp: 136, playerXp: 48 });
    expect(runXp({ difficulty: 'normal', energySpent: 6 })).toEqual({ championXp: 306, playerXp: 108 });
    expect(runXp({ difficulty: 'hard', energySpent: 11 })).toEqual({ championXp: 748, playerXp: 264 });
  });

  it('always drops the difficulty’s materials, inside their declared range', () => {
    for (const difficulty of ['intro', 'normal', 'hard'] as const) {
      const rewards = rollRunRewards(input({ difficulty }), createRng(`mats:${difficulty}`));
      for (const roll of MATERIAL_DROPS[difficulty]) {
        const amount = amountOf(rewards, roll.currency);
        expect(amount, `${difficulty} ${roll.currency}`).toBeGreaterThanOrEqual(roll.min);
        expect(amount, `${difficulty} ${roll.currency}`).toBeLessThanOrEqual(roll.max);
      }
    }
  });

  it('drops the brew of the settlement’s own element and no other', () => {
    let brews = 0;
    for (let i = 0; i < 200; i += 1) {
      const rewards = rollRunRewards(input({ element: 'faith' }), createRng(`brew:${i}`));
      expect(amountOf(rewards, 'brew_valor')).toBe(0);
      expect(amountOf(rewards, 'brew_justice')).toBe(0);
      expect(amountOf(rewards, 'brew_eclipse')).toBe(0);
      brews += amountOf(rewards, 'brew_faith');
    }
    expect(brews).toBeGreaterThan(0);
  });

  it('replays exactly from the same seed and differs from another', () => {
    const a = rollRunRewards(input(), createRng('same'));
    const b = rollRunRewards(input(), createRng('same'));
    const c = rollRunRewards(input(), createRng('other'));
    expect(a).toEqual(b);
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it('adds the first-clear bundle once and the star chests that were crossed', () => {
    const plain = rollRunRewards(input(), createRng('plain'));
    expect(plain.firstClear).toBeNull();
    expect(plain.gems).toBe(0);
    const first = rollRunRewards(input({ firstClear: true }), createRng('first'));
    expect(first.firstClear).toEqual(FIRST_CLEAR.intro.stage);
    expect(first.gems).toBe(FIRST_CLEAR.intro.stage.gems);
    expect(first.energy).toBe(FIRST_CLEAR.intro.stage.energy);
    const boss = rollRunRewards(input({ firstClear: true, boss: true, stageNumber: 10 }), createRng('boss'));
    expect(boss.firstClear).toEqual(FIRST_CLEAR.intro.boss);
    expect(amountOf(boss, 'shard_ancient')).toBe(1);
    const chest = rollRunRewards(
      input({ chestThresholds: [STAR_CHEST_THRESHOLDS[0], STAR_CHEST_THRESHOLDS[1]] }),
      createRng('chest'),
    );
    expect(chest.starChests.map((c) => c.threshold)).toEqual([
      STAR_CHEST_THRESHOLDS[0],
      STAR_CHEST_THRESHOLDS[1],
    ]);
    expect(chest.gems).toBe(STAR_CHESTS.intro[1]?.gems);
    expect(amountOf(chest, 'gold')).toBeGreaterThan(10_000);
  });

  it('merges a batch of runs into one summary', () => {
    const runs = Array.from({ length: 10 }, (_, i) =>
      rollRunRewards(input({ firstClear: i === 0 }), createRng(`batch:${i}`)),
    );
    const merged = mergeRunRewards(runs);
    expect(merged.championXp).toBe(runs.reduce((sum, r) => sum + r.championXp, 0));
    expect(amountOf(merged, 'gold')).toBe(runs.reduce((sum, r) => sum + amountOf(r, 'gold'), 0));
    expect(merged.gear).toHaveLength(runs.reduce((sum, r) => sum + r.gear.length, 0));
    expect(merged.firstClear).toEqual(FIRST_CLEAR.intro.stage);
    expect(mergeRunRewards([]).currencies).toEqual([]);
  });
});

describe('the milestone chest (CAMPAIGN.md §7)', () => {
  it('pays Normal and Hard, and leaves Intro for the champion picker', () => {
    const normal = rollRunRewards(
      input({ difficulty: 'normal', mastered: true }),
      createRng('milestone:normal'),
    );
    expect(normal.milestone).toEqual(MILESTONE_CHESTS.normal);
    expect(normal.gems).toBe(300);
    expect(amountOf(normal, 'shard_sacred')).toBe(2);

    const hard = rollRunRewards(input({ difficulty: 'hard', mastered: true }), createRng('milestone:hard'));
    expect(hard.gems).toBe(1_000);
    expect(amountOf(hard, 'shard_primordial')).toBe(1);

    const intro = rollRunRewards(input({ mastered: true }), createRng('milestone:intro'));
    expect(intro.milestone).toBeNull();
    expect(intro.gems).toBe(0);
  });

  it('pays nothing extra on an ordinary run', () => {
    const plain = rollRunRewards(input({ difficulty: 'hard' }), createRng('plain-hard'));
    expect(plain.milestone).toBeNull();
    expect(plain.gems).toBe(0);
  });
});

describe('drop rates over 10,000 runs', () => {
  /** Within 1.5 percentage points of the declared chance — tight enough to catch a wrong constant. */
  const TOLERANCE = 0.015;
  const RUNS = 10_000;

  it('hits the declared gear, shard and brew rates', () => {
    for (const difficulty of ['intro', 'normal', 'hard'] as const) {
      let gear = 0;
      let fromPool = 0;
      let shards = 0;
      let brews = 0;
      for (let i = 0; i < RUNS; i += 1) {
        const rewards = rollRunRewards(input({ difficulty }), createRng(`rate:${difficulty}:${i}`));
        if (rewards.gear.length) {
          gear += 1;
          if (rewards.gear[0]?.fromSetPool) fromPool += 1;
        }
        shards += amountOf(rewards, 'shard_faded');
        brews += rewards.currencies.filter((c) => c.currency.startsWith('brew_')).length;
      }
      expect(gear / RUNS, `${difficulty} gear`).toBeCloseTo(GEAR_DROP_CHANCE[difficulty], 2);
      expect(Math.abs(fromPool / gear - GEAR_SET_FROM_POOL_CHANCE), `${difficulty} set pool`).toBeLessThan(
        TOLERANCE * 2,
      );
      expect(Math.abs(shards / RUNS - SHARD_DROP_CHANCE[difficulty]), `${difficulty} shards`).toBeLessThan(
        TOLERANCE,
      );
      expect(Math.abs(brews / RUNS - BREW_DROP_CHANCE), `${difficulty} brews`).toBeLessThan(TOLERANCE);
    }
  });

  it('hits the boss stand’s higher gear rate', () => {
    let gear = 0;
    for (let i = 0; i < RUNS; i += 1) {
      const rewards = rollRunRewards(
        input({ boss: true, stageNumber: 10, globalIndex: 9 }),
        createRng(`boss-rate:${i}`),
      );
      if (rewards.gear.length) gear += 1;
    }
    expect(Math.abs(gear / RUNS - GEAR_DROP_CHANCE_BOSS)).toBeLessThan(TOLERANCE);
  });

  it('averages materials in the middle of their range', () => {
    let scrap = 0;
    for (let i = 0; i < RUNS; i += 1)
      scrap += amountOf(rollRunRewards(input(), createRng(`mat:${i}`)), 'mat_scrap_iron');
    const roll = MATERIAL_DROPS.intro.find((m) => m.currency === 'mat_scrap_iron');
    if (!roll) throw new Error('scrap iron');
    expect(scrap / RUNS).toBeCloseTo((roll.min + roll.max) / 2, 1);
  });

  it('keeps the gold formula in step with the campaign ladder', () => {
    // Hard's gold and its enemies both rise; the pay per run must not fall behind the fight.
    const introEnd = runGold({ globalIndex: 119, difficulty: 'intro', boss: false });
    const hardEnd = runGold({ globalIndex: 119, difficulty: 'hard', boss: false });
    expect(hardEnd / introEnd).toBeCloseTo(4, 1);
    expect(DIFFICULTY_MULT.hard / DIFFICULTY_MULT.intro).toBeGreaterThan(1);
    expect(globalStageIndex(12, 10)).toBe(119);
  });
});
