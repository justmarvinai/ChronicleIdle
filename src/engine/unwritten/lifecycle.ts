/**
 * An expedition from its first step to its last (docs/design/UNWRITTEN.md §3, §5, §16, §17).
 *
 * Begin it with an Omen and a company; enter a passage the roads reach and it sets out what the
 * passage holds — a fight, a mystery, a shop — drawn from the expedition's seed, so a reload shows
 * the same; finish it and the next row opens, or the folio ends in its interlude, or the whole
 * expedition ends and writes its Tale. Everything is written into the slice it is handed.
 */
import {
  ECHO_CHOICES,
  INTERLUDE_HEAL,
  OMEN_SCALE,
  PEDDLER_BLEND_PRICE,
  PEDDLER_INSCRIPTION_PRICE,
  PEDDLER_INSCRIPTIONS,
  PEDDLER_RELICS,
  START_GILT,
  TALES_KEPT,
  UNWRITTEN_FOLIOS,
} from '@content/balance/unwritten';
import { INKS, type InkId } from '@content/unwritten/types';
import { fail, ok, type Result } from '@engine/errors';
import { createRng } from '@engine/rng/rng';
import type { Expedition, Passage, Pending, Tale, Ware } from '@engine/schema/unwritten-save';
import { championOf, drawEchoes, heal, standing } from './company';
import { bump, emptyReceipt, pay, type UnwrittenCtx, type UnwrittenReceipt } from './context';
import { drawFolio, reachable } from './map';
import { drawOffer } from './offers';
import { bankedPages, passagePages, takeSeal } from './rewards';
import { combineRules, expeditionRules, groundRules, type Rules } from './rules';
import { illuminationTiers } from './shaping';
import { addBlot, writeInscription } from './write';

/** The expedition in hand, or why there is none. */
export function currentRun(ctx: UnwrittenCtx): Result<Expedition> {
  return ctx.unwritten.run ? ok(ctx.unwritten.run) : fail('invalid_argument', 'No expedition is under way');
}

/** The rules the expedition in hand is played under. */
export function rulesNow(ctx: UnwrittenCtx, run: Expedition): Rules {
  return expeditionRules(ctx.unwritten, run, ctx.world);
}

export function passageOf(run: Expedition, id: string | null): Passage | undefined {
  return id === null ? undefined : run.map.find((passage) => passage.id === id);
}

// ── Beginning ──────────────────────────────────────────────────────────────────────────────

export interface BeginInput {
  omen: number;
  /** Roster instance ids, in the order the player chose them. */
  company: readonly string[];
  /** The chronicle's root seed; the expedition's is derived from it and the count begun. */
  seedRoot: string;
}

export function beginExpedition(ctx: UnwrittenCtx, input: BeginInput): Result<UnwrittenReceipt> {
  const { unwritten, world, roster, now } = ctx;
  if (unwritten.run) return fail('invalid_argument', 'An expedition is already under way');
  if (!Number.isInteger(input.omen) || input.omen < 0 || input.omen > unwritten.omen.open)
    return fail('locked', `Omen ${input.omen} is not open`);
  const rules = combineRules(groundRules(unwritten, input.omen, world));
  const ids = [...new Set(input.company)];
  if (!ids.length) return fail('invalid_argument', 'A company needs a champion');
  if (ids.length > rules.company_cap)
    return fail('invalid_argument', `A company is at most ${rules.company_cap}`);
  for (const id of ids) if (!roster[id]) return fail('invalid_argument', `Unknown champion ${id}`);
  const folio = world.content.folios[0];
  if (!folio) return fail('invalid_argument', 'The Unwritten has no folios');

  const seed = `${input.seedRoot}:unwritten:${unwritten.records.expeditions}`;
  const run: Expedition = {
    seed,
    omen: input.omen,
    startedAt: now,
    folio: 1,
    map: drawFolio({ seed, folio, rules, affixes: world.content.affixes }),
    walked: [],
    at: null,
    company: ids.map((id) => ({ id, echo: null, hp: Math.min(1, rules.start_hp) })),
    inscriptions: [],
    relics: [],
    blots: [],
    gilt: START_GILT + Math.max(0, Math.round(rules.start_gilt)),
    pages: 0,
    rerolls: Math.max(0, Math.round(rules.rerolls_per_folio)),
    tokens: Math.max(0, Math.round(rules.rekindle_tokens)),
    mysteries: [],
    pending: null,
    queue: [],
    spoils: null,
    flags: {
      lastPage: false,
      phoenix: false,
      doubleGilt: false,
      revealed: false,
      wardenHp: 0,
      wardenRelics: 0,
    },
    fallen: 0,
    attempts: 0,
    echoes: 0,
    tale: [],
  };
  const receipt = emptyReceipt();
  const rng = createRng(`${seed}:start`);
  // The Omens' stain and the Scriptorium's head start are drawn before the first step.
  for (let i = 0; i < rules.start_blots; i += 1) {
    const open = world.content.blots.filter((blot) => !run.blots.includes(blot.id));
    if (open.length) addBlot(run, rng.pick(open).id);
  }
  for (let i = 0; i < rules.start_rare_inscriptions; i += 1) {
    const [card] = drawOffer({
      rng,
      source: 'start',
      rules,
      held: run.inscriptions,
      inscriptions: world.content.inscriptions,
      size: 1,
    });
    if (card) writeInscription(run, card.id, receipt, world, () => expeditionRules(unwritten, run, world));
  }
  unwritten.run = run;
  unwritten.records.expeditions += 1;
  bump(receipt, 'unwritten.expeditions');
  return ok(receipt);
}

// ── Entering a passage ─────────────────────────────────────────────────────────────────────

/** A price at the Peddler, after the rules' multiplier, never below a quarter of the list price. */
export function peddlerPrice(list: number, rules: Rules): number {
  return Math.max(1, Math.round(list * Math.max(0.25, 1 + rules.price_mult)));
}

/** Relics the expedition could still find, in the volumes the Scriptorium has opened. */
export function relicsLeft(ctx: UnwrittenCtx, run: Expedition, rules: Rules): string[] {
  return ctx.world.content.relics
    .filter((relic) => relic.volume <= rules.volume_relics && !run.relics.includes(relic.id))
    .map((relic) => relic.id);
}

/** The Peddler's cloth: three inscriptions and two relics, drawn when the passage is entered. */
export function peddlerWares(
  ctx: UnwrittenCtx,
  run: Expedition,
  passage: Passage,
  rules: Rules,
  draw: number,
): Ware[] {
  const rng = createRng(`${run.seed}:peddler:${run.folio}:${passage.id}:${draw}`);
  const cards = drawOffer({
    rng,
    source: 'skirmish',
    rules,
    held: run.inscriptions,
    inscriptions: ctx.world.content.inscriptions,
    size: PEDDLER_INSCRIPTIONS,
  });
  const inscriptions: Ware[] = cards.map((card) => {
    const def = ctx.world.content.inscriptions.find((i) => i.id === card.id);
    const list =
      def && def.inks.length > 1 ? PEDDLER_BLEND_PRICE : PEDDLER_INSCRIPTION_PRICE[def?.rarity ?? 'common'];
    return {
      kind: 'inscription',
      id: card.id,
      level: card.level,
      price: peddlerPrice(list, rules),
      sold: false,
    };
  });
  const relics: Ware[] = rng
    .shuffle(relicsLeft(ctx, run, rules))
    .slice(0, PEDDLER_RELICS)
    .map((id) => ({
      kind: 'relic',
      id,
      level: 1,
      price: peddlerPrice(ctx.world.content.relics.find((r) => r.id === id)?.price ?? 0, rules),
      sold: false,
    }));
  return [...inscriptions, ...relics];
}

/** What a passage holds when the company steps into it. */
function openPassage(ctx: UnwrittenCtx, run: Expedition, passage: Passage, rules: Rules): Pending | null {
  const { world } = ctx;
  const rng = createRng(`${run.seed}:passage:${run.folio}:${passage.id}`);
  switch (passage.kind) {
    case 'skirmish':
    case 'elite':
    case 'warden':
      return { kind: 'fight', fight: passage.kind, duel: false, wave: 0, wounds: null };
    case 'mystery': {
      const unmet = world.content.mysteries.filter((m) => !run.mysteries.includes(m.id));
      const pool = unmet.length ? unmet : world.content.mysteries;
      if (!pool.length) return null;
      const mystery = rng.pick(pool);
      run.mysteries.push(mystery.id);
      return { kind: 'mystery', id: mystery.id };
    }
    case 'shrine':
      return { kind: 'shrine' };
    case 'peddler':
      return {
        kind: 'peddler',
        wares: peddlerWares(ctx, run, passage, rules, 0),
        ash: false,
        deepen: false,
        restock: false,
      };
    case 'reliquary': {
      const relics = rng
        .shuffle(relicsLeft(ctx, run, rules))
        .slice(0, Math.max(1, Math.round(rules.reliquary_choice)));
      return relics.length ? { kind: 'reliquary', relics } : null;
    }
    case 'echo': {
      const echoes = drawEchoes({
        rng,
        run,
        roster: ctx.roster,
        world,
        count: ECHO_CHOICES,
        extraStars: Math.round(rules.echo_stars),
      });
      return echoes.length ? { kind: 'echo', echoes } : null;
    }
  }
}

export function enterPassage(ctx: UnwrittenCtx, passageId: string): Result<UnwrittenReceipt> {
  const got = currentRun(ctx);
  if (!got.ok) return got;
  const run = got.value;
  if (run.pending || run.at) return fail('invalid_argument', 'A passage is already in hand');
  const passage = reachable(run.map, run.walked).find((p) => p.id === passageId);
  if (!passage) return fail('invalid_argument', `Passage ${passageId} cannot be reached from here`);
  run.at = passage.id;
  run.spoils = null;
  const pending = openPassage(ctx, run, passage, rulesNow(ctx, run));
  const receipt = emptyReceipt();
  if (pending) run.pending = pending;
  else finishPassage(ctx, run, receipt);
  return ok(receipt);
}

// ── Finishing a passage, a folio, an expedition ────────────────────────────────────────────

/** Moves on to what the passage still waits on, or finishes it when nothing is left. */
export function advance(ctx: UnwrittenCtx, run: Expedition, receipt: UnwrittenReceipt): void {
  const next = run.queue.shift();
  if (next) {
    run.pending = next;
    return;
  }
  run.pending = null;
  finishPassage(ctx, run, receipt);
}

/** The passage in hand is done: walk on, or close the folio, or end the expedition. */
export function finishPassage(ctx: UnwrittenCtx, run: Expedition, receipt: UnwrittenReceipt): void {
  const passage = passageOf(run, run.at);
  const rules = rulesNow(ctx, run);
  run.pending = null;
  run.queue = [];
  if (!passage) {
    run.at = null;
    return;
  }
  run.walked.push(passage.id);
  run.at = null;
  run.pages += passagePages(passage.kind, rules);
  bump(receipt, 'unwritten.passages');
  if (passage.kind !== 'warden') return;
  bump(receipt, 'unwritten.folios');
  if (run.folio >= UNWRITTEN_FOLIOS) {
    endExpedition(ctx, 'victory', receipt);
    return;
  }
  // The interlude (§5.4): the company rests, and the next folio is drawn.
  heal(run, INTERLUDE_HEAL, 'all', ctx.roster, createRng(`${run.seed}:interlude:${run.folio}`));
  run.folio += 1;
  const folio = ctx.world.content.folios[run.folio - 1];
  run.map = folio ? drawFolio({ seed: run.seed, folio, rules, affixes: ctx.world.content.affixes }) : [];
  run.walked = [];
  run.rerolls = Math.max(0, Math.round(rules.rerolls_per_folio));
  run.flags.revealed = false;
  run.flags.wardenHp = 0;
  run.flags.wardenRelics = 0;
}

/** Inscriptions the company wrote in each ink, blends counted for both. */
function inkTally(ctx: UnwrittenCtx, run: Expedition): Record<InkId, number> {
  const tally = Object.fromEntries(INKS.map((ink) => [ink, 0])) as Record<InkId, number>;
  for (const held of run.inscriptions)
    for (const ink of ctx.world.content.inscriptions.find((def) => def.id === held.id)?.inks ?? [])
      tally[ink] += 1;
  return tally;
}

/**
 * Ends the expedition in hand — won, lost or abandoned — and does everything an ending does: banks
 * its Pages, pays an Omen's seal the first time it falls, opens the next Omen, keeps its Tale and
 * counts its feats (§14, §16, §19).
 */
export function endExpedition(ctx: UnwrittenCtx, result: Tale['result'], receipt: UnwrittenReceipt): void {
  const { unwritten } = ctx;
  const run = unwritten.run;
  if (!run) return;
  const rules = rulesNow(ctx, run);
  const won = result === 'victory';
  const pages = bankedPages(run.pages, run.omen, rules, won);
  unwritten.pages += pages;
  const wardens = run.tale.filter((entry) => entry.kind === 'warden').length;
  if (won) {
    unwritten.records.victories += 1;
    bump(receipt, 'unwritten.victories');
    const took = ctx.now - run.startedAt;
    if (unwritten.records.fastestMs === null || took < unwritten.records.fastestMs)
      unwritten.records.fastestMs = took;
    unwritten.omen.best = Math.max(unwritten.omen.best ?? 0, run.omen);
    unwritten.omen.open = Math.max(unwritten.omen.open, Math.min(OMEN_SCALE.length - 1, run.omen + 1));
    pay(receipt, takeSeal(unwritten, run.omen));
    if (run.fallen === 0) bump(receipt, 'feat.unwritten_unbroken');
    if (run.company.length === 1) bump(receipt, 'feat.unwritten_lone');
    const tiers = illuminationTiers(run, rules, ctx.world);
    const everInked = new Set(run.tale.flatMap((entry) => (entry.kind === 'illuminated' ? [entry.ink] : [])));
    if (INKS.every((ink) => tiers[ink] > 0 || everInked.has(ink)))
      bump(receipt, 'feat.unwritten_illuminated');
  }
  const tale: Tale = {
    omen: run.omen,
    result,
    startedAt: run.startedAt,
    endedAt: ctx.now,
    folio: run.folio,
    company: run.company.flatMap((member) => {
      const def = championOf(member, ctx.roster, ctx.world);
      return def ? [def.id] : [];
    }),
    inks: inkTally(ctx, run),
    relics: run.relics.length,
    pages,
    wardens,
    entries: run.tale,
  };
  unwritten.tales = [tale, ...unwritten.tales].slice(0, TALES_KEPT);
  unwritten.run = null;
  receipt.ended = tale;
}

/** Walks away: the expedition ends as a loss would, and still brings its Pages home (§17). */
export function abandonExpedition(ctx: UnwrittenCtx): Result<UnwrittenReceipt> {
  const got = currentRun(ctx);
  if (!got.ok) return got;
  const receipt = emptyReceipt();
  endExpedition(ctx, 'abandoned', receipt);
  return ok(receipt);
}

/** The company still standing — the members a fight can send in. */
export function standingIds(run: Expedition): string[] {
  return standing(run).map((member) => member.id);
}
