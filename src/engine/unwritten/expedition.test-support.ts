/**
 * Fixtures the Unwritten's tests share: a roster, an expedition begun on the real content, and
 * battle reports to settle it with. Test-only (`*.test-support.ts` crosses layers like a test).
 */
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import type { BattleOutcome, UnitReport } from '@engine/battle/types';
import { createInstance, type Roster } from '@engine/champions/instance';
import { emptyUnwritten, type Expedition, type UnwrittenSave } from '@engine/schema/unwritten-save';
import { UNWRITTEN_WORLD } from '@state/unwritten/world';
import { chooseOffer, chooseRelic } from './choices';
import type { UnwrittenCtx } from './context';
import { settleFight } from './fight';
import { beginExpedition } from './lifecycle';

/** Two of Justice, two of Faith: the elements the bearer tests lean on. */
export const COMPANY: ChampionId[] = [
  'champ.ser_corvin',
  'champ.bran_militia',
  'champ.wenna_novice',
  'champ.sister_maelis',
];

export function rosterOf(ids: readonly ChampionId[]): Roster {
  const roster: Roster = {};
  ids.forEach((id, i) => {
    const def = content.championById(id);
    if (!def) throw new Error(id);
    const instance = createInstance(def, { instanceId: `c${i + 1}`, now: 0, source: 'summon' });
    roster[instance.instanceId] = { ...instance, level: 30, stars: 4 };
  });
  return roster;
}

export function setup(unwritten: UnwrittenSave = emptyUnwritten(), weekKey = 'week-1') {
  const roster = rosterOf(COMPANY);
  const ctx: UnwrittenCtx = { unwritten, world: UNWRITTEN_WORLD, roster, now: 1_000, weekKey };
  return { ctx, roster };
}

export function begin(ctx: UnwrittenCtx, company = ['c1', 'c2', 'c3', 'c4'], omen = 0): Expedition {
  const begun = beginExpedition(ctx, { omen, company, seedRoot: 'test' });
  if (!begun.ok) throw new Error(begun.error.message);
  const run = ctx.unwritten.run;
  if (!run) throw new Error('no run');
  return run;
}

/** Points the next step at a passage of this kind by rewriting it (the map is drawn at random). */
export function nextIs(run: Expedition, kind: Expedition['map'][number]['kind']): string {
  const open = run.walked.length
    ? (run.map.find((p) => p.id === run.walked[run.walked.length - 1])?.next ?? [])
    : run.map.filter((p) => p.row === 1).map((p) => p.id);
  const id = open[0];
  const passage = run.map.find((p) => p.id === id);
  if (!passage || !id) throw new Error('nowhere to go');
  passage.kind = kind;
  if (kind === 'skirmish' || kind === 'elite')
    passage.faction = passage.faction ?? 'faction.thornwood_bandits';
  return id;
}

/** Walks the company to the last row, so the Warden is next. */
export function toWarden(run: Expedition): void {
  run.walked = run.map
    .filter((p) => p.row === 8)
    .slice(0, 1)
    .map((p) => p.id);
}

export const report = (unit: Partial<UnitReport> & Pick<UnitReport, 'unitId' | 'side'>): UnitReport => ({
  defId: 'x',
  instanceId: null,
  alive: true,
  died: false,
  damageDealt: 0,
  damageTaken: 0,
  healingDone: 0,
  kills: 0,
  hp: 1000,
  maxHp: 1000,
  ...unit,
});

export function outcome(kind: BattleOutcome['kind'], units: UnitReport[], wavesCleared = 0): BattleOutcome {
  return {
    kind,
    turns: 10,
    allyTurns: 5,
    wavesCleared,
    waveCount: 2,
    units,
    enemyHpLeft: 0,
    seed: 's',
    decisions: [],
  };
}

/** The fielded champions, standing at these shares of their max HP. */
export const allies = (shares: Record<string, number>): UnitReport[] =>
  Object.entries(shares).map(([id, share], slot) =>
    report({
      unitId: `a${slot}`,
      side: 'ally',
      instanceId: id,
      alive: share > 0,
      hp: Math.round(share * 1000),
    }),
  );

/** Wins the fight in hand with the company at `share` of its HP, writes the first card and returns. */
export function winAndWrite(ctx: UnwrittenCtx, fielded = ['c1', 'c2', 'c3', 'c4'], share = 1): void {
  const settled = settleFight(
    ctx,
    outcome('victory', allies(Object.fromEntries(fielded.map((id) => [id, share])))),
  );
  if (!settled.ok) throw new Error(settled.error.message);
  const run = ctx.unwritten.run;
  if (run?.pending?.kind === 'offer') chooseOffer(ctx, 0);
  while (ctx.unwritten.run?.pending?.kind === 'relic_choice') chooseRelic(ctx, 0);
}
