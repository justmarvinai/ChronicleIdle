import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { nextStage } from '@engine/campaign/progress';
import { createNewGame } from '@engine/save/new-game';
import { SAVE_VERSION } from '@engine/schema/save';
import { migrateSave } from './migrations';

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
      titles: [],
    });
    expect(result.save.wallet.gems).toBe(150);
    expect(result.save.wallet.gold).toBe(3_275);
    expect(result.save.energy).toEqual({ value: 42, lastTickAt: 1_757_603_540_000 });
    expect(result.save.provisionsClaimed).toEqual(['tutorial.awakening']);
    expect(result.save.settings.reducedMotion).toBe(true);
    expect(result.save.settings.launchFullscreen).toBe(false);
    expect(result.save.stats).toEqual({ playtime_ms: 3_600_000, hub_visits: 4 });
    expect(result.save.roster).toEqual({});
    expect(result.save.counters).toEqual({ instances: 0 });
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
