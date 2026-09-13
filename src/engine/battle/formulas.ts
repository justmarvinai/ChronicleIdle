/**
 * The numeric heart of combat (BATTLE.md §4). Every function is pure; randomness comes in as
 * pre-rolled values so tests pin exact outputs and the caller keeps RNG order deterministic.
 */
import {
  DEF_K_BASE,
  DEF_K_PER_LEVEL,
  ELEMENT_BEATS,
  ELEMENT_STRONG_CRIT,
  ELEMENT_STRONG_DMG,
  ELEMENT_WEAK_CRIT,
  ELEMENT_WEAK_DMG,
  VARIANCE_MAX,
  VARIANCE_MIN,
  type Element,
} from './imports';
import type { ElementMatch } from './types';

export function elementMatch(attacker: Element, defender: Element): ElementMatch {
  if (ELEMENT_BEATS[attacker] === defender) return 'strong';
  if (ELEMENT_BEATS[defender] === attacker) return 'weak';
  return 'neutral';
}

export function elementDamageMod(match: ElementMatch): number {
  return match === 'strong' ? ELEMENT_STRONG_DMG : match === 'weak' ? ELEMENT_WEAK_DMG : 1;
}

export function elementCritShift(match: ElementMatch): number {
  return match === 'strong' ? ELEMENT_STRONG_CRIT : match === 'weak' ? ELEMENT_WEAK_CRIT : 0;
}

/** `K = DEF_K_BASE + DEF_K_PER_LEVEL × attackerLevel`. */
export function mitigationK(attackerLevel: number): number {
  return DEF_K_BASE + DEF_K_PER_LEVEL * attackerLevel;
}

/** `1 − defEff / (defEff + K)` with `defEff = DEF × (1 − defIgnore)`. */
export function mitigation(defense: number, attackerLevel: number, defIgnore = 0): number {
  const defEff = Math.max(0, defense * (1 - defIgnore));
  const k = mitigationK(attackerLevel);
  return 1 - defEff / (defEff + k);
}

export interface DamageInput {
  /** Σ multiplier × source stat. */
  raw: number;
  match: ElementMatch;
  crit: boolean;
  critDmg: number;
  targetDef: number;
  attackerLevel: number;
  defIgnore: number;
  /** Σ damage bonuses (buffs, passives) minus penalties, as fractions. */
  outgoing: number;
  /** Σ damage reductions on the target, as fractions (Weaken counts negative). */
  incoming: number;
  /** Uniform roll in [0, 1) for the variance band. */
  varianceRoll: number;
  /** Boss damage-taken multiplier (1 for everyone else). */
  takenMult: number;
}

/** BATTLE.md §4.1; minimum 1 per hit. */
export function damage(input: DamageInput): number {
  const critMod = input.crit ? 1 + input.critDmg / 100 : 1;
  const variance = VARIANCE_MIN + (VARIANCE_MAX - VARIANCE_MIN) * input.varianceRoll;
  const value =
    input.raw *
    elementDamageMod(input.match) *
    critMod *
    mitigation(input.targetDef, input.attackerLevel, input.defIgnore) *
    Math.max(0, 1 + input.outgoing) *
    Math.max(0, 1 - input.incoming) *
    variance *
    input.takenMult;
  return Math.max(1, Math.floor(value));
}

/** Crit roll: `roll < clamp(critRate + shift + bonus, 0, 100) / 100`. */
export function critLands(critRate: number, match: ElementMatch, bonus: number, roll: number): boolean {
  const chance = Math.max(0, Math.min(100, critRate + elementCritShift(match) + bonus));
  return roll < chance / 100;
}

/** BATTLE.md §4.2: overheal is discarded by the caller. */
export function healing(k: number, sourceStat: number, healBonus: number, healReduction: number): number {
  return Math.max(0, Math.floor(k * sourceStat * (1 + healBonus) * (1 - healReduction)));
}

/**
 * BATTLE.md §4.3 debuff landing: the base chance roll, then a resist roll against
 * `clamp(RES − ACC, 0, 100)`. Returns what happened so the event can say why it failed.
 */
export function debuffLands(
  baseChance: number,
  targetRes: number,
  attackerAcc: number,
  chanceRoll: number,
  resistRoll: number,
): 'landed' | 'missed' | 'resisted' {
  if (chanceRoll >= baseChance / 100) return 'missed';
  const resist = Math.max(0, Math.min(100, targetRes - attackerAcc));
  if (resistRoll < resist / 100) return 'resisted';
  return 'landed';
}

/** Ticks until the fastest-filling unit reaches TM 1 (BATTLE.md §2); 0 when someone is already there. */
export function ticksToNextTurn(units: readonly { tm: number; spd: number }[], tmPerSpd: number): number {
  let best = Infinity;
  for (const u of units) {
    if (u.tm >= 1) return 0;
    if (u.spd <= 0) continue;
    best = Math.min(best, Math.ceil((1 - u.tm) / (u.spd * tmPerSpd) - 1e-9));
  }
  return Number.isFinite(best) ? Math.max(1, best) : 0;
}
