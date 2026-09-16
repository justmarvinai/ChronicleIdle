/** `steal_buff` effect (BATTLE.md §6): the caster takes buffs off its targets and wears them. */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { stealBuffs } from '@engine/battle/statuses';
import type { BattleUnit } from '@engine/battle/types';

type StealBuffEffect = Extract<Effect, { kind: 'steal_buff' }>;

export function resolveStealBuff(
  ctx: ActionContext,
  source: BattleUnit,
  targets: BattleUnit[],
  effect: StealBuffEffect,
): void {
  for (const target of targets) {
    if (!target.alive || target.id === source.id) continue;
    stealBuffs(ctx, target, source, effect.count);
  }
}
