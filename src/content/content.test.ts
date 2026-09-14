import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { BOSS_STAGE_NUMBER, SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { CHAMPION_IDS, STARTER_IDS } from '@content/champions/types';
import { FACTION_ARCHETYPES } from '@content/enemies/types';
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
    // Twelve factions, each fielding the six archetypes plus one named stage boss.
    expect(content.factions).toHaveLength(SETTLEMENT_COUNT);
    for (const faction of content.factions) {
      expect(
        faction.units.map((u) => u.archetype),
        faction.id,
      ).toEqual([...FACTION_ARCHETYPES]);
      expect(faction.boss.archetype, faction.id).toBe('boss');
    }
    expect(content.enemies).toHaveLength(SETTLEMENT_COUNT * (FACTION_ARCHETYPES.length + 1));
    // Titles are content too: every one names a condition and ships its strings.
    expect(content.titles.length).toBeGreaterThanOrEqual(10);
    expect(content.titleById('title.warden_of_veyrath')?.condition).toEqual({
      kind: 'difficulty_mastered',
      difficulty: 'hard',
    });
    // The only authored encounter left is the perf bench; campaign fights are derived from stages.
    expect(content.encounters.map((e) => [e.id, e.partySize, e.waves.length])).toEqual([
      ['encounter.bench.stress', 4, 2],
    ]);
  });

  it('ships the fourteen gear sets, every one of them reachable (GEAR.md §5)', () => {
    expect(content.gearSets).toHaveLength(14);
    const twoPiece = content.gearSets.filter((s) => s.pieces === 2);
    const fourPiece = content.gearSets.filter((s) => s.pieces === 4);
    expect(twoPiece).toHaveLength(8);
    expect(fourPiece).toHaveLength(6);
    // Every set is somebody's home drop, and every home lists it back (the validator checks both).
    for (const set of content.gearSets) {
      expect(set.homes.length).toBeGreaterThan(0);
      for (const home of set.homes) expect(content.settlementByIndex(home)?.setPool).toContain(set.id);
    }
    // The four-piece sets are the ones that carry behaviour rather than a flat stat.
    expect(content.gearSetById('gear_set.retaliation')?.passives[0]?.effects).toEqual([
      { kind: 'counterattack', chance: 30 },
    ]);
    // Lifedrinker heals per hit, so its passive hangs off `onHit` rather than sitting static.
    expect(content.gearSetById('gear_set.lifedrinker')?.passives[0]).toMatchObject({
      trigger: 'onHit',
      effects: [{ kind: 'lifesteal', percent: 30 }],
    });
    expect(content.gearSetById('gear_set.ember_guard')?.passives[0]?.effects).toEqual([
      { kind: 'stat_mod', stat: 'hp', percent: 15 },
    ]);
    // Immortal changes a stat *and* acts on a trigger, so it grants one passive of each.
    expect(content.gearSetById('gear_set.immortal')?.passives.map((p) => p.trigger)).toEqual([
      'static',
      'onTurnStart',
    ]);
  });

  it('ships twelve settlements of ten stages each (CAMPAIGN.md §1)', () => {
    expect(content.settlements.map((s) => s.index)).toEqual(
      Array.from({ length: SETTLEMENT_COUNT }, (_, i) => i + 1),
    );
    expect(content.stages).toHaveLength(SETTLEMENT_COUNT * STAGES_PER_SETTLEMENT);
    for (const settlement of content.settlements) {
      expect(settlement.stages, settlement.id).toHaveLength(STAGES_PER_SETTLEMENT);
      expect(
        settlement.stages.filter((s) => s.boss).map((s) => s.number),
        settlement.id,
      ).toEqual([BOSS_STAGE_NUMBER]);
      // Waves fill out as a settlement goes on: never fewer enemies than the stage before.
      const sizes = settlement.stages.map((s) => s.waves.flat().length);
      for (let i = 1; i < sizes.length - 1; i += 1)
        expect(sizes[i], `${settlement.id} stage ${i + 1}`).toBeGreaterThanOrEqual(sizes[i - 1] ?? 0);
      for (const stage of settlement.stages) {
        expect(content.stageById(stage.id), stage.id).toBe(stage);
        expect(content.settlementOfStage(stage.id), stage.id).toBe(settlement);
      }
    }
    // Every settlement is reachable in one straight line: index 1 first, no gaps.
    expect(content.settlementByIndex(1)?.id).toBe('settlement.01.thornwood_crossing');
    expect(content.settlementByIndex(SETTLEMENT_COUNT)?.id).toBe('settlement.12.eclipse_gate');
    expect(content.settlementByIndex(SETTLEMENT_COUNT + 1)).toBeUndefined();
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
