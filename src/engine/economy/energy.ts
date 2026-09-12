import { ENERGY_BASE_CAP, ENERGY_CAP_PER_LEVEL, ENERGY_REGEN_SECONDS } from '@content/balance/energy';
import { fail, ok, type Result } from '@engine/errors';

/** Energy is stored as a value plus the timestamp of the last regeneration tick (never a countdown). */
export interface EnergyState {
  value: number;
  lastTickAt: number;
}

export function energyCap(playerLevel: number): number {
  return ENERGY_BASE_CAP + ENERGY_CAP_PER_LEVEL * Math.max(0, playerLevel - 1);
}

/**
 * Applies regeneration up to `now`. One point per ENERGY_REGEN_SECONDS while below the cap;
 * above the cap nothing regenerates and the tick timestamp is simply moved forward.
 */
export function regenerateEnergy(state: EnergyState, playerLevel: number, now: number): EnergyState {
  if (now <= state.lastTickAt) return state;
  const cap = energyCap(playerLevel);
  if (state.value >= cap) return { value: state.value, lastTickAt: now };
  const period = ENERGY_REGEN_SECONDS * 1000;
  const ticks = Math.floor((now - state.lastTickAt) / period);
  if (ticks <= 0) return state;
  const value = Math.min(cap, state.value + ticks);
  // Keep the remainder so partial progress towards the next point is not lost — unless we hit the cap.
  const lastTickAt = value >= cap ? now : state.lastTickAt + ticks * period;
  return { value, lastTickAt };
}

/** Milliseconds until the next point regenerates, or null when at/above the cap. */
export function msUntilNextEnergy(state: EnergyState, playerLevel: number, now: number): number | null {
  if (state.value >= energyCap(playerLevel)) return null;
  const period = ENERGY_REGEN_SECONDS * 1000;
  const elapsed = Math.max(0, now - state.lastTickAt);
  return period - (elapsed % period);
}

/** Rewards always add, without an upper limit (owner's answer Q15). */
export function addEnergy(state: EnergyState, amount: number, playerLevel: number, now: number): EnergyState {
  const regenerated = regenerateEnergy(state, playerLevel, now);
  const wasBelowCap = regenerated.value < energyCap(playerLevel);
  const value = regenerated.value + Math.max(0, amount);
  // Crossing the cap freezes regeneration; the tick clock restarts when we drop below it again.
  return { value, lastTickAt: wasBelowCap && value >= energyCap(playerLevel) ? now : regenerated.lastTickAt };
}

export function spendEnergy(
  state: EnergyState,
  amount: number,
  playerLevel: number,
  now: number,
): Result<EnergyState> {
  const regenerated = regenerateEnergy(state, playerLevel, now);
  if (regenerated.value < amount)
    return fail('insufficient_energy', `Need ${amount} energy, have ${regenerated.value}`, {
      needed: amount,
      have: regenerated.value,
    });
  const value = regenerated.value - amount;
  const cap = energyCap(playerLevel);
  // If we were above the cap and just dropped below it, regeneration starts counting from now.
  const lastTickAt = regenerated.value >= cap && value < cap ? now : regenerated.lastTickAt;
  return ok({ value, lastTickAt });
}
