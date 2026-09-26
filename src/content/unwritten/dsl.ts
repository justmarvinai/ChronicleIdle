/**
 * Builders the Unwritten's content is written with (docs/tech/CONTENT_AUTHORING.md §20).
 *
 * Everything is written once, as a function of the numbers its line shows: an inscription's grant
 * is called for levels I, II and III with that level's numbers, a relic's with its own, an Omen's
 * and a Scriptorium folio's numbers are read off their rules. The grant and the line the player
 * reads are drawn from the same table and can never disagree. Ids and i18n keys follow from the
 * slug.
 */
import type { GlyphKey, SpellKey } from '@assets/manifest.generated';
import { PERCENT_RULES } from '@content/balance/unwritten';
import type { Condition, Effect, PassiveEffect, StatId, StatusId, Target } from '@content/champions/types';
import type {
  AffixDef,
  Bearer,
  BlotDef,
  Grant,
  IlluminationDef,
  InkId,
  InscriptionDef,
  InscriptionLevel,
  InscriptionRarity,
  MysteryChoice,
  MysteryDef,
  Outcome,
  OmenDef,
  PassiveTemplate,
  RelicDef,
  RuleEffect,
  RuleId,
  ScriptoriumDef,
  Shown,
  Volume,
} from './types';

/** Three of anything: an inscription's levels are always I–III. */
export type Three<T> = readonly [T, T, T];

/** The named numbers a line shows — `{a}` is `values.a` — and its grant is written from. */
export type Values<K extends string> = Readonly<Record<K, number>>;

// ── Passives ───────────────────────────────────────────────────────────────────────────────

/** A passive read wherever it matters (stats, damage) and never fired. */
export const statik = (...effects: PassiveEffect[]): PassiveTemplate => ({ trigger: 'static', effects });
export const onWave = (...effects: PassiveEffect[]): PassiveTemplate => ({ trigger: 'onWaveStart', effects });
export const onTurn = (...effects: PassiveEffect[]): PassiveTemplate => ({ trigger: 'onTurnStart', effects });
export const onHit = (...effects: PassiveEffect[]): PassiveTemplate => ({ trigger: 'onHit', effects });
export const onHitTaken = (...effects: PassiveEffect[]): PassiveTemplate => ({
  trigger: 'onHitTaken',
  effects,
});
export const onAllyHit = (...effects: PassiveEffect[]): PassiveTemplate => ({
  trigger: 'onAllyHit',
  effects,
});
export const onKill = (...effects: PassiveEffect[]): PassiveTemplate => ({ trigger: 'onKill', effects });
export const onDeath = (...effects: PassiveEffect[]): PassiveTemplate => ({ trigger: 'onDeath', effects });
export const onHeal = (...effects: PassiveEffect[]): PassiveTemplate => ({ trigger: 'onHeal', effects });
/** The same passive, fired once a fight. */
export const once = (template: PassiveTemplate): PassiveTemplate => ({ ...template, oncePerBattle: true });

/** `percent` % more of a stat (HP, ATK, DEF, SPD); negative is less. */
export const pct = (stat: StatId, percent: number, condition?: Condition): PassiveEffect => ({
  kind: 'stat_mod',
  stat,
  percent,
  ...(condition ? { if: condition } : {}),
});
/** Flat points of a stat (C.RATE, C.DMG, RES, ACC, SPD). */
export const flat = (stat: StatId, value: number): PassiveEffect => ({ kind: 'stat_mod', stat, flat: value });
/** `percent` % more damage dealt; `scope` narrows it to criticals. */
export const damage = (percent: number, condition?: Condition, scope?: 'crit'): PassiveEffect => ({
  kind: 'damage_bonus',
  value: percent / 100,
  ...(scope ? { scope } : {}),
  ...(condition ? { if: condition } : {}),
});
/** `percent` % less damage taken. */
export const guard = (percent: number, condition?: Condition): PassiveEffect => ({
  kind: 'damage_reduction',
  value: percent / 100,
  ...(condition ? { if: condition } : {}),
});
/** Apply a status: `chance` %, for `turns`, at `value` if the status takes one. */
export const inflict = (
  status: StatusId,
  turns: number,
  target: Target,
  chance = 100,
  value?: number,
): Effect => ({
  kind: 'apply_status',
  target,
  status,
  turns,
  chance,
  ...(value === undefined ? {} : { value }),
});
/** Heal `percent` % of the target's own max HP. */
export const mend = (percent: number, target: Target): Effect => ({
  kind: 'heal',
  target,
  mult: percent / 100,
  stat: 'TARGET_MAX_HP',
});
/** Turn meter by `percent` % (negative drains), at `chance` %. */
export const meter = (percent: number, target: Target, chance?: number): Effect => ({
  kind: 'tm',
  target,
  delta: percent / 100,
  ...(chance === undefined ? {} : { chance }),
});

/** A rule's value bent by `value`. */
export const rule = (id: RuleId, value: number): RuleEffect => ({ rule: id, value });

// ── Inscriptions ───────────────────────────────────────────────────────────────────────────

export interface InscriptionInput<K extends string, F extends string> {
  slug: string;
  ink: InkId | readonly [InkId, InkId];
  rarity: InscriptionRarity;
  volume?: Volume;
  icon: SpellKey;
  bearer?: Bearer;
  /** Each named number at levels I, II and III — `{a}` in the line is `values.a[level]`. */
  values: Readonly<Record<K, Three<number>>>;
  /** Numbers the line shows that stay the same at every level: a duration, a threshold. */
  fixed?: Values<F>;
  /** What the inscription grants at a level, given that level's numbers. */
  grant: (at: Values<K | F>, level: 1 | 2 | 3) => Grant;
  version?: number;
}

function levelsOf<K extends string, F extends string>(
  values: Readonly<Record<K, Three<number>>>,
  fixed: Values<F> | undefined,
  grant: (at: Values<K | F>, level: 1 | 2 | 3) => Grant,
): Three<InscriptionLevel> {
  const at = (index: 0 | 1 | 2): InscriptionLevel => {
    const show: Record<string, number> = { ...fixed };
    for (const [key, row] of Object.entries<Three<number>>(values)) show[key] = row[index];
    return { grant: grant(show as Values<K | F>, (index + 1) as 1 | 2 | 3), show };
  };
  return [at(0), at(1), at(2)];
}

export function inscription<K extends string, F extends string = never>(
  input: InscriptionInput<K, F>,
): InscriptionDef {
  const id = `inscription.${input.slug}`;
  const inks = typeof input.ink === 'string' ? ([input.ink] as const) : input.ink;
  return {
    id,
    name: `unwritten.${id}.name`,
    text: `unwritten.${id}.text`,
    inks,
    rarity: input.rarity,
    volume: input.volume ?? 1,
    icon: input.icon,
    bearer: input.bearer ?? 'each',
    levels: levelsOf(input.values, input.fixed, input.grant),
    version: input.version ?? 1,
  };
}

/** An ink's illumination: its two tiers' numbers, and what each tier grants with them. */
export function illumination<K extends string, F extends string = never>(input: {
  ink: InkId;
  icon: SpellKey;
  glyph: GlyphKey;
  colour: string;
  /** Each named number at the first and the full illumination. */
  values: Readonly<Record<K, readonly [number, number]>>;
  fixed?: Values<F>;
  grant: (at: Values<K | F>, tier: 1 | 2) => Grant;
}): IlluminationDef {
  const tier = (index: 0 | 1): InscriptionLevel => {
    const show: Record<string, number> = { ...input.fixed };
    for (const [key, row] of Object.entries<readonly [number, number]>(input.values)) show[key] = row[index];
    return { grant: input.grant(show as Values<K | F>, (index + 1) as 1 | 2), show };
  };
  return {
    ink: input.ink,
    text: [`unwritten.ink.${input.ink}.illumination.1`, `unwritten.ink.${input.ink}.illumination.2`],
    tiers: [tier(0), tier(1)],
    glyph: input.glyph,
    colour: input.colour,
    icon: input.icon,
  };
}

// ── Relics, blots, affixes ─────────────────────────────────────────────────────────────────

export interface RelicInput<K extends string> {
  slug: string;
  icon: SpellKey;
  volume?: Volume;
  price: number;
  values: Values<K>;
  grant: (at: Values<K>) => Grant;
  version?: number;
}

export function relic<K extends string>(input: RelicInput<K>): RelicDef {
  const id = `relic.${input.slug}`;
  return {
    id,
    name: `unwritten.${id}.name`,
    text: `unwritten.${id}.text`,
    icon: input.icon,
    volume: input.volume ?? 1,
    price: input.price,
    grant: input.grant(input.values),
    show: input.values,
    version: input.version ?? 1,
  };
}

export function blot<K extends string>(input: {
  slug: string;
  icon: SpellKey;
  values: Values<K>;
  grant: (at: Values<K>) => Grant;
  version?: number;
}): BlotDef {
  const id = `blot.${input.slug}`;
  return {
    id,
    name: `unwritten.${id}.name`,
    text: `unwritten.${id}.text`,
    icon: input.icon,
    grant: input.grant(input.values),
    show: input.values,
    version: input.version ?? 1,
  };
}

export function affix<K extends string>(input: {
  slug: string;
  icon: SpellKey;
  values: Values<K>;
  passives: (at: Values<K>) => readonly PassiveTemplate[];
  version?: number;
}): AffixDef {
  const id = `affix.${input.slug}`;
  return {
    id,
    name: `unwritten.${id}.name`,
    text: `unwritten.${id}.text`,
    icon: input.icon,
    passives: input.passives(input.values),
    show: input.values,
    version: input.version ?? 1,
  };
}

// ── Omens and the Scriptorium ──────────────────────────────────────────────────────────────

/**
 * The numbers a line about rules shows, lettered in the order the rules are written: a share as a
 * percentage (`price_mult −0.25` shows 25), a count as itself. The line says which way it bends.
 */
export function ruleShow(rules: readonly RuleEffect[]): Shown {
  return Object.fromEntries(
    rules.map(({ rule: id, value }, index) => [
      String.fromCharCode(97 + index),
      PERCENT_RULES.has(id) ? Math.round(Math.abs(value) * 100) : Math.abs(value),
    ]),
  );
}

export function omen(input: {
  omen: number;
  slug: string;
  scale: number;
  rules: readonly RuleEffect[];
}): OmenDef {
  const id = `omen.${String(input.omen).padStart(2, '0')}`;
  return {
    omen: input.omen,
    id,
    name: `unwritten.${id}.name`,
    text: input.rules.length ? `unwritten.${id}.text` : null,
    scale: input.scale,
    rules: input.rules,
    show: ruleShow(input.rules),
    version: 1,
  };
}

export function folio(input: {
  slug: string;
  shelf: number;
  cost: number;
  icon: GlyphKey;
  rules: readonly RuleEffect[];
}): ScriptoriumDef {
  const id = `scriptorium.${input.slug}`;
  return {
    id,
    name: `unwritten.${id}.name`,
    text: `unwritten.${id}.text`,
    shelf: input.shelf,
    cost: input.cost,
    icon: input.icon,
    rules: input.rules,
    show: ruleShow(input.rules),
    version: 1,
  };
}

// ── Mysteries ──────────────────────────────────────────────────────────────────────────────

export interface ChoiceInput extends Omit<MysteryChoice, 'label' | 'hint' | 'show'> {
  /** Keys the choice's label and hint: `unwritten.mystery.<slug>.<key>` and `…<key>.hint`. */
  key: string;
}

/** The numbers one list of outcomes shows, by name: `{cost}`, `{gilt}`, `{heal}`, `{wound}`… */
function outcomeShow(outcomes: readonly Outcome[]): Record<string, number> {
  const show: Record<string, number> = {};
  const percent = (share: number) => Math.round(Math.abs(share) * 100);
  for (const outcome of outcomes) {
    switch (outcome.kind) {
      case 'gilt':
        show[outcome.amount < 0 ? 'cost' : 'gilt'] = Math.abs(outcome.amount);
        break;
      case 'gilt_double':
        show['cap'] = outcome.cap;
        break;
      case 'heal':
        show['heal'] = percent(outcome.share);
        break;
      case 'wound':
        show['wound'] = percent(outcome.share);
        break;
      case 'rekindle':
        show['rekindle'] = percent(outcome.share);
        break;
      case 'pages':
        show['pages'] = outcome.amount;
        break;
      case 'warden_hp':
        show['warden'] = percent(outcome.delta);
        break;
      default:
        break;
    }
  }
  return show;
}

/**
 * The numbers a choice's hint shows: its outcomes' (`{cost}`, `{gilt}`, `{wound}`…), what it
 * requires (`{need}`), its gamble's odds (`{chance}`), and what the gamble brings when it fails
 * (`{elseCost}`, `{elseWound}`…).
 */
export function choiceShow(choice: Omit<MysteryChoice, 'label' | 'hint' | 'show'>): Shown {
  const show: Record<string, number> = outcomeShow(choice.outcomes);
  if (choice.requires?.gilt !== undefined) show['need'] = choice.requires.gilt;
  if (choice.gamble) {
    show['chance'] = Math.round(choice.gamble.chance * 100);
    for (const [key, value] of Object.entries(outcomeShow(choice.gamble.otherwise)))
      show[`else${key.charAt(0).toUpperCase()}${key.slice(1)}`] = value;
  }
  return show;
}

export function mystery(input: {
  slug: string;
  art: SpellKey;
  choices: readonly ChoiceInput[];
  version?: number;
}): MysteryDef {
  const id = `mystery.${input.slug}`;
  return {
    id,
    name: `unwritten.${id}.name`,
    scene: `unwritten.${id}.scene`,
    art: input.art,
    choices: input.choices.map(({ key, ...choice }) => ({
      ...choice,
      label: `unwritten.${id}.${key}`,
      hint: `unwritten.${id}.${key}.hint`,
      show: choiceShow(choice),
    })),
    version: input.version ?? 1,
  };
}
