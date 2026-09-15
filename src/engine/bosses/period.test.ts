/**
 * The boss period's rules (docs/design/BOSSES.md §1): two keys a day, damage that adds up across
 * them, chests that unlock at thresholds and are taken once, records that outlive the reset.
 */
import { describe, expect, it } from 'vitest';
import { BOSS_BY_ID } from '@content/bosses/index';
import { MS_PER_HOUR } from '@engine/time/clock';
import type { BattleOutcome } from '@engine/battle/types';
import {
  bossPeriodKey,
  chestThreshold,
  chestViews,
  claimableChests,
  currentPeriod,
  damagePercent,
  damageToBoss,
  freshPeriod,
  isChestClaimed,
  keysLeft,
  msUntilPeriodEnd,
  tierDamage,
  unclaimedAtReset,
  withChestClaimed,
  withDamageBanked,
  withKeySpent,
  type BossSave,
} from './period';

/** A key spent and its damage banked, the way a finished fight does both. */
function fight(
  state: BossSave,
  input: { tierId: string; damage: number; team: string[]; now: number },
): BossSave {
  return withDamageBanked(withKeySpent(state), input);
}

const gravemaw = BOSS_BY_ID['boss.gravemaw'];
if (!gravemaw) throw new Error('no daily boss');
const easy = gravemaw.tiers[0];
const normal = gravemaw.tiers[1];
if (!easy || !normal) throw new Error('no tiers');

/** Noon, so a few hours either way stays inside the same day. */
const NOON = new Date(2026, 8, 15, 12, 0).getTime();
const period = (now: number): BossSave => freshPeriod(bossPeriodKey('daily', now));

describe('the period boundary', () => {
  it('keys a daily boss by the day and a weekly one by the week', () => {
    const sameDay = bossPeriodKey('daily', NOON + 6 * MS_PER_HOUR);
    expect(bossPeriodKey('daily', NOON)).toBe(sameDay);
    expect(bossPeriodKey('daily', NOON + 24 * MS_PER_HOUR)).not.toBe(sameDay);
    // A Tuesday and the Thursday after it are the same week; the Monday after is not.
    const tuesday = new Date(2026, 8, 15, 12, 0).getTime();
    expect(bossPeriodKey('weekly', tuesday)).toBe(bossPeriodKey('weekly', tuesday + 2 * 24 * MS_PER_HOUR));
    expect(bossPeriodKey('weekly', tuesday)).not.toBe(
      bossPeriodKey('weekly', tuesday + 7 * 24 * MS_PER_HOUR),
    );
  });

  it('counts down to the reset', () => {
    expect(msUntilPeriodEnd('daily', NOON)).toBe(12 * MS_PER_HOUR);
    expect(msUntilPeriodEnd('weekly', NOON)).toBeGreaterThan(msUntilPeriodEnd('daily', NOON));
  });

  it('reads a record from an older period as a fresh one, keeping the records', () => {
    const spent = fight(period(NOON), {
      tierId: easy.id,
      damage: 90_000,
      team: ['champ.ser_corvin'],
      now: NOON,
    });
    expect(keysLeft(gravemaw, spent)).toBe(1);

    const tomorrow = currentPeriod(spent, 'daily', NOON + 24 * MS_PER_HOUR);
    expect(keysLeft(gravemaw, tomorrow)).toBe(2);
    expect(tierDamage(tomorrow, easy.id)).toBe(0);
    expect(tomorrow.claimed).toEqual([]);
    // History survives: the best damage and the team that did it stay.
    expect(tomorrow.records[easy.id]?.damage).toBe(90_000);
    expect(tomorrow.records[easy.id]?.team).toEqual(['champ.ser_corvin']);

    // Inside the period nothing is touched.
    expect(currentPeriod(spent, 'daily', NOON + 6 * MS_PER_HOUR)).toBe(spent);
  });
});

describe('banking a fight', () => {
  it('adds the damage of every key to the same pool', () => {
    let state = period(NOON);
    state = fight(state, { tierId: easy.id, damage: 20_000, team: ['a'], now: NOON });
    state = fight(state, { tierId: easy.id, damage: 30_000, team: ['b'], now: NOON + 1 });
    expect(tierDamage(state, easy.id)).toBe(50_000);
    expect(state.keysUsed).toBe(2);
    expect(keysLeft(gravemaw, state)).toBe(0);
    // The record is the period's running total, not one fight's share.
    expect(state.records[easy.id]?.damage).toBe(50_000);
    expect(state.records[easy.id]?.team).toEqual(['b']);
  });

  it('keeps each tier to its own pool', () => {
    let state = period(NOON);
    state = fight(state, { tierId: easy.id, damage: 10_000, team: ['a'], now: NOON });
    state = fight(state, { tierId: normal.id, damage: 7_000, team: ['a'], now: NOON });
    expect(tierDamage(state, easy.id)).toBe(10_000);
    expect(tierDamage(state, normal.id)).toBe(7_000);
  });

  it('never lowers a record, and never banks a negative', () => {
    let state = period(NOON);
    state = fight(state, { tierId: easy.id, damage: 200_000, team: ['a'], now: NOON });
    const best = state.records[easy.id];
    const tomorrow = currentPeriod(state, 'daily', NOON + 24 * MS_PER_HOUR);
    const weaker = fight(tomorrow, {
      tierId: easy.id,
      damage: 1_000,
      team: ['b'],
      now: NOON + 24 * MS_PER_HOUR,
    });
    expect(weaker.records[easy.id]).toEqual(best);
    expect(tierDamage(fight(period(NOON), { tierId: easy.id, damage: -5, team: [], now: 0 }), easy.id)).toBe(
      0,
    );
  });
});

describe('the chest ladder', () => {
  it('unlocks at its share of the pool', () => {
    expect(chestThreshold(easy, 5)).toBe(12_500);
    expect(chestThreshold(easy, 100)).toBe(250_000);
    expect(damagePercent(easy, 125_000)).toBe(50);
    // Past the kill the bar stays full.
    expect(damagePercent(easy, 400_000)).toBe(100);

    const state = fight(period(NOON), {
      tierId: easy.id,
      damage: 40_000,
      team: ['a'],
      now: NOON,
    });
    expect(chestViews(easy, state).map((chest) => chest.state)).toEqual([
      'claimable',
      'claimable',
      'locked',
      'locked',
      'locked',
    ]);
    expect(claimableChests(easy, state)).toEqual([5, 15]);
  });

  it('is taken once per period', () => {
    const state = fight(period(NOON), {
      tierId: easy.id,
      damage: 40_000,
      team: ['a'],
      now: NOON,
    });
    const after = withChestClaimed(state, easy.id, 5);
    expect(isChestClaimed(after, easy.id, 5)).toBe(true);
    expect(claimableChests(easy, after)).toEqual([15]);
    // Claiming twice changes nothing.
    expect(withChestClaimed(after, easy.id, 5)).toBe(after);
    // And the same threshold on another tier is a different chest.
    expect(isChestClaimed(after, normal.id, 5)).toBe(false);
  });

  it('owes what was earned and left when the period turns over', () => {
    let state = fight(period(NOON), {
      tierId: easy.id,
      damage: 40_000,
      team: ['a'],
      now: NOON,
    });
    state = withChestClaimed(state, easy.id, 5);
    state = fight(state, { tierId: normal.id, damage: 150_000, team: ['a'], now: NOON });
    expect(unclaimedAtReset(gravemaw, state)).toEqual([
      { tierId: easy.id, pct: 15 },
      { tierId: normal.id, pct: 5 },
    ]);
    // Nothing is owed on a period with no damage in it.
    expect(unclaimedAtReset(gravemaw, period(NOON))).toEqual([]);
  });
});

describe('the damage a fight did', () => {
  const outcome = (units: BattleOutcome['units']): BattleOutcome => ({
    kind: 'timeout',
    turns: 50,
    allyTurns: 20,
    wavesCleared: 0,
    waveCount: 1,
    units,
    enemyHpLeft: 0.8,
    seed: 'x',
    decisions: [],
  });
  const report = (over: Partial<BattleOutcome['units'][number]>): BattleOutcome['units'][number] => ({
    unitId: 'w0e0',
    defId: 'enemy.gravemaw_easy',
    instanceId: null,
    side: 'enemy',
    alive: true,
    died: false,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    kills: 0,
    ...over,
  });

  it('counts what the boss took and nothing else', () => {
    const state = outcome([
      report({ damageTaken: 42_000 }),
      // An add, and an ally that took a beating: neither is the pool.
      report({ unitId: 'w0e1', defId: 'enemy.chorister', damageTaken: 9_000 }),
      report({ unitId: 'a0', defId: 'champ.ser_corvin', side: 'ally', damageTaken: 30_000 }),
    ]);
    expect(damageToBoss(state, 'enemy.gravemaw_easy')).toBe(42_000);
    expect(damageToBoss(state, 'enemy.gravemaw_brutal')).toBe(0);
  });
});
