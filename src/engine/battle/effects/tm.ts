/** `tm` effect: instant turn-meter change with an optional chance (never resisted, BATTLE.md §5). */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { changeTm } from '@engine/battle/combat';
import type { BattleUnit } from '@engine/battle/types';

type TmEffect = Extract<Effect, { kind: 'tm' }>;

export function resolveTm(
  ctx: ActionContext,
  source: BattleUnit,
  targets: BattleUnit[],
  effect: TmEffect,
): void {
  for (const target of targets) {
    if (!target.alive) continue;
    if (effect.chance !== undefined && effect.chance < 100 && ctx.state.rng.next() >= effect.chance / 100)
      continue;
    changeTm(ctx, source, target, effect.delta);
  }
}
