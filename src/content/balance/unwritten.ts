/**
 * The Unwritten (docs/design/UNWRITTEN.md).
 *
 * Every number an expedition turns on: the shape of a folio's map, how a passage kind is drawn,
 * how hard the foes are at each Omen and each step of the way, what an offer weighs, what the
 * Peddler asks, what a Rest heals, what an expedition pays. The content — inscriptions, relics,
 * mysteries — lives in `src/content/unwritten/`; this file is the arithmetic around it.
 */
import type { CurrencyAmount } from '@content/currencies/types';
import type { FightKind, InscriptionRarity, PassageKind, RuleId, RuleMode } from '@content/unwritten/types';
import { PARTY_SIZE_BOSS } from './battle';

// ---------------------------------------------------------------------------------------------
// An expedition
// ---------------------------------------------------------------------------------------------

/** Folios in an expedition; the last Warden ends it. */
export const UNWRITTEN_FOLIOS = 3;
/** Champions a fight fields — the boss party, as the tower and the dungeons field. */
export const UNWRITTEN_PARTY = PARTY_SIZE_BOSS;
/** No company grows past this, Echoes included (§4.3). */
export const COMPANY_MAX = 8;
/** Share of max HP every living champion heals between folios (§5.4). */
export const INTERLUDE_HEAL = 0.25;
/** Tales the Records keep, newest first (§16). */
export const TALES_KEPT = 8;

// ---------------------------------------------------------------------------------------------
// The map (§5)
// ---------------------------------------------------------------------------------------------

/** Rows of passages below a folio's Warden. */
export const FOLIO_ROWS = 8;
/** Lanes a folio is drawn across. */
export const FOLIO_LANES = 4;
/** Walks that climb a folio; their footprints are the passages, their steps the roads. */
export const FOLIO_WALKS = 4;
/** Rows whose passages are always one kind (row → kind). The rest are drawn. */
export const FIXED_ROWS: Readonly<Record<number, PassageKind>> = {
  1: 'skirmish',
  4: 'reliquary',
  8: 'shrine',
};
/** How a drawn passage is weighted. Echo passages only once the Scriptorium calls them. */
export const DRAWN_WEIGHTS: Readonly<Partial<Record<PassageKind, number>>> = {
  skirmish: 40,
  mystery: 24,
  elite: 14,
  peddler: 8,
  shrine: 7,
  echo: 7,
};
/** Rows a kind is never drawn on (the second row is still the first steps; the seventh sits under the shrines). */
export const BARRED_ROWS: Readonly<Partial<Record<PassageKind, readonly number[]>>> = {
  elite: [2],
  peddler: [2],
  shrine: [7],
};
/** Kinds no road may join two of. */
export const NO_TWO_IN_A_ROW: readonly PassageKind[] = ['elite', 'peddler', 'shrine'];
/** Kinds every folio holds at least one of, placed on a drawn passage if the draw left none. */
export const EVERY_FOLIO_HOLDS: readonly PassageKind[] = ['elite', 'peddler'];

// ---------------------------------------------------------------------------------------------
// Fights (§6)
// ---------------------------------------------------------------------------------------------

/**
 * The Omen curve (§6.4): the single multiplier on every foe's archetype base at each rung. Omen 0
 * sits about where the campaign's Intro settlements 5–7 stand (a level-16 chronicle's ground).
 * Steep at the bottom, where each rung is a roster's next step, and gentler above Omen 5, where the
 * twists pile up on top of it — fitted by `sim:balance --unwritten` (§20) so a mid roster reads
 * Omens 0–2, a late one the middle rungs, and a finished roster wins the Blotted Heart about one
 * expedition in eight. Raising a rung makes every expedition at it and above it harder.
 */
export const OMEN_SCALE: readonly number[] = [
  2.4, 3.1, 4.0, 5.4, 6.8, 8.4, 10.0, 11.8, 13.8, 16.4, 19.4, 22.9, 27.0, 31.8, 37.0, 42.0,
];
/** Foes grow by this much with every step deeper into an expedition. */
export const DEPTH_GROWTH = 1.025;
/** Steps of depth one folio is worth: its eight rows and its Warden. */
export const DEPTH_PER_FOLIO = FOLIO_ROWS + 1;
/** An Elite and its escort, against a Skirmish at the same depth. */
export const ELITE_SCALE = 1.3;

/**
 * `OMEN_SCALE[omen] × DEPTH_GROWTH ^ depth`: how hard a foe is at an Omen and a depth, before the
 * Elite's or the Warden's own multiplier (`depth = (folio − 1) × 9 + row`, the Warden's row 9).
 */
export function unwrittenScale(omen: number, depth: number): number {
  const base = OMEN_SCALE[Math.max(0, Math.min(OMEN_SCALE.length - 1, omen))] ?? 1;
  return base * DEPTH_GROWTH ** depth;
}

/** Plate level of the foes: display, and the mitigation constant of their own attacks. */
export function unwrittenEnemyLevel(omen: number, depth: number): number {
  return Math.round(26 + 4.5 * omen + 0.4 * depth);
}

/** Ally turns before a fight is lost, by kind. */
export const TURN_LIMIT: Readonly<Record<FightKind, number>> = {
  skirmish: 40,
  elite: 45,
  warden: 60,
};
/** No Skirmish wave fields more than this, whatever the Omen adds. */
export const WAVE_MAX = 4;
/** Affixes every Elite carries before the Omens add theirs. */
export const ELITE_AFFIXES = 1;

// ---------------------------------------------------------------------------------------------
// Rules (§7–§15): how the Unwritten's own numbers start and combine
// ---------------------------------------------------------------------------------------------

/** Where each rule stands before any source bends it. */
export const RULE_BASE: Readonly<Record<RuleId, number>> = {
  offer_size: 3,
  offer_rarity_bump: 0,
  offer_legendary_skirmish: 0,
  blends: 0,
  price_mult: 0,
  rest_heal: 0.4,
  rest_heal_mult: 0,
  rekindle_mult: 0,
  heal_after_victory: 0,
  after_fight_wound: 0,
  gilt_mult: 0,
  gilt_after_elite: 0,
  start_gilt: 0,
  start_hp: 1,
  start_blots: 0,
  start_rare_inscriptions: 0,
  echo_stars: 0,
  echo_full_hp: 0,
  echo_passages: 0,
  illumination_sooner: 0,
  pages_per_passage: 0,
  pages_mult: 0,
  last_page: 0,
  phoenix: 0,
  warden_hp: 0,
  elite_hp: 0,
  enemy_hp: 0,
  enemy_atk: 0,
  enemy_spd: 0,
  elite_affixes: 0,
  warden_affixes: 0,
  skirmish_extra_foe: 0,
  unwriter_hp: 0,
  unwriter_last_phase: 0.35,
  reliquary_choice: 1,
  rerolls_per_folio: 0,
  rekindle_tokens: 0,
  company_cap: 6,
  keen_reader: 0,
  volume_inscriptions: 1,
  volume_relics: 1,
};

/** Rules whose values are shares of something: a line shows them as percentages. */
export const PERCENT_RULES: ReadonlySet<RuleId> = new Set<RuleId>([
  'offer_rarity_bump',
  'price_mult',
  'rest_heal',
  'rest_heal_mult',
  'rekindle_mult',
  'heal_after_victory',
  'after_fight_wound',
  'gilt_mult',
  'start_hp',
  'pages_mult',
  'warden_hp',
  'elite_hp',
  'enemy_hp',
  'enemy_atk',
  'unwriter_hp',
  'unwriter_last_phase',
]);

/** How each rule's sources combine with its base. */
export const RULE_MODE: Readonly<Record<RuleId, RuleMode>> = {
  ...(Object.fromEntries(Object.keys(RULE_BASE).map((rule) => [rule, 'sum'])) as Record<RuleId, RuleMode>),
  rest_heal: 'min',
  start_hp: 'min',
  unwriter_last_phase: 'max',
  volume_inscriptions: 'max',
  volume_relics: 'max',
};

// ---------------------------------------------------------------------------------------------
// Inscriptions (§7)
// ---------------------------------------------------------------------------------------------

/** Rarity weights of an offer, by where it comes from (§7.1). */
export const OFFER_WEIGHTS: Readonly<
  Record<'skirmish' | 'elite' | 'warden', Readonly<Record<InscriptionRarity, number>>>
> = {
  skirmish: { common: 60, rare: 30, epic: 9, legendary: 1 },
  elite: { common: 30, rare: 45, epic: 20, legendary: 5 },
  warden: { common: 0, rare: 0, epic: 70, legendary: 30 },
};
/** An ink the company already writes in weighs this much more in an offer. */
export const HELD_INK_WEIGHT = 1.5;
/** Chance an offer's slot is a blend, once blends may be offered and the company holds two inks. */
export const BLEND_CHANCE = 0.15;
/** Gilt for leaving an offer unwritten. */
export const SKIP_GILT = 10;
/** Inscriptions of one ink that illuminate it, then fully (§7.5). */
export const ILLUMINATION_AT: readonly [number, number] = [3, 6];
/** Levels an inscription has (§7.2). */
export const INSCRIPTION_LEVELS = 3;

// ---------------------------------------------------------------------------------------------
// Gilt, the Peddler, the Shrine (§11, §12)
// ---------------------------------------------------------------------------------------------

/** Gilt an expedition begins with. */
export const START_GILT = 40;
/** Gilt a won fight pays, [least, most], before the gilt rules. */
export const FIGHT_GILT: Readonly<Record<FightKind, readonly [number, number]>> = {
  skirmish: [14, 18],
  elite: [28, 36],
  warden: [45, 55],
};

/** The Peddler's prices in gilt (§11.2), before `price_mult`. */
export const PEDDLER_INSCRIPTION_PRICE: Readonly<Record<InscriptionRarity, number>> = {
  common: 45,
  rare: 70,
  epic: 105,
  legendary: 150,
};
export const PEDDLER_BLEND_PRICE = 130;
export const PEDDLER_SALVE_PRICE = 35;
export const PEDDLER_ASH_PRICE = 60;
export const PEDDLER_DEEPEN_PRICE = 55;
export const PEDDLER_SCRAPE_PRICE = 50;
export const PEDDLER_RESTOCK_PRICE = 15;
/** Inscriptions and relics on the Peddler's cloth. */
export const PEDDLER_INSCRIPTIONS = 3;
export const PEDDLER_RELICS = 2;
/** What a Salve heals, and the share Phoenix Ash raises a fallen champion to. */
export const SALVE_HEAL = 0.25;
export const ASH_SHARE = 0.5;

/** The share a Shrine's Rekindle raises a fallen champion to, before `rekindle_mult`. */
export const REKINDLE_SHARE = 0.4;
/** The Last Page raises the whole company to this share, once (§8). */
export const LAST_PAGE_SHARE = 0.3;
/** Phoenix Feather raises the first to fall to this share (§8). */
export const PHOENIX_SHARE = 0.5;

// ---------------------------------------------------------------------------------------------
// Echoes (§4.3)
// ---------------------------------------------------------------------------------------------

/** Rarity weights of an Echo offered. */
export const ECHO_WEIGHTS: Readonly<Record<'rare' | 'epic' | 'legendary' | 'mythic', number>> = {
  rare: 50,
  epic: 35,
  legendary: 13,
  mythic: 2,
};
/** Echoes offered at an Echo passage. */
export const ECHO_CHOICES = 2;
/** What an Echo's resolve adds to its HP, ATK and DEF, standing in for the gear it has not got (%). */
export const ECHO_RESOLVE = 15;
/** Gilt for sending the Echoes away, or when the company is full. */
export const ECHO_DECLINE_GILT = 25;

// ---------------------------------------------------------------------------------------------
// What an expedition pays (§14)
// ---------------------------------------------------------------------------------------------

/** Recovered Pages a finished passage adds, by kind. */
export const PASSAGE_PAGES: Readonly<Record<PassageKind, number>> = {
  skirmish: 3,
  elite: 6,
  warden: 15,
  mystery: 1,
  shrine: 1,
  peddler: 1,
  reliquary: 1,
  echo: 1,
};
/** Recovered Pages an expedition won adds. */
export const VICTORY_PAGES = 25;
/** Each Omen adds this share to the Pages multiplier. */
export const PAGES_PER_OMEN = 0.15;

/** Wardens a week that pay the Tithe (§14.2). */
export const TITHE_PER_WEEK = 6;
/** Each Omen adds this share to the Tithe's gold. */
export const TITHE_GOLD_PER_OMEN = 0.1;
/** The Omen from which the third Warden also pays a Legendary Tome. */
export const TITHE_LEGENDARY_FROM = 8;
/** The Tithe of each folio's Warden, gold before the Omen's share. */
export const TITHE: readonly (readonly CurrencyAmount[])[] = [
  [
    { currency: 'gold', amount: 15_000 },
    { currency: 'tome_rare', amount: 1 },
    { currency: 'brew_universal', amount: 2 },
  ],
  [
    { currency: 'gold', amount: 25_000 },
    { currency: 'tome_epic', amount: 1 },
    { currency: 'mat_refining_core', amount: 1 },
  ],
  [
    { currency: 'gold', amount: 40_000 },
    { currency: 'tome_epic', amount: 1 },
    { currency: 'mat_glyph_sigil', amount: 1 },
  ],
];

/** The seal the first expedition won at each Omen pays (§14.3), index = Omen. */
export const OMEN_SEALS: readonly (readonly CurrencyAmount[])[] = [
  [
    { currency: 'gems', amount: 100 },
    { currency: 'shard_ancient', amount: 1 },
  ],
  [{ currency: 'gems', amount: 120 }],
  [{ currency: 'gems', amount: 140 }],
  [{ currency: 'gems', amount: 160 }],
  [{ currency: 'gems', amount: 180 }],
  [
    { currency: 'gems', amount: 300 },
    { currency: 'shard_sacred', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 220 },
    { currency: 'tome_epic', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 240 },
    { currency: 'tome_epic', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 260 },
    { currency: 'tome_epic', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 280 },
    { currency: 'tome_epic', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 500 },
    { currency: 'shard_sacred', amount: 1 },
    { currency: 'tome_legendary', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 350 },
    { currency: 'tome_legendary', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 380 },
    { currency: 'tome_legendary', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 410 },
    { currency: 'tome_legendary', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 440 },
    { currency: 'tome_legendary', amount: 1 },
  ],
  [
    { currency: 'gems', amount: 1_000 },
    { currency: 'shard_primordial', amount: 1 },
  ],
];

/** Folios of a shelf that must be written before the next shelf opens (§15). */
export const SHELF_OPENS_AFTER = 2;
