import { z } from 'zod';
import { RARITY_KIT, STAT_DEVIATION_TOLERANCE } from '@content/balance/stats';
import { CHAMPION_IDS, STARTER_IDS, type ChampionDef } from '@content/champions/types';
import { CURRENCY_IDS } from '@content/currencies/types';
import { PARTY_SIZE_BOSS, PARTY_SIZE_CAMPAIGN } from '@content/balance/battle';
import type { EncounterDef } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import { statDeviation } from '@engine/champions/stats';
import { championSchema } from './champion';
import { encounterSchema } from './encounter';
import { enemySchema } from './enemy';

export const currencySchema = z.object({
  id: z.enum(CURRENCY_IDS),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  tint: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  category: z.enum(['core', 'keys', 'shards', 'brews', 'tomes', 'materials']),
  topBar: z.boolean(),
  version: z.number().int().positive(),
});

export type ValidationIssue = { path: string; message: string; severity: 'error' | 'warning' };

export interface ContentRefs {
  assetKeys: ReadonlySet<string>;
  i18nKeys: ReadonlySet<string>;
  /** English text per key, used to check description placeholders; optional. */
  i18nText?: (key: string) => string | undefined;
}

/** Placeholders an ability description may use (engine/champions/describe.ts `AbilityNumbers`). */
export const DESCRIPTION_TOKENS: ReadonlySet<string> = new Set([
  'dmg',
  'dmg2',
  'hits',
  'chance',
  'turns',
  'value',
  'heal',
  'shield',
  'tm',
  'cooldown',
  'defIgnore',
]);

const PLACEHOLDER_MODEL = 'model.teritorial_lizard';

/**
 * Validates every content object and its cross-references. `assetKeys` and `i18nKeys` are
 * injected so the engine stays free of asset/i18n imports. Warnings never fail the build.
 */
export function validateContentRegistry(
  registry: {
    currencies: readonly unknown[];
    champions: readonly unknown[];
    enemies: readonly unknown[];
    encounters: readonly unknown[];
  },
  refs: ContentRefs,
): ValidationIssue[] {
  const enemies = validateEnemies(registry.enemies, refs);
  return [
    ...validateCurrencies(registry.currencies, refs),
    ...validateChampions(registry.champions, refs),
    ...enemies.issues,
    ...validateEncounters(registry.encounters, enemies.ids, refs),
  ];
}

function validateEnemies(
  enemies: readonly unknown[],
  refs: ContentRefs,
): { issues: ValidationIssue[]; ids: Set<string> } {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const text = (key: string, path: string): void => {
    if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
  };
  enemies.forEach((raw, index) => {
    const parsed = enemySchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`enemies[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as EnemyDef;
    const path = `enemies.${def.id}`;
    if (ids.has(def.id)) error(path, 'duplicate id');
    ids.add(def.id);
    text(def.name, `${path}.name`);
    if (!refs.assetKeys.has(def.art.model)) error(`${path}.art`, `unknown asset key ${def.art.model}`);
    if (def.art.model === PLACEHOLDER_MODEL && !def.art.tint)
      error(`${path}.art`, 'placeholder art needs a tint');
    if ((def.archetype === 'boss') !== !!def.boss)
      error(`${path}.boss`, 'boss archetypes carry a boss block, others do not');
    def.abilities.forEach((ability, i) => {
      if (ability.slot !== `a${i + 1}`)
        error(`${path}.abilities[${i}]`, `expected slot a${i + 1}, found ${ability.slot}`);
      if (ability.slot === 'a1' && ability.cooldown !== 0)
        error(`${path}.${ability.id}`, 'A1 must have no cooldown');
      if (ability.slot !== 'a1' && ability.cooldown < 1)
        error(`${path}.${ability.id}`, 'A2–A4 need a cooldown');
      if (!refs.assetKeys.has(ability.icon))
        error(`${path}.${ability.id}.icon`, `unknown asset key ${ability.icon}`);
      text(ability.name, `${path}.${ability.id}.name`);
      text(ability.description, `${path}.${ability.id}.description`);
    });
    for (const passive of def.passives) {
      if (!refs.assetKeys.has(passive.icon))
        error(`${path}.${passive.id}.icon`, `unknown asset key ${passive.icon}`);
      text(passive.name, `${path}.${passive.id}.name`);
      text(passive.description, `${path}.${passive.id}.description`);
    }
    if (def.boss) {
      const slots = new Set(def.abilities.map((a) => a.slot));
      for (const slot of def.boss.rotation)
        if (!slots.has(slot)) error(`${path}.boss.rotation`, `rotation names ${slot} which the kit lacks`);
    }
  });
  return { issues, ids };
}

function validateEncounters(
  encounters: readonly unknown[],
  enemyIds: ReadonlySet<string>,
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  encounters.forEach((raw, index) => {
    const parsed = encounterSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`encounters[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as EncounterDef;
    const path = `encounters.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
    if (!refs.assetKeys.has(def.backdrop)) error(`${path}.backdrop`, `unknown asset key ${def.backdrop}`);
    const expected = def.kind === 'boss' ? PARTY_SIZE_BOSS : PARTY_SIZE_CAMPAIGN;
    if (def.partySize !== expected)
      error(`${path}.partySize`, `${def.kind} encounters field ${expected} champions`);
    def.waves.forEach((wave, w) => {
      for (const spawn of wave.enemies)
        if (!enemyIds.has(spawn.enemyId)) error(`${path}.waves[${w}]`, `unknown enemy ${spawn.enemyId}`);
    });
  });
  return issues;
}

function validateCurrencies(currencies: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  currencies.forEach((raw, index) => {
    const parsed = currencySchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`currencies[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data;
    if (seen.has(def.id)) error(`currencies.${def.id}`, 'duplicate id');
    seen.add(def.id);
    if (!refs.assetKeys.has(def.icon)) error(`currencies.${def.id}.icon`, `unknown asset key ${def.icon}`);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(`currencies.${def.id}`, `missing i18n key ${key}`);
  });
  for (const id of CURRENCY_IDS)
    if (!seen.has(id)) error(`currencies.${id}`, 'currency id declared but not defined');
  return issues;
}

function validateChampions(champions: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const warn = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'warning' });
  const seen = new Set<string>();
  const abilityIds = new Set<string>();
  const text = (key: string, path: string): void => {
    if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
  };
  const placeholders = (key: string, path: string): void => {
    const body = refs.i18nText?.(key);
    if (!body) return;
    for (const match of body.matchAll(/\{(\w+)\}/g)) {
      const token = match[1] ?? '';
      if (!DESCRIPTION_TOKENS.has(token)) error(path, `unknown description placeholder {${token}} in ${key}`);
    }
  };

  champions.forEach((raw, index) => {
    const parsed = championSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`champions[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as ChampionDef;
    const path = `champions.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);

    text(def.name, `${path}.name`);
    text(def.lore, `${path}.lore`);
    for (const key of [def.art.model, def.art.avatar])
      if (!refs.assetKeys.has(key)) error(`${path}.art`, `unknown asset key ${key}`);
    if (def.art.model === PLACEHOLDER_MODEL) {
      if (!def.art.placeholder) error(`${path}.art`, 'lizard model must be flagged as placeholder');
      if (!def.art.tint) error(`${path}.art`, 'placeholder art needs a tint');
    } else if (def.art.placeholder) error(`${path}.art`, 'finished model flagged as placeholder');

    const kit = RARITY_KIT[def.rarity];
    if (def.abilities.length !== kit.abilities)
      error(
        `${path}.abilities`,
        `${def.rarity} champions have ${kit.abilities} active abilities, found ${def.abilities.length}`,
      );
    def.abilities.forEach((ability, i) => {
      const expectedSlot = `a${i + 1}`;
      if (ability.slot !== expectedSlot)
        error(`${path}.abilities[${i}]`, `expected slot ${expectedSlot}, found ${ability.slot}`);
      if (ability.slot === 'a1' && ability.cooldown !== 0)
        error(`${path}.${ability.id}`, 'A1 must have no cooldown');
      if (ability.slot !== 'a1' && ability.cooldown < 1)
        error(`${path}.${ability.id}`, 'A2–A4 need a cooldown');
      if (abilityIds.has(ability.id)) error(`${path}.${ability.id}`, 'duplicate ability id');
      abilityIds.add(ability.id);
      if (!refs.assetKeys.has(ability.icon))
        error(`${path}.${ability.id}.icon`, `unknown asset key ${ability.icon}`);
      text(ability.name, `${path}.${ability.id}.name`);
      text(ability.description, `${path}.${ability.id}.description`);
      placeholders(ability.description, `${path}.${ability.id}.description`);
      const maxUpgrades = ability.slot === 'a1' ? 2 : 4;
      if (ability.upgrades.length > maxUpgrades)
        error(`${path}.${ability.id}.upgrades`, `at most ${maxUpgrades} upgrade steps`);
      if (
        def.rarity !== 'common' &&
        def.rarity !== 'uncommon' &&
        ability.slot !== 'a1' &&
        ability.upgrades.length < 3
      )
        warn(`${path}.${ability.id}.upgrades`, 'non-A1 abilities usually have 3–4 upgrade steps');
      if (
        (def.rarity === 'common' || def.rarity === 'uncommon') &&
        ability.slot !== 'a1' &&
        ability.upgrades.length === 0
      )
        warn(`${path}.${ability.id}.upgrades`, 'uncommon A2 usually lists its upgrade steps');
    });

    if (kit.passive && !def.passive) error(`${path}.passive`, `${def.rarity} champions have a passive`);
    if (!kit.passive && def.passive) error(`${path}.passive`, `${def.rarity} champions have no passive`);
    if (kit.aura && !def.aura) error(`${path}.aura`, `${def.rarity} champions have an aura`);
    if (!kit.aura && def.aura) error(`${path}.aura`, `${def.rarity} champions have no aura`);
    for (const extra of [def.passive, def.aura]) {
      if (!extra) continue;
      if (!refs.assetKeys.has(extra.icon))
        error(`${path}.${extra.id}.icon`, `unknown asset key ${extra.icon}`);
      text(extra.name, `${path}.${extra.id}.name`);
      text(extra.description, `${path}.${extra.id}.description`);
      placeholders(extra.description, `${path}.${extra.id}.description`);
      if (abilityIds.has(extra.id)) error(`${path}.${extra.id}`, 'duplicate ability id');
      abilityIds.add(extra.id);
    }

    if ((STARTER_IDS as readonly string[]).includes(def.id) && !def.obtain.includes('starter'))
      error(`${path}.obtain`, 'starters must list the starter source');

    const deviation = statDeviation(def.stats, def.role, def.rarity);
    for (const stat of ['hp', 'atk', 'def'] as const)
      if (deviation[stat] > STAT_DEVIATION_TOLERANCE)
        warn(
          `${path}.stats.${stat}`,
          `${Math.round(deviation[stat] * 100)} % off the ${def.role}/${def.rarity} template`,
        );
  });

  for (const id of CHAMPION_IDS)
    if (!seen.has(id)) error(`champions.${id}`, 'champion id declared but not defined');
  return issues;
}
