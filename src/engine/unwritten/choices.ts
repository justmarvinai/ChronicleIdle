/**
 * The choices a passage waits on (docs/design/UNWRITTEN.md §7, §10, §11): an offer, a Warden's
 * relics, a shrine's one blessing, the Peddler's cloth, a reliquary, an Echo, a mystery — and the
 * Rekindle token that can be spent between passages. Each checks that the passage in hand is
 * waiting on it, writes the choice into the expedition, and moves on.
 */
import {
  ASH_SHARE,
  COMPANY_MAX,
  INSCRIPTION_LEVELS,
  ECHO_CHOICES,
  ECHO_DECLINE_GILT,
  PEDDLER_ASH_PRICE,
  PEDDLER_DEEPEN_PRICE,
  PEDDLER_RESTOCK_PRICE,
  PEDDLER_SALVE_PRICE,
  PEDDLER_SCRAPE_PRICE,
  REKINDLE_SHARE,
  SALVE_HEAL,
  SKIP_GILT,
} from '@content/balance/unwritten';
import type { InscriptionDef, Outcome, Requirement } from '@content/unwritten/types';
import { fail, ok, type Result } from '@engine/errors';
import { createRng, type Rng } from '@engine/rng/rng';
import type { EchoSave, Expedition, Pending } from '@engine/schema/unwritten-save';
import { championOf, drawEchoes, fallenMembers, heal, rekindle, standing, wound } from './company';
import { bump, emptyReceipt, type UnwrittenCtx, type UnwrittenReceipt } from './context';
import {
  advance,
  currentRun,
  finishPassage,
  passageOf,
  peddlerPrice,
  peddlerWares,
  relicsLeft,
  rulesNow,
} from './lifecycle';
import { drawOffer } from './offers';
import type { Rules } from './rules';
import { addBlot, addRelic, deepenInscription, writeInscription } from './write';

type PendingOf<K extends Pending['kind']> = Extract<Pending, { kind: K }>;

/** The expedition and its pending choice, if the choice is of this kind. */
function waiting<K extends Pending['kind']>(
  ctx: UnwrittenCtx,
  kind: K,
): Result<{ run: Expedition; pending: PendingOf<K> }> {
  const got = currentRun(ctx);
  if (!got.ok) return got;
  const pending = got.value.pending;
  if (!pending || pending.kind !== kind) return fail('invalid_argument', `No ${kind} is waiting`);
  return ok({ run: got.value, pending: pending as PendingOf<K> });
}

const rulesOf = (ctx: UnwrittenCtx, run: Expedition) => () => rulesNow(ctx, run);

// ── Offers and relics ──────────────────────────────────────────────────────────────────────

/** Writes the offer's card at `index`, or leaves them all for gilt when `index` is null. */
export function chooseOffer(ctx: UnwrittenCtx, index: number | null): Result<UnwrittenReceipt> {
  const got = waiting(ctx, 'offer');
  if (!got.ok) return got;
  const { run, pending } = got.value;
  const receipt = emptyReceipt();
  if (index === null) run.gilt += SKIP_GILT;
  else {
    const card = pending.cards[index];
    if (!card) return fail('invalid_argument', `The offer has no card ${index}`);
    writeInscription(run, card.id, receipt, ctx.world, rulesOf(ctx, run), card.level);
  }
  advance(ctx, run, receipt);
  return ok(receipt);
}

/** Draws the offer again, for one of the folio's rerolls. */
export function rerollOffer(ctx: UnwrittenCtx): Result<UnwrittenReceipt> {
  const got = waiting(ctx, 'offer');
  if (!got.ok) return got;
  const { run, pending } = got.value;
  if (run.rerolls < 1) return fail('invalid_argument', 'No rerolls are left this folio');
  run.rerolls -= 1;
  const draws = pending.draws + 1;
  const cards = drawOffer({
    rng: createRng(`${run.seed}:offer:${run.folio}:${run.at ?? ''}:${draws}`),
    source: pending.from,
    rules: rulesNow(ctx, run),
    held: run.inscriptions,
    inscriptions: ctx.world.content.inscriptions,
  });
  run.pending = { ...pending, cards, draws };
  return ok(emptyReceipt());
}

/** Takes the relic at `index` from a Warden's choice or a reliquary. */
export function chooseRelic(ctx: UnwrittenCtx, index: number): Result<UnwrittenReceipt> {
  const got = currentRun(ctx);
  if (!got.ok) return got;
  const run = got.value;
  const pending = run.pending;
  if (!pending || (pending.kind !== 'relic_choice' && pending.kind !== 'reliquary'))
    return fail('invalid_argument', 'No relic is waiting to be chosen');
  const id = pending.relics[index];
  if (!id) return fail('invalid_argument', `There is no relic ${index}`);
  const receipt = emptyReceipt();
  addRelic(run, id, receipt);
  if (pending.kind === 'reliquary') finishPassage(ctx, run, receipt);
  else advance(ctx, run, receipt);
  return ok(receipt);
}

// ── The shrine (§11.1) ─────────────────────────────────────────────────────────────────────

export type ShrineAction =
  | { kind: 'rest' }
  | { kind: 'rekindle'; member: string }
  | { kind: 'reink'; inscription: string }
  | { kind: 'scrape'; blot: string };

/** What a Rest heals under the rules. */
export function restShare(rules: Rules): number {
  return Math.max(0, rules.rest_heal * (1 + rules.rest_heal_mult));
}

/** The share a rekindled champion rises at under the rules. */
export function rekindleShare(rules: Rules, base = REKINDLE_SHARE): number {
  return Math.max(0.01, base * Math.max(0, 1 + rules.rekindle_mult));
}

export function useShrine(ctx: UnwrittenCtx, action: ShrineAction): Result<UnwrittenReceipt> {
  const got = waiting(ctx, 'shrine');
  if (!got.ok) return got;
  const { run } = got.value;
  const rules = rulesNow(ctx, run);
  const receipt = emptyReceipt();
  const rng = createRng(`${run.seed}:shrine:${run.folio}:${run.at ?? ''}`);
  switch (action.kind) {
    case 'rest':
      heal(run, restShare(rules), 'all', ctx.roster, rng);
      break;
    case 'rekindle': {
      const risen = rekindle(run, rekindleShare(rules), action.member);
      if (!risen) return fail('invalid_argument', 'That champion has not fallen');
      run.tale.push({
        kind: 'rekindled',
        folio: run.folio,
        who: championOf(risen, ctx.roster, ctx.world)?.id ?? risen.id,
      });
      break;
    }
    case 'reink':
      if (!deepenInscription(run, action.inscription, receipt, ctx.world, rulesOf(ctx, run)))
        return fail('invalid_argument', 'That inscription cannot go deeper');
      break;
    case 'scrape':
      if (!run.blots.includes(action.blot)) return fail('invalid_argument', 'That blot is not on the page');
      run.blots = run.blots.filter((id) => id !== action.blot);
      break;
  }
  finishPassage(ctx, run, receipt);
  return ok(receipt);
}

// ── The Peddler (§11.2) ────────────────────────────────────────────────────────────────────

export type PeddlerAction =
  | { kind: 'buy'; ware: number }
  | { kind: 'salve' }
  | { kind: 'ash'; member: string }
  | { kind: 'deepen'; inscription: string }
  | { kind: 'scrape'; blot: string }
  | { kind: 'restock' }
  | { kind: 'leave' };

/** What each of the Peddler's services costs under the rules. */
export function peddlerServices(
  rules: Rules,
): Record<'salve' | 'ash' | 'deepen' | 'scrape' | 'restock', number> {
  return {
    salve: peddlerPrice(PEDDLER_SALVE_PRICE, rules),
    ash: peddlerPrice(PEDDLER_ASH_PRICE, rules),
    deepen: peddlerPrice(PEDDLER_DEEPEN_PRICE, rules),
    scrape: peddlerPrice(PEDDLER_SCRAPE_PRICE, rules),
    restock: peddlerPrice(PEDDLER_RESTOCK_PRICE, rules),
  };
}

export function usePeddler(ctx: UnwrittenCtx, action: PeddlerAction): Result<UnwrittenReceipt> {
  const got = waiting(ctx, 'peddler');
  if (!got.ok) return got;
  const { run, pending } = got.value;
  const receipt = emptyReceipt();
  if (action.kind === 'leave') {
    finishPassage(ctx, run, receipt);
    return ok(receipt);
  }
  const rules = rulesNow(ctx, run);
  const prices = peddlerServices(rules);
  const spend = (price: number): boolean => {
    if (run.gilt < price) return false;
    run.gilt -= price;
    return true;
  };
  const broke = () => fail<UnwrittenReceipt>('insufficient_currency', 'Not enough gilt');
  switch (action.kind) {
    case 'buy': {
      const ware = pending.wares[action.ware];
      if (!ware || ware.sold) return fail('invalid_argument', 'That ware is gone');
      if (!spend(ware.price)) return broke();
      ware.sold = true;
      if (ware.kind === 'relic') addRelic(run, ware.id, receipt);
      else writeInscription(run, ware.id, receipt, ctx.world, rulesOf(ctx, run), ware.level);
      break;
    }
    case 'salve':
      if (!spend(prices.salve)) return broke();
      heal(run, SALVE_HEAL, 'all', ctx.roster, createRng(`${run.seed}:salve:${run.folio}:${run.at ?? ''}`));
      break;
    case 'ash': {
      if (pending.ash) return fail('invalid_argument', 'The Peddler has no more ash today');
      if (!fallenMembers(run).some((m) => m.id === action.member))
        return fail('invalid_argument', 'That champion has not fallen');
      if (!spend(prices.ash)) return broke();
      const risen = rekindle(run, rekindleShare(rules, ASH_SHARE), action.member);
      pending.ash = true;
      if (risen)
        run.tale.push({
          kind: 'rekindled',
          folio: run.folio,
          who: championOf(risen, ctx.roster, ctx.world)?.id ?? risen.id,
        });
      break;
    }
    case 'deepen': {
      if (pending.deepen) return fail('invalid_argument', 'The Peddler has no more of that ink today');
      const held = run.inscriptions.find((h) => h.id === action.inscription);
      if (!held || held.level >= INSCRIPTION_LEVELS)
        return fail('invalid_argument', 'That inscription cannot go deeper');
      if (!spend(prices.deepen)) return broke();
      deepenInscription(run, action.inscription, receipt, ctx.world, rulesOf(ctx, run));
      pending.deepen = true;
      break;
    }
    case 'scrape':
      if (!run.blots.includes(action.blot)) return fail('invalid_argument', 'That blot is not on the page');
      if (!spend(prices.scrape)) return broke();
      run.blots = run.blots.filter((id) => id !== action.blot);
      break;
    case 'restock': {
      if (pending.restock) return fail('invalid_argument', 'The Peddler has restocked once already');
      if (!spend(prices.restock)) return broke();
      const passage = passageOf(run, run.at);
      if (!passage) return fail('invalid_argument', 'No passage is in hand');
      const fresh = peddlerWares(ctx, run, passage, rules, 1).filter((ware) => ware.kind === 'inscription');
      pending.wares = [...fresh, ...pending.wares.filter((ware) => ware.kind === 'relic')];
      pending.restock = true;
      break;
    }
  }
  return ok(receipt);
}

// ── Echoes (§4.3, §11.4) ───────────────────────────────────────────────────────────────────

/** Adds an Echo to the company; returns false when the company is already full. */
function joinEcho(ctx: UnwrittenCtx, run: Expedition, echo: EchoSave, receipt: UnwrittenReceipt): boolean {
  if (run.company.length >= COMPANY_MAX) return false;
  const rules = rulesNow(ctx, run);
  const up = standing(run);
  const share = rules.echo_full_hp >= 1 || !up.length ? 1 : up.reduce((sum, m) => sum + m.hp, 0) / up.length;
  run.echoes += 1;
  run.company.push({ id: `echo.${run.echoes}`, echo, hp: Math.max(0.01, Math.min(1, share)) });
  run.tale.push({ kind: 'echo', folio: run.folio, who: echo.defId });
  bump(receipt, 'unwritten.echoes');
  return true;
}

/** Takes the Echo at `index`, or sends them away for gilt when `index` is null. */
export function chooseEcho(ctx: UnwrittenCtx, index: number | null): Result<UnwrittenReceipt> {
  const got = waiting(ctx, 'echo');
  if (!got.ok) return got;
  const { run, pending } = got.value;
  const receipt = emptyReceipt();
  const echo = index === null ? null : pending.echoes[index];
  if (index !== null && !echo) return fail('invalid_argument', `There is no Echo ${index}`);
  if (!echo || !joinEcho(ctx, run, echo, receipt)) run.gilt += ECHO_DECLINE_GILT;
  advance(ctx, run, receipt);
  return ok(receipt);
}

// ── Mysteries (§10) ────────────────────────────────────────────────────────────────────────

/** Whether a choice's requirements are met. */
export function meets(run: Expedition, requires: Requirement | undefined): boolean {
  if (!requires) return true;
  return (
    run.gilt >= (requires.gilt ?? 0) &&
    run.relics.length >= (requires.relics ?? 0) &&
    fallenMembers(run).length >= (requires.fallen ?? 0) &&
    run.inscriptions.length >= (requires.inscriptions ?? 0) &&
    run.blots.length >= (requires.blots ?? 0)
  );
}

/** A random inscription of the pool the outcome names, at its next level; undefined if none is left. */
function randomInscription(
  ctx: UnwrittenCtx,
  run: Expedition,
  rng: Rng,
  outcome: Extract<Outcome, { kind: 'inscribe' }>,
): InscriptionDef | undefined {
  const rules = rulesNow(ctx, run);
  const pool = ctx.world.content.inscriptions.filter((def) => {
    if (def.inks.length > 1 || def.volume > rules.volume_inscriptions) return false;
    if (outcome.ink && def.inks[0] !== outcome.ink) return false;
    if (outcome.rarity && def.rarity !== outcome.rarity) return false;
    const held = run.inscriptions.find((h) => h.id === def.id);
    return !held || held.level < INSCRIPTION_LEVELS;
  });
  return pool.length ? rng.pick(pool) : undefined;
}

/** Applies a mystery's outcomes in order; returns what the passage waits on next, if anything. */
function applyOutcomes(
  ctx: UnwrittenCtx,
  run: Expedition,
  outcomes: readonly Outcome[],
  rng: Rng,
  receipt: UnwrittenReceipt,
): Pending | null {
  let next: Pending | null = null;
  for (const outcome of outcomes) {
    switch (outcome.kind) {
      case 'gilt':
        run.gilt = Math.max(0, run.gilt + outcome.amount);
        break;
      case 'gilt_all':
        run.gilt = 0;
        break;
      case 'gilt_double':
        run.gilt += Math.min(run.gilt, outcome.cap);
        break;
      case 'heal':
        heal(run, outcome.share, outcome.whom, ctx.roster, rng);
        break;
      case 'wound':
        wound(run, outcome.share, outcome.whom, ctx.roster, rng);
        break;
      case 'inscribe': {
        const def = randomInscription(ctx, run, rng, outcome);
        if (def) writeInscription(run, def.id, receipt, ctx.world, rulesOf(ctx, run));
        break;
      }
      case 'deepen': {
        const open = run.inscriptions.filter((h) => h.level < INSCRIPTION_LEVELS);
        if (open.length) deepenInscription(run, rng.pick(open).id, receipt, ctx.world, rulesOf(ctx, run));
        break;
      }
      case 'unwrite':
        if (run.inscriptions.length) {
          const lost = rng.pick(run.inscriptions);
          run.inscriptions = run.inscriptions.filter((h) => h !== lost);
        }
        break;
      case 'relic': {
        const left = relicsLeft(ctx, run, rulesNow(ctx, run));
        if (left.length) addRelic(run, rng.pick(left), receipt);
        break;
      }
      case 'lose_relic':
        if (run.relics.length) {
          const lost = rng.pick(run.relics);
          run.relics = run.relics.filter((id) => id !== lost);
        }
        break;
      case 'blot': {
        const open = ctx.world.content.blots.filter((b) => !run.blots.includes(b.id));
        const id = outcome.id ?? (open.length ? rng.pick(open).id : undefined);
        if (id) addBlot(run, id);
        break;
      }
      case 'scrape':
        if (run.blots.length) {
          const gone = rng.pick(run.blots);
          run.blots = run.blots.filter((id) => id !== gone);
        }
        break;
      case 'rekindle': {
        const risen = rekindle(run, rekindleShare(rulesNow(ctx, run), outcome.share));
        if (risen)
          run.tale.push({
            kind: 'rekindled',
            folio: run.folio,
            who: championOf(risen, ctx.roster, ctx.world)?.id ?? risen.id,
          });
        break;
      }
      case 'echo': {
        const echoes = drawEchoes({
          rng,
          run,
          roster: ctx.roster,
          world: ctx.world,
          count: ECHO_CHOICES,
          extraStars: Math.round(rulesNow(ctx, run).echo_stars),
        });
        if (echoes.length && run.company.length < COMPANY_MAX) next = { kind: 'echo', echoes };
        break;
      }
      case 'pages':
        run.pages += outcome.amount;
        break;
      case 'duel':
        next = { kind: 'fight', fight: 'elite', duel: true, wave: 0, wounds: null };
        break;
      case 'ambush':
        next = { kind: 'fight', fight: 'skirmish', duel: false, wave: 0, wounds: null };
        break;
      case 'warden_hp':
        run.flags.wardenHp += outcome.delta;
        break;
      case 'warden_relic':
        run.flags.wardenRelics += 1;
        break;
      case 'double_gilt_next':
        run.flags.doubleGilt = true;
        break;
      case 'reveal_affixes':
        run.flags.revealed = true;
        break;
    }
  }
  return next;
}

/** Takes a mystery's choice at `index`. */
export function chooseMystery(ctx: UnwrittenCtx, index: number): Result<UnwrittenReceipt> {
  const got = waiting(ctx, 'mystery');
  if (!got.ok) return got;
  const { run, pending } = got.value;
  const def = ctx.world.content.mysteries.find((m) => m.id === pending.id);
  const choice = def?.choices[index];
  if (!def || !choice) return fail('invalid_argument', `The mystery has no choice ${index}`);
  if (!meets(run, choice.requires)) return fail('invalid_argument', 'That choice cannot be taken');
  const receipt = emptyReceipt();
  const rng = createRng(`${run.seed}:mystery:${run.folio}:${run.at ?? ''}:${index}`);
  const outcomes =
    choice.gamble && !rng.chance(choice.gamble.chance) ? choice.gamble.otherwise : choice.outcomes;
  const next = applyOutcomes(ctx, run, outcomes, rng, receipt);
  if (next) run.pending = next;
  else finishPassage(ctx, run, receipt);
  return ok(receipt);
}

// ── Tokens ─────────────────────────────────────────────────────────────────────────────────

/** Spends a Rekindle token on a fallen champion, any time but in a fight (§15). */
export function useRekindleToken(ctx: UnwrittenCtx, member: string): Result<UnwrittenReceipt> {
  const got = currentRun(ctx);
  if (!got.ok) return got;
  const run = got.value;
  if (run.tokens < 1) return fail('invalid_argument', 'No Rekindle token is left');
  const risen = rekindle(run, rekindleShare(rulesNow(ctx, run)), member);
  if (!risen) return fail('invalid_argument', 'That champion has not fallen');
  run.tokens -= 1;
  run.tale.push({
    kind: 'rekindled',
    folio: run.folio,
    who: championOf(risen, ctx.roster, ctx.world)?.id ?? risen.id,
  });
  return ok(emptyReceipt());
}
