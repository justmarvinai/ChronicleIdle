/**
 * Passive triggers (BATTLE.md §6). Active effects on a trigger run through the effect
 * dispatcher with the reacted-to unit as the chosen target; the passive-only reactive kinds
 * (`shield_ally_below`, `on_heal_grant`, `on_stun_gain_tm`) are handled here. Static kinds are
 * read where they matter (stats, damage, targeting) and never "fire".
 */
import type { Effect, PassiveEffect, PassiveTrigger } from './imports';
import { changeTm } from './combat';
import type { ActionContext, TriggerExtra } from './context';
import { hpFraction } from './stats';
import { applyStatus } from './statuses';
import type { BattleUnit } from './types';

const PASSIVE_ONLY = new Set<string>([
  'stat_mod',
  'damage_bonus',
  'damage_bonus_per',
  'crit_rate_per',
  'damage_reduction',
  'counterattack',
  'survive_lethal',
  'status_value_override',
  'retarget_single_attacks',
  'extra_turn_chance',
  'shield_ally_below',
  'on_heal_grant',
  'on_stun_gain_tm',
]);

function isActive(effect: PassiveEffect): effect is Effect {
  return !PASSIVE_ONLY.has(effect.kind);
}

/** Fires every passive of `unit` bound to `trigger`. */
export function firePassives(
  ctx: ActionContext,
  trigger: PassiveTrigger,
  unit: BattleUnit,
  extra: TriggerExtra = {},
): void {
  if (trigger === 'static' || (!unit.alive && trigger !== 'onDeath')) return;
  for (const passive of unit.passives) {
    if (passive.trigger !== trigger) continue;
    if (passive.oncePerBattle) {
      if (unit.flags.firedOnce.includes(passive.id)) continue;
      unit.flags.firedOnce.push(passive.id);
    }
    let fired = false;
    const reactive = passive.effects.filter((e) => !isActive(e));
    for (const effect of reactive) fired = reactTo(ctx, unit, effect, extra) || fired;
    const active = passive.effects.filter(isActive);
    if (active.length) {
      fired = true;
      ctx.runEffects(active, unit, extra.target ?? extra.healed ?? extra.debuffed ?? null);
    }
    if (fired) ctx.events.push({ type: 'passive.triggered', unitId: unit.id, passiveId: passive.id });
  }
}

function reactTo(ctx: ActionContext, unit: BattleUnit, effect: PassiveEffect, extra: TriggerExtra): boolean {
  switch (effect.kind) {
    case 'shield_ally_below': {
      const ally = extra.target;
      if (!ally || !ally.alive || ally.side !== unit.side) return false;
      if (hpFraction(ally) * 100 >= effect.hpPercent) return false;
      if (unit.flags.shieldedThisWave.includes(ally.id)) return false;
      unit.flags.shieldedThisWave.push(ally.id);
      applyStatus(ctx, unit, ally, 'shield', effect.turns, {
        chance: 100,
        value: effect.shield,
        guaranteed: true,
      });
      return true;
    }
    case 'on_heal_grant': {
      const healed = extra.healed;
      if (!healed || !healed.alive) return false;
      applyStatus(ctx, unit, healed, effect.status, effect.turns, {
        chance: 100,
        value: effect.value,
        guaranteed: true,
      });
      return true;
    }
    case 'on_stun_gain_tm': {
      const debuffed = extra.debuffed;
      if (!debuffed || !debuffed.statuses.some((s) => s.id === 'stun' && s.sourceId === unit.id))
        return false;
      changeTm(ctx, unit, unit, effect.delta);
      return true;
    }
    default:
      return false;
  }
}

/** `extra_turn_chance` passives (Relentless set): rolled once after the unit's action. */
export function extraTurnChance(unit: BattleUnit): number {
  let total = 0;
  for (const passive of unit.passives)
    if (passive.trigger === 'static')
      for (const effect of passive.effects) if (effect.kind === 'extra_turn_chance') total += effect.chance;
  return Math.min(100, total);
}
