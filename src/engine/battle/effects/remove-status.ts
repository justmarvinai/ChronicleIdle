/** `remove_status` effect: cleanse debuffs or strip buffs, newest first (BATTLE.md §4.4). */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { removeStatuses } from '@engine/battle/statuses';
import type { BattleUnit } from '@engine/battle/types';

type RemoveStatusEffect = Extract<Effect, { kind: 'remove_status' }>;

export function resolveRemoveStatus(
  ctx: ActionContext,
  targets: BattleUnit[],
  effect: RemoveStatusEffect,
): void {
  for (const target of targets) {
    if (!target.alive) continue;
    removeStatuses(
      ctx,
      target,
      effect.which,
      effect.count,
      effect.which === 'debuffs' ? 'cleansed' : 'stripped',
    );
  }
}
