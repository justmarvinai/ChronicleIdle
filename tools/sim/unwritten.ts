/**
 * Headless expeditions into the Unwritten (docs/design/UNWRITTEN.md §20).
 *
 * A whole expedition is played through the engine the game plays: `beginExpedition`, the map, the
 * real `planFight` → `createBattle` → `settleFight` path with its scaling, wounds and inscriptions,
 * and every passage's own reducer. Only the choices are the sim's, and they are a plain policy a
 * careful player would recognise:
 *
 * - **the path**: fights while the company is healthy, the Elites first; the shrine, the Peddler and
 *   the mysteries when it is hurt;
 * - **an offer**: the ink the company already writes in, then the rarer card;
 * - **a fight**: the healthiest four still standing;
 * - **a shrine**: raise the fallen, else rest the hurt, else scrape a blot, else deepen;
 * - **the Peddler**: ash for the fallen, a salve for the hurt, then inscriptions of the held inks;
 * - **a mystery**: the first choice the company can take.
 *
 * Deterministic: every expedition runs on its own seed, so a report is reproducible.
 */
import { COMPANY_MAX, UNWRITTEN_PARTY } from '@content/balance/unwritten';
import type { ChampionDef } from '@content/champions/types';
import type { InscriptionDef, PassageKind } from '@content/unwritten/types';
import { createBattle, type PartyMember } from '@engine/battle/create';
import { runAuto } from '@engine/battle/step';
import type { Roster } from '@engine/champions/instance';
import type { Result } from '@engine/errors';
import { emptyUnwritten, type Expedition, type UnwrittenSave } from '@engine/schema/unwritten-save';
import {
  abandonExpedition,
  beginExpedition,
  chooseEcho,
  chooseMystery,
  chooseOffer,
  chooseRelic,
  enterPassage,
  expeditionRules,
  inkCounts,
  meets,
  peddlerServices,
  planFight,
  reachable,
  settleFight,
  useRekindleToken,
  usePeddler,
  useShrine,
  type UnwrittenCtx,
  type UnwrittenWorld,
} from '@engine/unwritten/index';
import { UNWRITTEN_WORLD } from '@state/unwritten/world';
import { buildParty, type SimTeam } from './teams';

/** What one expedition came to. */
export interface ExpeditionResult {
  won: boolean;
  /** The folio it ended in (3 when won). */
  folio: number;
  wardens: number;
  fights: number;
  /** Fights lost or timed out: each one a retry with the wounds kept. */
  setbacks: number;
  fallen: number;
  pages: number;
}

export interface ExpeditionSummary {
  team: string;
  omen: number;
  runs: number;
  rate: number;
  /** Mean folio reached, mean Wardens felled, mean fights and setbacks per expedition. */
  folio: number;
  wardens: number;
  fights: number;
  setbacks: number;
}

/** A passage the sim would take, best first: healthy, a fight; hurt, a place to mend. */
const HEALTHY: readonly PassageKind[] = [
  'elite',
  'skirmish',
  'reliquary',
  'echo',
  'mystery',
  'peddler',
  'shrine',
];
const HURT: readonly PassageKind[] = [
  'shrine',
  'peddler',
  'mystery',
  'reliquary',
  'echo',
  'skirmish',
  'elite',
];
/** Below this mean health (of those standing), or with this many fallen, the company is hurt. */
const HURT_BELOW = 0.6;
const RARITY_RANK: Readonly<Record<InscriptionDef['rarity'], number>> = {
  common: 0,
  rare: 1,
  epic: 2,
  legendary: 3,
};
/** Attempts at one passage before the sim walks away from the expedition. */
const ATTEMPTS_MAX = 16;
/** Steps a whole expedition may take before the sim calls it stuck. */
const STEPS_MAX = 600;

/** The sim's roster and world: the team's six at its stars and level, in its modelled gear. */
function simWorld(team: SimTeam, company: readonly string[]): { roster: Roster; world: UnwrittenWorld } {
  const party = buildParty({ ...team, champions: company });
  const roster: Roster = {};
  const defs = new Map<string, ChampionDef>();
  for (const member of party) {
    roster[member.instance.instanceId] = member.instance;
    defs.set(member.def.id, member.def);
  }
  const world: UnwrittenWorld = {
    ...UNWRITTEN_WORLD,
    // The team's own champions fight in their modelled gear; an Echo stands in for nobody's.
    championById: (id) => defs.get(id) ?? UNWRITTEN_WORLD.championById(id),
  };
  return { roster, world };
}

const standingOf = (run: Expedition) => run.company.filter((member) => member.hp > 0);
const meanHp = (run: Expedition): number => {
  const up = standingOf(run);
  return up.length ? up.reduce((sum, member) => sum + member.hp, 0) / up.length : 0;
};
const hurt = (run: Expedition): boolean =>
  meanHp(run) < HURT_BELOW || run.company.some((member) => member.hp <= 0);

function nextPassage(run: Expedition): string | null {
  const open = reachable(run.map, run.walked);
  const order = hurt(run) ? HURT : HEALTHY;
  const rank = (kind: PassageKind): number => {
    const at = order.indexOf(kind);
    return at < 0 ? order.length : at;
  };
  const best = [...open].sort((a, b) => rank(a.kind) - rank(b.kind) || a.lane - b.lane)[0];
  return best?.id ?? null;
}

/** Inks the company already writes in, most-written first. */
function heldInks(ctx: UnwrittenCtx, run: Expedition): string[] {
  const byId = (id: string) => ctx.world.content.inscriptions.find((def) => def.id === id);
  const counts = inkCounts(run.inscriptions, byId);
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([ink]) => ink);
}

/** An inscription's worth to the sim: a held ink first, then its rarity, then a deeper level. */
function cardScore(ctx: UnwrittenCtx, run: Expedition, id: string, level: number): number {
  const def = ctx.world.content.inscriptions.find((d) => d.id === id);
  if (!def) return -1;
  const inks = heldInks(ctx, run);
  const inHeld = def.inks.some((ink) => inks.includes(ink));
  const leading = inks[0] !== undefined && def.inks.includes(inks[0] as never);
  return (leading ? 20 : inHeld ? 10 : 0) + RARITY_RANK[def.rarity] * 3 + level;
}

function fightOnce(ctx: UnwrittenCtx, run: Expedition): Result<unknown> {
  const fielded = [...standingOf(run)]
    .sort((a, b) => b.hp - a.hp)
    .slice(0, UNWRITTEN_PARTY)
    .map((member) => member.id);
  const plan = planFight(ctx, fielded);
  if (!plan.ok) return plan;
  const party: PartyMember[] = plan.value.fielded.map((id) => {
    const instance = plan.value.echoes[id] ?? ctx.roster[id];
    const def = instance ? ctx.world.championById(instance.defId) : undefined;
    if (!instance || !def) throw new Error(`no champion ${id}`);
    return { instance, def };
  });
  const state = createBattle(
    {
      encounter: plan.value.encounter,
      party,
      enemyById: plan.value.enemyById,
      shaping: plan.value.shaping,
      control: 'auto',
    },
    plan.value.seed,
  );
  const { outcome } = runAuto(state);
  return settleFight(ctx, outcome);
}

function useShrineWell(ctx: UnwrittenCtx, run: Expedition): void {
  const fallen = run.company.filter((member) => member.hp <= 0);
  if (fallen[0]) {
    useShrine(ctx, { kind: 'rekindle', member: fallen[0].id });
    return;
  }
  if (meanHp(run) < 0.8) {
    useShrine(ctx, { kind: 'rest' });
    return;
  }
  const blot = run.blots[0];
  if (blot) {
    useShrine(ctx, { kind: 'scrape', blot });
    return;
  }
  const deepen = run.inscriptions.find((held) => held.level < 3);
  useShrine(ctx, deepen ? { kind: 'reink', inscription: deepen.id } : { kind: 'rest' });
}

function shopWell(ctx: UnwrittenCtx, run: Expedition): void {
  const pending = run.pending;
  if (pending?.kind !== 'peddler') return;
  const prices = peddlerServices(expeditionRules(ctx.unwritten, run, ctx.world));
  const fallen = run.company.find((member) => member.hp <= 0);
  if (fallen && !pending.ash && run.gilt >= prices.ash) usePeddler(ctx, { kind: 'ash', member: fallen.id });
  if (meanHp(run) < HURT_BELOW && run.gilt >= prices.salve) usePeddler(ctx, { kind: 'salve' });
  // The wares, best first, while the purse holds.
  const wares = pending.wares
    .map((ware, index) => ({ ware, index }))
    .filter(({ ware }) => !ware.sold)
    .sort((a, b) => {
      const score = (w: typeof a.ware) => (w.kind === 'relic' ? 15 : cardScore(ctx, run, w.id, w.level ?? 1));
      return score(b.ware) - score(a.ware);
    });
  for (const { ware, index } of wares)
    if (run.gilt >= ware.price) usePeddler(ctx, { kind: 'buy', ware: index });
  usePeddler(ctx, { kind: 'leave' });
}

/** Plays one expedition to its end and says how it went. */
export function playExpedition(
  team: SimTeam,
  company: readonly string[],
  omen: number,
  seed: string,
  scriptorium: readonly string[],
): ExpeditionResult {
  const { roster, world } = simWorld(team, company);
  const unwritten: UnwrittenSave = { ...emptyUnwritten(), scriptorium: [...scriptorium] };
  unwritten.omen.open = omen;
  const ctx: UnwrittenCtx = { unwritten, world, roster, now: 0, weekKey: 'sim' };
  const ids = Object.keys(roster);
  const begun = beginExpedition(ctx, { omen, company: ids.slice(0, COMPANY_MAX), seedRoot: seed });
  if (!begun.ok) throw new Error(begun.error.message);

  let fights = 0;
  let setbacks = 0;
  let lastAt: string | null = null;
  let attempts = 0;
  for (let step = 0; step < STEPS_MAX && unwritten.run; step += 1) {
    const run: Expedition = unwritten.run;
    // A token raises the fallen the moment there is one.
    const fallen = run.company.find((member) => member.hp <= 0);
    if (fallen && run.tokens > 0) useRekindleToken(ctx, fallen.id);
    const pending = run.pending;
    if (!pending) {
      const id = nextPassage(run);
      if (!id || !enterPassage(ctx, id).ok) break;
      continue;
    }
    switch (pending.kind) {
      case 'fight': {
        attempts = run.at === lastAt ? attempts + 1 : 1;
        lastAt = run.at;
        if (attempts > ATTEMPTS_MAX) {
          abandonExpedition(ctx);
          break;
        }
        fights += 1;
        fightOnce(ctx, run);
        if (unwritten.run?.pending?.kind === 'fight') setbacks += 1;
        break;
      }
      case 'offer': {
        const best = pending.cards
          .map((card, index) => ({ index, score: cardScore(ctx, run, card.id, card.level) }))
          .sort((a, b) => b.score - a.score)[0];
        chooseOffer(ctx, best ? best.index : null);
        break;
      }
      case 'relic_choice':
      case 'reliquary':
        chooseRelic(ctx, 0);
        break;
      case 'mystery': {
        const def = ctx.world.content.mysteries.find((m) => m.id === pending.id);
        const index = def ? def.choices.findIndex((choice) => meets(run, choice.requires)) : -1;
        chooseMystery(ctx, Math.max(0, index));
        break;
      }
      case 'shrine':
        useShrineWell(ctx, run);
        break;
      case 'peddler':
        shopWell(ctx, run);
        break;
      case 'echo':
        chooseEcho(ctx, run.company.length < COMPANY_MAX ? 0 : null);
        break;
    }
  }
  if (unwritten.run) abandonExpedition(ctx);
  const tale = unwritten.tales[0];
  return {
    won: tale?.result === 'victory',
    folio: tale?.folio ?? 1,
    wardens: tale?.wardens ?? 0,
    fights,
    setbacks,
    fallen: tale?.entries.filter((entry) => entry.kind === 'fell').length ?? 0,
    pages: tale?.pages ?? 0,
  };
}

/** `runs` expeditions of one team at one Omen, on fixed seeds. */
export function simulateExpeditions(
  team: SimTeam,
  company: readonly string[],
  omen: number,
  runs: number,
  scriptorium: readonly string[],
): ExpeditionSummary {
  const results = Array.from({ length: runs }, (_, i) =>
    playExpedition(team, company, omen, `sim:${team.id}:omen${omen}:${i}`, scriptorium),
  );
  const mean = (pick: (r: ExpeditionResult) => number): number =>
    results.reduce((sum, r) => sum + pick(r), 0) / Math.max(1, runs);
  return {
    team: team.id,
    omen,
    runs,
    rate: mean((r) => (r.won ? 1 : 0)),
    folio: mean((r) => r.folio),
    wardens: mean((r) => r.wardens),
    fights: mean((r) => r.fights),
    setbacks: mean((r) => r.setbacks),
  };
}
