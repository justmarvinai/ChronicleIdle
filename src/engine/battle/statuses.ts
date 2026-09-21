/**
 * Status bookkeeping (BATTLE.md §5): landing rolls, stacking and refresh rules, duration ticks,
 * DoT/regen amounts and shield absorption. Death and healing side effects live in `combat.ts`.
 */
import {
  BLEED_PCT,
  BURN_ATK_MULT,
  BURN_PCT,
  MAX_STATUSES_PER_UNIT,
  POISON_PCT,
  REGEN_PCT,
  STATUS_DEFAULT_VALUE,
  STATUS_MAX_STACKS,
  type StatusId,
} from './imports';
import { isDebuff } from './conditions';
import { debuffLands } from './formulas';
import { effectiveStat } from './stats';
import type { ActionContext } from './context';
import type { BattleUnit, StatusInstance } from './types';

export type ApplyResult =
  | { outcome: 'applied'; status: StatusInstance; refreshed: boolean }
  | { outcome: 'missed' | 'resisted' | 'blocked' | 'immune' | 'full' };

export interface ApplyOptions {
  /** Base landing chance in % (100 = only RES/ACC can stop a debuff). */
  chance: number;
  /** Effect value; `undefined` uses the status default (shields: % of the source's max HP). */
  value?: number | undefined;
  /** Skip the chance and resist rolls (passive grants, Revive on Death consumption). */
  guaranteed?: boolean;
}

/** Resolves the absolute value a status carries when placed by `source` on `target`. */
export function statusValue(source: BattleUnit, id: StatusId, value: number | undefined): number {
  let v = value ?? STATUS_DEFAULT_VALUE[id];
  // `status_value_override` passives (Rattledagger's 6 % Poison) change what this unit places.
  for (const passive of source.passives) {
    if (passive.trigger !== 'static') continue;
    for (const effect of passive.effects)
      if (effect.kind === 'status_value_override' && effect.status === id) v = effect.value;
  }
  if (id === 'shield') return Math.round((v / 100) * source.maxHp);
  return v;
}

/**
 * Remembers that a *kind* of debuff has landed on a unit, and says so once a passive that counts
 * them can no longer hold (Gargoyle's hide breaks on the fifth distinct debuff). The count only
 * ever grows, so a broken passive stays broken for the fight.
 */
function noteDebuffKind(ctx: ActionContext, target: BattleUnit, id: StatusId): void {
  if (target.flags.debuffKindsTaken.includes(id)) return;
  target.flags.debuffKindsTaken.push(id);
  const count = target.flags.debuffKindsTaken.length;
  for (const passive of target.passives) {
    if (passive.trigger !== 'static') continue;
    for (const effect of passive.effects) {
      if (effect.kind !== 'damage_reduction' || !effect.if) continue;
      if (!('selfDistinctDebuffsBelow' in effect.if) || effect.if.selfDistinctDebuffsBelow !== count)
        continue;
      ctx.events.push({ type: 'passive.broken', unitId: target.id, passiveId: passive.id });
    }
  }
}

/** Applies (or refreshes) a status with all landing rules; emits the matching event. */
export function applyStatus(
  ctx: ActionContext,
  source: BattleUnit,
  target: BattleUnit,
  id: StatusId,
  turns: number,
  options: ApplyOptions,
): ApplyResult {
  const debuff = isDebuff(id);
  const fail = (reason: 'missed' | 'resisted' | 'blocked' | 'immune' | 'full'): ApplyResult => {
    ctx.events.push({ type: 'status.failed', targetId: target.id, sourceId: source.id, status: id, reason });
    return { outcome: reason };
  };
  if (!target.alive) return fail('missed');
  if (target.immunities.includes(id)) return fail('immune');
  if (debuff && target.statuses.some((s) => s.id === 'block_debuffs')) return fail('blocked');
  if (!debuff && target.statuses.some((s) => s.id === 'block_buffs')) return fail('blocked');
  if (!options.guaranteed) {
    if (debuff) {
      const roll = debuffLands(
        options.chance,
        effectiveStat(ctx.state, target, 'res'),
        effectiveStat(ctx.state, source, 'acc'),
        ctx.state.rng.next(),
        ctx.state.rng.next(),
      );
      if (roll !== 'landed') return fail(roll);
    } else if (options.chance < 100 && ctx.state.rng.next() >= options.chance / 100) {
      return fail('missed');
    }
  }
  const value = statusValue(source, id, options.value);
  const existing = target.statuses.find((s) => s.id === id);
  const maxStacks = STATUS_MAX_STACKS[id] ?? 1;
  if (existing) {
    if (debuff) noteDebuffKind(ctx, target, id);
    if (maxStacks > 1 && existing.stacks < maxStacks) {
      existing.stacks += 1;
      existing.turns = Math.max(existing.turns, turns);
      existing.value = Math.max(existing.value, value);
    } else {
      // Refresh: the higher value wins, duration restarts (shields top up to the larger amount).
      existing.turns = Math.max(existing.turns, turns);
      existing.value = Math.max(existing.value, value);
    }
    existing.sourceId = source.id;
    existing.placedAt = ctx.state.actionSeq;
    ctx.events.push({
      type: 'status.applied',
      targetId: target.id,
      sourceId: source.id,
      status: id,
      turns: existing.turns,
      value: existing.value,
      stacks: existing.stacks,
      refreshed: true,
    });
    return { outcome: 'applied', status: existing, refreshed: true };
  }
  if (target.statuses.length >= MAX_STATUSES_PER_UNIT) return fail('full');
  if (debuff) noteDebuffKind(ctx, target, id);
  const status: StatusInstance = {
    id,
    turns,
    value,
    stacks: 1,
    sourceId: source.id,
    placedAt: ctx.state.actionSeq,
  };
  target.statuses.push(status);
  ctx.events.push({
    type: 'status.applied',
    targetId: target.id,
    sourceId: source.id,
    status: id,
    turns,
    value,
    stacks: 1,
    refreshed: false,
  });
  return { outcome: 'applied', status, refreshed: false };
}

/** Removes up to `count` buffs or debuffs, newest first (BATTLE.md §4.4). Returns removed ids. */
export function removeStatuses(
  ctx: ActionContext,
  target: BattleUnit,
  which: 'buffs' | 'debuffs',
  count: number | 'all',
  reason: 'cleansed' | 'stripped' | 'consumed',
): StatusId[] {
  const removed: StatusId[] = [];
  const limit = count === 'all' ? Infinity : count;
  for (let i = target.statuses.length - 1; i >= 0 && removed.length < limit; i--) {
    const status = target.statuses[i];
    if (!status) continue;
    const debuff = isDebuff(status.id);
    if ((which === 'debuffs') !== debuff) continue;
    target.statuses.splice(i, 1);
    removed.push(status.id);
    ctx.events.push({ type: 'status.removed', targetId: target.id, status: status.id, reason });
  }
  return removed;
}

/**
 * Takes buffs off `from` and wears them (BOSSES.md §3, Titan's Dirge): newest first, same turns
 * and same value, so a steal is a strip the thief profits from. A shield stays where it is — its
 * value is the HP it still absorbs, which cannot move to another unit's pool.
 */
export function stealBuffs(ctx: ActionContext, from: BattleUnit, to: BattleUnit, count: number): StatusId[] {
  const taken: StatusInstance[] = [];
  for (let i = from.statuses.length - 1; i >= 0 && taken.length < count; i--) {
    const status = from.statuses[i];
    if (!status || isDebuff(status.id) || status.id === 'shield') continue;
    from.statuses.splice(i, 1);
    taken.push(status);
    ctx.events.push({ type: 'status.removed', targetId: from.id, status: status.id, reason: 'stripped' });
  }
  for (const status of taken)
    applyStatus(ctx, to, to, status.id, status.turns, {
      chance: 100,
      value: status.value,
      guaranteed: true,
    });
  return taken.map((status) => status.id);
}

export function removeStatusById(
  ctx: ActionContext,
  target: BattleUnit,
  id: StatusId,
  reason: 'expired' | 'cleansed' | 'stripped' | 'consumed' | 'woke',
): boolean {
  const index = target.statuses.findIndex((s) => s.id === id);
  if (index < 0) return false;
  target.statuses.splice(index, 1);
  ctx.events.push({ type: 'status.removed', targetId: target.id, status: id, reason });
  return true;
}

/**
 * Turn-start duration tick (BATTLE.md §3.1). A status the unit placed on itself during its own
 * previous action keeps its full duration through this first tick.
 */
export function tickDurations(ctx: ActionContext, unit: BattleUnit): void {
  for (let i = unit.statuses.length - 1; i >= 0; i--) {
    const status = unit.statuses[i];
    if (!status) continue;
    const selfPlacedLastAction =
      status.sourceId === unit.id && status.placedAt === unit.flags.lastActionSeq && status.placedAt > 0;
    if (selfPlacedLastAction) {
      // Consume the grace by detaching it from the action that granted it.
      status.placedAt = -1;
      continue;
    }
    status.turns -= 1;
    if (status.turns <= 0) {
      unit.statuses.splice(i, 1);
      ctx.events.push({ type: 'status.removed', targetId: unit.id, status: status.id, reason: 'expired' });
    }
  }
}

/** Absorbs `amount` with the unit's shields (newest first); depleted shields are removed. */
export function absorbWithShields(ctx: ActionContext, unit: BattleUnit, amount: number): number {
  let remaining = amount;
  for (let i = unit.statuses.length - 1; i >= 0 && remaining > 0; i--) {
    const status = unit.statuses[i];
    if (!status || status.id !== 'shield') continue;
    const used = Math.min(status.value, remaining);
    status.value -= used;
    remaining -= used;
    if (status.value <= 0) {
      unit.statuses.splice(i, 1);
      ctx.events.push({ type: 'status.removed', targetId: unit.id, status: 'shield', reason: 'consumed' });
    }
  }
  return amount - remaining;
}

/** Damage a DoT status deals per tick (BATTLE.md §5). */
export function dotAmount(ctx: ActionContext, unit: BattleUnit, status: StatusInstance): number {
  switch (status.id) {
    case 'poison':
      return Math.floor(unit.maxHp * ((status.value || POISON_PCT * 100) / 100) * status.stacks);
    case 'burn': {
      const placer = ctx.state.units[status.sourceId];
      const atk = placer ? effectiveStat(ctx.state, placer, 'atk') : 0;
      return Math.floor(unit.maxHp * ((status.value || BURN_PCT * 100) / 100) + BURN_ATK_MULT * atk);
    }
    case 'bleed':
      // `value` is the per-tick damage fixed when the placing hit landed.
      return Math.floor(status.value * status.stacks);
    default:
      return 0;
  }
}

/** Per-tick bleed damage from the hit that placed it: `pct` of the hit (BLEED_PCT default). */
export function bleedTick(hitDamage: number, pct: number | undefined): number {
  return Math.max(1, Math.floor(hitDamage * ((pct ?? BLEED_PCT * 100) / 100)));
}

export function regenAmount(unit: BattleUnit, status: StatusInstance): number {
  return Math.floor(unit.maxHp * ((status.value || REGEN_PCT * 100) / 100));
}

export function isSkipStatus(id: StatusId): id is 'stun' | 'freeze' | 'sleep' {
  return id === 'stun' || id === 'freeze' || id === 'sleep';
}
