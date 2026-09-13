/** `revive` effect: dead allies return at `hpPercent` with no statuses (BATTLE.md §4.2). */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { reviveUnit } from '@engine/battle/combat';
import type { BattleUnit } from '@engine/battle/types';

type ReviveEffect = Extract<Effect, { kind: 'revive' }>;

export function resolveRevive(ctx: ActionContext, targets: BattleUnit[], effect: ReviveEffect): void {
  for (const target of targets) if (!target.alive) reviveUnit(ctx, target, effect.hpPercent);
}
