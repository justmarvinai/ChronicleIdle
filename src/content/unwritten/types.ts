/**
 * The Unwritten's content types (docs/design/UNWRITTEN.md, CONTENT_AUTHORING.md §20).
 *
 * Everything an expedition can gain or suffer is one of five shapes — an inscription, a relic, a
 * blot, a Scriptorium folio, an Omen — and every one of them does its work through the same two
 * channels: **passives** the fielded champions carry into a fight, written in the battle DSL, and
 * **rules**, the handful of the Unwritten's own numbers (how many inscriptions an offer shows, what
 * the Peddler charges, how deep a Rest heals) that the engine reads by summing every source. A new
 * relic is therefore data: a passive, a rule, or both.
 */
import type { BackdropKey, GlyphKey, SpellKey } from '@assets/manifest.generated';
import type { Element, PassiveEffect, PassiveTrigger } from '@content/champions/types';

/** The four inks inscriptions are written in — the four elements, in their order (§7.4). */
export const INKS = ['gold', 'crimson', 'azure', 'violet'] as const;
export type InkId = (typeof INKS)[number];

/** Which element each ink is: it colours the ink and names whom a kinship favours. */
export const INK_ELEMENT: Readonly<Record<InkId, Element>> = {
  gold: 'justice',
  crimson: 'valor',
  azure: 'faith',
  violet: 'eclipse',
};

/** Inscriptions come in four of the game's six rarities; blends are always Epic. */
export const INSCRIPTION_RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type InscriptionRarity = (typeof INSCRIPTION_RARITIES)[number];

/** What a passage is (§5.2). */
export const PASSAGE_KINDS = [
  'skirmish',
  'elite',
  'warden',
  'mystery',
  'shrine',
  'peddler',
  'reliquary',
  'echo',
] as const;
export type PassageKind = (typeof PASSAGE_KINDS)[number];

/** The passages that are fights. */
export const FIGHT_KINDS = ['skirmish', 'elite', 'warden'] as const;
export type FightKind = (typeof FIGHT_KINDS)[number];

/**
 * The Unwritten's own numbers that content bends. Each rule has a base and a way its sources
 * combine (`RULE_BASE`, `RULE_MODE` in `balance/unwritten.ts`): most add up, a few take the lowest
 * or the highest source, so an Omen that says "Rest heals 30 %" and one that says "25 %" leave 25.
 */
export const RULES = [
  /** Inscriptions an offer shows. */
  'offer_size',
  /** Chance that an offered inscription rolls one rarity higher. */
  'offer_rarity_bump',
  /** Legendary inscriptions may be offered after Skirmishes (1 = yes). */
  'offer_legendary_skirmish',
  /** Blended inscriptions may be offered (1 = yes). */
  'blends',
  /** Added to the Peddler's price multiplier (−0.25 is a quarter off). */
  'price_mult',
  /** The share of max HP a Rest heals, before `rest_heal_mult`. */
  'rest_heal',
  /** Added to the Rest's multiplier (+0.2 heals a fifth more). */
  'rest_heal_mult',
  /** Added to the share a rekindled champion rises at, as a multiplier (−0.5 halves it). */
  'rekindle_mult',
  /** Share of max HP the whole living company heals after every victory. */
  'heal_after_victory',
  /** Share of max HP every champion who fought loses after every fight. */
  'after_fight_wound',
  /** Added to the multiplier on gilt found. */
  'gilt_mult',
  /** Gilt after every Elite and Warden won. */
  'gilt_after_elite',
  /** Gilt an expedition begins with, beyond the base. */
  'start_gilt',
  /** The share of max HP the company begins an expedition at. */
  'start_hp',
  /** Random blots an expedition begins with. */
  'start_blots',
  /** Random Rare inscriptions an expedition begins with. */
  'start_rare_inscriptions',
  /** Stars an Echo joins with beyond the company's average. */
  'echo_stars',
  /** Echoes join at full health (1 = yes); otherwise at the company's average share. */
  'echo_full_hp',
  /** Echo passages are drawn on the maps (1 = yes). */
  'echo_passages',
  /** Inscriptions fewer an ink needs to illuminate. */
  'illumination_sooner',
  /** Recovered Pages every finished passage adds, beyond its own. */
  'pages_per_passage',
  /** Added to the multiplier on Recovered Pages. */
  'pages_mult',
  /** The first time the whole company would fall, everyone rises at 30 % instead (1 = yes). */
  'last_page',
  /** The first champion to fall rises after that fight at half health (1 = yes). */
  'phoenix',
  /** Added to a Warden's HP multiplier. */
  'warden_hp',
  /** Added to an Elite's HP multiplier. */
  'elite_hp',
  /** Added to every foe's HP multiplier. */
  'enemy_hp',
  /** Added to every foe's ATK multiplier. */
  'enemy_atk',
  /** Flat SPD every foe gains. */
  'enemy_spd',
  /** Affixes an Elite carries beyond its first. */
  'elite_affixes',
  /** Affixes a Warden carries. */
  'warden_affixes',
  /** Foes a Skirmish wave fields beyond its folio's number (four at most). */
  'skirmish_extra_foe',
  /** Added to the Unwriter's HP multiplier. */
  'unwriter_hp',
  /** The HP share at which the Unwriter's last phase opens. */
  'unwriter_last_phase',
  /** Relics a Reliquary offers to choose from. */
  'reliquary_choice',
  /** Rerolls of an inscription offer each folio. */
  'rerolls_per_folio',
  /** Rekindle tokens an expedition carries. */
  'rekindle_tokens',
  /** Champions the company may begin with. */
  'company_cap',
  /** Mysteries name their odds and the map shows Elites' affixes (1 = yes). */
  'keen_reader',
  /** The highest volume of inscriptions in the Unwritten. */
  'volume_inscriptions',
  /** The highest volume of relics in the Unwritten. */
  'volume_relics',
] as const;
export type RuleId = (typeof RULES)[number];

/** How a rule's sources combine. */
export type RuleMode = 'sum' | 'min' | 'max';

export interface RuleEffect {
  rule: RuleId;
  value: number;
}

/**
 * A passive as content writes it. The engine names it after the thing that grants it, so a relic's
 * passive shows the relic's name and icon when it fires.
 */
export interface PassiveTemplate {
  trigger: PassiveTrigger;
  effects: readonly PassiveEffect[];
  oncePerBattle?: true;
}

/**
 * What something gives the expedition: passives the fielded champions carry into the fights,
 * passives the foes carry (a blot's or an Omen's cruelty), and rules for everything else.
 */
export interface Grant {
  passives?: readonly PassiveTemplate[];
  /** When set, the passives are carried only into fights of these kinds (Warden's Bane). */
  only?: readonly FightKind[];
  /** Passives every foe of every fight carries. */
  foes?: readonly PassiveTemplate[];
  rules?: readonly RuleEffect[];
}

/**
 * Who carries an inscription's passives into a fight (§7.3): every fielded champion, the leader
 * alone (an effect on the whole field that four bearers would multiply), or the champions of one
 * element (a kinship).
 */
export type Bearer = 'each' | 'leader' | { element: Element };

/** The numbers an inscription's line prints at a level: `{a}`, `{b}` … in its string. */
export type Shown = Readonly<Record<string, number>>;

export interface InscriptionLevel {
  grant: Grant;
  show: Shown;
}

/** Which volume of the Unwritten an inscription or relic belongs to (§7.7, §8). */
export type Volume = 1 | 2 | 3;

export interface InscriptionDef {
  /** `inscription.<slug>`. */
  id: string;
  /** i18n keys: the name, and the line with its `{a}`… placeholders. */
  name: string;
  text: string;
  /** One ink, or two for a blend. */
  inks: readonly [InkId] | readonly [InkId, InkId];
  rarity: InscriptionRarity;
  /** Volume I is always in the Unwritten; II arrives with the Scriptorium. Blends are volume 1. */
  volume: Volume;
  icon: SpellKey;
  bearer: Bearer;
  levels: readonly [InscriptionLevel, InscriptionLevel, InscriptionLevel];
  version: number;
}

/** An ink's illumination (§7.5): what three of it grant, and what six grant instead. */
export interface IlluminationDef {
  ink: InkId;
  /** i18n keys for the two tiers' lines. */
  text: readonly [string, string];
  /** Each tier's grant, and the numbers its line shows. */
  tiers: readonly [InscriptionLevel, InscriptionLevel];
  /** The ink's glyph and colour, for its seal on the screen; the painting its passives fire under. */
  glyph: GlyphKey;
  colour: string;
  icon: SpellKey;
}

export interface RelicDef {
  /** `relic.<slug>`. */
  id: string;
  name: string;
  text: string;
  icon: SpellKey;
  volume: Volume;
  /** What the Peddler asks for it, in gilt. */
  price: number;
  grant: Grant;
  show: Shown;
  version: number;
}

export interface BlotDef {
  /** `blot.<slug>`. */
  id: string;
  name: string;
  text: string;
  icon: SpellKey;
  grant: Grant;
  show: Shown;
  version: number;
}

/** An Elite's or a Warden's mark (§6.2): passives on the foe. */
export interface AffixDef {
  /** `affix.<slug>`. */
  id: string;
  name: string;
  text: string;
  icon: SpellKey;
  passives: readonly PassiveTemplate[];
  show: Shown;
  version: number;
}

/** A rung of the difficulty ladder (§13). Its rules are added to every rung below it. */
export interface OmenDef {
  /** 0 … 15. */
  omen: number;
  /** `omen.<nn>`. */
  id: string;
  name: string;
  /** i18n key of the twist it adds; the first rung has none. */
  text: string | null;
  /** The single multiplier on every foe's base stats at this Omen (§6.4). */
  scale: number;
  rules: readonly RuleEffect[];
  /** The numbers the twist's line shows, read off its rules. */
  show: Shown;
  version: number;
}

/** One folio of the Scriptorium (§15). */
export interface ScriptoriumDef {
  /** `scriptorium.<slug>`. */
  id: string;
  name: string;
  text: string;
  /** 1–4: a shelf opens when two folios of the shelf below are written. */
  shelf: number;
  cost: number;
  icon: GlyphKey;
  rules: readonly RuleEffect[];
  /** The numbers its line shows, read off its rules. */
  show: Shown;
  version: number;
}

/** One act of an expedition (§5, §6.1). */
export interface FolioDef {
  /** `folio.<n>`. */
  id: string;
  /** 1 … 3. */
  index: number;
  name: string;
  /** The factions whose foes the folio remembers, by id. */
  factions: readonly string[];
  /** Foes in the first and second wave of a Skirmish, before Omen 10's extra. */
  waves: readonly [number, number];
  /** Foes flanking an Elite. */
  escort: number;
  /** The Warden's enemy id. */
  warden: string;
  /** The single multiplier on the Warden beyond the Omen's curve. */
  wardenScale: number;
  backdrop: BackdropKey;
  /** A colour laid over the backdrop, so each folio reads darker than the last. */
  grade: string;
  surface: 'dirt' | 'stone' | 'water' | 'wood';
  version: number;
}

// ── Mysteries (§10) ────────────────────────────────────────────────────────────────────────

/** Whom a heal or a wound reaches. */
export type Whom = 'all' | 'strongest' | 'random';

/** What a mystery's choice does, in order. */
export type Outcome =
  | { kind: 'gilt'; amount: number }
  /** Pay every gilt held (a price stated as "all your gilt"). */
  | { kind: 'gilt_all' }
  /** Double the gilt held, adding at most `cap`. */
  | { kind: 'gilt_double'; cap: number }
  | { kind: 'heal'; share: number; whom: Whom }
  | { kind: 'wound'; share: number; whom: Whom }
  /** A random inscription is written, of this ink and rarity if given. */
  | { kind: 'inscribe'; ink?: InkId; rarity?: InscriptionRarity }
  /** A random inscription gains a level. */
  | { kind: 'deepen' }
  /** A random inscription is lost. */
  | { kind: 'unwrite' }
  | { kind: 'relic' }
  | { kind: 'lose_relic' }
  | { kind: 'blot'; id?: string }
  | { kind: 'scrape' }
  /** The first fallen champion rises at this share. */
  | { kind: 'rekindle'; share: number }
  /** An Echo offers to join. */
  | { kind: 'echo' }
  | { kind: 'pages'; amount: number }
  /** An Elite fight, whose victory offers Warden-grade inscriptions. */
  | { kind: 'duel' }
  /** A Skirmish fight on the spot. */
  | { kind: 'ambush' }
  /** Added to this folio's Warden's HP multiplier. */
  | { kind: 'warden_hp'; delta: number }
  /** This folio's Warden pays one more relic. */
  | { kind: 'warden_relic' }
  /** The next fight won pays double gilt. */
  | { kind: 'double_gilt_next' }
  /** This folio's Elites show their affixes. */
  | { kind: 'reveal_affixes' };

/** What a choice needs before it may be taken. */
export interface Requirement {
  gilt?: number;
  relics?: number;
  fallen?: number;
  inscriptions?: number;
  blots?: number;
}

export interface MysteryChoice {
  /** i18n key of the button. */
  label: string;
  /** i18n key of the line under it: what it costs and what it may bring. */
  hint: string;
  requires?: Requirement;
  /** Certain outcomes, or a gamble. */
  outcomes: readonly Outcome[];
  /** A gamble: `chance` (0–1) of `outcomes`, otherwise `otherwise`. */
  gamble?: { chance: number; otherwise: readonly Outcome[] };
  /** The numbers the hint shows, read off the outcomes (`dsl.ts` `choiceShow`). */
  show: Shown;
}

export interface MysteryDef {
  /** `mystery.<slug>`. */
  id: string;
  name: string;
  /** i18n key of the scene. */
  scene: string;
  /** The painting the scene is set beside. */
  art: SpellKey;
  /** When only some choices can be taken, the one that always can comes last. */
  choices: readonly MysteryChoice[];
  version: number;
}
