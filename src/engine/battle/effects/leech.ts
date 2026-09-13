/** `leech` effect: heals the actor for a share of the damage dealt so far this action. */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { healUnit } from '@engine/battle/combat';
import type { BattleUnit } from '@engine/battle/types';

type LeechEffect = Extract<Effect, { kind: 'leech' }>;

export function resolveLeech(ctx: ActionContext, source: BattleUnit, effect: LeechEffect): void {
  const amount = Math.floor(source.flags.actionDamage * (effect.percentOfDamage / 100));
  if (amount > 0) healUnit(ctx, source, source, amount, 'leech');
}
