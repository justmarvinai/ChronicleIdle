/**
 * A passage's fight, before and after (docs/design/UNWRITTEN.md §4.2, §6, §12).
 *
 * Before: the plan the battle is started from — the encounter as it stands (a contested one
 * rebuilt from its wave, its survivors wounded), the foes bent by the rules, and what each fielded
 * champion carries in. After: the outcome settled back into the expedition. A victory pays gilt and
 * Pages, heals what heals after a victory, and queues its offer (and a Warden's relics); anything
 * else keeps every wound on both sides, and only a company with nobody left standing ends there.
 */
import { FIGHT_GILT, LAST_PAGE_SHARE, PHOENIX_SHARE, UNWRITTEN_PARTY } from '@content/balance/unwritten';
import type { EncounterDef } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import type { BattleShaping } from '@engine/battle/create';
import type { BattleOutcome } from '@engine/battle/types';
import type { Roster } from '@engine/champions/instance';
import { fail, ok, type Result } from '@engine/errors';
import { createRng } from '@engine/rng/rng';
import type { Expedition, FoeWound, Pending } from '@engine/schema/unwritten-save';
import { championOf, heal, isStanding, rekindle } from './company';
import { bump, emptyReceipt, pay, type UnwrittenCtx, type UnwrittenReceipt } from './context';
import { passageFight, type FightPending } from './encounter';
import { advance, currentRun, endExpedition, passageOf, relicsLeft, rulesNow } from './lifecycle';
import { drawOffer } from './offers';
import { passagePages, takeTithe } from './rewards';
import { companyShaping, echoRoster } from './shaping';
import { addRelic } from './write';

/** Relics a Warden offers to choose from. */
const WARDEN_RELIC_CHOICE = 2;

export interface FightPlan {
  encounter: EncounterDef;
  enemyById: (id: string) => EnemyDef | undefined;
  shaping: BattleShaping;
  /** The company's Echoes as instances, to stand beside the roster in the battle. */
  echoes: Roster;
  /** The fight's own seed: every attempt at a passage fights on a fresh one. */
  seed: string;
  /** The members sent in, in line-up order. */
  fielded: string[];
}

function fightInHand(run: Expedition): FightPending | null {
  return run.pending?.kind === 'fight' ? run.pending : null;
}

/** What the battle for the passage in hand is started from, with these champions sent in. */
export function planFight(ctx: UnwrittenCtx, fielded: readonly string[]): Result<FightPlan> {
  const got = currentRun(ctx);
  if (!got.ok) return got;
  const run = got.value;
  const pending = fightInHand(run);
  const passage = passageOf(run, run.at);
  const folio = ctx.world.content.folios[run.folio - 1];
  if (!pending || !passage || !folio) return fail('invalid_argument', 'No fight is waiting');
  const ids = [...new Set(fielded)];
  if (!ids.length || ids.length > UNWRITTEN_PARTY)
    return fail('invalid_argument', `A fight fields one to ${UNWRITTEN_PARTY} champions`);
  const members = ids.map((id) => run.company.find((member) => member.id === id));
  if (members.some((member) => !member || !isStanding(member)))
    return fail('invalid_argument', 'Only champions still standing can be sent in');
  const rules = rulesNow(ctx, run);
  const built = passageFight({ run, passage, pending, folio, rules, world: ctx.world });
  if (!built.encounter.waves.length) return fail('invalid_argument', 'The passage has no foes left');
  const shaping = companyShaping({
    run,
    rules,
    world: ctx.world,
    roster: ctx.roster,
    fielded: members.filter((member) => member !== undefined),
    fight: pending.fight,
  });
  return ok({
    encounter: built.encounter,
    enemyById: built.enemyById,
    shaping: { ...shaping, ...(built.firstWaveHp ? { firstWaveHp: built.firstWaveHp } : {}) },
    echoes: echoRoster(run, ctx.world),
    seed: `${run.seed}:fight:${run.folio}:${passage.id}:${run.attempts}`,
    fielded: ids,
  });
}

/** The foes still standing in the wave a lost fight ended in, and the wounds they carry. */
function contestedFoes(outcome: BattleOutcome): FoeWound[] {
  const prefix = `w${outcome.wavesCleared}e`;
  return outcome.units
    .filter((unit) => unit.side === 'enemy' && unit.unitId.startsWith(prefix))
    .sort((a, b) => Number(a.unitId.slice(prefix.length)) - Number(b.unitId.slice(prefix.length)))
    .filter((unit) => unit.alive && unit.hp > 0)
    .map((unit) => ({
      enemyId: unit.defId,
      hp: Math.min(1, Math.max(0, unit.hp / Math.max(1, unit.maxHp))),
    }));
}

/** Writes the fielded champions' final HP back as shares; returns who fell in this fight. */
function keepWounds(ctx: UnwrittenCtx, run: Expedition, outcome: BattleOutcome): string[] {
  const fell: string[] = [];
  for (const unit of outcome.units) {
    if (unit.side !== 'ally' || !unit.instanceId) continue;
    const member = run.company.find((m) => m.id === unit.instanceId);
    if (!member) continue;
    const before = member.hp;
    member.hp = unit.alive ? Math.min(1, Math.max(0.01, unit.hp / Math.max(1, unit.maxHp))) : 0;
    if (before > 0 && member.hp === 0) {
      fell.push(member.id);
      run.fallen += 1;
      const passage = passageOf(run, run.at);
      run.tale.push({
        kind: 'fell',
        folio: run.folio,
        who: championOf(member, ctx.roster, ctx.world)?.id ?? member.id,
        at: passage?.kind ?? 'skirmish',
      });
    }
  }
  return fell;
}

/** Gilt a won fight pays: drawn from its kind's range, bent by the rules and the Lantern. */
function fightGilt(run: Expedition, kind: FightPending['fight'], rules: ReturnType<typeof rulesNow>): number {
  const [least, most] = FIGHT_GILT[kind];
  const rolled = createRng(`${run.seed}:gilt:${run.folio}:${run.at ?? ''}:${run.attempts}`).int(least, most);
  const bonus = kind === 'skirmish' ? 0 : rules.gilt_after_elite;
  const doubled = run.flags.doubleGilt ? 2 : 1;
  return Math.max(0, Math.round((rolled * Math.max(0, 1 + rules.gilt_mult) + bonus) * doubled));
}

/** Settles a fight's outcome into the expedition. */
export function settleFight(ctx: UnwrittenCtx, outcome: BattleOutcome): Result<UnwrittenReceipt> {
  const got = currentRun(ctx);
  if (!got.ok) return got;
  const run = got.value;
  const pending = fightInHand(run);
  const passage = passageOf(run, run.at);
  if (!pending || !passage) return fail('invalid_argument', 'No fight is waiting to be settled');
  const receipt = emptyReceipt();
  const rules = rulesNow(ctx, run);
  run.attempts += 1;
  const fell = keepWounds(ctx, run, outcome);
  const rng = createRng(`${run.seed}:settle:${run.folio}:${passage.id}:${run.attempts}`);

  if (outcome.kind !== 'victory') {
    // Wounds are kept on both sides (§4.2): the wave the fight ended in keeps its survivors.
    const survivors = contestedFoes(outcome);
    const wave = pending.wave + outcome.wavesCleared + (survivors.length ? 0 : 1);
    run.pending = { ...pending, wave, wounds: survivors.length ? survivors : null };
    if (!run.company.some(isStanding)) {
      if (rules.last_page >= 1 && !run.flags.lastPage) {
        run.flags.lastPage = true;
        for (const member of run.company) member.hp = LAST_PAGE_SHARE;
      } else endExpedition(ctx, 'defeat', receipt);
    }
    return ok(receipt);
  }

  // A victory's wounds, then what heals after one.
  if (rules.after_fight_wound > 0)
    for (const member of run.company)
      if (isStanding(member) && outcome.units.some((u) => u.instanceId === member.id))
        member.hp = Math.max(0.01, member.hp - rules.after_fight_wound);
  if (rules.heal_after_victory > 0) heal(run, rules.heal_after_victory, 'all', ctx.roster, rng);
  if (rules.phoenix >= 1 && !run.flags.phoenix && fell[0]) {
    const risen = rekindle(run, PHOENIX_SHARE, fell[0]);
    if (risen) {
      run.flags.phoenix = true;
      run.tale.push({
        kind: 'rekindled',
        folio: run.folio,
        who: championOf(risen, ctx.roster, ctx.world)?.id ?? risen.id,
      });
    }
  }

  const kind = pending.fight;
  const gilt = fightGilt(run, kind, rules);
  run.gilt += gilt;
  run.flags.doubleGilt = false;
  let relic: string | null = null;
  if (kind === 'elite' && !pending.duel) {
    const left = relicsLeft(ctx, run, rules);
    relic = left.length ? rng.pick(left) : null;
    if (relic) addRelic(run, relic, receipt);
  }
  let tithe: ReturnType<typeof takeTithe> = [];
  const queue: Pending[] = [];
  if (kind === 'warden') {
    tithe = takeTithe(ctx.unwritten, ctx.weekKey, run.folio, run.omen);
    pay(receipt, tithe);
    ctx.unwritten.records.wardens += 1;
    bump(receipt, 'unwritten.wardens');
    const folio = ctx.world.content.folios[run.folio - 1];
    run.tale.push({ kind: 'warden', folio: run.folio, id: folio?.warden ?? '' });
    // The Herald's mockery pays its extra relics outright; the Warden's own is chosen.
    for (let i = 0; i < run.flags.wardenRelics; i += 1) {
      const left = relicsLeft(ctx, run, rules);
      if (left.length) addRelic(run, rng.pick(left), receipt);
    }
    const choice = rng.shuffle(relicsLeft(ctx, run, rules)).slice(0, WARDEN_RELIC_CHOICE);
    if (choice.length) queue.push({ kind: 'relic_choice', relics: choice });
  }
  const from = pending.duel ? 'duel' : kind;
  const cards = drawOffer({
    rng: createRng(`${run.seed}:offer:${run.folio}:${passage.id}:0`),
    source: from,
    rules,
    held: run.inscriptions,
    inscriptions: ctx.world.content.inscriptions,
  });
  const healed = rules.heal_after_victory;
  run.spoils = { gilt, pages: passagePages(passage.kind, rules), relic, tithe, healed };
  run.pending = cards.length ? { kind: 'offer', from, cards, draws: 0 } : null;
  run.queue = queue;
  if (!run.pending) advance(ctx, run, receipt);
  return ok(receipt);
}
