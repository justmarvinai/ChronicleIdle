/**
 * The rhythm of a summon (docs/design/SUMMONING.md §5): the tells climb from the shard's floor to
 * the answer, the gate holds its breath before gold and rose, and a rarer pull is a longer wait.
 */
import { describe, expect, it } from 'vitest';
import { BURST_WEIGHT, RITUAL_TIMING, ritualPlan, shardFloor, tellRate, tellsFor } from './choreography';

describe('the ritual’s beat sheet', () => {
  it('tells every rarity from the shard’s floor up to the answer', () => {
    expect(tellsFor('rare', 'legendary')).toEqual(['rare', 'epic', 'legendary']);
    expect(tellsFor('common', 'common')).toEqual(['common']);
    expect(tellsFor('epic', 'mythic')).toEqual(['epic', 'legendary', 'mythic']);
    // A floor above the answer never happens, but it must not tell nothing.
    expect(tellsFor('epic', 'rare')).toEqual(['rare']);
  });

  it('starts every climb at the least the shard can answer with', () => {
    expect(shardFloor('faded')).toBe('common');
    expect(shardFloor('ancient')).toBe('rare');
    expect(shardFloor('sacred')).toBe('epic');
    expect(shardFloor('primordial')).toBe('epic');
  });

  it('stalls before gold and before rose, never before the first tell', () => {
    const legendary = ritualPlan('rare', 'legendary');
    expect(legendary.beats.map((beat) => beat.stalled)).toEqual([false, false, true]);
    const mythic = ritualPlan('epic', 'mythic');
    expect(mythic.beats.map((beat) => beat.stalled)).toEqual([false, true, true]);
    expect(ritualPlan('legendary', 'legendary').beats[0]?.stalled).toBe(false);
  });

  it('keeps a plain pull short and makes the rarest wait the longest', () => {
    const { full } = RITUAL_TIMING;
    const common = ritualPlan('common', 'common');
    expect(common.burstAt).toBeCloseTo(full.charge + full.step + full.windup);
    const legendary = ritualPlan('rare', 'legendary');
    expect(legendary.burstAt).toBeCloseTo(full.charge + 3 * full.step + full.stall + full.windup);
    expect(ritualPlan('epic', 'mythic').total).toBeGreaterThan(legendary.total);
    expect(legendary.total).toBeGreaterThan(common.total);
    // Beats land in order, each after the last.
    const times = legendary.beats.map((beat) => beat.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(legendary.burstAt).toBeGreaterThan(times.at(-1) ?? 0);
  });

  it('shortens everything and never stalls under reduced motion', () => {
    const reduced = ritualPlan('epic', 'mythic', true);
    expect(reduced.beats.every((beat) => !beat.stalled)).toBe(true);
    expect(reduced.total).toBeLessThan(ritualPlan('epic', 'mythic').total / 2);
  });

  it('gives each rarer burst more of everything, and a pillar only to gold and rose', () => {
    expect(BURST_WEIGHT.mythic.sparks).toBeGreaterThan(BURST_WEIGHT.legendary.sparks);
    expect(BURST_WEIGHT.legendary.sparks).toBeGreaterThan(BURST_WEIGHT.epic.sparks);
    expect(BURST_WEIGHT.epic.pillar).toBe(false);
    expect(BURST_WEIGHT.legendary.pillar && BURST_WEIGHT.mythic.pillar).toBe(true);
    expect(tellRate(0)).toBe(1);
    expect(tellRate(2)).toBeGreaterThan(tellRate(1));
  });
});
