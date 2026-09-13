import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { CHAMPION_IDS, STARTER_IDS } from '@content/champions/types';
import { STATUSES } from '@content/statuses/index';
import { abilityNumbers, passiveNumbers } from '@engine/champions/describe';
import { validateContentRegistry } from '@engine/schema/content';
import { I18N_KEYS, textOf, translate } from '@i18n/index';
import { content } from './registry';

const manifest = JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest;
const refs = { assetKeys: new Set(Object.keys(manifest.entries)), i18nKeys: I18N_KEYS, i18nText: textOf };

describe('content registry', () => {
  it('validates against the generated asset manifest and the string table', () => {
    const issues = validateContentRegistry(content, refs);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    // Deliberate deviations from the role templates (CHAMPIONS.md §4): the Mythic all-rounder
    // carries defender-class HP. Any new warning must be added here on purpose.
    expect(issues.filter((i) => i.severity === 'warning').map((i) => i.path)).toEqual([
      'champions.champ.varkos_sundered_king.stats.hp',
    ]);
    expect(content.currencies).toHaveLength(24);
    expect(content.currencies.filter((c) => c.topBar).map((c) => c.id)).toEqual(['gold', 'gems', 'energy']);
    expect(content.enemies.map((e) => e.archetype)).toEqual([
      'raider',
      'marksman',
      'brute',
      'warden',
      'hexer',
      'mender',
      'boss',
    ]);
    expect(content.encounters.map((e) => [e.id, e.partySize, e.waves.length])).toEqual([
      ['encounter.training.1', 3, 2],
      ['encounter.training.2', 3, 3],
      ['encounter.training.3', 4, 2],
      ['encounter.bench.stress', 4, 2],
    ]);
    // The Training Grounds list is everything but the bench: three drills, the last a boss fight.
    const drills = content.encounters.filter((e) => e.kind !== 'bench');
    expect(drills.map((e) => e.kind)).toEqual(['training', 'training', 'boss']);
  });

  it('ships all 23 champions of CHAMPIONS.md §4 with the three Rare starters', () => {
    expect(content.champions.map((c) => c.id)).toEqual([...CHAMPION_IDS]);
    const byRarity = new Map<string, number>();
    for (const c of content.champions) byRarity.set(c.rarity, (byRarity.get(c.rarity) ?? 0) + 1);
    expect(Object.fromEntries(byRarity)).toEqual({
      common: 3,
      uncommon: 3,
      rare: 3,
      epic: 7,
      legendary: 6,
      mythic: 1,
    });
    for (const id of STARTER_IDS) expect(content.championById(id)?.rarity).toBe('rare');
    expect(content.champions.filter((c) => !c.art.placeholder)).toHaveLength(7);
  });

  it('renders every ability description with live numbers and no unresolved placeholders', () => {
    for (const champion of content.champions) {
      for (const ability of champion.abilities) {
        const text = translate(ability.description, { ...abilityNumbers(ability) });
        expect(text, ability.id).not.toMatch(/\{\w+\}/);
        expect(text, ability.id).not.toMatch(/\b0% of/);
      }
      for (const passive of [champion.passive, champion.aura]) {
        if (!passive) continue;
        const text = translate(passive.description, { ...passiveNumbers(passive.effects) });
        expect(text, passive.id).not.toMatch(/\{\w+\}/);
        expect(text, passive.id).not.toMatch(/\b0 turn/);
      }
    }
    for (const enemy of content.enemies) {
      for (const ability of enemy.abilities) {
        const text = translate(ability.description, { ...abilityNumbers(ability) });
        expect(text, ability.id).not.toMatch(/\{\w+\}/);
      }
    }
    for (const status of STATUSES) {
      expect(translate(status.name)).not.toMatch(/^status\./);
      expect(translate(status.description, { value: 1 })).not.toMatch(/\{\w+\}/);
    }
  });
});
