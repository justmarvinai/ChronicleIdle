/**
 * Effective battle stats: base × (1 + Σ status %) + static passive and aura modifiers
 * (BATTLE.md §5 buffs/debuffs, §6 `stat_mod`). Computed on demand so a buff expiring or a
 * conditional aura is always reflected without bookkeeping.
 */
import type { BattleState, BattleUnit } from './types';
import type { PassiveEffect, StatId, StatusId } from './imports';
import { evaluateCondition } from './conditions';

const PERCENT_STATUS: Partial<Record<StatusId, { stat: StatId; sign: 1 | -1 }>> = {
  atk_up: { stat: 'atk', sign: 1 },
  def_up: { stat: 'def', sign: 1 },
  spd_up: { stat: 'spd', sign: 1 },
  crit_rate_up: { stat: 'critRate', sign: 1 },
  atk_down: { stat: 'atk', sign: -1 },
  def_down: { stat: 'def', sign: -1 },
  spd_down: { stat: 'spd', sign: -1 },
};

export function hasStatus(unit: BattleUnit, id: StatusId): boolean {
  return unit.statuses.some((s) => s.id === id);
}

export function findStatus(unit: BattleUnit, id: StatusId): StatusInstanceOf | undefined {
  return unit.statuses.find((s) => s.id === id);
}
type StatusInstanceOf = BattleUnit['statuses'][number];

export function hpFraction(unit: BattleUnit): number {
  return unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
}

/** Sum of active shields on the unit. */
export function shieldTotal(unit: BattleUnit): number {
  let total = 0;
  for (const s of unit.statuses) if (s.id === 'shield') total += s.value;
  return total;
}

/** Static passive and aura `stat_mod` effects that apply to `unit` right now. */
function* staticMods(
  state: BattleState,
  unit: BattleUnit,
): Generator<Extract<PassiveEffect, { kind: 'stat_mod' }>> {
  for (const passive of unit.passives) {
    if (passive.trigger !== 'static') continue;
    for (const effect of passive.effects) {
      if (effect.kind !== 'stat_mod') continue;
      if (effect.if && !evaluateCondition(state, effect.if, { self: unit })) continue;
      yield effect;
    }
  }
  for (const id of state.order) {
    const other = state.units[id];
    if (!other || other.side !== unit.side || !other.aura) continue;
    if (other.aura.scope && other.aura.scope !== 'all') {
      if (other.aura.scope === 'campaign' && state.kind === 'boss') continue;
      if (other.aura.scope === 'boss' && state.kind !== 'boss') continue;
    }
    for (const effect of other.aura.effects) {
      if (effect.kind !== 'stat_mod') continue;
      if (effect.if && !evaluateCondition(state, effect.if, { self: unit })) continue;
      yield effect;
    }
  }
}

/** Effective value of one stat (BATTLE.md §5): percent modifiers add up, flats apply last, HP never changes mid-battle. */
export function effectiveStat(state: BattleState, unit: BattleUnit, stat: StatId): number {
  if (stat === 'hp') return unit.maxHp;
  let percent = 0;
  let flat = 0;
  for (const status of unit.statuses) {
    const mod = PERCENT_STATUS[status.id];
    if (mod && mod.stat === stat) percent += mod.sign * status.value;
    if (status.id === 'res_up' && stat === 'res') flat += status.value;
  }
  for (const mod of staticMods(state, unit)) {
    if (mod.stat !== stat) continue;
    percent += mod.percent ?? 0;
    flat += mod.flat ?? 0;
  }
  const value = unit.base[stat] * (1 + percent / 100) + flat;
  return stat === 'critRate' ? Math.max(0, Math.min(100, value)) : Math.max(0, value);
}

/** Max HP at battle entry includes static `hp` modifiers (auras, passives); statuses never change it. */
export function entryMaxHp(state: BattleState, unit: BattleUnit): number {
  let percent = 0;
  let flat = 0;
  for (const mod of staticMods(state, unit)) {
    if (mod.stat !== 'hp') continue;
    percent += mod.percent ?? 0;
    flat += mod.flat ?? 0;
  }
  return Math.round(unit.base.hp * (1 + percent / 100) + flat);
}

/** Threat used by targeting rules (BATTLE.md §7): ATK × SPD. */
export function threat(state: BattleState, unit: BattleUnit): number {
  return effectiveStat(state, unit, 'atk') * effectiveStat(state, unit, 'spd');
}

export function alliesOf(state: BattleState, unit: BattleUnit, includeDead = false): BattleUnit[] {
  return state.order
    .map((id) => state.units[id])
    .filter((u): u is BattleUnit => !!u && u.side === unit.side && (includeDead || u.alive));
}

export function enemiesOf(state: BattleState, unit: BattleUnit): BattleUnit[] {
  return state.order
    .map((id) => state.units[id])
    .filter((u): u is BattleUnit => !!u && u.side !== unit.side && u.alive);
}

export function livingUnits(state: BattleState, side: BattleUnit['side']): BattleUnit[] {
  return state.order
    .map((id) => state.units[id])
    .filter((u): u is BattleUnit => !!u && u.side === side && u.alive);
}

export function unitOrThrow(state: BattleState, id: string): BattleUnit {
  const unit = state.units[id];
  if (!unit) throw new Error(`Unknown battle unit ${id}`);
  return unit;
}
