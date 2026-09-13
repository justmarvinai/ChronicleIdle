/**
 * Target resolution for the effect DSL (BATTLE.md §6) and the legal targets offered to the
 * player (§8): Veil hides units from single-target abilities, Provoke forces the A1 on the
 * provoker, and `retarget_single_attacks` sends single attacks elsewhere while an ally lives.
 */
import type { AbilityDef, Target } from './imports';
import { alliesOf, enemiesOf, hasStatus } from './stats';
import type { BattleState, BattleUnit, Targeting } from './types';

export function targetingOf(ability: AbilityDef): Targeting {
  for (const effect of ability.effects) {
    const t = primaryTarget(effect);
    if (t === 'single_enemy') return 'single_enemy';
    if (t === 'single_ally') return 'single_ally';
  }
  return 'none';
}

function primaryTarget(effect: AbilityDef['effects'][number]): Target | null {
  if (effect.kind === 'leech') return null;
  if (effect.kind === 'conditional') {
    for (const e of effect.then) {
      const t = primaryTarget(e);
      if (t) return t;
    }
    return null;
  }
  return effect.target;
}

/** Enemies a single-target ability may pick (Veil excluded unless nobody else is left). */
export function targetableEnemies(state: BattleState, actor: BattleUnit): BattleUnit[] {
  const enemies = enemiesOf(state, actor);
  const visible = enemies.filter((e) => !hasStatus(e, 'veil'));
  return visible.length ? visible : enemies;
}

export function targetableAllies(state: BattleState, actor: BattleUnit, includeDead = false): BattleUnit[] {
  return alliesOf(state, actor, includeDead);
}

/** Legal explicit targets for an ability, or `[]` when it needs none. */
export function validTargets(state: BattleState, actor: BattleUnit, ability: AbilityDef): string[] {
  const targeting = targetingOf(ability);
  if (targeting === 'single_enemy') return targetableEnemies(state, actor).map((u) => u.id);
  if (targeting === 'single_ally') {
    const revives = ability.effects.some((e) => e.kind === 'revive');
    return targetableAllies(state, actor, revives)
      .filter((u) => (revives ? !u.alive : u.alive))
      .map((u) => u.id);
  }
  return [];
}

/** The provoker forcing this unit's A1, if a Provoke is active and its source still lives. */
export function provoker(state: BattleState, unit: BattleUnit): BattleUnit | null {
  const provoke = unit.statuses.find((s) => s.id === 'provoke');
  if (!provoke) return null;
  const source = state.units[provoke.sourceId];
  return source && source.alive && source.side !== unit.side ? source : null;
}

/**
 * Applies `retarget_single_attacks` (Morrigan's Veiled): a single attack aimed at the unit
 * lands on another living ally of hers instead, chosen deterministically (highest HP).
 */
export function redirectSingleAttack(state: BattleState, target: BattleUnit): BattleUnit {
  const retargets = target.passives.some(
    (p) => p.trigger === 'static' && p.effects.some((e) => e.kind === 'retarget_single_attacks'),
  );
  if (!retargets) return target;
  const others = alliesOf(state, target).filter((u) => u.id !== target.id);
  if (!others.length) return target;
  return others.reduce((best, u) => (u.hp > best.hp ? u : best));
}

export interface ResolveInput {
  state: BattleState;
  actor: BattleUnit;
  /** The decision's explicit target (single-target abilities). */
  chosen: BattleUnit | null;
  /** Set once a damage effect resolved, for `adjacent_to_target` and `provoker`. */
  lastHit: BattleUnit | null;
}

/** Units an effect applies to, in slot order; dead units are excluded except for revives. */
export function resolveTargets(input: ResolveInput, target: Target, forRevive = false): BattleUnit[] {
  const { state, actor } = input;
  const enemies = enemiesOf(state, actor);
  const allies = alliesOf(state, actor, forRevive);
  if (typeof target === 'string') {
    switch (target) {
      case 'self':
        return [actor];
      case 'single_enemy': {
        const chosen =
          input.chosen && input.chosen.side !== actor.side && input.chosen.alive ? input.chosen : null;
        const picked = chosen ?? enemies[0] ?? null;
        return picked ? [redirectSingleAttack(state, picked)] : [];
      }
      case 'all_enemies':
        return enemies;
      case 'single_ally': {
        const chosen = input.chosen && input.chosen.side === actor.side ? input.chosen : null;
        if (forRevive) return chosen && !chosen.alive ? [chosen] : allies.filter((u) => !u.alive).slice(0, 1);
        return chosen && chosen.alive ? [chosen] : [actor];
      }
      case 'all_allies':
        return forRevive ? allies.filter((u) => !u.alive) : allies;
      case 'lowest_hp_ally':
        return lowestHp(
          allies.filter((u) => u.alive),
          1,
        );
      case 'lowest_hp_allies_2':
        return lowestHp(
          allies.filter((u) => u.alive),
          2,
        );
      case 'all_dead_allies':
        return alliesOf(state, actor, true).filter((u) => !u.alive);
      case 'highest_atk_enemies_2':
        return [...enemies].sort((a, b) => b.base.atk - a.base.atk || a.slot - b.slot).slice(0, 2);
      case 'provoker': {
        const p = provoker(state, actor);
        return p ? [p] : enemies.slice(0, 1);
      }
      default:
        return [];
    }
  }
  if ('random_enemies' in target) {
    const pool = [...enemies];
    const out: BattleUnit[] = [];
    // With replacement when fewer enemies than hits, so multi-hit abilities keep their hit count.
    for (let i = 0; i < target.random_enemies && pool.length; i++) out.push(state.rng.pick(pool));
    return out;
  }
  if ('adjacent_to_target' in target) {
    const centre = input.lastHit ?? input.chosen;
    if (!centre) return [];
    return enemies
      .filter((u) => u.id !== centre.id && Math.abs(u.slot - centre.slot) <= target.adjacent_to_target)
      .sort((a, b) => a.slot - b.slot);
  }
  return [];
}

function lowestHp(units: BattleUnit[], count: number): BattleUnit[] {
  return [...units].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.slot - b.slot).slice(0, count);
}
