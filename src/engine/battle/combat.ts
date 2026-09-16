/**
 * Applying damage, healing, death and revival to units (BATTLE.md §4, §5). Everything that
 * changes HP goes through here so shields, Ally Protection, Freeze, Weaken, damage-reduction
 * passives, Revive on Death, `survive_lethal` and the death/hit triggers behave the same for
 * abilities, counterattacks and DoTs.
 */
import { FREEZE_DAMAGE_TAKEN, REVIVE_ON_DEATH_HP, TM_OVERFLOW_CAP, type PassiveEffect } from './imports';
import { evaluateCondition } from './conditions';
import type { ActionContext } from './context';
import { hasStatus, hpFraction } from './stats';
import { absorbWithShields, applyStatus, removeStatusById } from './statuses';
import type { BattleUnit, ElementMatch, UnitReport } from './types';

export interface HitMeta {
  abilityId: string;
  crit: boolean;
  match: ElementMatch;
  /** Ally Protection redirects are already split by the caller; marks the protected unit. */
  redirectedFrom: string | null;
  /** DoT ticks and redirects skip on-hit triggers and further protection. */
  triggers: boolean;
}

/**
 * Who takes a share of this hit instead (BATTLE.md §5 Ally Protection): the buff's caster, or an
 * add still standing between the party and its master (BOSSES.md §3, Nyxara's Choristers). The
 * buff wins when both apply, because a champion's play should not be undone by the fight's own
 * furniture.
 */
function protectorOf(
  ctx: ActionContext,
  target: BattleUnit,
): { protector: BattleUnit; percent: number } | null {
  const protection = target.statuses.find((status) => status.id === 'ally_protection');
  const caster = protection ? ctx.state.units[protection.sourceId] : undefined;
  if (protection && caster?.alive && caster.id !== target.id)
    return { protector: caster, percent: protection.value };
  // `order` rather than the unit map, so the escort is searched in spawn order on every replay.
  for (const id of ctx.state.order) {
    const add = ctx.state.units[id];
    if (!add?.alive || add.guards?.unitId !== target.id) continue;
    return { protector: add, percent: add.guards.percent };
  }
  return null;
}

/**
 * Σ `damage_reduction` passive values that apply to `target` against `attacker` right now. A
 * reduction scoped to crits (Gravemaw's hide) only counts when the incoming hit is one.
 */
export function damageReduction(
  ctx: ActionContext,
  target: BattleUnit,
  attacker: BattleUnit | null,
  crit = false,
): number {
  let total = 0;
  for (const passive of target.passives) {
    if (passive.trigger !== 'static') continue;
    for (const effect of passive.effects) {
      if (effect.kind !== 'damage_reduction') continue;
      if (effect.scope === 'crit' && !crit) continue;
      if (
        effect.if &&
        !evaluateCondition(ctx.state, effect.if, {
          self: target,
          target: attacker ?? undefined,
          attackerElement: attacker?.element,
        })
      )
        continue;
      total += effect.value;
    }
  }
  return total;
}

/** Fractions added to incoming damage by the target's own state (Weaken, Freeze). */
export function incomingPenalty(target: BattleUnit): number {
  let total = 0;
  for (const status of target.statuses) {
    if (status.id === 'weaken') total += status.value / 100;
    if (status.id === 'freeze') total += FREEZE_DAMAGE_TAKEN;
  }
  return total;
}

export function report(ctx: ActionContext, unitId: string): UnitReport {
  const r = ctx.state.reports[unitId];
  if (r) return r;
  const unit = ctx.state.units[unitId];
  const fresh: UnitReport = {
    unitId,
    defId: unit?.defId ?? unitId,
    instanceId: unit?.instanceId ?? null,
    side: unit?.side ?? 'enemy',
    alive: unit?.alive ?? false,
    died: false,
    damageDealt: 0,
    damageTaken: 0,
    healingDone: 0,
    kills: 0,
  };
  ctx.state.reports[unitId] = fresh;
  return fresh;
}

/**
 * Applies a computed hit. Splits Ally Protection first (the protector takes their share as a
 * separate hit), then shields, then HP; handles lethal outcomes and triggers.
 */
export function applyHit(
  ctx: ActionContext,
  source: BattleUnit | null,
  target: BattleUnit,
  amount: number,
  meta: HitMeta,
): number {
  if (!target.alive) return 0;
  let remaining = amount;
  if (meta.triggers && !meta.redirectedFrom) {
    const split = protectorOf(ctx, target);
    if (split) {
      const share = Math.floor(amount * (split.percent / 100));
      if (share > 0) {
        remaining -= share;
        applyHit(ctx, source, split.protector, share, {
          ...meta,
          redirectedFrom: target.id,
          triggers: false,
        });
      }
    }
  }
  const absorbed = absorbWithShields(ctx, target, remaining);
  const toHp = remaining - absorbed;
  const before = target.hp;
  target.hp = Math.max(0, target.hp - toHp);
  const dealt = before - target.hp;
  if (source) {
    report(ctx, source.id).damageDealt += dealt + absorbed;
    if (source.id === ctx.actor.id) ctx.actor.flags.actionDamage += dealt + absorbed;
  }
  report(ctx, target.id).damageTaken += dealt;
  if (dealt > 0 && hasStatus(target, 'sleep')) removeStatusById(ctx, target, 'sleep', 'woke');
  let killed = false;
  if (target.hp <= 0) killed = resolveLethal(ctx, source, target);
  ctx.events.push({
    type: 'hit',
    sourceId: source?.id ?? target.id,
    targetId: target.id,
    abilityId: meta.abilityId,
    damage: dealt,
    absorbed,
    crit: meta.crit,
    match: meta.match,
    hpAfter: target.hp,
    shieldAfter: shieldTotalOf(target),
    killed,
    redirectedFrom: meta.redirectedFrom,
  });
  if (killed) {
    ctx.killedThisAction = true;
    if (source) report(ctx, source.id).kills += 1;
    report(ctx, target.id).died = true;
    ctx.events.push({ type: 'unit.died', unitId: target.id, killerId: source?.id ?? null });
    if (source && meta.triggers) ctx.trigger('onKill', source, { target });
    if (!target.flags.onDeathFired) {
      target.flags.onDeathFired = true;
      ctx.trigger('onDeath', target, { attacker: source ?? undefined });
    }
  } else if (meta.triggers && source) {
    ctx.trigger('onHitTaken', target, { attacker: source });
    for (const ally of alliesAlive(ctx, target))
      if (ally.id !== target.id) ctx.trigger('onAllyHit', ally, { target, attacker: source });
    // Counterattack (buff or passive): retaliate with A1 at COUNTER_DMG_MULT, never against a counter.
    // The Counter buff always retaliates; a passive may be a roll instead (Retaliation: 30 %).
    const counters = hasStatus(target, 'counter') || rollsCounter(ctx, target);
    if (counters && ctx.counterDepth === 0 && source.alive && source.side !== target.side) {
      counterattack(ctx, target, source);
    }
  }
  return dealt + absorbed;
}

/** True when one of the unit's `counterattack` passives fires; a missing chance means always. */
function rollsCounter(ctx: ActionContext, unit: BattleUnit): boolean {
  for (const passive of unit.passives) {
    if (passive.trigger !== 'static') continue;
    for (const effect of passive.effects) {
      if (effect.kind !== 'counterattack') continue;
      const chance = effect.chance ?? 100;
      if (chance >= 100 || ctx.state.rng.chance(chance / 100)) return true;
    }
  }
  return false;
}

function alliesAlive(ctx: ActionContext, unit: BattleUnit): BattleUnit[] {
  return ctx.state.order
    .map((id) => ctx.state.units[id])
    .filter((u): u is BattleUnit => !!u && u.side === unit.side && u.alive);
}

function shieldTotalOf(unit: BattleUnit): number {
  let t = 0;
  for (const s of unit.statuses) if (s.id === 'shield') t += s.value;
  return t;
}

/** Counterattacks are injected through the context so `combat` stays below `effects`. */
let counterattackImpl: ((ctx: ActionContext, unit: BattleUnit, target: BattleUnit) => void) | null = null;
export function registerCounterattack(impl: typeof counterattackImpl): void {
  counterattackImpl = impl;
}
function counterattack(ctx: ActionContext, unit: BattleUnit, target: BattleUnit): void {
  counterattackImpl?.(ctx, unit, target);
}

/** The unit reached 0 HP: `survive_lethal` (once per battle), then Revive on Death, else death. */
function resolveLethal(ctx: ActionContext, source: BattleUnit | null, target: BattleUnit): boolean {
  const survive = findSurviveLethal(target);
  if (survive && !target.flags.survivedLethal) {
    target.flags.survivedLethal = true;
    target.hp = Math.max(1, Math.floor(target.maxHp * (survive.hpPercent / 100)));
    ctx.events.push({
      type: 'unit.revived',
      unitId: target.id,
      hpAfter: target.hp,
      reason: 'survive_lethal',
    });
    if (survive.shield)
      applyStatus(ctx, target, target, 'shield', 2, { chance: 100, value: survive.shield, guaranteed: true });
    if (survive.healNextTurn) target.flags.healNextTurn = survive.healNextTurn;
    return false;
  }
  const revive = target.statuses.find((s) => s.id === 'revive_on_death');
  if (revive) {
    const pct = revive.value > 0 ? revive.value / 100 : REVIVE_ON_DEATH_HP;
    removeStatusById(ctx, target, 'revive_on_death', 'consumed');
    target.hp = Math.max(1, Math.floor(target.maxHp * pct));
    clearDebuffs(ctx, target);
    ctx.events.push({
      type: 'unit.revived',
      unitId: target.id,
      hpAfter: target.hp,
      reason: 'revive_on_death',
    });
    return false;
  }
  target.alive = false;
  target.hp = 0;
  target.tm = 0;
  target.statuses = [];
  report(ctx, target.id).alive = false;
  void source;
  return true;
}

function findSurviveLethal(unit: BattleUnit): Extract<PassiveEffect, { kind: 'survive_lethal' }> | null {
  for (const passive of unit.passives)
    for (const effect of passive.effects) if (effect.kind === 'survive_lethal') return effect;
  return null;
}

function clearDebuffs(ctx: ActionContext, unit: BattleUnit): void {
  for (let i = unit.statuses.length - 1; i >= 0; i--) {
    const s = unit.statuses[i];
    if (!s) continue;
    if (
      [
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
      ].includes(s.id)
    ) {
      unit.statuses.splice(i, 1);
      ctx.events.push({ type: 'status.removed', targetId: unit.id, status: s.id, reason: 'cleansed' });
    }
  }
}

/** Heals with Heal Reduction applied by the caller's formula; overheal discarded; fires `onHeal`. */
export function healUnit(
  ctx: ActionContext,
  source: BattleUnit,
  target: BattleUnit,
  amount: number,
  reason: 'ability' | 'regen' | 'leech' | 'survive',
): number {
  if (!target.alive || amount <= 0) return 0;
  const before = target.hp;
  target.hp = Math.min(target.maxHp, target.hp + amount);
  const healed = target.hp - before;
  // A heal that changes nothing (full HP) is not an event: no number, no log line, no trigger.
  if (healed <= 0) return 0;
  report(ctx, source.id).healingDone += healed;
  ctx.events.push({
    type: 'heal',
    sourceId: source.id,
    targetId: target.id,
    amount: healed,
    hpAfter: target.hp,
    reason,
  });
  if (reason === 'ability' && healed > 0) ctx.trigger('onHeal', source, { healed: target });
  return healed;
}

export function reviveUnit(ctx: ActionContext, target: BattleUnit, hpPercent: number): void {
  if (target.alive) return;
  target.alive = true;
  target.hp = Math.max(1, Math.floor(target.maxHp * (hpPercent / 100)));
  target.tm = 0;
  target.statuses = [];
  report(ctx, target.id).alive = true;
  ctx.events.push({ type: 'unit.revived', unitId: target.id, hpAfter: target.hp, reason: 'ability' });
}

const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;

/**
 * Turn-meter change clamped to [0, TM_OVERFLOW_CAP] (BATTLE.md §2). Gains for the unit whose
 * action this is are banked and applied after its end-of-turn reset, so "gain 30 % TM" on an
 * own ability is not wiped by the reset that follows.
 */
export function changeTm(ctx: ActionContext, source: BattleUnit, target: BattleUnit, delta: number): void {
  if (!target.alive) return;
  if (target.id === ctx.actor.id && ctx.state.pending === null && ctx.abilityId !== 'turn') {
    const before = target.flags.pendingTm;
    target.flags.pendingTm = Math.max(-TM_OVERFLOW_CAP, Math.min(TM_OVERFLOW_CAP, before + delta));
    ctx.events.push({
      type: 'tm.changed',
      targetId: target.id,
      sourceId: source.id,
      delta: round4(target.flags.pendingTm - before),
      tmAfter: round4(Math.max(0, target.flags.pendingTm)),
    });
    return;
  }
  const before = target.tm;
  target.tm = round4(Math.max(0, Math.min(TM_OVERFLOW_CAP, target.tm + delta)));
  ctx.events.push({
    type: 'tm.changed',
    targetId: target.id,
    sourceId: source.id,
    delta: round4(target.tm - before),
    tmAfter: target.tm,
  });
}

export { hpFraction };
