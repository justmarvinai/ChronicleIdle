/**
 * The boss tables are the fight (docs/design/BOSSES.md §2): what the table prints is what the
 * player meets, and the ladder climbs. The generic shape checks live in the content validator;
 * these are the promises the numbers make.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { createBattle } from '@engine/battle/create';
import { createInstance } from '@engine/champions/instance';
import type { PartyMember } from '@engine/battle/create';
import { BOSS_BY_ID } from './index';

const gravemaw = BOSS_BY_ID['boss.gravemaw'];

describe('Gravemaw, the Bone Tyrant', () => {
  it('is the daily boss, two keys a day, from chronicle level 10', () => {
    expect(gravemaw?.period).toBe('daily');
    expect(gravemaw?.keysPerPeriod).toBe(2);
    expect(gravemaw?.unlockLevel).toBe(10);
    expect(gravemaw?.tiers.map((tier) => tier.id)).toEqual(['easy', 'normal', 'hard', 'brutal']);
  });

  it('is Unshakeable: no stun, freeze, sleep, provoke or fear', () => {
    expect(gravemaw?.immunities).toEqual(['stun', 'freeze', 'sleep', 'provoke', 'fear']);
    for (const tier of gravemaw?.tiers ?? [])
      expect(tier.enemy.boss?.immunities).toEqual(gravemaw?.immunities);
  });

  it('shares one kit across all four tiers', () => {
    const ids = (gravemaw?.tiers ?? []).map((tier) => tier.enemy.abilities.map((a) => a.id).join(','));
    expect(new Set(ids).size).toBe(1);
    expect(gravemaw?.tiers[0]?.enemy.abilities.map((a) => a.id)).toEqual([
      'ab.gravemaw.bone_crush',
      'ab.gravemaw.grave_quake',
      'ab.gravemaw.devour',
    ]);
    expect(gravemaw?.tiers[0]?.enemy.passives.map((p) => p.id)).toEqual(['ab.gravemaw.tyrants_hide']);
  });

  it('fights at the pools the table prints, not a scaled version of them', () => {
    const champ = content.championById('champ.ser_corvin');
    if (!champ || !gravemaw) throw new Error('missing content');
    const party: PartyMember[] = [
      { def: champ, instance: createInstance(champ, { instanceId: 'x', now: 0, source: 'starter' }) },
    ];
    const pools = [250_000, 2_000_000, 12_000_000, 60_000_000];
    gravemaw.tiers.forEach((tier, index) => {
      const encounter = content.bossEncounter(gravemaw.id, tier.id);
      if (!encounter) throw new Error(`no encounter for ${tier.id}`);
      const state = createBattle(
        {
          encounter,
          party,
          enemyById: (id) => (id === tier.enemy.id ? tier.enemy : undefined),
          control: 'auto',
        },
        'boss-test',
      );
      const boss = state.units['w0e0'];
      expect(boss?.maxHp).toBe(pools[index]);
      expect(boss?.base.atk).toBe(tier.stats.atk);
      expect(boss?.base.spd).toBe(tier.stats.spd);
      expect(boss?.isBoss).toBe(true);
      expect(boss?.rotation).toEqual(['a1', 'a1', 'a2', 'a1', 'a3']);
      // Four champions face it, and the limit ends the race without calling it a defeat.
      expect(encounter.partySize).toBe(4);
      expect(encounter.turnLimit).toBe(50);
      expect(encounter.timeUpIsDefeat).toBe(false);
    });
  });

  it('pays a ladder of chests that ends in the kill', () => {
    for (const tier of gravemaw?.tiers ?? []) {
      expect(tier.chests.map((chest) => chest.pct)).toEqual([5, 15, 30, 60, 100]);
      expect(tier.chests[tier.chests.length - 1]?.gear).toBeDefined();
    }
    // The hardest tier's kill is the only Legendary 6★ piece on the ladder.
    expect(gravemaw?.tiers[3]?.chests[4]?.gear).toEqual({ rarity: 'legendary', stars: 6 });
  });

  it('is reachable through the registry by id and by tier', () => {
    expect(content.bossById('boss.gravemaw')?.name).toBe('boss.gravemaw.name');
    expect(content.bossTier('boss.gravemaw', 'hard')?.stats.hp).toBe(12_000_000);
    expect(content.bossTier('boss.gravemaw', 'nope')).toBeUndefined();
    expect(content.encounterById('encounter.boss.gravemaw.easy')?.kind).toBe('boss');
    expect(content.enemyById('enemy.gravemaw_brutal')?.stats.atk).toBe(4_000);
  });
});
