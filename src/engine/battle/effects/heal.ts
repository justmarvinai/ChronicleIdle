/** `heal` effect (BATTLE.md §4.2): `k × sourceStat × (1 + healBonus) × (1 − healReduction)`. */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { healUnit } from '@engine/battle/combat';
import { isDebuff } from '@engine/battle/conditions';
import { healing } from '@engine/battle/formulas';
import { effectiveStat } from '@engine/battle/stats';
import type { BattleUnit } from '@engine/battle/types';

type HealEffect = Extract<Effect, { kind: 'heal' }>;

function healStat(
  ctx: ActionContext,
  source: BattleUnit,
  target: BattleUnit,
  stat: HealEffect['stat'],
): number {
  switch (stat) {
    case 'ATK':
      return effectiveStat(ctx.state, source, 'atk');
    case 'HP':
    case 'CASTER_MAX_HP':
      return source.maxHp;
    case 'TARGET_MAX_HP':
      return target.maxHp;
  }
}

/** Heal Reduction on the target as a fraction (0.5 / 1). */
export function healReduction(target: BattleUnit): number {
  let total = 0;
  for (const s of target.statuses) if (s.id === 'heal_reduction') total = Math.max(total, s.value / 100);
  return Math.min(1, total);
}

/**
 * `per: 'target_debuff'` multiplies the heal by the debuffs on the action's target — Gravemaw
 * eats the curses off a champion. With none on them the heal is worth nothing at all.
 */
function perMultiplier(ctx: ActionContext, effect: HealEffect): number {
  if (effect.per !== 'target_debuff') return 1;
  const target = ctx.primaryTarget;
  return target ? target.statuses.filter((status) => isDebuff(status.id)).length : 0;
}

export function resolveHeal(
  ctx: ActionContext,
  source: BattleUnit,
  targets: BattleUnit[],
  effect: HealEffect,
): void {
  const mult = effect.mult * perMultiplier(ctx, effect);
  if (mult <= 0) return;
  for (const target of targets) {
    if (!target.alive) continue;
    const amount = healing(mult, healStat(ctx, source, target, effect.stat), 0, healReduction(target));
    healUnit(ctx, source, target, amount, 'ability');
  }
}
