/** `extra_turn` effect: the actor's TM resets to 1 after this action instead of 0 (BATTLE.md §2). */
import type { Effect } from '@engine/battle/imports';
import { evaluateCondition } from '@engine/battle/conditions';
import type { ActionContext } from '@engine/battle/context';
import type { BattleUnit } from '@engine/battle/types';

type ExtraTurnEffect = Extract<Effect, { kind: 'extra_turn' }>;

export function resolveExtraTurn(ctx: ActionContext, source: BattleUnit, effect: ExtraTurnEffect): void {
  if (
    effect.if &&
    !evaluateCondition(ctx.state, effect.if, {
      self: source,
      target: ctx.primaryTarget ?? undefined,
      killedThisAction: ctx.killedThisAction,
    })
  )
    return;
  if (source.id !== ctx.actor.id) return;
  source.flags.extraTurn = true;
  ctx.events.push({ type: 'extra_turn', unitId: source.id });
}
