/**
 * Effect dispatch (BATTLE.md §6): resolves each effect's targets, then hands it to its resolver.
 * `conditional` evaluates against the primary target and this action's kills.
 */
import type { Effect } from '@engine/battle/imports';
import { evaluateCondition } from '@engine/battle/conditions';
import type { ActionContext } from '@engine/battle/context';
import { resolveTargets, type ResolveInput } from '@engine/battle/targets';
import type { BattleUnit } from '@engine/battle/types';
import { resolveApplyStatus } from './apply-status';
import { resolveDamage } from './damage';
import { resolveDetonate } from './detonate';
import { resolveExtraTurn } from './extra-turn';
import { resolveHeal } from './heal';
import { resolveLeech } from './leech';
import { resolveRemoveStatus } from './remove-status';
import { resolveRevive } from './revive';
import { resolveTm } from './tm';

export interface EffectRun {
  ctx: ActionContext;
  source: BattleUnit;
  /** Explicit target of the decision (or the unit a passive reacts to). */
  chosen: BattleUnit | null;
}

/** Runs effects in order; each resolves its own targets against the current state. */
export function runEffectList(run: EffectRun, effects: readonly Effect[]): void {
  const input: ResolveInput = { state: run.ctx.state, actor: run.source, chosen: run.chosen, lastHit: null };
  for (const effect of effects) resolveEffect(run, input, effect);
}

function resolveEffect(run: EffectRun, input: ResolveInput, effect: Effect): void {
  const { ctx, source } = run;
  switch (effect.kind) {
    case 'damage': {
      const targets = resolveTargets(input, effect.target);
      if (targets[0]) input.lastHit = targets[0];
      const random = typeof effect.target === 'object' && 'random_enemies' in effect.target;
      resolveDamage(
        ctx,
        source,
        targets,
        effect,
        random ? () => resolveTargets(input, effect.target) : undefined,
      );
      return;
    }
    case 'heal':
      resolveHeal(ctx, source, resolveTargets(input, effect.target), effect);
      return;
    case 'apply_status':
      resolveApplyStatus(ctx, source, resolveTargets(input, effect.target), effect);
      return;
    case 'remove_status':
      resolveRemoveStatus(ctx, resolveTargets(input, effect.target), effect);
      return;
    case 'tm':
      resolveTm(ctx, source, resolveTargets(input, effect.target), effect);
      return;
    case 'revive':
      resolveRevive(ctx, resolveTargets(input, effect.target, true), effect);
      return;
    case 'extra_turn':
      resolveExtraTurn(ctx, source, effect);
      return;
    case 'detonate':
      resolveDetonate(ctx, source, resolveTargets(input, effect.target), effect);
      return;
    case 'leech':
      resolveLeech(ctx, source, effect);
      return;
    case 'conditional': {
      const holds = evaluateCondition(ctx.state, effect.if, {
        self: source,
        target: input.lastHit ?? input.chosen ?? undefined,
        killedThisAction: ctx.killedThisAction,
      });
      const branch = holds ? effect.then : (effect.else ?? []);
      for (const e of branch) resolveEffect(run, input, e);
      return;
    }
  }
}
