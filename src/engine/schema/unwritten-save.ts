/**
 * The Unwritten's save slice (docs/design/UNWRITTEN.md §18), in save v22.
 *
 * What is kept is what cannot be derived: the Recovered Pages held and the Scriptorium written, the
 * Omens opened and sealed, the week's Tithe, the records and the last Tales — and the expedition in
 * hand, whole, so closing the game in the middle of a folio loses nothing (§17). An expedition keeps
 * the map it drew and every choice it is waiting on (an offer, a shop, a mystery) exactly as drawn,
 * so a content change never reshapes a map already walked or a shop already opened.
 */
import { z } from 'zod';
import { INSCRIPTION_LEVELS } from '@content/balance/unwritten';
import { FIGHT_KINDS, INKS, PASSAGE_KINDS } from '@content/unwritten/types';
import { CURRENCY_IDS } from '@content/currencies/types';

/** A share of max HP: 0 is fallen, 1 is whole. */
const share = z.number().min(0).max(1);
const level = z.number().int().min(1).max(INSCRIPTION_LEVELS);
const count = z.number().int().min(0);

/** Who an Echo is (§4.3): the champion it echoes, at the level and stars it joined with. */
export const echoSchema = z.object({
  defId: z.string().min(1),
  level: z.number().int().min(1),
  stars: z.number().int().min(1).max(6),
});

/** A champion of the company: a roster instance, or an Echo (`echo.<n>`), with the share of HP it carries. */
export const companyMemberSchema = z.object({
  id: z.string().min(1),
  echo: echoSchema.nullable(),
  hp: share,
});

/** A passage of the folio in hand, as drawn (§5). */
export const passageSchema = z.object({
  /** `p<row>.<lane>`, or `warden`. */
  id: z.string().min(1),
  /** 1–8, the Warden 9. */
  row: z.number().int().min(1).max(9),
  lane: z.number().int().min(0),
  kind: z.enum(PASSAGE_KINDS),
  /** The passages its roads lead to. */
  next: z.array(z.string()),
  /** Fights: the faction whose foes stand in it. */
  faction: z.string().nullable(),
  /** Elites and the Warden: the affixes drawn for it. */
  affixes: z.array(z.string()),
});

/** An inscription written into the company, at its level. */
export const heldSchema = z.object({ id: z.string().min(1), level });

/** One card of an offer: the inscription, and the level it would be written at. */
export const offerCardSchema = z.object({ id: z.string().min(1), level });

/** A foe of a contested wave, and the share of HP it has left (§4.2). */
export const foeWoundSchema = z.object({ enemyId: z.string().min(1), hp: share });

/** One ware on the Peddler's cloth (§11.2). */
export const wareSchema = z.object({
  kind: z.enum(['inscription', 'relic']),
  id: z.string().min(1),
  level,
  price: count,
  sold: z.boolean(),
});

/** What the passage in hand is waiting on. */
export const pendingSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('fight'),
    fight: z.enum(FIGHT_KINDS),
    /** A mystery's duel: an Elite whose victory offers a Warden's inscriptions. */
    duel: z.boolean(),
    /** The wave the passage stands at: waves before it are cleared. */
    wave: count,
    /** The contested wave's surviving foes and their wounds; null while untouched. */
    wounds: z.array(foeWoundSchema).nullable(),
  }),
  z.object({
    kind: z.literal('offer'),
    from: z.enum(['skirmish', 'elite', 'warden', 'duel', 'start']),
    cards: z.array(offerCardSchema),
    /** Offers drawn here so far, rerolls included — the next draw's seed. */
    draws: count,
  }),
  z.object({ kind: z.literal('relic_choice'), relics: z.array(z.string()) }),
  z.object({ kind: z.literal('mystery'), id: z.string().min(1) }),
  z.object({ kind: z.literal('shrine') }),
  z.object({
    kind: z.literal('peddler'),
    wares: z.array(wareSchema),
    /** Once-a-visit services already used. */
    ash: z.boolean(),
    deepen: z.boolean(),
    restock: z.boolean(),
  }),
  z.object({ kind: z.literal('reliquary'), relics: z.array(z.string()) }),
  z.object({ kind: z.literal('echo'), echoes: z.array(echoSchema) }),
]);

/** What the last victory paid, for the screen that shows it; cleared at the next passage. */
export const spoilsSchema = z.object({
  gilt: count,
  pages: count,
  /** An Elite's relic, already carried. */
  relic: z.string().nullable(),
  /** The Warden's Tithe paid into the wallet, if this was one of the week's first six. */
  tithe: z.array(z.object({ currency: z.enum(CURRENCY_IDS), amount: z.number().int().positive() })),
  /** The share of max HP every living champion healed after it. */
  healed: z.number().min(0),
});

/** One line of an expedition's Tale (§16). */
export const taleEntrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fell'), folio: z.number().int(), who: z.string(), at: z.enum(PASSAGE_KINDS) }),
  z.object({ kind: z.literal('rekindled'), folio: z.number().int(), who: z.string() }),
  z.object({ kind: z.literal('inscribed'), folio: z.number().int(), id: z.string(), level }),
  z.object({ kind: z.literal('relic'), folio: z.number().int(), id: z.string() }),
  z.object({ kind: z.literal('blot'), folio: z.number().int(), id: z.string() }),
  z.object({ kind: z.literal('echo'), folio: z.number().int(), who: z.string() }),
  z.object({
    kind: z.literal('illuminated'),
    folio: z.number().int(),
    ink: z.enum(INKS),
    tier: z.number().int(),
  }),
  z.object({ kind: z.literal('warden'), folio: z.number().int(), id: z.string() }),
]);

/** The expedition in hand (§18). */
export const expeditionSchema = z.object({
  /** Every draw of the expedition derives from this. */
  seed: z.string().min(1),
  omen: count,
  startedAt: count,
  /** 1–3. */
  folio: z.number().int().min(1),
  map: z.array(passageSchema),
  /** Passages finished this folio, in the order walked. */
  walked: z.array(z.string()),
  /** The passage entered and not yet finished, or null between passages. */
  at: z.string().nullable(),
  company: z.array(companyMemberSchema),
  inscriptions: z.array(heldSchema),
  relics: z.array(z.string()),
  blots: z.array(z.string()),
  gilt: count,
  /** Recovered Pages earned so far, banked when the expedition ends. */
  pages: count,
  /** Offer rerolls left this folio, and Rekindle tokens left this expedition. */
  rerolls: count,
  tokens: count,
  /** Mysteries met, never met twice. */
  mysteries: z.array(z.string()),
  pending: pendingSchema.nullable(),
  /** What follows the pending choice at the same passage (a Warden's offer, then its relics). */
  queue: z.array(pendingSchema),
  spoils: spoilsSchema.nullable(),
  flags: z.object({
    /** The Last Page and the Phoenix Feather have been spent. */
    lastPage: z.boolean(),
    phoenix: z.boolean(),
    /** The next fight won pays double gilt (the Lantern-Bearer). */
    doubleGilt: z.boolean(),
    /** This folio's Elites show their affixes. */
    revealed: z.boolean(),
    /** Added to this folio's Warden's HP multiplier, and relics it pays beyond one (the Herald). */
    wardenHp: z.number(),
    wardenRelics: count,
  }),
  /** Champions who have fallen this expedition, rekindled or not. */
  fallen: count,
  /** Fights begun this expedition — every attempt its own seed. */
  attempts: count,
  /** Echoes minted, for their ids. */
  echoes: count,
  tale: z.array(taleEntrySchema),
});

/** An expedition as the Records keep it once it is over (§16). */
export const taleSchema = z.object({
  omen: count,
  result: z.enum(['victory', 'defeat', 'abandoned']),
  startedAt: count,
  endedAt: count,
  /** The folio it reached, 1–3. */
  folio: z.number().int().min(1),
  /** Who went in, by champion id. */
  company: z.array(z.string()),
  /** Inscriptions written in each ink. */
  inks: z.record(z.enum(INKS), count),
  relics: count,
  pages: count,
  wardens: count,
  entries: z.array(taleEntrySchema),
});

export const unwrittenSchema = z.object({
  /** Recovered Pages held, to spend in the Scriptorium. */
  pages: count,
  /** Scriptorium folios written. */
  scriptorium: z.array(z.string()),
  omen: z.object({
    /** The highest Omen an expedition may be begun at. */
    open: count,
    /** The highest Omen an expedition has been won at; null before the first victory. */
    best: count.nullable(),
    /** Omens whose seal has been paid. */
    sealed: z.array(count),
  }),
  /** The week's Tithe: which week, and how many Wardens have paid it. */
  tithe: z.object({ weekKey: z.string(), paid: count }),
  records: z.object({
    expeditions: count,
    victories: count,
    wardens: count,
    /** The quickest victory, start to last Warden, in milliseconds. */
    fastestMs: count.nullable(),
  }),
  /** The last Tales, newest first. */
  tales: z.array(taleSchema),
  run: expeditionSchema.nullable(),
});

export type UnwrittenSave = z.infer<typeof unwrittenSchema>;
export type Expedition = z.infer<typeof expeditionSchema>;
export type CompanyMember = z.infer<typeof companyMemberSchema>;
export type EchoSave = z.infer<typeof echoSchema>;
export type Passage = z.infer<typeof passageSchema>;
export type HeldInscription = z.infer<typeof heldSchema>;
export type OfferCard = z.infer<typeof offerCardSchema>;
export type FoeWound = z.infer<typeof foeWoundSchema>;
export type Ware = z.infer<typeof wareSchema>;
export type Pending = z.infer<typeof pendingSchema>;
export type Spoils = z.infer<typeof spoilsSchema>;
export type TaleEntry = z.infer<typeof taleEntrySchema>;
export type Tale = z.infer<typeof taleSchema>;

/** An Unwritten nobody has entered: nothing written, Omen 0 open, no expedition. */
export function emptyUnwritten(): UnwrittenSave {
  return {
    pages: 0,
    scriptorium: [],
    omen: { open: 0, best: null, sealed: [] },
    tithe: { weekKey: '', paid: 0 },
    records: { expeditions: 0, victories: 0, wardens: 0, fastestMs: null },
    tales: [],
    run: null,
  };
}
