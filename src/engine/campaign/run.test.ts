import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import type { BattleOutcome, UnitReport } from '@engine/battle/types';
import { energyCap, type EnergyState } from '@engine/economy/energy';
import { createRng } from '@engine/rng/rng';
import { emptyCampaignProgress, recordRun, starsOf, type CampaignProgress } from './progress';
import { affordableRuns, autoRepeatTiers, beginRun, runCost, settleRun, type StageRef } from './run';

const T0 = 1_760_000_000_000;

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

const victory = (over: Partial<BattleOutcome> = {}): BattleOutcome => ({
  kind: 'victory',
  turns: 24,
  allyTurns: 11,
  wavesCleared: 2,
  waveCount: 2,
  units: [ally()],
  enemyHpLeft: 0,
  seed: 'seed',
  decisions: [],
  ...over,
});

const energy = (value: number): EnergyState => ({ value, lastTickAt: T0 });

describe('starting a run', () => {
  it('costs the stage’s energy and refuses a locked stage', () => {
    const progress = emptyCampaignProgress();
    const first = ref(1, 1, 'intro');
    expect(runCost(first)).toBe(4);
    const started = beginRun(first, { progress, energy: energy(10), playerLevel: 1, now: T0 });
    expect(started.ok && started.value.cost).toBe(4);
    expect(started.ok && started.value.energy.value).toBe(6);

    const locked = beginRun(ref(1, 2, 'intro'), {
      progress,
      energy: energy(10),
      playerLevel: 1,
      now: T0,
    });
    expect(locked.ok).toBe(false);
    expect(!locked.ok && locked.error.code).toBe('locked');
  });

  it('refuses a run the wallet cannot pay for, and says what it needed', () => {
    const short = beginRun(ref(1, 1, 'intro'), {
      progress: emptyCampaignProgress(),
      energy: energy(3),
      playerLevel: 1,
      now: T0,
    });
    expect(!short.ok && short.error.code).toBe('insufficient_energy');
    expect(!short.ok && short.error.details).toEqual({ needed: 4, have: 3 });
  });

  it('charges more deeper in the campaign and one extra on a boss stand', () => {
    let progress = emptyCampaignProgress();
    for (let settlement = 1; settlement <= 9; settlement += 1)
      for (let stage = 1; stage <= 10; stage += 1)
        progress = recordRun(progress, {
          settlement,
          stage,
          difficulty: 'intro',
          stars: 1,
          allyTurns: 10,
        }).progress;
    expect(runCost(ref(9, 1, 'intro'))).toBe(6);
    expect(runCost(ref(9, 10, 'intro'))).toBe(7);
    expect(runCost(ref(1, 10, 'hard'))).toBe(9);
    const deep = beginRun(ref(9, 10, 'intro'), { progress, energy: energy(20), playerLevel: 5, now: T0 });
    expect(deep.ok && deep.value.energy.value).toBe(13);
  });

  it('regenerates before it charges, so a run waited for is affordable', () => {
    const state = { value: 1, lastTickAt: T0 - 5 * 60_000 };
    const started = beginRun(ref(1, 1, 'intro'), {
      progress: emptyCampaignProgress(),
      energy: state,
      playerLevel: 1,
      now: T0,
    });
    expect(started.ok && started.value.energy.value).toBe(2);
    expect(energyCap(1)).toBe(60);
  });
});

describe('settling a run', () => {
  it('records stars and pays the first clear', () => {
    const first = ref(1, 1, 'intro');
    const settled = settleRun(
      first,
      { progress: emptyCampaignProgress(), energySpent: 4 },
      victory(),
      createRng('settle'),
    );
    expect(settled.stars).toBe(3);
    expect(settled.record.firstClear).toBe(true);
    expect(starsOf(settled.record.progress, 'stage.01.01', 'intro')).toBe(3);
    expect(settled.rewards?.firstClear).not.toBeNull();
    expect(settled.rewards?.championXp).toBe(136);
  });

  it('pays nothing for a defeat but still records the attempt as uncleared', () => {
    const settled = settleRun(
      ref(1, 1, 'intro'),
      { progress: emptyCampaignProgress(), energySpent: 4 },
      victory({ kind: 'defeat', wavesCleared: 1 }),
      createRng('defeat'),
    );
    expect(settled.stars).toBe(0);
    expect(settled.rewards).toBeNull();
    expect(settled.record.progress.stars).toEqual({});
  });

  it('pays a retreat nothing at all (the energy is already gone)', () => {
    const settled = settleRun(
      ref(1, 1, 'intro'),
      { progress: emptyCampaignProgress(), energySpent: 4 },
      victory({ kind: 'retreat' }),
      createRng('retreat'),
    );
    expect(settled.stars).toBe(0);
    expect(settled.rewards).toBeNull();
  });

  it('pays the boss stand’s bundle and its doubled gold', () => {
    let progress: CampaignProgress = emptyCampaignProgress();
    for (let stage = 1; stage <= 9; stage += 1)
      progress = recordRun(progress, {
        settlement: 1,
        stage,
        difficulty: 'intro',
        stars: 3,
        allyTurns: 9,
      }).progress;
    const boss = ref(1, 10, 'intro');
    const settled = settleRun(boss, { progress, energySpent: 5 }, victory({ allyTurns: 18 }), createRng('b'));
    expect(settled.stars).toBe(3);
    expect(settled.rewards?.gems).toBe(20);
    const gold = settled.rewards?.currencies.find((c) => c.currency === 'gold')?.amount ?? 0;
    expect(gold).toBeGreaterThan(300);
    // The 30th star of the settlement came with this run: its chest is in the rewards.
    expect(settled.record.chestThresholds).toContain(30);
    expect(settled.rewards?.starChests.map((c) => c.threshold)).toContain(30);
  });
});

describe('auto-repeat (CAMPAIGN.md §9)', () => {
  it('offers more runs as the player levels', () => {
    expect(autoRepeatTiers(1)).toEqual([1]);
    expect(autoRepeatTiers(5)).toEqual([1, 10]);
    expect(autoRepeatTiers(20)).toEqual([1, 10, 25]);
    expect(autoRepeatTiers(30)).toEqual([1, 10, 25, 50]);
  });

  it('runs only as often as the energy pays for', () => {
    const stage = ref(1, 1, 'intro');
    expect(affordableRuns(stage, 40, 10)).toBe(10);
    expect(affordableRuns(stage, 14, 10)).toBe(3);
    expect(affordableRuns(stage, 3, 10)).toBe(0);
  });
});
