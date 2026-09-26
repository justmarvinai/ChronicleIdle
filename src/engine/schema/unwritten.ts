/**
 * The Unwritten's content, validated (docs/design/UNWRITTEN.md, CONTENT_AUTHORING.md §20).
 *
 * The mode ships in its own chunk, outside the registry, so it is checked on its own — by
 * `pnpm content:validate` and the content suite, like everything else. What a content edit could
 * break without a type error:
 *
 * - **Every line tells the truth.** Each `{slot}` a line prints has a number in its `show` table,
 *   and every passive a grant carries parses as the battle engine's own.
 * - **An offer never runs dry.** Every ink has every rarity in Volume I, blends are Epic and of two
 *   inks, and each level of an inscription improves on the last.
 * - **The ladder climbs.** Sixteen Omens, in order, each on the curve `OMEN_SCALE` draws; a twist
 *   has a line exactly when it has rules.
 * - **Every door opens.** Each Scriptorium shelf holds enough folios to open the next; each
 *   Mystery can always be left by its last choice; each blot, ink and faction a piece of content
 *   names exists.
 * - **The Wardens are real foes**, held to the same checks as the campaign's.
 */
import { z } from 'zod';
import { OMEN_SCALE, WAVE_MAX } from '@content/balance/unwritten';
import { PASSIVE_TRIGGERS } from '@content/champions/types';
import type { FactionDef } from '@content/enemies/faction';
import type { UnwrittenContent } from '@content/unwritten/index';
import {
  INKS,
  INSCRIPTION_RARITIES,
  type Grant,
  type PassiveTemplate,
  type Shown,
} from '@content/unwritten/types';
import { passiveEffectSchema } from './champion';
import { validateEnemies, type ContentRefs, type ValidationIssue } from './content';

const templateSchema = z.object({
  trigger: z.enum(PASSIVE_TRIGGERS),
  effects: z.array(passiveEffectSchema).min(1),
  oncePerBattle: z.boolean().optional(),
});

/** Shelves of the Scriptorium; a shelf opens once this many folios of the one below are written. */
const SHELVES = 4;
const TO_OPEN_NEXT_SHELF = 2;

export interface UnwrittenRefs extends ContentRefs {
  /** The campaign's factions, whose foes a folio remembers. */
  factions: readonly FactionDef[];
}

export function validateUnwritten(content: UnwrittenContent, refs: UnwrittenRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const ids = new Set<string>();
  const unique = (path: string, id: string): void => {
    if (ids.has(id)) error(path, 'duplicate id');
    ids.add(id);
  };
  const strings = (path: string, keys: readonly (string | null)[]): void => {
    for (const key of keys)
      if (key !== null && !refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
  };
  const asset = (path: string, key: string): void => {
    if (!refs.assetKeys.has(key)) error(path, `unknown asset key ${key}`);
  };
  /** Every `{slot}` the line prints has a number in `show`. */
  const slots = (path: string, key: string, show: Shown): void => {
    const text = refs.i18nText?.(key);
    if (!text) return;
    for (const match of text.matchAll(/\{(\w+)\}/g))
      if (match[1] && show[match[1]] === undefined)
        error(path, `${key} prints {${match[1]}}, which it has no number for`);
  };
  const templates = (path: string, list: readonly PassiveTemplate[] | undefined): void => {
    (list ?? []).forEach((template, index) => {
      const parsed = templateSchema.safeParse(template);
      if (!parsed.success)
        for (const issue of parsed.error.issues)
          error(`${path}.passives[${index}].${issue.path.join('.')}`, issue.message);
    });
  };
  const grant = (path: string, value: Grant): void => {
    templates(path, value.passives);
    templates(`${path}.foes`, value.foes);
    if (value.only && !value.passives?.length) error(path, 'names fights for passives it does not carry');
  };

  // ── Inscriptions ──
  const inscriptionIds = new Set(content.inscriptions.map((def) => def.id));
  for (const def of content.inscriptions) {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name, def.text]);
    asset(path, def.icon);
    if (def.inks.length === 2) {
      if (def.inks[0] === def.inks[1]) error(path, 'a blend is of two different inks');
      if (def.rarity !== 'epic') error(path, 'a blend is Epic');
      if (def.volume !== 1) error(path, 'a blend is in Volume I');
    }
    def.levels.forEach((level, index) => {
      grant(`${path}.level${index + 1}`, level.grant);
      slots(`${path}.level${index + 1}`, def.text, level.show);
      const before = def.levels[index - 1];
      if (!before) return;
      const keys = Object.keys(level.show);
      if (keys.some((key) => (level.show[key] ?? 0) < (before.show[key] ?? 0)))
        error(`${path}.level${index + 1}`, 'a number falls from the level before');
      if (!keys.some((key) => (level.show[key] ?? 0) > (before.show[key] ?? 0)))
        error(`${path}.level${index + 1}`, 'improves nothing on the level before');
    });
  }
  for (const ink of INKS)
    for (const rarity of INSCRIPTION_RARITIES)
      if (
        !content.inscriptions.some(
          (d) => d.volume === 1 && d.inks.length === 1 && d.inks[0] === ink && d.rarity === rarity,
        )
      )
        error(`unwritten.inks.${ink}`, `Volume I has no ${rarity} inscription of this ink`);

  // ── Illuminations ──
  for (const ink of INKS) {
    const def = content.illuminations[ink];
    const path = `unwritten.illumination.${ink}`;
    if (def.ink !== ink) error(path, `is filed under ${ink} but lights ${def.ink}`);
    strings(path, [...def.text, `unwritten.ink.${ink}.name`, `unwritten.ink.${ink}.virtue`]);
    asset(path, def.icon);
    asset(path, def.glyph);
    def.tiers.forEach((tier, index) => {
      grant(`${path}.tier${index + 1}`, tier.grant);
      const text = def.text[index];
      if (text) slots(`${path}.tier${index + 1}`, text, tier.show);
    });
  }

  // ── Relics, blots, affixes ──
  for (const def of content.relics) {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name, def.text]);
    asset(path, def.icon);
    grant(path, def.grant);
    slots(path, def.text, def.show);
    if (def.price <= 0) error(path, 'the Peddler cannot give it away');
    if (def.volume === 2) error(path, 'relics come in Volumes I and III');
  }
  const blotIds = new Set(content.blots.map((def) => def.id));
  for (const def of content.blots) {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name, def.text]);
    asset(path, def.icon);
    grant(path, def.grant);
    slots(path, def.text, def.show);
  }
  for (const def of content.affixes) {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name, def.text]);
    asset(path, def.icon);
    templates(path, def.passives);
    slots(path, def.text, def.show);
  }

  // ── Omens ──
  if (content.omens.length !== OMEN_SCALE.length)
    error('unwritten.omens', `${content.omens.length} Omens; the curve has ${OMEN_SCALE.length}`);
  content.omens.forEach((def, index) => {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    if (def.omen !== index) error(path, `is Omen ${def.omen} but sits at ${index}`);
    if (def.scale !== OMEN_SCALE[index]) error(path, `scales foes by ${def.scale}, off the curve`);
    const before = content.omens[index - 1];
    if (before && def.scale <= before.scale) error(path, 'is no harder than the Omen below it');
    strings(path, [def.name, def.text]);
    if ((def.text === null) !== (def.rules.length === 0))
      error(path, 'has a line exactly when it has a twist');
    if (def.text) slots(path, def.text, def.show);
  });

  // ── The Scriptorium ──
  for (let shelf = 1; shelf <= SHELVES; shelf += 1) {
    const count = content.scriptorium.filter((def) => def.shelf === shelf).length;
    if (count < TO_OPEN_NEXT_SHELF) error(`unwritten.scriptorium.shelf${shelf}`, `holds ${count} folios`);
  }
  // A higher shelf is the deeper investment: nothing on a shelf costs more than the cheapest above.
  const cheapestAbove = (shelf: number): number =>
    Math.min(Infinity, ...content.scriptorium.filter((def) => def.shelf > shelf).map((def) => def.cost));
  for (const def of content.scriptorium) {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name, def.text]);
    asset(path, def.icon);
    slots(path, def.text, def.show);
    if (def.shelf < 1 || def.shelf > SHELVES) error(path, `stands on shelf ${def.shelf}`);
    if (def.cost <= 0) error(path, 'costs nothing');
    if (def.cost > cheapestAbove(def.shelf)) error(path, 'costs more than a folio of a higher shelf');
  }

  // ── Mysteries ──
  for (const def of content.mysteries) {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    strings(path, [def.name, def.scene]);
    asset(path, def.art);
    const last = def.choices[def.choices.length - 1];
    if (def.choices.length < 2) error(path, 'offers no real choice');
    if (!last || last.requires) error(path, 'its last choice must always be open');
    def.choices.forEach((choice, index) => {
      const choicePath = `${path}.choices[${index}]`;
      strings(choicePath, [choice.label, choice.hint]);
      slots(choicePath, choice.hint, choice.show);
      if (choice.gamble && (choice.gamble.chance <= 0 || choice.gamble.chance >= 1))
        error(choicePath, 'a gamble is neither certain nor impossible');
      // A closed choice tells what it still needs in the singular ("Needs a relic"): it may ask
      // for gilt by the amount, and for anything else only one.
      const { gilt, ...counted } = choice.requires ?? {};
      if (gilt !== undefined && gilt <= 0) error(choicePath, 'requires no gilt');
      for (const [what, count] of Object.entries(counted))
        if (count !== 1) error(choicePath, `requires ${count} ${what}; the panel only names one`);
      for (const outcome of [...choice.outcomes, ...(choice.gamble?.otherwise ?? [])]) {
        if (outcome.kind === 'blot' && outcome.id !== undefined && !blotIds.has(outcome.id))
          error(choicePath, `names an unknown blot ${outcome.id}`);
        if (outcome.kind === 'inscribe') {
          const { ink, rarity } = outcome;
          const any = content.inscriptions.some(
            (d) => d.volume === 1 && (!ink || d.inks.includes(ink)) && (!rarity || d.rarity === rarity),
          );
          if (!any) error(choicePath, 'writes an inscription Volume I does not hold');
        }
      }
    });
  }
  if (!inscriptionIds.size) error('unwritten.inscriptions', 'there are none');

  // ── Folios and their foes ──
  const enemies = validateEnemies(content.enemies, refs);
  issues.push(...enemies.issues.map((issue) => ({ ...issue, path: `unwritten.${issue.path}` })));
  const factionIds = new Set(refs.factions.map((faction) => faction.id));
  content.folios.forEach((def, index) => {
    const path = `unwritten.${def.id}`;
    unique(path, def.id);
    if (def.index !== index + 1) error(path, `is folio ${def.index} but sits at ${index + 1}`);
    strings(path, [def.name]);
    asset(path, def.backdrop);
    for (const faction of def.factions)
      if (!factionIds.has(faction)) error(path, `names an unknown faction ${faction}`);
    if (def.waves.some((size) => size < 1 || size > WAVE_MAX)) error(path, `a wave outside 1–${WAVE_MAX}`);
    const warden = content.enemies.find((enemy) => enemy.id === def.warden);
    if (!warden?.boss) error(path, `its Warden ${def.warden} is not one of the Unwritten's bosses`);
    const adds = warden?.boss?.adds;
    if (adds && !enemies.ids.has(adds.enemyId))
      error(path, `its Warden's choir ${adds.enemyId} does not exist`);
  });
  return issues;
}
