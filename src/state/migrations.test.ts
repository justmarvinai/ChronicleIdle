import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nextStage } from '@engine/campaign/progress';
import { createNewGame } from '@engine/save/new-game';
import { mineLevel, mineStore } from '@engine/mine/index';
import { SAVE_VERSION } from '@engine/schema/save';
import { migrateSave } from './migrations';
import { titlesOf } from './progression';

describe('migrateSave', () => {
  const save = createNewGame({ name: 'Test', now: 1_700_000_000_000, seedRoot: 's' });

  it('accepts a current save unchanged', () => {
    const result = migrateSave(structuredClone(save));
    expect(result.migrated).toBe(false);
    expect(result.save).toEqual(save);
  });

  it('refuses newer versions and garbage', () => {
    expect(() => migrateSave({ ...save, saveVersion: 99 })).toThrow(/newer/);
    expect(() => migrateSave('nope')).toThrow(/not an object/);
    expect(() => migrateSave({ ...save, wallet: { gold: -1 } })).toThrow(/validation/);
  });

  it('upgrades a Phase 0 (version 1) chronicle without losing anything', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v1.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(1);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    expect(result.save.profile).toEqual({
      name: 'Marvin',
      level: 1,
      xp: 0,
      avatarChampionId: null,
      title: null,
    });
    expect(result.save.wallet.gems).toBe(150);
    expect(result.save.wallet.gold).toBe(3_275);
    expect(result.save.energy).toEqual({ value: 42, lastTickAt: 1_757_603_540_000 });
    // The Path opens at level 1 now, so a chronicle older than the tutorial has waved that off too
    // and is not owed its Provision a second time.
    expect(result.save.provisionsClaimed).toEqual(['tutorial.awakening', 'tutorial.the_path']);
    expect(result.save.settings.reducedMotion).toBe(true);
    expect(result.save.settings.launchFullscreen).toBe(false);
    expect(result.save.stats).toEqual({ playtime_ms: 3_600_000, hub_visits: 4 });
    expect(result.save.roster).toEqual({});
    expect(result.save.counters).toEqual({ instances: 0, gear: 0 });
    expect(result.save.campaign.stars).toEqual({});
    expect('avatarKey' in result.save.profile).toBe(false);
  });

  it('upgrades a Phase 1 (version 2) chronicle keeping the roster intact', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v2.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(2);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    expect(Object.keys(result.save.roster)).toEqual([
      'reva_ashblade-1',
      'bran_militia-2',
      'wenna_novice-3',
      'gil_scrapper-4',
      'anuria-5',
    ]);
    expect(result.save.roster['anuria-5']?.locked).toBe(true);
    expect(result.save.roster['reva_ashblade-1']?.favourite).toBe(true);
    expect(result.save.profile.avatarChampionId).toBe('champ.reva_ashblade');
    expect(result.save.settings.battleSpeed).toBe(2);
    expect(result.save.teams).toEqual({
      campaign: { presets: [[], [], []], lastUsed: [] },
      boss: { presets: [[], [], []], lastUsed: [] },
      dungeon: { presets: [[], [], []], lastUsed: [] },
    });
  });

  it('upgrades a Phase 2 (version 3) chronicle to a campaign at its first stage', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v3.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(3);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // Everything played in Phase 2 survives…
    expect(result.save.profile.level).toBe(3);
    expect(Object.keys(result.save.roster)).toHaveLength(5);
    expect(result.save.teams.campaign.lastUsed).toEqual([
      'reva_ashblade-1',
      'wenna_novice-3',
      'gil_scrapper-4',
    ]);
    expect(result.save.settings.battleSpeed).toBe(2);
    expect(result.save.settings.autoBattle).toBe(true);
    expect(result.save.stats['battles.victory']).toBe(9);
    // …and the campaign starts from nothing, pointed at its first stage.
    expect(result.save.campaign).toEqual({ stars: {}, bestTurns: {}, selected: null, autoRepeat: 1 });
    expect(nextStage(result.save.campaign)).toEqual({ settlement: 1, stage: 1, difficulty: 'intro' });
  });

  it('upgrades a Phase 3 (version 4) chronicle, dropping the stored titles', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v4.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(4);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // The campaign, the roster and the chronicle's standing all survive…
    expect(result.save.profile.level).toBe(7);
    expect(result.save.profile.xp).toBe(620);
    expect(result.save.campaign.autoRepeat).toBe(5);
    expect(result.save.campaign.selected).toEqual({ settlement: 2, stage: 5, difficulty: 'intro' });
    expect(result.save.campaign.stars['stage.01.01|intro']).toBe(3);
    expect(Object.keys(result.save.campaign.stars)).toHaveLength(14);
    expect(result.save.campaign.bestTurns['stage.02.04|intro']).toBe(22);
    expect(nextStage(result.save.campaign)).toEqual({ settlement: 2, stage: 5, difficulty: 'intro' });
    expect(result.save.stats['campaign.cleared']).toBe(19);
    expect(result.save.wallet.gold).toBe(18_450);
    expect(result.save.energy).toEqual({ value: 74, lastTickAt: 1_789_389_960_000 });
    // …but the titles it used to store are gone: they are derived from the play now.
    expect('titles' in result.save.profile).toBe(false);
    expect(result.save.profile.title).toBeNull();
    expect(titlesOf(result.save)).toContain('title.chronicler');
  });

  it('upgrades a Phase 5 (version 5) chronicle to an empty armoury', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v5.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(5);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // Everything Phases 4 and 5 wrote survives…
    expect(result.save.profile.title).toBe('title.wayfarer');
    expect(result.save.profile.level).toBe(9);
    expect(result.save.stats['tavern.rankUps']).toBe(1);
    const levelled = Object.values(result.save.roster).find((c) => c.stars === 4);
    expect(levelled?.level).toBe(23);
    expect(levelled?.skillUpgrades).toEqual({ 'ab.reva_ashblade.sunder': 2 });
    expect(result.save.wallet.tome_rare).toBe(3);
    // …and the armoury starts empty, with its own counter.
    expect(result.save.inventory).toEqual({});
    expect(result.save.counters).toEqual({ instances: 5, gear: 0 });
    for (const champion of Object.values(result.save.roster))
      expect(Object.values(champion.gear).every((id) => id === null)).toBe(true);
  });

  it('upgrades a Phase 6/7 (version 6) chronicle to an unused Portal', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v6.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(6);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // The armoury Phase 6 wrote survives, worn pieces included…
    expect(Object.keys(result.save.inventory)).toHaveLength(3);
    expect(result.save.counters).toEqual({ instances: 5, gear: 3 });
    const worn = result.save.inventory['gear-1'];
    expect(worn?.equippedTo).toBe('reva_ashblade-1');
    expect(result.save.roster['reva_ashblade-1']?.gear.weapon).toBe('gear-1');
    expect(result.save.wallet.shard_ancient).toBe(4);
    // …and the Portal starts clean: no mercy owed, no history, no choice taken.
    expect(result.save.summon.pity).toEqual({ faded: {}, ancient: {}, sacred: {}, primordial: {} });
    expect(result.save.summon.history).toEqual([]);
    expect(result.save.summon.unseen).toEqual([]);
    expect(result.save.summon.choices).toEqual({});
  });

  it('upgrades a Phase 8 (version 7) chronicle to a chest that starts filling', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v7.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(7);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // The Portal Phase 8 wrote survives: mercy, history, the badge and the choice taken.
    expect(result.save.summon.pity.ancient).toEqual({ epic: 7, legendary: 41 });
    expect(result.save.summon.history).toHaveLength(2);
    expect(result.save.summon.unseen).toEqual(['khazgor-6']);
    expect(result.save.summon.choices['choice.milestone.intro']?.championId).toBe('champ.khazgor');
    expect(Object.keys(result.save.inventory)).toHaveLength(3);
    // …and the chest starts filling from when the chronicle was last saved, not from zero.
    expect(result.save.idle.lastClaimAt).toBe(result.save.updatedAt);
  });

  it('upgrades a Phase 9 (version 8) chronicle to a save that knows the bosses', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v8.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(8);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // Nothing is owed on a chronicle that has never spent a key: the record is simply empty.
    expect(result.save.bosses).toEqual({});
    // And Phase 9's chest is carried forward untouched.
    expect(result.save.idle.lastClaimAt).toBe(result.save.updatedAt);
  });

  it('upgrades a Phase 10/11 (version 9) chronicle to two fresh quest boards', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v9.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(9);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // What Phases 10 and 11 wrote survives: the keys spent, the damage, the chests taken, the
    // records of both gates.
    expect(result.save.bosses['boss.gargoyle']?.keysUsed).toBe(2);
    expect(result.save.bosses['boss.gargoyle']?.claimed).toEqual([
      'tier.gargoyle.1|15',
      'tier.gargoyle.1|30',
    ]);
    expect(result.save.bosses['boss.titan']?.damage['tier.titan.1']).toBe(1_250_000);
    expect(result.save.bosses['boss.titan']?.records['tier.titan.1']?.damage).toBe(1_250_000);
    // …and both boards open on the period the save was last in, baselined against the counters it
    // has already earned — so a hundred hours of play does not hand over a finished board.
    expect(result.save.quests.daily.periodKey).toBe('2026-09-13');
    expect(result.save.quests.weekly.periodKey).toBe('2026-09-07');
    expect(result.save.quests.daily.baseline['campaign.cleared']).toBe(57);
    expect(result.save.quests.weekly.baseline['boss.fights.boss.titan']).toBe(1);
    expect(result.save.quests.daily.baseline).toEqual(result.save.stats);
    for (const period of ['daily', 'weekly'] as const) {
      expect(result.save.quests[period].claimed).toEqual([]);
      expect(result.save.quests[period].chests).toEqual([]);
    }
  });

  it('upgrades a Phase 12 (version 10) chronicle to the first page of the Path', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v10.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(10);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // What Phase 12 wrote survives: the day's claims, the chest taken, both baselines.
    expect(result.save.quests.daily.claimed).toEqual([
      'quest.daily.login',
      'quest.daily.claim_idle',
      'quest.daily.clear_stages',
    ]);
    expect(result.save.quests.daily.chests).toEqual([20]);
    expect(result.save.quests.weekly.baseline['summon.pulls']).toBe(15);
    expect(result.save.stats['quests.daily.days5']).toBe(5);
    // …and the Path starts at its first page, baselined against everything already played: the
    // counter missions ask for play from here, the state ones read as met.
    expect(result.save.missions.claimed).toEqual([]);
    expect(result.save.missions.chests).toEqual([]);
    expect(result.save.missions.gearChoice).toBeNull();
    expect(result.save.missions.baseline).toEqual(result.save.stats);
    expect(result.save.missions.baseline['campaign.cleared']).toBe(57);
  });

  it('starts a Phase 13 (version 11) chronicle past the lessons its level has opened', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v11.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const result = migrateSave(fixture);
    expect(result.migrated).toBe(true);
    expect(result.fromVersion).toBe(11);
    expect(result.save.saveVersion).toBe(SAVE_VERSION);
    // What Phase 13 wrote survives.
    expect(result.save.missions.claimed).toEqual(['mission.01.01', 'mission.01.02', 'mission.01.03']);
    // A level-16 chronicle is not sent back to school: the five taught chapters count as waved off…
    expect(result.save.tutorial.skippedChapters).toEqual([
      'tut.awakening',
      'tut.the_path',
      'tut.the_hold',
      'tut.the_binding',
      'tut.routine',
    ]);
    // …Steel and Bone's lessons up to level 16 count as read — the instant clear's (11) among
    // them, since the rule is the level, not the version a lesson arrived in…
    expect(result.save.tutorial.completedSteps).toEqual([
      'tut.6.1',
      'tut.6.2',
      'tut.6.3',
      'tut.6.4',
      'tut.6.5',
      'tut.6.6',
      'tut.6.9',
    ]);
    // …and Refine (18) and auto-repeat (20) are still ahead of it.
    expect(result.save.tutorial.completedSteps).not.toContain('tut.6.7');
    // The Provisions of the chapters it never walked are not back-paid.
    expect(result.save.provisionsClaimed).toEqual([
      'tutorial.awakening',
      'tutorial.the_path',
      'tutorial.the_hold',
      'tutorial.gift.ancient_shard',
      'tutorial.the_binding',
      'tutorial.routine',
    ]);
  });

  it('moves everything the boss rename touches, and loses none of it (16 → 17)', () => {
    // A v16 chronicle mid-period: a key spent on the daily boss, two chests taken, a personal
    // best, a skill point already paid for this period, and the counters a quest measures.
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v16.json', 'utf8')) as Record<
      string,
      unknown
    >;
    interface StoredBoss {
      keysUsed: number;
      damage: Record<string, number>;
      claimed: string[];
      records: Record<string, { damage: number }>;
    }
    const before = fixture['bosses'] as Record<string, StoredBoss>;
    const old = before['boss.gravemaw'];
    expect(old, 'the v16 fixture must still carry the old spelling').toBeDefined();

    const { save } = migrateSave(fixture);
    const moved = save.bosses['boss.gargoyle'];
    expect(save.bosses['boss.gravemaw' as 'boss.gargoyle']).toBeUndefined();
    // The period's damage, the chests taken and the record all move with the boss.
    expect(moved?.damage['boss.gargoyle.normal']).toBe(old?.damage['boss.gravemaw.normal']);
    expect(moved?.claimed).toEqual(['boss.gargoyle.normal.1', 'boss.gargoyle.normal.2']);
    expect(moved?.records['boss.gargoyle.normal']?.damage).toBe(old?.records['boss.gravemaw.normal']?.damage);
    expect(moved?.keysUsed).toBe(old?.keysUsed);
    // So do the counters, and the baselines that are snapshots of them — a board whose baseline
    // kept the old key would read a lifetime of boss fights as fought this period.
    const stats = fixture['stats'] as Record<string, number>;
    expect(save.stats['boss.fights.boss.gargoyle']).toBe(stats['boss.fights.boss.gravemaw']);
    expect(save.stats['boss.fights.boss.gravemaw']).toBeUndefined();
    for (const period of ['daily', 'weekly'] as const)
      expect(save.quests[period].baseline['boss.fights.boss.gravemaw']).toBeUndefined();
    expect(save.missions.baseline['boss.fights.boss.gravemaw']).toBeUndefined();
  });

  it('gives a v19 chronicle the Mine a new one gets: level 1, its first store full (19 → 20)', () => {
    const fixture = JSON.parse(readFileSync('tests/fixtures/saves/v19.json', 'utf8')) as Record<
      string,
      unknown
    >;
    expect(fixture['mine'], 'the v19 fixture predates the Mine').toBeUndefined();
    const { save: migrated } = migrateSave(fixture);
    expect(migrated.mine.level).toBe(1);
    expect(migrated.mine.carry).toEqual({ gems: 0, sigils: 0 });
    // Stamped from the chronicle's last save, a store's length back: full the moment it opens.
    const store = mineStore(migrated.mine, fixture['updatedAt'] as number);
    expect(store.full).toBe(true);
    expect(store.gems).toBe(mineLevel(1).storeGems);
  });

  it('runs migration steps in order', () => {
    const legacy = { ...structuredClone(save), saveVersion: 0, legacyName: 'Old' } as Record<string, unknown>;
    const result = migrateSave(legacy, [
      {
        from: 0,
        to: SAVE_VERSION,
        migrate: (raw) => ({
          ...raw,
          saveVersion: SAVE_VERSION,
          profile: { ...(raw['profile'] as object), name: raw['legacyName'] as string },
        }),
      },
    ]);
    expect(result.migrated).toBe(true);
    expect(result.save.profile.name).toBe('Old');
  });
});
