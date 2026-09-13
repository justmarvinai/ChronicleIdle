import { describe, expect, it } from 'vitest';
import { STAGES_PER_SETTLEMENT, SETTLEMENT_COUNT, STAR_CHEST_THRESHOLDS } from '@content/balance/campaign';
import type { BattleOutcome, UnitReport } from '@engine/battle/types';
import {
  bestTurnsOf,
  clearedStages,
  difficultyStars,
  emptyCampaignProgress,
  evaluateStars,
  isDifficultyUnlocked,
  isSettlementUnlocked,
  isStageUnlocked,
  maxBattleSpeed,
  nextStage,
  recordRun,
  settlementStars,
  stageIdOf,
  starsOf,
  type CampaignProgress,
} from './progress';

const ally = (over: Partial<UnitReport> = {}): UnitReport => ({
  unitId: 'a0',
  defId: 'champ.ser_corvin',
  instanceId: 'ser_corvin-1',
  side: 'ally',
  alive: true,
  died: false,
  damageDealt: 0,
  damageTaken: 0,
  healingDone: 0,
  kills: 0,
  ...over,
});

const outcome = (over: Partial<BattleOutcome> = {}): BattleOutcome => ({
  kind: 'victory',
  turns: 30,
  allyTurns: 12,
  wavesCleared: 3,
  waveCount: 3,
  units: [ally(), ally({ unitId: 'a1' })],
  enemyHpLeft: 0,
  seed: 'seed',
  decisions: [],
  ...over,
});

/** Clears stages 1..n of a settlement with three stars each. */
function clear(
  progress: CampaignProgress,
  settlement: number,
  upTo: number,
  difficulty: 'intro' | 'normal' | 'hard' = 'intro',
  stars = 3,
): CampaignProgress {
  let next = progress;
  for (let stage = 1; stage <= upTo; stage += 1)
    next = recordRun(next, { settlement, stage, difficulty, stars, allyTurns: 10 }).progress;
  return next;
}

describe('stars (CAMPAIGN.md §3)', () => {
  it('pays one star for the clear, two when nobody went down, three inside the limit', () => {
    expect(evaluateStars(outcome({ allyTurns: 12 }), 25)).toBe(3);
    expect(evaluateStars(outcome({ allyTurns: 26 }), 25)).toBe(2);
    expect(evaluateStars(outcome({ units: [ally({ died: true, alive: true })] }), 25)).toBe(1);
    expect(evaluateStars(outcome({ units: [ally({ died: true, alive: false })] }), 25)).toBe(1);
  });

  it('pays nothing for a defeat, a timeout or a retreat', () => {
    for (const kind of ['defeat', 'timeout', 'retreat'] as const)
      expect(evaluateStars(outcome({ kind }), 25)).toBe(0);
  });

  it('ignores enemies that died', () => {
    const enemies = [
      ally(),
      { ...ally({ unitId: 'w0e0' }), side: 'enemy' as const, died: true, alive: false },
    ];
    expect(evaluateStars(outcome({ units: enemies }), 25)).toBe(3);
  });
});

describe('recording a run', () => {
  it('keeps the best stars and the fewest turns', () => {
    let progress = emptyCampaignProgress();
    const first = recordRun(progress, {
      settlement: 1,
      stage: 1,
      difficulty: 'intro',
      stars: 2,
      allyTurns: 20,
    });
    expect(first.firstClear).toBe(true);
    progress = first.progress;
    const worse = recordRun(progress, {
      settlement: 1,
      stage: 1,
      difficulty: 'intro',
      stars: 1,
      allyTurns: 30,
    });
    expect(worse.firstClear).toBe(false);
    expect(starsOf(worse.progress, 'stage.01.01', 'intro')).toBe(2);
    expect(bestTurnsOf(worse.progress, 'stage.01.01', 'intro')).toBe(20);
    const better = recordRun(worse.progress, {
      settlement: 1,
      stage: 1,
      difficulty: 'intro',
      stars: 3,
      allyTurns: 8,
    });
    expect(starsOf(better.progress, 'stage.01.01', 'intro')).toBe(3);
    expect(bestTurnsOf(better.progress, 'stage.01.01', 'intro')).toBe(8);
  });

  it('records nothing for a loss', () => {
    const record = recordRun(emptyCampaignProgress(), {
      settlement: 2,
      stage: 4,
      difficulty: 'intro',
      stars: 0,
      allyTurns: 40,
    });
    expect(record.progress.stars).toEqual({});
    expect(record.progress.bestTurns).toEqual({});
    expect(record.firstClear).toBe(false);
  });

  it('grants each star chest once, when the settlement crosses its threshold', () => {
    let progress = emptyCampaignProgress();
    const crossed: number[] = [];
    for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1) {
      const record = recordRun(progress, {
        settlement: 1,
        stage,
        difficulty: 'intro',
        stars: 3,
        allyTurns: 10,
      });
      crossed.push(...record.chestThresholds);
      progress = record.progress;
    }
    expect(crossed).toEqual([...STAR_CHEST_THRESHOLDS]);
    expect(settlementStars(progress, 1, 'intro')).toBe(30);
    // Replaying a stage grants nothing more.
    const replay = recordRun(progress, {
      settlement: 1,
      stage: 1,
      difficulty: 'intro',
      stars: 3,
      allyTurns: 9,
    });
    expect(replay.chestThresholds).toEqual([]);
  });

  it('counts stars per difficulty, never across them', () => {
    let progress = clear(emptyCampaignProgress(), 1, 10, 'intro');
    progress = clear(progress, 1, 5, 'normal', 2);
    expect(settlementStars(progress, 1, 'intro')).toBe(30);
    expect(settlementStars(progress, 1, 'normal')).toBe(10);
    expect(difficultyStars(progress, 'intro')).toEqual({ stars: 30, max: 360 });
    expect(clearedStages(progress, 'normal')).toBe(5);
  });
});

describe('the unlock chain (CAMPAIGN.md §1)', () => {
  it('opens stage 1 of settlement 1 and nothing else', () => {
    const progress = emptyCampaignProgress();
    expect(isStageUnlocked(progress, 1, 1, 'intro')).toBe(true);
    expect(isStageUnlocked(progress, 1, 2, 'intro')).toBe(false);
    expect(isSettlementUnlocked(progress, 2, 'intro')).toBe(false);
    expect(isDifficultyUnlocked(progress, 'intro')).toBe(true);
    expect(isDifficultyUnlocked(progress, 'normal')).toBe(false);
    expect(isDifficultyUnlocked(progress, 'hard')).toBe(false);
    expect(nextStage(progress)).toEqual({ settlement: 1, stage: 1, difficulty: 'intro' });
  });

  it('opens the next stage on a clear and the next settlement on the boss', () => {
    let progress = clear(emptyCampaignProgress(), 1, 9);
    expect(isStageUnlocked(progress, 1, 10, 'intro')).toBe(true);
    expect(isSettlementUnlocked(progress, 2, 'intro')).toBe(false);
    expect(nextStage(progress)).toEqual({ settlement: 1, stage: 10, difficulty: 'intro' });
    progress = clear(progress, 1, 10);
    expect(isSettlementUnlocked(progress, 2, 'intro')).toBe(true);
    expect(isStageUnlocked(progress, 2, 1, 'intro')).toBe(true);
    expect(isStageUnlocked(progress, 2, 2, 'intro')).toBe(false);
    expect(nextStage(progress)).toEqual({ settlement: 2, stage: 1, difficulty: 'intro' });
  });

  it('opens Normal only with all of Intro cleared, and Hard only with all of Normal', () => {
    let progress = emptyCampaignProgress();
    for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
      progress = clear(progress, settlement, STAGES_PER_SETTLEMENT, 'intro', 1);
    expect(clearedStages(progress, 'intro')).toBe(120);
    expect(isDifficultyUnlocked(progress, 'normal')).toBe(true);
    expect(isDifficultyUnlocked(progress, 'hard')).toBe(false);
    expect(isStageUnlocked(progress, 1, 1, 'normal')).toBe(true);
    expect(nextStage(progress)).toEqual({ settlement: 1, stage: 1, difficulty: 'normal' });
    // One stage short of Normal keeps Hard shut.
    let normal = progress;
    for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
      normal = clear(normal, settlement, settlement === SETTLEMENT_COUNT ? 9 : 10, 'normal', 1);
    expect(isDifficultyUnlocked(normal, 'hard')).toBe(false);
    normal = clear(normal, SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT, 'normal', 1);
    expect(isDifficultyUnlocked(normal, 'hard')).toBe(true);
    expect(nextStage(normal)).toEqual({ settlement: 1, stage: 1, difficulty: 'hard' });
  });

  it('reports the difficulty a run completed, once', () => {
    let progress = emptyCampaignProgress();
    for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
      progress = clear(progress, settlement, settlement === SETTLEMENT_COUNT ? 9 : 10, 'intro', 1);
    const last = recordRun(progress, {
      settlement: SETTLEMENT_COUNT,
      stage: STAGES_PER_SETTLEMENT,
      difficulty: 'intro',
      stars: 1,
      allyTurns: 12,
    });
    expect(last.completedDifficulty).toBe(true);
    const replay = recordRun(last.progress, {
      settlement: SETTLEMENT_COUNT,
      stage: STAGES_PER_SETTLEMENT,
      difficulty: 'intro',
      stars: 3,
      allyTurns: 9,
    });
    expect(replay.completedDifficulty).toBe(false);
  });

  it('unlocks ×3 with Normal complete and ×4 with Hard (GAME_DESIGN.md §6)', () => {
    let progress = emptyCampaignProgress();
    expect(maxBattleSpeed(progress)).toBe(2);
    for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
      progress = clear(progress, settlement, STAGES_PER_SETTLEMENT, 'intro', 1);
    expect(maxBattleSpeed(progress)).toBe(2);
    for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
      progress = clear(progress, settlement, STAGES_PER_SETTLEMENT, 'normal', 1);
    expect(maxBattleSpeed(progress)).toBe(3);
    for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
      progress = clear(progress, settlement, STAGES_PER_SETTLEMENT, 'hard', 1);
    expect(maxBattleSpeed(progress)).toBe(4);
    expect(nextStage(progress)).toEqual({
      settlement: SETTLEMENT_COUNT,
      stage: STAGES_PER_SETTLEMENT,
      difficulty: 'hard',
    });
  });

  it('names the stage ids the content uses', () => {
    expect(stageIdOf(3, 7)).toBe('stage.03.07');
    expect(stageIdOf(12, 10)).toBe('stage.12.10');
  });
});
