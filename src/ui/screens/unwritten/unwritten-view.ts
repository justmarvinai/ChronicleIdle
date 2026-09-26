/**
 * What the Unwritten's screen draws, derived from the save in one pass (docs/tech/UI_DESIGN.md
 * §5.32). Pure: the screen memoises it on the save, so a step lands and everything that follows
 * from it — the map's inked route, an ink lit, a price the Gilded Tongue took a quarter off — is
 * redrawn from the same numbers the engine decided with.
 */
import {
  ASH_SHARE,
  COMPANY_MAX,
  ECHO_DECLINE_GILT,
  ECHO_RESOLVE,
  ILLUMINATION_AT,
  OMEN_SEALS,
  SKIP_GILT,
  TITHE_PER_WEEK,
  UNWRITTEN_PARTY,
} from '@content/balance/unwritten';
import type { ChampionDef } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { EncounterDef } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import {
  INKS,
  type FolioDef,
  type InkId,
  type InscriptionDef,
  type MysteryChoice,
  type MysteryDef,
  type OmenDef,
  type RelicDef,
  type BlotDef,
  type AffixDef,
  type ScriptoriumDef,
} from '@content/unwritten/types';
import type { EchoSave, Expedition, OfferCard, Passage, Pending, Ware } from '@engine/schema/unwritten-save';
import {
  championOf,
  combineRules,
  folioState,
  groundRules,
  illuminationTiers,
  inkCounts,
  meets,
  pagesMultiplier,
  passageFight,
  peddlerServices,
  reachable,
  rekindleShare,
  restShare,
  shelfOpen,
  standingOf,
  titheLeft,
  titheOf,
  WARDEN_PASSAGE,
  type FolioState,
  type Rules,
  type UnwrittenCtx,
} from '@engine/unwritten/index';
import { expeditionRules } from '@engine/unwritten/rules';

// ── The threshold: an Omen, a company ─────────────────────────────────────────────────────

export interface OmenView {
  def: OmenDef;
  open: boolean;
  /** The seal a first victory here pays, and whether it has been paid. */
  seal: readonly CurrencyAmount[];
  sealed: boolean;
  /** Won at least once. */
  won: boolean;
  /** Pages an expedition brings home at this Omen, as a multiplier. */
  pagesMult: number;
}

export interface ThresholdView {
  omens: OmenView[];
  /** The company's cap under the Scriptorium written. */
  cap: number;
  titheLeft: number;
  tithePerWeek: number;
  pages: number;
  /** Champions a fight fields. */
  party: number;
}

export function thresholdView(ctx: UnwrittenCtx): ThresholdView {
  const { unwritten, world } = ctx;
  const ground = combineRules(groundRules(unwritten, 0, world));
  return {
    omens: world.content.omens.map((def) => ({
      def,
      open: def.omen <= unwritten.omen.open,
      seal: OMEN_SEALS[def.omen] ?? [],
      sealed: unwritten.omen.sealed.includes(def.omen),
      won: unwritten.omen.best !== null && def.omen <= unwritten.omen.best,
      pagesMult: pagesMultiplier(def.omen, ground),
    })),
    cap: Math.min(COMPANY_MAX, Math.round(ground.company_cap)),
    titheLeft: titheLeft(unwritten, ctx.weekKey),
    tithePerWeek: TITHE_PER_WEEK,
    pages: unwritten.pages,
    party: UNWRITTEN_PARTY,
  };
}

/** Every twist in force at an Omen: its own and every one below it, lowest first. */
export function twistsAt(omens: readonly OmenDef[], omen: number): OmenDef[] {
  return omens.filter((def) => def.omen <= omen && def.text !== null);
}

// ── The map ────────────────────────────────────────────────────────────────────────────────

export type PassageState = 'walked' | 'here' | 'open' | 'ahead' | 'lost';

export interface PassageView {
  passage: Passage;
  state: PassageState;
  /** Where it stands on the page, in 0–1 of the map's width and height. */
  x: number;
  y: number;
}

export interface RoadView {
  from: PassageView;
  to: PassageView;
  state: 'walked' | 'open' | 'ahead' | 'lost';
}

/** A small, stable wobble per passage, so a folio reads as drawn by hand rather than on a grid. */
function wobble(id: string, folio: number, span: number): number {
  let hash = folio * 7919;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 1_000_003;
  return ((hash % 1000) / 1000 - 0.5) * span;
}

const MAP_TOP = 0.075;
const MAP_BOTTOM = 0.935;

export function mapView(run: Expedition): { passages: PassageView[]; roads: RoadView[] } {
  const rows = Math.max(...run.map.map((p) => p.row));
  const step = (MAP_BOTTOM - MAP_TOP) / Math.max(1, rows - 1);
  const walked = new Set(run.walked);
  const open = new Set(run.at ? [] : reachable(run.map, run.walked).map((p) => p.id));
  // Everything still ahead of the company: the roads out of where it stands, followed to the end.
  const ahead = new Set<string>();
  const frontier = run.walked.length
    ? (run.map.find((p) => p.id === run.walked[run.walked.length - 1])?.next ?? [])
    : run.map.filter((p) => p.row === 1).map((p) => p.id);
  const queue = [...frontier, ...(run.at ? [run.at] : [])];
  while (queue.length) {
    const id = queue.shift();
    if (id === undefined || ahead.has(id)) continue;
    ahead.add(id);
    queue.push(...(run.map.find((p) => p.id === id)?.next ?? []));
  }
  const views = new Map<string, PassageView>();
  for (const passage of run.map) {
    const state: PassageState = walked.has(passage.id)
      ? 'walked'
      : passage.id === run.at
        ? 'here'
        : open.has(passage.id)
          ? 'open'
          : ahead.has(passage.id)
            ? 'ahead'
            : 'lost';
    const warden = passage.id === WARDEN_PASSAGE;
    views.set(passage.id, {
      passage,
      state,
      x: warden ? 0.5 : 0.14 + passage.lane * 0.24 + wobble(passage.id, run.folio, 0.06),
      y: MAP_BOTTOM - (passage.row - 1) * step + (warden ? 0 : wobble(`${passage.id}y`, run.folio, 0.025)),
    });
  }
  const route = [...run.walked, ...(run.at ? [run.at] : [])];
  const onRoute = (a: string, b: string): boolean => {
    const i = route.indexOf(a);
    return i >= 0 && route[i + 1] === b;
  };
  const last = run.walked[run.walked.length - 1];
  const roads: RoadView[] = [];
  for (const from of views.values())
    for (const next of from.passage.next) {
      const to = views.get(next);
      if (!to) continue;
      const state = onRoute(from.passage.id, next)
        ? 'walked'
        : from.passage.id === last && to.state === 'open'
          ? 'open'
          : (ahead.has(from.passage.id) || from.passage.id === last) && ahead.has(next)
            ? 'ahead'
            : 'lost';
      roads.push({ from, to, state });
    }
  return { passages: [...views.values()], roads };
}

// ── The company ────────────────────────────────────────────────────────────────────────────

export interface MemberView {
  id: string;
  def: ChampionDef;
  level: number;
  stars: number;
  hp: number;
  fallen: boolean;
  echo: boolean;
}

export function companyView(run: Expedition, ctx: UnwrittenCtx): MemberView[] {
  return run.company.flatMap((member) => {
    const def = championOf(member, ctx.roster, ctx.world);
    if (!def) return [];
    const { level, stars } = standingOf(member, ctx.roster);
    return [
      { id: member.id, def, level, stars, hp: member.hp, fallen: member.hp <= 0, echo: member.echo !== null },
    ];
  });
}

// ── The codex: what the company has written, carries and suffers ──────────────────────────

export interface HeldView {
  def: InscriptionDef;
  level: number;
}

export interface InkView {
  ink: InkId;
  count: number;
  tier: number;
  /** Inscriptions of the ink the next tier needs, or null when fully lit. */
  next: number | null;
  held: HeldView[];
}

export interface CodexView {
  inks: InkView[];
  blends: HeldView[];
  relics: RelicDef[];
  blots: BlotDef[];
  rules: Rules;
  /** What the Pages carried are multiplied by when they come home. */
  pagesMult: number;
  /** The share a Rekindle token raises a fallen champion to. */
  tokenShare: number;
}

export function codexView(run: Expedition, ctx: UnwrittenCtx): CodexView {
  const { content } = ctx.world;
  const rules = expeditionRules(ctx.unwritten, run, ctx.world);
  const byId = (id: string) => content.inscriptions.find((def) => def.id === id);
  const counts = inkCounts(run.inscriptions, byId);
  const tiers = illuminationTiers(run, rules, ctx.world);
  const [first = 3, second = 6] = ILLUMINATION_AT.map((at) => Math.max(1, at - rules.illumination_sooner));
  const held = run.inscriptions.flatMap((h) => {
    const def = byId(h.id);
    return def ? [{ def, level: h.level }] : [];
  });
  return {
    inks: INKS.map((ink) => ({
      ink,
      count: counts[ink],
      tier: tiers[ink],
      next: tiers[ink] === 0 ? first : tiers[ink] === 1 ? second : null,
      held: held.filter((h) => h.def.inks.length === 1 && h.def.inks[0] === ink),
    })),
    blends: held.filter((h) => h.def.inks.length > 1),
    relics: run.relics.flatMap((id) => content.relics.find((def) => def.id === id) ?? []),
    blots: run.blots.flatMap((id) => content.blots.find((def) => def.id === id) ?? []),
    rules,
    pagesMult: pagesMultiplier(run.omen, rules),
    tokenShare: rekindleShare(rules),
  };
}

// ── The passage in hand ────────────────────────────────────────────────────────────────────

export interface CardView {
  def: InscriptionDef;
  level: number;
  /** The level before this card, when it deepens one already written. */
  held: number;
}

export function cardView(card: Pick<OfferCard, 'id' | 'level'>, ctx: UnwrittenCtx): CardView | null {
  const def = ctx.world.content.inscriptions.find((d) => d.id === card.id);
  return def ? { def, level: card.level, held: card.level - 1 } : null;
}

export interface FoeView {
  def: EnemyDef;
  /** Its share of HP, below 1 when a contested wave kept its wounds. */
  hp: number;
  marked: boolean;
}

export interface FightView {
  pending: Extract<Pending, { kind: 'fight' }>;
  encounter: EncounterDef;
  /** The first wave standing, and how many come after it. */
  foes: FoeView[];
  later: number;
  contested: boolean;
  affixes: AffixDef[];
  /** Whether the affixes may be read (the Warden's always; an Elite's once revealed). */
  affixesKnown: boolean;
  standing: MemberView[];
  party: number;
}

export function fightView(run: Expedition, ctx: UnwrittenCtx, company: MemberView[]): FightView | null {
  const pending = run.pending;
  const passage = run.map.find((p) => p.id === run.at);
  const folio = ctx.world.content.folios[run.folio - 1];
  if (pending?.kind !== 'fight' || !passage || !folio) return null;
  const rules = expeditionRules(ctx.unwritten, run, ctx.world);
  const built = passageFight({ run, passage, pending, folio, rules, world: ctx.world });
  const [first, ...rest] = built.encounter.waves;
  const wounds = built.firstWaveHp;
  const foes = (first?.enemies ?? []).flatMap((enemy, slot) => {
    const def = built.enemyById(enemy.enemyId);
    return def ? [{ def, hp: wounds?.[slot] ?? 1, marked: slot === 0 && pending.fight !== 'skirmish' }] : [];
  });
  return {
    pending,
    encounter: built.encounter,
    foes,
    later: rest.reduce((sum, wave) => sum + wave.enemies.length, 0),
    contested: pending.wounds !== null || pending.wave > 0,
    affixes: passage.affixes.flatMap((id) => ctx.world.content.affixes.find((a) => a.id === id) ?? []),
    affixesKnown: pending.fight === 'warden' || run.flags.revealed || rules.keen_reader >= 1,
    standing: company.filter((m) => !m.fallen),
    party: UNWRITTEN_PARTY,
  };
}

export interface ChoiceView {
  choice: MysteryChoice;
  index: number;
  open: boolean;
}

export function mysteryView(
  run: Expedition,
  ctx: UnwrittenCtx,
): { def: MysteryDef; choices: ChoiceView[]; keen: boolean } | null {
  const pending = run.pending;
  if (pending?.kind !== 'mystery') return null;
  const def = ctx.world.content.mysteries.find((m) => m.id === pending.id);
  if (!def) return null;
  const rules = expeditionRules(ctx.unwritten, run, ctx.world);
  return {
    def,
    choices: def.choices.map((choice, index) => ({ choice, index, open: meets(run, choice.requires) })),
    keen: rules.keen_reader >= 1,
  };
}

export interface ShrineView {
  rest: number;
  rekindle: number;
  fallen: MemberView[];
  deepenable: HeldView[];
  blots: BlotDef[];
}

export function shrineView(run: Expedition, ctx: UnwrittenCtx, company: MemberView[]): ShrineView {
  const rules = expeditionRules(ctx.unwritten, run, ctx.world);
  const codex = codexView(run, ctx);
  return {
    rest: restShare(rules),
    rekindle: rekindleShare(rules),
    fallen: company.filter((m) => m.fallen),
    deepenable: [...codex.inks.flatMap((ink) => ink.held), ...codex.blends].filter((h) => h.level < 3),
    blots: codex.blots,
  };
}

export interface WareView {
  ware: Ware;
  index: number;
  card: CardView | null;
  relic: RelicDef | null;
}

export interface PeddlerView {
  wares: WareView[];
  prices: ReturnType<typeof peddlerServices>;
  /** The share Phoenix Ash raises a fallen champion to, under the rules. */
  ashShare: number;
  ash: boolean;
  deepen: boolean;
  restock: boolean;
  shrine: ShrineView;
}

export function peddlerView(run: Expedition, ctx: UnwrittenCtx, company: MemberView[]): PeddlerView | null {
  const pending = run.pending;
  if (pending?.kind !== 'peddler') return null;
  const rules = expeditionRules(ctx.unwritten, run, ctx.world);
  return {
    wares: pending.wares.map((ware, index) => ({
      ware,
      index,
      card: ware.kind === 'inscription' ? cardView({ id: ware.id, level: ware.level ?? 1 }, ctx) : null,
      relic: ware.kind === 'relic' ? (ctx.world.content.relics.find((r) => r.id === ware.id) ?? null) : null,
    })),
    prices: peddlerServices(rules),
    ashShare: rekindleShare(rules, ASH_SHARE),
    ash: pending.ash,
    deepen: pending.deepen,
    restock: pending.restock,
    shrine: shrineView(run, ctx, company),
  };
}

export interface EchoView {
  echo: EchoSave;
  def: ChampionDef;
}

export function echoView(
  run: Expedition,
  ctx: UnwrittenCtx,
): { echoes: EchoView[]; full: boolean; gilt: number; resolve: number } | null {
  const pending = run.pending;
  if (pending?.kind !== 'echo') return null;
  return {
    echoes: pending.echoes.flatMap((echo) => {
      const def = ctx.world.championById(echo.defId);
      return def ? [{ echo, def }] : [];
    }),
    full: run.company.length >= COMPANY_MAX,
    gilt: ECHO_DECLINE_GILT,
    resolve: ECHO_RESOLVE,
  };
}

/** The relics a Warden's hoard or a Reliquary lays out. */
export function relicChoice(run: Expedition, ctx: UnwrittenCtx): RelicDef[] {
  const pending = run.pending;
  if (pending?.kind !== 'relic_choice' && pending?.kind !== 'reliquary') return [];
  return pending.relics.flatMap((id) => ctx.world.content.relics.find((r) => r.id === id) ?? []);
}

export const OFFER_SKIP_GILT = SKIP_GILT;

// ── Folio and Tithe ────────────────────────────────────────────────────────────────────────

export function folioOf(run: Expedition, ctx: UnwrittenCtx): FolioDef | null {
  return ctx.world.content.folios[run.folio - 1] ?? null;
}

/** What this folio's Warden pays into the wallet if the week's Tithe still has room. */
export function wardenTithe(run: Expedition, ctx: UnwrittenCtx): CurrencyAmount[] {
  return titheLeft(ctx.unwritten, ctx.weekKey) > 0 ? titheOf(run.folio, run.omen) : [];
}

// ── The Scriptorium ────────────────────────────────────────────────────────────────────────

export interface ShelfView {
  shelf: number;
  open: boolean;
  folios: { def: ScriptoriumDef; state: FolioState }[];
}

export function scriptoriumView(ctx: UnwrittenCtx): ShelfView[] {
  const { unwritten, world } = ctx;
  const shelves = [...new Set(world.content.scriptorium.map((def) => def.shelf))].sort((a, b) => a - b);
  return shelves.map((shelf) => ({
    shelf,
    open: shelfOpen(unwritten, shelf, world),
    folios: world.content.scriptorium
      .filter((def) => def.shelf === shelf)
      .map((def) => ({ def, state: folioState(unwritten, def, world) })),
  }));
}
