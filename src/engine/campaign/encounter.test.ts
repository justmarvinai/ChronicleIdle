import { describe, expect, it } from 'vitest';
import { DIFFICULTY_MULT, STAGE_COUNT, STAGE_GROWTH_TOP, stageScale } from '@content/balance/battle';
import { BOSS_ENERGY_EXTRA, ENERGY_COST } from '@content/balance/campaign';
import { content } from '@content/registry';
import {
  parseStageEncounterId,
  stageEncounter,
  stageEncounterId,
  stageEnemyLevel,
  stageEnergyCost,
} from './encounter';

const settlement = (index: number) => {
  const found = content.settlementByIndex(index);
  if (!found) throw new Error(`settlement ${index}`);
  return found;
};

describe('stage encounter ids', () => {
  it('round-trips a stage and a difficulty', () => {
    const id = stageEncounterId('stage.03.07', 'hard');
    expect(id).toBe('encounter.stage.03.07.hard');
    expect(parseStageEncounterId(id)).toEqual({ stageId: 'stage.03.07', difficulty: 'hard' });
  });

  it('ignores ids that are not campaign stages', () => {
    expect(parseStageEncounterId('encounter.bench.stress')).toBeNull();
    expect(parseStageEncounterId('encounter.stage.03.07.nightmare')).toBeNull();
    expect(parseStageEncounterId('encounter.stage.3.7.hard')).toBeNull();
  });

  it('resolves and memoises every stage/difficulty pair through the registry', () => {
    const first = content.encounterById('encounter.stage.05.10.normal');
    expect(first?.stageId).toBe('stage.05.10');
    expect(content.encounterById('encounter.stage.05.10.normal')).toBe(first);
    expect(content.stageEncounter('stage.05.10', 'normal')).toBe(first);
    expect(content.stageEncounter('stage.13.01', 'normal')).toBeUndefined();
  });
});

describe('energy and plate levels (CAMPAIGN.md §2, §8)', () => {
  it('costs more per band of four settlements, and one more on a boss stand', () => {
    for (const difficulty of ['intro', 'normal', 'hard'] as const) {
      const [low, mid, high] = ENERGY_COST[difficulty];
      expect(stageEnergyCost(1, false, difficulty)).toBe(low);
      expect(stageEnergyCost(4, false, difficulty)).toBe(low);
      expect(stageEnergyCost(5, false, difficulty)).toBe(mid);
      expect(stageEnergyCost(8, false, difficulty)).toBe(mid);
      expect(stageEnergyCost(9, false, difficulty)).toBe(high);
      expect(stageEnergyCost(12, false, difficulty)).toBe(high);
      expect(stageEnergyCost(12, true, difficulty)).toBe(high + BOSS_ENERGY_EXTRA);
    }
    // Hard always costs more than Intro for the same stage.
    expect(stageEnergyCost(6, false, 'hard')).toBeGreaterThan(stageEnergyCost(6, false, 'intro'));
  });

  it('shows a level that rises with the stage and the difficulty', () => {
    expect(stageEnemyLevel(0, 'intro')).toBe(1);
    expect(stageEnemyLevel(0, 'normal')).toBe(21);
    expect(stageEnemyLevel(0, 'hard')).toBe(41);
    expect(stageEnemyLevel(119, 'intro')).toBe(61);
    expect(stageEnemyLevel(119, 'hard')).toBe(101);
  });
});

describe('enemy scaling curve (BATTLE.md §4.5)', () => {
  it('rises from the first stage to the last without ever dipping', () => {
    expect(stageScale(0)).toBe(1);
    expect(stageScale(STAGE_COUNT - 1)).toBeCloseTo(STAGE_GROWTH_TOP, 5);
    let previous = 0;
    for (let g = 0; g < STAGE_COUNT; g += 1) {
      const value = stageScale(g);
      expect(value, `stage index ${g}`).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    // Quadratic: the first settlement is nearly flat, the last is where the curve bites.
    expect(stageScale(9)).toBeLessThan(1.05);
    expect(stageScale(119) - stageScale(110)).toBeGreaterThan(stageScale(9) - stageScale(0));
  });

  it('clamps outside the campaign and steps up with the difficulty', () => {
    expect(stageScale(-5)).toBe(1);
    expect(stageScale(500)).toBeCloseTo(STAGE_GROWTH_TOP, 5);
    expect(DIFFICULTY_MULT.intro).toBeLessThan(DIFFICULTY_MULT.normal);
    expect(DIFFICULTY_MULT.normal).toBeLessThan(DIFFICULTY_MULT.hard);
  });
});

describe('derived encounters', () => {
  it('takes its waves from the stage and everything else from the settlement', () => {
    const greyhaven = settlement(3);
    const stage = greyhaven.stages[6];
    if (!stage) throw new Error('stage 3.07');
    const encounter = stageEncounter(greyhaven, stage, 'normal');
    expect(encounter.id).toBe('encounter.stage.03.07.normal');
    expect(encounter.kind).toBe('campaign');
    expect(encounter.partySize).toBe(3);
    expect(encounter.stageIndex).toBe(26);
    expect(encounter.backdrop).toBe(greyhaven.backdrop);
    expect(encounter.surface).toBe(greyhaven.surface);
    expect(encounter.music).toBe('battle');
    expect(encounter.turnLimit).toBe(stage.turnLimitDefeat);
    expect(encounter.turnLimitMode).toBe('ally');
    expect(encounter.timeUpIsDefeat).toBe(true);
    expect(encounter.waves.map((w) => w.enemies.map((e) => e.enemyId))).toEqual(
      stage.waves.map((wave) => [...wave]),
    );
  });

  it('plays boss music on a boss stand and scales it above the stage before it', () => {
    const duskmere = settlement(10);
    const ninth = duskmere.stages[8];
    const boss = duskmere.stages[9];
    if (!ninth || !boss) throw new Error('duskmere stages');
    expect(stageEncounter(duskmere, boss, 'intro').music).toBe('boss');
    expect(stageEncounter(duskmere, ninth, 'intro').music).toBe('battle');
    expect(stageEncounter(duskmere, boss, 'intro').stageIndex).toBeGreaterThan(
      stageEncounter(duskmere, ninth, 'intro').stageIndex,
    );
    // The boss stand allows more turns for the third star and for the run itself.
    expect(boss.turnLimit3Star).toBeGreaterThan(ninth.turnLimit3Star);
    expect(boss.turnLimitDefeat).toBeGreaterThan(ninth.turnLimitDefeat);
  });

  it('derives all 360 stage/difficulty pairs with unique ids', () => {
    const ids = new Set<string>();
    for (const stage of content.stages)
      for (const difficulty of ['intro', 'normal', 'hard'] as const) {
        const encounter = content.stageEncounter(stage.id, difficulty);
        expect(encounter, `${stage.id} ${difficulty}`).toBeDefined();
        ids.add(encounter?.id ?? '');
      }
    expect(ids.size).toBe(content.stages.length * 3);
  });
});
