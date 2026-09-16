/**
 * The boss tables are the fight (docs/design/BOSSES.md §2–§3): what the table prints is what the
 * player meets, and the ladder climbs. The generic shape checks live in the content validator;
 * these are the promises the numbers make.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { createBattle } from '@engine/battle/create';
import { snapshot } from '@engine/battle/snapshot';
import { runAuto } from '@engine/battle/step';
import { createInstance } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import type { PartyMember } from '@engine/battle/create';
import { BOSS_BY_ID } from './index';

const gravemaw = BOSS_BY_ID['boss.gravemaw'];
const nyxara = BOSS_BY_ID['boss.nyxara'];

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

  it('casts its kit in the printed order, the same way on the same seed', () => {
    const encounter = content.bossEncounter('boss.gravemaw', 'easy');
    if (!encounter || !gravemaw) throw new Error('missing content');
    // A party that survives long enough for the rotation to come round twice.
    const party: PartyMember[] = ['champ.khazgor', 'champ.anuria', 'champ.maruan'].map((id, index) => {
      const def = content.championById(id as 'champ.khazgor');
      if (!def) throw new Error(id);
      const instance = createInstance(def, { instanceId: `r${index}`, now: 0, source: 'starter' });
      return { def, instance: { ...instance, stars: 4, level: levelCap(4) } };
    });
    const casts = (): string[] => {
      const state = createBattle(
        { encounter, party, enemyById: (id) => content.enemyById(id), control: 'auto' },
        'rotation',
      );
      return runAuto(state)
        .events.filter((event) => event.type === 'ability.cast' && event.unitId === 'w0e0')
        .map((event) => (event.type === 'ability.cast' ? event.abilityId : ''));
    };

    const first = casts();
    // The same seed, the same fight: a race can be replayed turn for turn (BATTLE.md §2).
    expect(casts()).toEqual(first);
    expect(first.length).toBeGreaterThan(6);
    // `A1 A1 A2 A1 A3` with Devour starting on cooldown: the bite cannot open the fight.
    expect(first[0]).toBe('ab.gravemaw.bone_crush');
    expect(first[1]).toBe('ab.gravemaw.bone_crush');
    expect(first.slice(0, 3)).not.toContain('ab.gravemaw.devour');
    expect(first).toContain('ab.gravemaw.grave_quake');
    expect(first).toContain('ab.gravemaw.devour');
    expect(new Set(first).size).toBe(3);
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

describe('Nyxara, Mother of Shadows', () => {
  it('is the weekly boss, three keys a week, from chronicle level 15', () => {
    expect(nyxara?.period).toBe('weekly');
    expect(nyxara?.keysPerPeriod).toBe(3);
    expect(nyxara?.unlockLevel).toBe(15);
    expect(nyxara?.keyCurrency).toBe('key_weekly');
    expect(nyxara?.tiers.map((tier) => tier.id)).toEqual(['normal', 'hard', 'nightmare']);
  });

  it('fights in three phases, and every tier knows where they are', () => {
    expect(nyxara?.phases).toEqual([0.9, 0.75]);
    for (const tier of nyxara?.tiers ?? []) expect(tier.enemy.boss?.phases).toEqual([0.9, 0.75]);
  });

  it('opens the Hymn in phase II and the Embrace in phase III', () => {
    const byId = new Map((nyxara?.tiers[0]?.enemy.abilities ?? []).map((a) => [a.id, a]));
    expect(byId.get('ab.nyxara.shadow_verse')?.minPhase).toBeUndefined();
    expect(byId.get('ab.nyxara.dirge')?.minPhase).toBeUndefined();
    expect(byId.get('ab.nyxara.eclipse_hymn')?.minPhase).toBe(2);
    expect(byId.get('ab.nyxara.mothers_embrace')?.minPhase).toBe(3);
    // Un-light only bites in her last phase.
    expect(nyxara?.tiers[0]?.enemy.passives[0]?.effects[0]).toEqual({
      kind: 'enemy_heal_reduction',
      value: 30,
      if: { selfPhaseAtLeast: 3 },
    });
  });

  it('brings two Choristers that take half of every hit meant for her', () => {
    expect(nyxara?.adds).toMatchObject({
      name: 'enemy.chorister.name',
      count: 2,
      guardPercent: 50,
      reviveEvery: 12,
      revivedHpPercent: 50,
    });
    for (const tier of nyxara?.tiers ?? []) {
      expect(tier.adds?.id).toBe(`enemy.chorister_${tier.id}`);
      expect(tier.enemy.boss?.adds).toEqual({
        enemyId: tier.adds?.id,
        count: 2,
        guardPercent: 50,
        reviveEvery: 12,
        revivedHpPercent: 50,
      });
      // A pair of them holds well under a tenth of the pool: a speed bump, not a second boss.
      expect((tier.adds?.stats.hp ?? 0) * 2).toBeLessThan(tier.stats.hp / 10);
      // The escort is rank and file: no boss block, so no phases and no escort of its own.
      expect(tier.adds?.boss).toBeUndefined();
    }
  });

  it('stands with its chorus in the wave a key buys', () => {
    const encounter = content.bossEncounter('boss.nyxara', 'normal');
    expect(encounter?.waves[0]?.enemies.map((e) => e.enemyId)).toEqual([
      'enemy.nyxara_normal',
      'enemy.chorister_normal',
      'enemy.chorister_normal',
    ]);
    expect(encounter?.turnLimit).toBe(100);
    expect(encounter?.timeUpIsDefeat).toBe(false);
    // Two per cent of the tier's pool, on every tier (BOSSES.md §3).
    for (const tier of nyxara?.tiers ?? [])
      expect(tier.adds?.stats.hp).toBe(Math.round(tier.stats.hp * 0.02));
  });

  it('is linked to its chorus the moment the wave spawns', () => {
    const encounter = content.bossEncounter('boss.nyxara', 'normal');
    const champ = content.championById('champ.ser_corvin');
    if (!encounter || !champ) throw new Error('missing content');
    const party: PartyMember[] = [
      { def: champ, instance: createInstance(champ, { instanceId: 'x', now: 0, source: 'starter' }) },
    ];
    const state = createBattle(
      { encounter, party, enemyById: (id) => content.enemyById(id), control: 'auto' },
      'nyxara-test',
    );
    const boss = state.units['w0e0'];
    expect(boss?.maxHp).toBe(5_000_000);
    expect(boss?.phaseThresholds).toEqual([0.9, 0.75]);
    expect(boss?.phase).toBe(1);
    expect(boss?.adds).toEqual({ ids: ['w0e1', 'w0e2'], every: 12, hpPercent: 50 });
    expect(state.units['w0e1']?.guards).toEqual({ unitId: 'w0e0', percent: 50 });
    expect(state.units['w0e2']?.guards).toEqual({ unitId: 'w0e0', percent: 50 });
  });

  it('changes gear twice against the damage a finished roster does', () => {
    const encounter = content.bossEncounter('boss.nyxara', 'normal');
    const tier = content.bossTier('boss.nyxara', 'normal');
    if (!encounter || !tier) throw new Error('missing content');
    // Four champions with the gear a finished roster wears, modelled the way `tools/sim` does it
    // (GEAR.md §5 is roughly +120 % on a full set; ×8 stands in for that plus rank-up and sets).
    // At that damage the race is 40 % of her pool in one key, which is where phase III lives.
    const party: PartyMember[] = [
      'champ.aurelia_dawnwarden',
      'champ.varkos_sundered_king',
      'champ.seraphine_vale',
      'champ.anuria',
    ].map((id, index) => {
      const authored = content.championById(id as 'champ.anuria');
      if (!authored) throw new Error(id);
      const def = {
        ...authored,
        stats: {
          ...authored.stats,
          hp: authored.stats.hp * 8,
          atk: authored.stats.atk * 8,
          def: authored.stats.def * 8,
        },
      };
      const instance = createInstance(def, { instanceId: `n${index}`, now: 0, source: 'summon' });
      return { def, instance: { ...instance, stars: 6, level: levelCap(6) } };
    });

    const state = createBattle(
      { encounter, party, enemyById: (id) => content.enemyById(id), control: 'auto' },
      'nyxara-race',
    );
    const { events } = runAuto(state, 100_000);
    const casts = events
      .filter((e) => e.type === 'ability.cast' && e.unitId === 'w0e0')
      .map((e) => (e.type === 'ability.cast' ? e.abilityId : ''));

    // Both thresholds are crossed, in order, and the gated kit opens behind them.
    expect(
      events.filter((e) => e.type === 'phase.changed').map((e) => (e.type === 'phase.changed' ? e.phase : 0)),
    ).toEqual([2, 3]);
    const hymn = casts.indexOf('ab.nyxara.eclipse_hymn');
    const embrace = casts.indexOf('ab.nyxara.mothers_embrace');
    expect(hymn).toBeGreaterThanOrEqual(0);
    expect(embrace).toBeGreaterThanOrEqual(0);
    // Her chorus falls to the party and comes back to sing again.
    expect(events.some((e) => e.type === 'unit.died' && e.unitId !== 'w0e0')).toBe(true);
    expect(events.some((e) => e.type === 'unit.revived' && e.unitId.startsWith('w0e'))).toBe(true);
    // And while one of them stood, it took its half of a hit meant for her.
    expect(events.some((e) => e.type === 'hit' && e.redirectedFrom === 'w0e0')).toBe(true);
  });

  it('pays six chests a tier, from a sliver of the pool to the kill', () => {
    for (const tier of nyxara?.tiers ?? [])
      expect(tier.chests.map((chest) => chest.pct)).toEqual([2, 5, 12, 25, 50, 100]);
    expect(nyxara?.tiers[2]?.chests[5]?.gear).toEqual({ rarity: 'mythic', stars: 6 });
    expect(nyxara?.tiers.map((tier) => tier.playerXp)).toEqual([800, 1_600, 3_200]);
  });
});

describe('what the arena is handed for a phased boss', () => {
  it('names the escort on the boss view and the master on each add', () => {
    const encounter = content.bossEncounter('boss.nyxara', 'normal');
    const champ = content.championById('champ.ser_corvin');
    if (!encounter || !champ) throw new Error('missing content');
    const party: PartyMember[] = [
      { def: champ, instance: createInstance(champ, { instanceId: 'x', now: 0, source: 'starter' }) },
    ];
    const state = createBattle(
      { encounter, party, enemyById: (id) => content.enemyById(id), control: 'auto' },
      'nyxara-view',
    );
    const view = snapshot(state);
    const boss = view.units.find((u) => u.isBoss);
    const adds = view.units.filter((u) => u.guarding !== null);
    expect(boss?.boss?.adds).toEqual({ ids: ['w0e1', 'w0e2'], percent: 50 });
    expect(adds.map((u) => u.id)).toEqual(['w0e1', 'w0e2']);
    for (const add of adds) expect(add.guarding).toBe('w0e0');
    // Nothing else on the field claims to be guarding anyone.
    expect(view.units.filter((u) => u.guarding !== null)).toHaveLength(2);
  });
});
