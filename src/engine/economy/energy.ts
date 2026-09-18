import { ENERGY_BASE_CAP, ENERGY_CAP_PER_LEVEL, ENERGY_REGEN_SECONDS } from '@content/balance/energy';
import type { Result } from '@engine/errors';
import { add, msUntilNext, regenerate, take, type Pool } from './pool';

/** Energy is stored as a value plus the timestamp of the last regeneration tick (never a countdown). */
export type EnergyState = Pool;

const PERIOD_MS = ENERGY_REGEN_SECONDS * 1000;

export function energyCap(playerLevel: number): number {
  return ENERGY_BASE_CAP + ENERGY_CAP_PER_LEVEL * Math.max(0, playerLevel - 1);
}

/**
 * Applies regeneration up to `now`. One point per ENERGY_REGEN_SECONDS while below the cap;
 * above the cap nothing regenerates and the tick timestamp is simply moved forward.
 */
export function regenerateEnergy(state: EnergyState, playerLevel: number, now: number): EnergyState {
  return regenerate(state, energyCap(playerLevel), PERIOD_MS, now);
}

/** Milliseconds until the next point regenerates, or null when at/above the cap. */
export function msUntilNextEnergy(state: EnergyState, playerLevel: number, now: number): number | null {
  return msUntilNext(state, energyCap(playerLevel), PERIOD_MS, now);
}

/** Rewards always add, without an upper limit (owner's answer Q15). */
export function addEnergy(state: EnergyState, amount: number, playerLevel: number, now: number): EnergyState {
  return add(state, amount, energyCap(playerLevel), PERIOD_MS, now);
}

export function spendEnergy(
  state: EnergyState,
  amount: number,
  playerLevel: number,
  now: number,
): Result<EnergyState> {
  return take(state, amount, energyCap(playerLevel), PERIOD_MS, now, 'insufficient_energy');
}
