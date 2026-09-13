/**
 * Auto-battle policy (BATTLE.md §7): the highest-priority usable ability whose `when` holds
 * and whose `avoid` does not, A1 as the fallback; targets by ability kind; enemies pick
 * threat-weighted random targets; bosses follow their scripted rotation.
 */
import {
  AI_HEAL_SKIP_TEAM_HP,
  AI_TM_BOOST_ALLIES_BELOW,
  AI_TM_BOOST_MIN_ALLIES,
  AI_WAVE_START_BUFF_BONUS,
  type Effect,
} from './imports';
import { evaluateCondition } from './conditions';
import { damage as damageFormula, elementMatch } from './formulas';
import { alliesOf, effectiveStat, enemiesOf, hpFraction, shieldTotal, threat } from './stats';
import { isDebuff } from './conditions';
import { provoker, targetableAllies, targetableEnemies, targetingOf } from './targets';
import type { TargetPreference } from './imports';
import type { BattleState, BattleUnit, Decision, UnitAbility } from './types';

function flatten(effects: readonly Effect[]): Effect[] {
  const out: Effect[] = [];
  for (const e of effects) {
    out.push(e);
    if (e.kind === 'conditional') out.push(...flatten(e.then), ...flatten(e.else ?? []));
    if (e.kind === 'damage' && e.onKill) out.push(...flatten(e.onKill));
  }
  return out;
}

function hasEffect(ability: UnitAbility, predicate: (e: Effect) => boolean): boolean {
  return flatten(ability.def.effects).some(predicate);
}

const isAllyTarget = (e: Effect): boolean =>
  'target' in e &&
  (e.target === 'self' ||
    e.target === 'single_ally' ||
    e.target === 'all_allies' ||
    e.target === 'lowest_hp_ally' ||
    e.target === 'lowest_hp_allies_2' ||
    e.target === 'all_dead_allies');

const isBuffEffect = (e: Effect): boolean =>
  e.kind === 'apply_status' && !isDebuff(e.status) && isAllyTarget(e);
const isHealEffect = (e: Effect): boolean => e.kind === 'heal';
const isReviveEffect = (e: Effect): boolean => e.kind === 'revive';
const isAllyTmBoost = (e: Effect): boolean => e.kind === 'tm' && e.delta > 0 && isAllyTarget(e);
const isDamageEffect = (e: Effect): boolean => e.kind === 'damage';

/** Expected damage of the ability's first hit without crit or variance (for "could kill" checks). */
export function estimateDamage(
  state: BattleState,
  source: BattleUnit,
  target: BattleUnit,
  ability: UnitAbility,
): number {
  const first = flatten(ability.def.effects).find(
    (e): e is Extract<Effect, { kind: 'damage' }> => e.kind === 'damage',
  );
  if (!first) return 0;
  const stat =
    first.stat === 'ATK'
      ? effectiveStat(state, source, 'atk')
      : first.stat === 'DEF'
        ? effectiveStat(state, source, 'def')
        : first.stat === 'HP'
          ? source.maxHp
          : target.maxHp;
  const hits = first.hits ?? 1;
  return (
    damageFormula({
      raw: first.mult * stat,
      match: elementMatch(source.element, target.element),
      crit: false,
      critDmg: 0,
      targetDef: effectiveStat(state, target, 'def'),
      attackerLevel: source.level,
      defIgnore: first.defIgnore ?? 0,
      outgoing: 0,
      incoming: 0,
      varianceRoll: 0.5,
      takenMult: target.damageTakenMult,
    }) * hits
  );
}

/** Whether the ability is worth using now under the global rules (BATTLE.md §7). */
function passesGlobalRules(state: BattleState, unit: BattleUnit, ability: UnitAbility): boolean {
  const allies = alliesOf(state, unit);
  const dealsDamage = hasEffect(ability, isDamageEffect);
  if (hasEffect(ability, isReviveEffect) && !alliesOf(state, unit, true).some((u) => !u.alive)) return false;
  if (!dealsDamage && hasEffect(ability, isHealEffect)) {
    const teamHp =
      allies.reduce((sum, u) => sum + u.hp, 0) /
      Math.max(
        1,
        allies.reduce((sum, u) => sum + u.maxHp, 0),
      );
    if (teamHp > AI_HEAL_SKIP_TEAM_HP) return false;
  }
  if (!dealsDamage && hasEffect(ability, isAllyTmBoost) && !hasEffect(ability, isBuffEffect)) {
    const low = allies.filter((u) => u.tm < AI_TM_BOOST_ALLIES_BELOW).length;
    if (low < AI_TM_BOOST_MIN_ALLIES) return false;
  }
  return true;
}

function abilityScore(
  state: BattleState,
  unit: BattleUnit,
  ability: UnitAbility,
  target: BattleUnit | null,
): number | null {
  const ai = ability.def.ai;
  const ctx = { self: unit, target: target ?? undefined };
  if (ai.when && !evaluateCondition(state, ai.when, ctx)) return null;
  if (ai.avoid && evaluateCondition(state, ai.avoid, ctx)) return null;
  let score = ai.priority;
  if (state.waveFresh && hasEffect(ability, isBuffEffect)) score += AI_WAVE_START_BUFF_BONUS;
  return score;
}

/** `ai.prefer`: the ability names who it goes for, whoever casts it (BATTLE.md §7). */
function preferredTarget(
  state: BattleState,
  pool: readonly BattleUnit[],
  preference: TargetPreference,
): BattleUnit {
  const first = pool[0];
  if (!first) throw new Error('preferredTarget needs a non-empty pool');
  switch (preference) {
    case 'lowest_hp':
      return pool.reduce((best, u) => (u.hp < best.hp ? u : best), first);
    case 'lowest_hp_percent':
      return pool.reduce((best, u) => (hpFraction(u) < hpFraction(best) ? u : best), first);
    case 'highest_atk':
      return pool.reduce(
        (best, u) => (effectiveStat(state, u, 'atk') > effectiveStat(state, best, 'atk') ? u : best),
        first,
      );
    case 'lowest_def':
      return pool.reduce(
        (best, u) => (effectiveStat(state, u, 'def') < effectiveStat(state, best, 'def') ? u : best),
        first,
      );
  }
}

/** Default target for an ability (BATTLE.md §7 table); `null` when it needs none. */
export function pickTarget(state: BattleState, unit: BattleUnit, ability: UnitAbility): BattleUnit | null {
  const targeting = targetingOf(ability.def);
  if (targeting === 'none') return null;
  if (targeting === 'single_ally') {
    const revives = hasEffect(ability, isReviveEffect);
    const pool = targetableAllies(state, unit, revives).filter((u) => (revives ? !u.alive : u.alive));
    if (!pool.length) return null;
    const buff = flatten(ability.def.effects).find(
      (e): e is Extract<Effect, { kind: 'apply_status' }> => e.kind === 'apply_status' && !isDebuff(e.status),
    );
    const without = buff ? pool.filter((u) => !u.statuses.some((s) => s.id === buff.status)) : pool;
    const candidates = without.length ? without : pool;
    return candidates.reduce((best, u) => (hpFraction(u) < hpFraction(best) ? u : best));
  }
  const forced = provoker(state, unit);
  if (forced) return forced;
  const enemies = targetableEnemies(state, unit);
  if (!enemies.length) return null;
  // A declared preference wins over the side's default (the Marksman archetype picks off the
  // champion closest to death; a champion kit may ask for the biggest threat instead).
  const prefer = ability.def.ai.prefer;
  if (prefer) return preferredTarget(state, enemies, prefer);
  if (unit.side === 'enemy') {
    // Campaign enemies: random, weighted by threat (ATK × SPD).
    return state.rng.weighted(enemies.map((e) => ({ item: e, weight: Math.max(1, threat(state, e)) })));
  }
  const debuff = flatten(ability.def.effects).find(
    (e): e is Extract<Effect, { kind: 'apply_status' }> => e.kind === 'apply_status' && isDebuff(e.status),
  );
  if (debuff && !hasEffect(ability, isDamageEffect)) {
    const without = enemies.filter((e) => !e.statuses.some((s) => s.id === debuff.status));
    const pool = without.length ? without : enemies;
    return pool.reduce((best, e) => (threat(state, e) > threat(state, best) ? e : best));
  }
  // Single damage: the lowest-HP enemy the hit could kill, else the highest ATK.
  const killable = enemies.filter((e) => estimateDamage(state, unit, e, ability) >= e.hp + shieldTotal(e));
  if (killable.length) return killable.reduce((best, e) => (e.hp < best.hp ? e : best));
  return enemies.reduce((best, e) =>
    effectiveStat(state, e, 'atk') > effectiveStat(state, best, 'atk') ? e : best,
  );
}

/** Picks the ability and target for `unit`'s turn. */
export function autoDecide(state: BattleState, unit: BattleUnit): Decision {
  const a1 = unit.abilities.find((a) => a.slot === 'a1') ?? unit.abilities[0];
  if (!a1) throw new Error(`Unit ${unit.id} has no abilities`);
  const forced = provoker(state, unit);
  if (forced) return { unitId: unit.id, abilityId: a1.id, targetId: forced.id };
  const ready = unit.abilities.filter((a) => a.cooldown === 0);
  if (unit.rotation && unit.rotation.length) {
    // Bosses: the next rotation entry whose ability is ready; the pointer advances past skips.
    for (let i = 0; i < unit.rotation.length; i++) {
      const index = (unit.rotationIndex + i) % unit.rotation.length;
      const slot = unit.rotation[index];
      const ability = ready.find((a) => a.slot === slot);
      if (ability) {
        unit.rotationIndex = (index + 1) % unit.rotation.length;
        return {
          unitId: unit.id,
          abilityId: ability.id,
          targetId: pickTarget(state, unit, ability)?.id ?? null,
        };
      }
    }
    return { unitId: unit.id, abilityId: a1.id, targetId: pickTarget(state, unit, a1)?.id ?? null };
  }
  let best: { ability: UnitAbility; target: BattleUnit | null; score: number } | null = null;
  for (const ability of ready) {
    if (!passesGlobalRules(state, unit, ability)) continue;
    const target = pickTarget(state, unit, ability);
    if (targetingOf(ability.def) !== 'none' && !target) continue;
    const score = abilityScore(state, unit, ability, target);
    if (score === null) continue;
    if (!best || score > best.score || (score === best.score && ability.slot > best.ability.slot))
      best = { ability, target, score };
  }
  if (!best) {
    const target = pickTarget(state, unit, a1);
    return { unitId: unit.id, abilityId: a1.id, targetId: target?.id ?? null };
  }
  return { unitId: unit.id, abilityId: best.ability.id, targetId: best.target?.id ?? null };
}

export { enemiesOf };
