import { describe, expect, it } from 'vitest';
import {
  critLands,
  damage,
  debuffLands,
  elementCritShift,
  elementDamageMod,
  elementMatch,
  healing,
  mitigation,
  mitigationK,
  ticksToNextTurn,
} from './formulas';

describe('element wheel', () => {
  it('Justice beats Valor beats Faith beats Justice; Eclipse is neutral', () => {
    expect(elementMatch('justice', 'valor')).toBe('strong');
    expect(elementMatch('valor', 'faith')).toBe('strong');
    expect(elementMatch('faith', 'justice')).toBe('strong');
    expect(elementMatch('valor', 'justice')).toBe('weak');
    expect(elementMatch('eclipse', 'valor')).toBe('neutral');
    expect(elementMatch('valor', 'eclipse')).toBe('neutral');
    expect(elementDamageMod('strong')).toBe(1.1);
    expect(elementDamageMod('weak')).toBe(0.9);
    expect(elementCritShift('strong')).toBe(10);
    expect(elementCritShift('weak')).toBe(-10);
  });
});

describe('damage formula (BATTLE.md §4.1)', () => {
  it('uses K = 1800 + 15 × level and the DEF / (DEF + K) mitigation', () => {
    expect(mitigationK(60)).toBe(2700);
    expect(mitigation(1000, 60)).toBeCloseTo(1 - 1000 / 3700, 10);
    expect(mitigation(1000, 60, 0.5)).toBeCloseTo(1 - 500 / 3200, 10);
    expect(mitigation(0, 1)).toBe(1);
  });

  it('reproduces the worked example exactly', () => {
    // 3.5 × 1000 ATK, neutral, no crit, DEF 500 at level 60, no bonuses, mid variance.
    const raw = 3500;
    const mit = 1 - 500 / 3200;
    const expected = Math.floor(raw * mit * 1);
    expect(
      damage({
        raw,
        match: 'neutral',
        crit: false,
        critDmg: 50,
        targetDef: 500,
        attackerLevel: 60,
        defIgnore: 0,
        outgoing: 0,
        incoming: 0,
        varianceRoll: 0.5,
        takenMult: 1,
      }),
    ).toBe(expected);
  });

  it('applies crit, element, bonuses, reductions, variance band and the boss multiplier', () => {
    const base = {
      raw: 1000,
      match: 'neutral' as const,
      crit: false,
      critDmg: 60,
      targetDef: 0,
      attackerLevel: 60,
      defIgnore: 0,
      outgoing: 0,
      incoming: 0,
      varianceRoll: 0.5,
      takenMult: 1,
    };
    expect(damage(base)).toBe(1000);
    expect(damage({ ...base, crit: true })).toBe(1600);
    expect(damage({ ...base, match: 'strong' })).toBe(1100);
    expect(damage({ ...base, outgoing: 0.25 })).toBe(1250);
    expect(damage({ ...base, incoming: 0.2 })).toBe(800);
    expect(damage({ ...base, varianceRoll: 0 })).toBe(950);
    expect(damage({ ...base, varianceRoll: 0.999999 })).toBe(1049);
    expect(damage({ ...base, takenMult: 0.5 })).toBe(500);
    expect(damage({ ...base, raw: 0 })).toBe(1);
  });

  it('rolls crits against the clamped chance', () => {
    expect(critLands(15, 'neutral', 0, 0.149)).toBe(true);
    expect(critLands(15, 'neutral', 0, 0.15)).toBe(false);
    expect(critLands(15, 'strong', 0, 0.249)).toBe(true);
    expect(critLands(15, 'weak', 0, 0.06)).toBe(false);
    expect(critLands(95, 'strong', 10, 0.999)).toBe(true);
  });
});

describe('healing and debuff landing', () => {
  it('heals k × stat scaled by bonus and reduction', () => {
    expect(healing(0.2, 10_000, 0, 0)).toBe(2000);
    expect(healing(0.2, 10_000, 0.5, 0)).toBe(3000);
    expect(healing(0.2, 10_000, 0, 0.5)).toBe(1000);
    expect(healing(0.2, 10_000, 0, 1)).toBe(0);
  });

  it('lands, misses or resists per the two rolls', () => {
    expect(debuffLands(60, 0, 0, 0.59, 0)).toBe('landed');
    expect(debuffLands(60, 0, 0, 0.6, 0)).toBe('missed');
    expect(debuffLands(100, 50, 20, 0, 0.29)).toBe('resisted');
    expect(debuffLands(100, 50, 20, 0, 0.3)).toBe('landed');
    expect(debuffLands(100, 20, 50, 0, 0)).toBe('landed');
  });
});

describe('turn meter ticks', () => {
  it('finds the ticks until the fastest unit reaches 1.0', () => {
    expect(
      ticksToNextTurn(
        [
          { tm: 0, spd: 100 },
          { tm: 0, spd: 50 },
        ],
        0.001,
      ),
    ).toBe(10);
    expect(
      ticksToNextTurn(
        [
          { tm: 0.5, spd: 100 },
          { tm: 0.95, spd: 10 },
        ],
        0.001,
      ),
    ).toBe(5);
    expect(ticksToNextTurn([{ tm: 1.2, spd: 100 }], 0.001)).toBe(0);
    expect(ticksToNextTurn([{ tm: 0, spd: 0 }], 0.001)).toBe(0);
  });
});
