/**
 * The gate's lean (docs/design/SUMMONING.md §5): the charge kindles the runes and draws the light
 * in, every tell builds on the last, a held breath drains it all to a heartbeat, the wind-up pulls
 * hardest, and the burst leaves a pillar standing only over gold and rose.
 */
import { describe, expect, it } from 'vitest';
import { RITUAL_TIMING, ritualPlan } from './choreography';
import { AT_REST, ritualLean, spentLean, type RitualState } from './lean';

const { full } = RITUAL_TIMING;
const plan = ritualPlan('rare', 'legendary');
const state = (over: Partial<RitualState> = {}): RitualState => ({
  rarity: 'legendary',
  plan,
  t: 0,
  told: 0,
  stallAt: null,
  windupAt: null,
  burst: false,
  ...over,
});
const lean = (over: Partial<RitualState>) => ritualLean(state(over), full, false);

describe('the gate’s lean', () => {
  it('rests dark and still between presses', () => {
    expect(AT_REST).toMatchObject({ zoom: 1, kindled: 0, inflow: 0, dim: 0, heart: 0, squeeze: 0 });
  });

  it('kindles the runes one after another through the charge and draws the light in harder', () => {
    const start = lean({ t: 0 });
    const half = lean({ t: full.charge / 2 });
    const end = lean({ t: full.charge });
    expect(start.kindled).toBe(0);
    expect(half.kindled).toBeCloseTo(0.5);
    expect(end.kindled).toBe(1);
    expect(half.inflow).toBeGreaterThan(start.inflow);
    expect(end.inflow).toBeGreaterThan(half.inflow);
    expect(end.dim).toBeGreaterThan(start.dim);
  });

  it('builds with every tell told', () => {
    const one = lean({ t: 1.2, told: 1 });
    const two = lean({ t: 1.7, told: 2 });
    expect(two.charge).toBeGreaterThan(one.charge);
    expect(two.vortexSpeed).toBeGreaterThan(one.vortexSpeed);
    expect(two.zoom).toBeGreaterThan(one.zoom);
  });

  it('holds its breath before gold: the light drains, the ring all but stops, the heart beats twice', () => {
    const told = lean({ t: 2, told: 2 });
    const stallAt = 2.07;
    const held = lean({ t: stallAt + 0.1, told: 2, stallAt });
    expect(held.inflow).toBe(0);
    expect(held.ringSpeed).toBeLessThan(told.ringSpeed / 10);
    expect(held.runes).toBeLessThan(told.runes);
    expect(held.dim).toBeGreaterThan(told.dim);
    // Two thumps, the second softer, and nothing between them.
    const heart = (s: number): number => lean({ t: stallAt + s, told: 2, stallAt }).heart;
    expect(heart(0.1)).toBeCloseTo(1, 1);
    expect(heart(0.34)).toBeCloseTo(0.75, 1);
    expect(heart(0.22)).toBeLessThan(0.1);
  });

  it('pulls hardest in the wind-up and squeezes the crystal harder all the way to the burst', () => {
    const windupAt = 3.15;
    const at = (s: number) => lean({ t: windupAt + s, told: 3, windupAt });
    expect(at(0).squeeze).toBe(0);
    expect(at(full.windup / 2).squeeze).toBeCloseTo(0.25);
    expect(at(full.windup).squeeze).toBeCloseTo(1);
    expect(at(0).inflow).toBeGreaterThan(lean({ t: 3, told: 3 }).inflow);
    expect(at(0).charge).toBe(1);
  });

  it('glows on after the burst, with a pillar only over gold and rose that lingers under the cards', () => {
    const gold = lean({ burst: true });
    expect(gold.pillar).toBeGreaterThan(0);
    expect(gold.rays).toBeGreaterThan(0);
    expect(lean({ rarity: 'epic', burst: true }).pillar).toBe(0);
    expect(spentLean('mythic').pillar).toBeGreaterThan(0);
    expect(spentLean('mythic').pillar).toBeLessThan(gold.pillar);
    expect(spentLean('rare').pillar).toBe(0);
    expect(spentLean(null).pillar).toBe(0);
  });

  it('never moves the camera under reduced motion', () => {
    const moments: Partial<RitualState>[] = [
      { t: 0.2 },
      { t: 1.2, told: 1 },
      { t: 2.1, told: 2, stallAt: 2.07 },
      { t: 3.2, told: 3, windupAt: 3.15 },
      { burst: true },
    ];
    for (const over of moments) expect(ritualLean(state(over), RITUAL_TIMING.reduced, true).zoom).toBe(1);
    expect(lean({ t: 1.2, told: 1 }).zoom).toBeGreaterThan(1);
  });
});
