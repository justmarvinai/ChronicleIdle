/**
 * `damage` effect (BATTLE.md §4.1, §6): per target, per hit — element, crit, mitigation,
 * outgoing bonuses, incoming reductions, variance — with repeat chances, on-kill effects and
 * kill-extended hit counts.
 */
import type { Effect, PassiveEffect } from '@engine/battle/imports';
import { evaluateCondition } from '@engine/battle/conditions';
import type { ActionContext } from '@engine/battle/context';
import { applyHit, damageReduction, incomingPenalty } from '@engine/battle/combat';
import { critLands, damage as damageFormula, elementMatch } from '@engine/battle/formulas';
import { effectiveStat, enemiesOf, hpFraction } from '@engine/battle/stats';
import { bleedTick } from '@engine/battle/statuses';
import type { BattleUnit } from '@engine/battle/types';

type DamageEffect = Extract<Effect, { kind: 'damage' }>;

export interface DamageOptions {
  /** Global multiplier (counterattacks use COUNTER_DMG_MULT). */
  mult?: number;
}

/** Σ outgoing damage bonuses from the attacker's static passives for this hit. */
export function outgoingBonus(
  ctx: ActionContext,
  source: BattleUnit,
  target: BattleUnit,
  crit: boolean,
): number {
  let total = 0;
  for (const passive of source.passives) {
    if (passive.trigger !== 'static') continue;
    for (const effect of passive.effects) total += bonusOf(ctx, effect, source, target, crit);
  }
  return total;
}

function bonusOf(
  ctx: ActionContext,
  effect: PassiveEffect,
  source: BattleUnit,
  target: BattleUnit,
  crit: boolean,
): number {
  switch (effect.kind) {
    case 'damage_bonus': {
      if (effect.scope === 'crit' && !crit) return 0;
      if (effect.scope === 'dot') return 0;
      if (effect.if && !evaluateCondition(ctx.state, effect.if, { self: source, target })) return 0;
      return effect.value;
    }
    case 'damage_bonus_per': {
      const count =
        effect.per === 'target_debuff'
          ? target.statuses.filter((s) => isDebuffId(s.id)).length
          : effect.per === 'missing_hp_10'
            ? Math.floor((1 - hpFraction(source)) * 10)
            : enemiesOf(ctx.state, source).filter((e) => e.statuses.some((s) => s.id === 'def_down')).length;
      return Math.min(effect.max, count * effect.value);
    }
    default:
      return 0;
  }
}

/** Extra crit rate (percentage points) from `crit_rate_per` passives. */
export function critBonusOf(ctx: ActionContext, source: BattleUnit): number {
  let total = 0;
  for (const passive of source.passives) {
    if (passive.trigger !== 'static') continue;
    for (const effect of passive.effects) {
      if (effect.kind !== 'crit_rate_per') continue;
      const count = enemiesOf(ctx.state, source).filter((e) =>
        e.statuses.some((s) => s.id === 'def_down'),
      ).length;
      total += Math.min(effect.max, count * effect.value);
    }
  }
  return total;
}

const DEBUFFS = new Set([
  'atk_down',
  'def_down',
  'spd_down',
  'weaken',
  'poison',
  'burn',
  'bleed',
  'stun',
  'freeze',
  'sleep',
  'provoke',
  'heal_reduction',
  'block_buffs',
  'fear',
]);
function isDebuffId(id: string): boolean {
  return DEBUFFS.has(id);
}

function sourceStatValue(
  ctx: ActionContext,
  source: BattleUnit,
  target: BattleUnit,
  stat: DamageEffect['stat'],
): number {
  switch (stat) {
    case 'ATK':
      return effectiveStat(ctx.state, source, 'atk');
    case 'DEF':
      return effectiveStat(ctx.state, source, 'def');
    case 'HP':
      return source.maxHp;
    case 'TARGET_MAX_HP':
      return target.maxHp;
  }
}

/** One computed hit on `target`; returns damage dealt (incl. absorbed) and whether it killed. */
export function strike(
  ctx: ActionContext,
  source: BattleUnit,
  target: BattleUnit,
  effect: DamageEffect,
  options: DamageOptions = {},
): { dealt: number; killed: boolean } {
  const match = elementMatch(source.element, target.element);
  const guaranteed =
    !!effect.guaranteedCritIf &&
    evaluateCondition(ctx.state, effect.guaranteedCritIf, { self: source, target });
  const critRoll = ctx.state.rng.next();
  const crit =
    guaranteed ||
    critLands(
      effectiveStat(ctx.state, source, 'critRate'),
      match,
      (effect.critBonus ?? 0) + critBonusOf(ctx, source),
      critRoll,
    );
  const raw = effect.mult * sourceStatValue(ctx, source, target, effect.stat) * (options.mult ?? 1);
  const amount = damageFormula({
    raw,
    match,
    crit,
    critDmg: effectiveStat(ctx.state, source, 'critDmg'),
    targetDef: effectiveStat(ctx.state, target, 'def'),
    attackerLevel: source.level,
    defIgnore: effect.defIgnore ?? 0,
    outgoing: outgoingBonus(ctx, source, target, crit),
    incoming: damageReduction(ctx, target, source, crit) - incomingPenalty(target),
    varianceRoll: ctx.state.rng.next(),
    takenMult: target.damageTakenMult,
  });
  const wasAlive = target.alive;
  const dealt = applyHit(ctx, source, target, amount, {
    abilityId: ctx.abilityId,
    crit,
    match,
    redirectedFrom: null,
    triggers: true,
  });
  ctx.trigger('onHit', source, { target, damage: dealt });
  return { dealt, killed: wasAlive && !target.alive };
}

/**
 * Resolves a damage effect. `reroll` re-picks targets for every hit after the first (random
 * targets spread multi-hit and kill-extended attacks across the enemy line).
 */
export function resolveDamage(
  ctx: ActionContext,
  source: BattleUnit,
  targets: BattleUnit[],
  effect: DamageEffect,
  reroll?: () => BattleUnit[],
): void {
  let hits = effect.hits ?? 1;
  let kills = 0;
  for (let h = 0; h < hits; h++) {
    const current = h === 0 || !reroll ? targets : reroll();
    for (const target of current) {
      if (!target.alive) continue;
      const result = strike(ctx, source, target, effect);
      // Bleed placed by this hit remembers the hit's damage (statuses.ts `bleedTick`).
      ctx.state.lastHitDamage = result.dealt;
      if (result.killed) {
        kills++;
        if (effect.onKill) ctx.runEffects(effect.onKill, source, target);
        if (effect.extendOnKill && hits < effect.extendOnKill.maxHits) hits++;
      }
    }
  }
  if (effect.repeatChance && ctx.state.rng.next() < effect.repeatChance / 100) {
    for (const target of reroll ? reroll() : targets) {
      if (!target.alive) continue;
      const result = strike(ctx, source, target, effect);
      ctx.state.lastHitDamage = result.dealt;
      if (result.killed && effect.onKill) ctx.runEffects(effect.onKill, source, target);
    }
  }
  void kills;
}

export { bleedTick };
