/**
 * Condition evaluation for the effect DSL (BATTLE.md §6). Conditions read the live state;
 * `ctx` supplies what the state cannot know (the current target, kills this action, the
 * attacker's element for damage-reduction passives).
 */
import type { Condition, Element } from './imports';
import type { BattleState, BattleUnit } from './types';

export interface ConditionContext {
  self: BattleUnit;
  target?: BattleUnit | undefined;
  killedThisAction?: boolean | undefined;
  attackerElement?: Element | undefined;
}

const DEBUFF_SET = new Set<string>([
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

export function isDebuff(id: string): boolean {
  return DEBUFF_SET.has(id);
}

export function evaluateCondition(state: BattleState, condition: Condition, ctx: ConditionContext): boolean {
  const { self, target } = ctx;
  if ('targetHas' in condition) return !!target && target.statuses.some((s) => s.id === condition.targetHas);
  if ('targetHasAnyDebuff' in condition) return !!target && target.statuses.some((s) => isDebuff(s.id));
  if ('selfDistinctDebuffsBelow' in condition)
    return self.flags.debuffKindsTaken.length < condition.selfDistinctDebuffsBelow;
  if ('selfPhaseAtLeast' in condition) return self.phase >= condition.selfPhaseAtLeast;
  if ('targetHpBelow' in condition)
    return !!target && target.maxHp > 0 && (target.hp / target.maxHp) * 100 < condition.targetHpBelow;
  if ('killedThisAction' in condition) return ctx.killedThisAction === true;
  if ('selfHpBelow' in condition)
    return self.maxHp > 0 && (self.hp / self.maxHp) * 100 < condition.selfHpBelow;
  if ('alliesBelowHp' in condition) {
    const { percent, count } = condition.alliesBelowHp;
    const n = sideUnits(state, self.side).filter((u) => u.alive && (u.hp / u.maxHp) * 100 < percent).length;
    return n >= count;
  }
  if ('alliesBelowTm' in condition) {
    const { percent, count } = condition.alliesBelowTm;
    const n = sideUnits(state, self.side).filter((u) => u.alive && u.tm * 100 < percent).length;
    return n >= count;
  }
  if ('enemiesAlive' in condition) {
    const n = sideUnits(state, self.side === 'ally' ? 'enemy' : 'ally').filter((u) => u.alive).length;
    const { gte, lte } = condition.enemiesAlive;
    return (gte === undefined || n >= gte) && (lte === undefined || n <= lte);
  }
  if ('waveStart' in condition) return state.waveFresh;
  if ('attackerElement' in condition) return ctx.attackerElement === condition.attackerElement;
  if ('selfHas' in condition) return self.statuses.some((s) => s.id === condition.selfHas);
  return false;
}

function sideUnits(state: BattleState, side: BattleUnit['side']): BattleUnit[] {
  return state.order.map((id) => state.units[id]).filter((u): u is BattleUnit => !!u && u.side === side);
}
