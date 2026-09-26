/**
 * Per-action context threaded through effect resolvers, status handling and passive triggers.
 * The two callbacks are injected by the step loop so low-level modules never import the
 * modules above them (effects → combat → passives → effects would otherwise be a cycle).
 */
import type { Effect, PassiveTrigger } from './imports';
import type { BattleEvent, BattleState, BattleUnit } from './types';

export interface TriggerExtra {
  target?: BattleUnit | undefined;
  /** For `onHitTaken`/`onAllyHit`: who hit. */
  attacker?: BattleUnit | undefined;
  /** For `onHeal`: who was healed. */
  healed?: BattleUnit | undefined;
  /** For `onDebuffLanded`: the debuffed unit. */
  debuffed?: BattleUnit | undefined;
  /** For `onHit`: what that hit took off, shield included — lifesteal heals a share of it. */
  damage?: number | undefined;
}

export interface ActionContext {
  state: BattleState;
  events: BattleEvent[];
  /** The unit whose action this is (counterattacks and passives run inside the victim's or owner's own context). */
  actor: BattleUnit;
  abilityId: string;
  primaryTarget: BattleUnit | null;
  killedThisAction: boolean;
  /** Nested counterattack depth; counters never counter counters. */
  counterDepth: number;
  /** `attacker` is the foe whose hit set off the passive running these effects, for the `attacker` target. */
  runEffects(
    effects: readonly Effect[],
    source: BattleUnit,
    target: BattleUnit | null,
    attacker?: BattleUnit | null,
  ): void;
  trigger(trigger: PassiveTrigger, unit: BattleUnit, extra?: TriggerExtra): void;
}

export function tmSnapshot(state: BattleState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of state.order) {
    const u = state.units[id];
    if (u) out[id] = Math.round(u.tm * 1000) / 1000;
  }
  return out;
}
