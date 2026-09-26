/**
 * The Unwritten's fights played for real: a plan built from an expedition goes into the battle
 * engine, the fight runs to its end on auto, and its outcome settles back into the expedition.
 */
import { describe, expect, it } from 'vitest';
import { createBattle, type PartyMember } from '@engine/battle/create';
import { step } from '@engine/battle/step';
import type { BattleOutcome, BattleState } from '@engine/battle/types';
import type { Roster } from '@engine/champions/instance';
import { UNWRITTEN_WORLD } from '@state/unwritten/world';
import type { UnwrittenCtx } from './context';
import { begin, nextIs, setup, toWarden } from './expedition.test-support';
import { planFight, settleFight, type FightPlan } from './fight';
import { enterPassage } from './lifecycle';
import { WARDEN_PASSAGE } from './map';

function party(plan: FightPlan, roster: Roster): PartyMember[] {
  return plan.fielded.map((id) => {
    const instance = plan.echoes[id] ?? roster[id];
    const def = instance ? UNWRITTEN_WORLD.championById(instance.defId) : undefined;
    if (!instance || !def) throw new Error(`no champion ${id}`);
    return { instance, def };
  });
}

function fight(ctx: UnwrittenCtx, fielded: string[]): { state: BattleState; outcome: BattleOutcome } {
  const plan = planFight(ctx, fielded);
  if (!plan.ok) throw new Error(plan.error.message);
  const state = createBattle(
    {
      encounter: plan.value.encounter,
      party: party(plan.value, ctx.roster),
      enemyById: plan.value.enemyById,
      shaping: plan.value.shaping,
      control: 'auto',
    },
    plan.value.seed,
  );
  for (let i = 0; i < 5000 && !state.outcome; i += 1) step(state);
  if (!state.outcome) throw new Error('the fight never ended');
  return { state, outcome: state.outcome };
}

describe('an Unwritten fight in the battle engine', () => {
  it('plays a Skirmish from its plan and settles what it left', () => {
    const { ctx } = setup();
    const run = begin(ctx);
    enterPassage(ctx, nextIs(run, 'skirmish'));
    const { state, outcome } = fight(ctx, ['c1', 'c2', 'c3', 'c4']);
    // Every unit reports the HP it ended on: that is what the expedition keeps.
    for (const unit of outcome.units) {
      expect(unit.maxHp).toBeGreaterThan(0);
      expect(unit.hp).toBeLessThanOrEqual(unit.maxHp);
      if (!unit.alive) expect(unit.hp).toBe(0);
    }
    const settled = settleFight(ctx, outcome);
    expect(settled.ok).toBe(true);
    if (outcome.kind === 'victory') {
      expect(ctx.unwritten.run?.pending?.kind).toBe('offer');
      for (const member of ctx.unwritten.run?.company ?? []) {
        const unit = outcome.units.find((u) => u.instanceId === member.id);
        expect(member.hp).toBeCloseTo((unit?.hp ?? 0) / (unit?.maxHp ?? 1), 6);
      }
    }
    expect(state.units).toBeDefined();
  });

  it('fights the same passage the same way from the same plan', () => {
    const once = () => {
      const { ctx } = setup();
      const run = begin(ctx);
      enterPassage(ctx, nextIs(run, 'elite'));
      return fight(ctx, ['c1', 'c2']).outcome;
    };
    expect(once()).toEqual(once());
  });

  it('stands every Warden up, phases and choir included, without a hitch', () => {
    const { ctx } = setup();
    ctx.unwritten.omen.open = 15;
    for (const folio of [1, 2, 3]) {
      const run = begin(ctx, ['c1', 'c2', 'c3', 'c4'], 15);
      run.folio = folio;
      toWarden(run);
      enterPassage(ctx, WARDEN_PASSAGE);
      const { outcome } = fight(ctx, ['c1', 'c2', 'c3', 'c4']);
      expect(['victory', 'defeat', 'timeout']).toContain(outcome.kind);
      // At the deepest Omen a level-30 company is outmatched: nobody walks this far unready.
      expect(outcome.kind).not.toBe('victory');
      ctx.unwritten.run = null;
    }
  });
});
