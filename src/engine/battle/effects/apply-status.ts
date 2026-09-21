/** `apply_status` effect: landing rolls in `statuses.ts`; Bleed fixes its tick from the last hit. */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { isDebuff } from '@engine/battle/conditions';
import { applyStatus, bleedTick } from '@engine/battle/statuses';
import type { BattleUnit } from '@engine/battle/types';

type ApplyStatusEffect = Extract<Effect, { kind: 'apply_status' }>;

export function resolveApplyStatus(
  ctx: ActionContext,
  source: BattleUnit,
  targets: BattleUnit[],
  effect: ApplyStatusEffect,
): void {
  let landed = 0;
  for (const target of targets) {
    // `maxTargets` stops rolling once it has its quota: a Stun aimed at the party that may only
    // catch one of them (Gargoyle's Stonequake) rolls down the line until one sticks.
    if (effect.maxTargets !== undefined && landed >= effect.maxTargets) break;
    const value = effect.status === 'bleed' ? bleedTick(ctx.state.lastHitDamage, effect.value) : effect.value;
    const result = applyStatus(ctx, source, target, effect.status, effect.turns, {
      chance: effect.chance,
      value,
    });
    if (result.outcome !== 'applied') continue;
    landed += 1;
    if (isDebuff(effect.status)) ctx.trigger('onDebuffLanded', source, { debuffed: target, target });
  }
}
