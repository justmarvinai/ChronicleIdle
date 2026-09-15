import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nextStage } from '@engine/campaign/progress';
import { createNewGame } from '@engine/save/new-game';
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
    expect(result.save.provisionsClaimed).toEqual(['tutorial.awakening']);
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
