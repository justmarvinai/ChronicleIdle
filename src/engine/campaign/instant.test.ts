/**
 * Instant clears (docs/design/CAMPAIGN.md §10): which stands may be written down, what one costs,
 * and that what it pays is a mastered stand's repeat — rolled exactly as a fought run of the same
 * index would roll it, and never anything a stand pays only once.
 */
import { describe, expect, it } from 'vitest';
import { STAGE_MAX_STARS, globalStageIndex } from '@content/balance/campaign';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import type { EnergyState } from '@engine/economy/energy';
import { createRng } from '@engine/rng/rng';
import { beginInstantRun, instantBlock, isStandMastered, rollInstantRun } from './instant';
import { emptyCampaignProgress, progressKey, type CampaignProgress } from './progress';
import { rollRunRewards } from './rewards';
import { runCost, type StageRef } from './run';

const T0 = 1_760_000_000_000;
const OPEN = FEATURE_UNLOCK_LEVEL.instant_clear;

function ref(
  settlementIndex: number,
  stageNumber: number,
  difficulty: 'intro' | 'normal' | 'hard',
): StageRef {
  const settlement = content.settlementByIndex(settlementIndex);
  const stage = settlement?.stages[stageNumber - 1];
  if (!settlement || !stage) throw new Error(`${settlementIndex}.${stageNumber}`);
  return { settlement, stage, difficulty };
}

/** Progress with the given stands at the given stars. */
function progressWith(entries: readonly [StageRef, number][]): CampaignProgress {
  const progress = emptyCampaignProgress();
  for (const [stand, stars] of entries) {
    progress.stars[progressKey(stand.stage.id, stand.difficulty)] = stars;
    progress.bestTurns[progressKey(stand.stage.id, stand.difficulty)] = 12;
  }
  return progress;
}

const energy = (value: number): EnergyState => ({ value, lastTickAt: T0 });

describe('which stands can be cleared instantly', () => {
  const stand = ref(1, 3, 'intro');

  it('is a stand at every star it can hold, on that difficulty only', () => {
    expect(isStandMastered(progressWith([[stand, STAGE_MAX_STARS]]), stand)).toBe(true);
    expect(isStandMastered(progressWith([[stand, STAGE_MAX_STARS - 1]]), stand)).toBe(false);
    // Three stars on Intro say nothing about Normal.
    expect(isStandMastered(progressWith([[stand, STAGE_MAX_STARS]]), ref(1, 3, 'normal'))).toBe(false);
  });

  it('names the level first, then the stars, then the energy', () => {
    const mastered = progressWith([[stand, STAGE_MAX_STARS]]);
    expect(instantBlock(stand, { progress: mastered, energy: 100, playerLevel: OPEN - 1 })).toEqual({
      reason: 'level',
      opensAt: OPEN,
    });
    expect(
      instantBlock(stand, { progress: progressWith([[stand, 2]]), energy: 100, playerLevel: OPEN }),
    ).toEqual({ reason: 'stars', stars: 2 });
    expect(
      instantBlock(stand, { progress: mastered, energy: runCost(stand) - 1, playerLevel: OPEN }),
    ).toEqual({
      reason: 'energy',
      cost: runCost(stand),
    });
    expect(instantBlock(stand, { progress: mastered, energy: runCost(stand), playerLevel: OPEN })).toBeNull();
  });
});

describe('charging an instant run', () => {
  const stand = ref(2, 10, 'intro');
  const mastered = progressWith([[stand, STAGE_MAX_STARS]]);

  it('costs what a fought run of the stand costs', () => {
    const begun = beginInstantRun(stand, {
      progress: mastered,
      energy: energy(40),
      playerLevel: OPEN,
      now: T0,
    });
    if (!begun.ok) throw new Error(begun.error.message);
    expect(begun.value.cost).toBe(runCost(stand));
    expect(begun.value.energy.value).toBe(40 - runCost(stand));
  });

  it('is refused before its level, short of the stars and short of the energy', () => {
    const early = beginInstantRun(stand, {
      progress: mastered,
      energy: energy(40),
      playerLevel: OPEN - 1,
      now: T0,
    });
    expect(!early.ok && early.error.code).toBe('locked');
    const unmastered = beginInstantRun(stand, {
      progress: progressWith([[stand, 2]]),
      energy: energy(40),
      playerLevel: OPEN,
      now: T0,
    });
    expect(!unmastered.ok && unmastered.error.code).toBe('locked');
    const poor = beginInstantRun(stand, {
      progress: mastered,
      energy: energy(1),
      playerLevel: OPEN,
      now: T0,
    });
    expect(!poor.ok && poor.error.code).toBe('insufficient_energy');
  });
});

describe('what an instant run pays', () => {
  const stand = ref(2, 10, 'normal');

  it('is exactly a mastered repeat on the same seed', () => {
    const cost = runCost(stand);
    const instant = rollInstantRun(stand, cost, createRng('campaign:seed:stage.02.10:normal:7'));
    const fought = rollRunRewards(
      {
        settlementIndex: 2,
        stageNumber: 10,
        globalIndex: globalStageIndex(2, 10),
        difficulty: 'normal',
        boss: true,
        element: stand.settlement.element,
        energySpent: cost,
        firstClear: false,
        chestThresholds: [],
      },
      createRng('campaign:seed:stage.02.10:normal:7'),
    );
    expect(instant).toEqual(fought);
  });

  it('never pays a first clear, a star chest or a milestone', () => {
    for (let run = 0; run < 200; run += 1) {
      const rewards = rollInstantRun(stand, runCost(stand), createRng(`instant:${run}`));
      expect(rewards.firstClear).toBeNull();
      expect(rewards.starChests).toEqual([]);
      expect(rewards.milestone).toBeNull();
      expect(rewards.energy).toBe(0);
      expect(rewards.gems).toBe(0);
    }
  });

  it('pays gold and XP on every run, and drops as often as a fought repeat', () => {
    let drops = 0;
    const runs = 2_000;
    for (let run = 0; run < runs; run += 1) {
      const rewards = rollInstantRun(stand, runCost(stand), createRng(`instant:drops:${run}`));
      expect(rewards.currencies.find((entry) => entry.currency === 'gold')?.amount ?? 0).toBeGreaterThan(0);
      expect(rewards.championXp).toBeGreaterThan(0);
      expect(rewards.playerXp).toBeGreaterThan(0);
      drops += rewards.gear.length;
    }
    // A boss stand drops half the time (CAMPAIGN.md §7); 2,000 runs sit well inside ±5 points.
    expect(drops / runs).toBeGreaterThan(0.45);
    expect(drops / runs).toBeLessThan(0.55);
  });
});
