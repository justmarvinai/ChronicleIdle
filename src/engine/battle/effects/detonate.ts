/** `detonate` effect: consumes a DoT and deals a share of its remaining ticks at once. */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { applyHit } from '@engine/battle/combat';
import { elementMatch } from '@engine/battle/formulas';
import { dotAmount, removeStatusById } from '@engine/battle/statuses';
import type { BattleUnit } from '@engine/battle/types';

type DetonateEffect = Extract<Effect, { kind: 'detonate' }>;

export function resolveDetonate(
  ctx: ActionContext,
  source: BattleUnit,
  targets: BattleUnit[],
  effect: DetonateEffect,
): void {
  for (const target of targets) {
    if (!target.alive) continue;
    const status = target.statuses.find((s) => s.id === effect.status);
    if (!status) continue;
    const remaining = dotAmount(ctx, target, status) * status.turns;
    const amount = Math.max(1, Math.floor(remaining * (effect.percentOfRemaining / 100)));
    removeStatusById(ctx, target, effect.status, 'consumed');
    applyHit(ctx, source, target, amount, {
      abilityId: ctx.abilityId,
      crit: false,
      match: elementMatch(source.element, target.element),
      redirectedFrom: null,
      triggers: false,
    });
  }
}
