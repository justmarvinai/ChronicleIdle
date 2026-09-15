import { describe, expect, it } from 'vitest';
import {
  FARM_TIER_MAX,
  IDLE_CAPACITY_BANDS,
  IDLE_CHANCES,
  IDLE_ENERGY_PER_FILL,
  IDLE_GOLD_BASE,
} from '@content/balance/idle';
import { emptyCampaignProgress, progressKey, stageIdOf } from '@engine/campaign/progress';
import type { CampaignProgress } from '@engine/campaign/progress';
import { createRng } from '@engine/rng/rng';
import { MS_PER_HOUR, MS_PER_MINUTE } from '@engine/time/clock';
import {
  farmSettlement,
  farmTier,
  farmTierOf,
  idleCapacityHours,
  idleFill,
  idleGoldPerHour,
  idleGuaranteed,
  idleHaul,
  idleNextCapacity,
  idleRolls,
} from './idle';

const T0 = new Date(2026, 8, 15, 12, 0).getTime();
const at = (hours: number) => T0 + hours * MS_PER_HOUR;

/** A progress record with the named boss stands cleared. */
function withBosses(cleared: { settlement: number; difficulty: 'intro' | 'normal' | 'hard' }[]) {
  const progress: CampaignProgress = emptyCampaignProgress();
  for (const { settlement, difficulty } of cleared)
    progress.stars[progressKey(stageIdOf(settlement, 10), difficulty)] = 3;
  return progress;
}

describe('the chest capacity', () => {
  it('follows the level bands', () => {
    expect(idleCapacityHours(1)).toBe(3);
    expect(idleCapacityHours(9)).toBe(3);
    expect(idleCapacityHours(10)).toBe(6);
    expect(idleCapacityHours(29)).toBe(12);
    expect(idleCapacityHours(30)).toBe(16);
    expect(idleCapacityHours(60)).toBe(24);
    // Past the table's last row the widest band carries on.
    expect(idleCapacityHours(100)).toBe(24);
    expect(idleCapacityHours(140)).toBe(IDLE_CAPACITY_BANDS[IDLE_CAPACITY_BANDS.length - 1]?.hours);
  });

  it('names the next band a chronicle is levelling towards', () => {
    expect(idleNextCapacity(1)).toEqual({ level: 10, hours: 6 });
    expect(idleNextCapacity(9)).toEqual({ level: 10, hours: 6 });
    expect(idleNextCapacity(20)).toEqual({ level: 30, hours: 16 });
    expect(idleNextCapacity(59)).toEqual({ level: 60, hours: 24 });
    // The widest band is the end of the road: there is nothing left to promise.
    expect(idleNextCapacity(60)).toBeNull();
    expect(idleNextCapacity(140)).toBeNull();
  });
});

describe('the chest fill', () => {
  it('accrues to the minute and reports the wait', () => {
    const fill = idleFill({ now: at(1) + 30 * MS_PER_MINUTE, lastClaimAt: T0, level: 10 });
    expect(fill.hours).toBe(1.5);
    expect(fill.fraction).toBeCloseTo(1.5 / 6, 6);
    expect(fill.full).toBe(false);
    expect(fill.msToFull).toBe(4.5 * MS_PER_HOUR);
    expect(fill.claimable).toBe(true);
  });

  it('ignores the seconds, so the numbers tick once a minute', () => {
    const fill = idleFill({ now: T0 + 90 * 1000, lastClaimAt: T0, level: 1 });
    expect(fill.hours).toBe(1 / 60);
    expect(fill.claimable).toBe(true);
    const fresh = idleFill({ now: T0 + 59 * 1000, lastClaimAt: T0, level: 1 });
    expect(fresh.hours).toBe(0);
    expect(fresh.claimable).toBe(false);
  });

  it('pays exactly one hour after an hour away', () => {
    const fill = idleFill({ now: at(1), lastClaimAt: T0, level: 10 });
    expect(fill.hours).toBe(1);
    expect(fill.full).toBe(false);
    expect(fill.msToFull).toBe(5 * MS_PER_HOUR);
    const haul = idleGuaranteed({ tier: 10, hours: fill.hours, brewElement: 'justice' });
    expect(haul.currencies.find((c) => c.currency === 'gold')?.amount).toBe(Math.floor(idleGoldPerHour(10)));
    expect(haul.playerXp).toBe(50);
  });

  it('caps at capacity and stays there', () => {
    const level10 = { lastClaimAt: T0, level: 10 };
    const overflowing = idleFill({ now: at(26), ...level10 });
    expect(overflowing.hours).toBe(6);
    expect(overflowing.heldMs).toBe(6 * MS_PER_HOUR);
    expect(overflowing.fraction).toBe(1);
    expect(overflowing.full).toBe(true);
    expect(overflowing.msToFull).toBe(0);
    // Everything past capacity is lost: a day and a night pay the same as six hours.
    expect(idleGuaranteed({ tier: 12, hours: overflowing.hours, brewElement: 'valor' })).toEqual(
      idleGuaranteed({ tier: 12, hours: 6, brewElement: 'valor' }),
    );
  });

  it('waits when the clock has moved backwards', () => {
    const fill = idleFill({ now: T0 - 5 * MS_PER_HOUR, lastClaimAt: T0, level: 20 });
    expect(fill.elapsedMs).toBe(0);
    expect(fill.hours).toBe(0);
    expect(fill.fraction).toBe(0);
    expect(fill.claimable).toBe(false);
    expect(fill.msToFull).toBe(12 * MS_PER_HOUR);
  });
});

describe('the farm tier', () => {
  it('counts the three difficulties end to end', () => {
    expect(farmTier([0, 0, 0])).toBe(0);
    expect(farmTier([1, 0, 0])).toBe(1);
    expect(farmTier([12, 0, 0])).toBe(12);
    expect(farmTier([12, 1, 0])).toBe(13);
    expect(farmTier([12, 12, 1])).toBe(25);
    expect(farmTier([12, 12, 12])).toBe(FARM_TIER_MAX);
  });

  it('never drops when a harder difficulty opens', () => {
    // All of Intro cleared, no Normal boss yet: the tier earned on Intro stands.
    expect(farmTierOf(withBosses([{ settlement: 12, difficulty: 'intro' }]))).toBe(12);
    expect(
      farmTierOf(
        withBosses([
          { settlement: 12, difficulty: 'intro' },
          { settlement: 3, difficulty: 'normal' },
        ]),
      ),
    ).toBe(15);
  });

  it('knows which settlement a tier farms', () => {
    expect(farmSettlement(0)).toBe(0);
    expect(farmSettlement(1)).toBe(1);
    expect(farmSettlement(12)).toBe(12);
    expect(farmSettlement(13)).toBe(1);
    expect(farmSettlement(36)).toBe(12);
  });
});

describe('what the chest owes', () => {
  it('pays nothing before the first boss falls', () => {
    expect(idleGuaranteed({ tier: 0, hours: 24, brewElement: null })).toEqual({
      currencies: [],
      playerXp: 0,
    });
    expect(idleRolls({ tier: 0, hours: 24, brewElement: null }, createRng('x'))).toEqual({
      currencies: [],
      procs: {},
    });
  });

  it('follows the hourly table', () => {
    const haul = idleGuaranteed({ tier: 1, hours: 3, brewElement: 'faith' });
    const gold = haul.currencies.find((c) => c.currency === 'gold');
    expect(gold?.amount).toBe(Math.floor(IDLE_GOLD_BASE * 3));
    // An idle hour is worth about one run at the tier it farms (ADR-035).
    expect(idleGoldPerHour(12)).toBe(1_440);
    expect(idleGoldPerHour(36)).toBe(4_320);
    // 1 iron/hour → 3; 5 XP/hour/tier → 15.
    expect(haul.currencies.find((c) => c.currency === 'mat_scrap_iron')?.amount).toBe(3);
    expect(haul.playerXp).toBe(15);
  });

  it('owes no brews and no dust: one is luck, the other is a campaign drop', () => {
    const haul = idleGuaranteed({ tier: 24, hours: 24, brewElement: 'eclipse' });
    const owed = haul.currencies.map((c) => c.currency);
    expect(owed.filter((id) => id.startsWith('brew_'))).toEqual([]);
    expect(owed).not.toContain('mat_arcane_dust');
    expect(owed).toEqual(['gold', 'mat_ember_alloy', 'energy']);
  });

  it('pays the band material and no other', () => {
    const intro = idleGuaranteed({ tier: 6, hours: 6, brewElement: 'valor' }).currencies.map(
      (c) => c.currency,
    );
    expect(intro).toContain('mat_scrap_iron');
    expect(intro).not.toContain('mat_ember_alloy');
    // The hard band pays starsteel *instead of* the bands below it, not as well as.
    const hard = idleGuaranteed({ tier: 30, hours: 6, brewElement: 'valor' }).currencies.map(
      (c) => c.currency,
    );
    expect(hard).toContain('mat_starsteel');
    expect(hard).not.toContain('mat_scrap_iron');
    expect(hard).not.toContain('mat_ember_alloy');
  });

  it('caps the energy a single fill may hold', () => {
    const haul = idleGuaranteed({ tier: 20, hours: 24, brewElement: 'justice' });
    expect(haul.currencies.find((c) => c.currency === 'energy')?.amount).toBe(IDLE_ENERGY_PER_FILL);
  });
});

describe('the chest luck', () => {
  it('rolls once an hour and caps each reward per fill', () => {
    // A generous seed sweep: no fill may ever exceed the per-fill caps.
    for (let seed = 0; seed < 200; seed += 1) {
      const rolls = idleRolls({ tier: 30, hours: 24, brewElement: 'valor' }, createRng(`idle:${seed}`));
      for (const def of IDLE_CHANCES) expect(rolls.procs[def.id] ?? 0).toBeLessThanOrEqual(def.perFill);
      // However lucky the chest is, a fill is never more than two brews.
      const brews = rolls.currencies.filter((c) => c.currency.startsWith('brew_'));
      expect(brews.reduce((sum, c) => sum + c.amount, 0)).toBeLessThanOrEqual(2);
    }
  });

  it('is the same chest however often it is read', () => {
    const input = { tier: 18, hours: 9, brewElement: 'faith' as const };
    const first = idleRolls(input, createRng('idle:fixture:1234'));
    const second = idleRolls(input, createRng('idle:fixture:1234'));
    expect(second).toEqual(first);
  });

  it('lands near the published rates over many fills', () => {
    let gemProcs = 0;
    let hours = 0;
    for (let seed = 0; seed < 400; seed += 1) {
      // Two hours per fill keeps the per-fill caps out of the way of the rate.
      const rolls = idleRolls({ tier: 10, hours: 2, brewElement: 'valor' }, createRng(`r${seed}`));
      gemProcs += rolls.procs['gems'] ?? 0;
      hours += 2;
    }
    expect(gemProcs / hours).toBeGreaterThan(0.05);
    expect(gemProcs / hours).toBeLessThan(0.12);
  });

  it('merges the rolls into the guaranteed haul', () => {
    const input = { tier: 30, hours: 24, brewElement: 'valor' as const };
    const rng = createRng('idle:merge');
    const haul = idleHaul(input, rng);
    const guaranteed = idleGuaranteed(input);
    const gold = haul.currencies.find((c) => c.currency === 'gold')?.amount ?? 0;
    expect(gold).toBe(guaranteed.currencies.find((c) => c.currency === 'gold')?.amount);
    // Every currency is listed once, whichever half it came from.
    const ids = haul.currencies.map((c) => c.currency);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
