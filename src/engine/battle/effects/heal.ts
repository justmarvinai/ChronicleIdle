/** `heal` effect (BATTLE.md §4.2): `k × sourceStat × (1 + healBonus) × (1 − healReduction)`. */
import type { Effect } from '@engine/battle/imports';
import type { ActionContext } from '@engine/battle/context';
import { healUnit } from '@engine/battle/combat';
import { evaluateCondition, isDebuff } from '@engine/battle/conditions';
import { healing } from '@engine/battle/formulas';
import { effectiveStat, enemiesOf } from '@engine/battle/stats';
import type { BattleState, BattleUnit } from '@engine/battle/types';

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

/**
 * Heal Reduction on the target as a fraction (0.5 / 1): the debuff it carries, and any enemy
 * passive that dims healing while its condition holds — Titan's Un-light in its last phase
 * (BOSSES.md §3). The strongest source wins rather than stacking, as elsewhere in §5.
 */
export function healReduction(state: BattleState, target: BattleUnit): number {
  let total = 0;
  for (const s of target.statuses) if (s.id === 'heal_reduction') total = Math.max(total, s.value / 100);
  for (const enemy of enemiesOf(state, target)) {
    if (!enemy.alive) continue;
    for (const passive of enemy.passives) {
      if (passive.trigger !== 'static') continue;
      for (const effect of passive.effects) {
        if (effect.kind !== 'enemy_heal_reduction') continue;
        if (effect.if && !evaluateCondition(state, effect.if, { self: enemy, target })) continue;
        total = Math.max(total, effect.value / 100);
      }
    }
  }
  return Math.min(1, total);
}

/**
 * `per: 'target_debuff'` multiplies the heal by the debuffs on the action's target — Gargoyle
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
    const amount = healing(
      mult,
      healStat(ctx, source, target, effect.stat),
      0,
      healReduction(ctx.state, target),
    );
    healUnit(ctx, source, target, amount, 'ability');
  }
}
