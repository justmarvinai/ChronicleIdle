/**
 * The Idle Chest as it touches the save (docs/design/ECONOMY.md §6).
 *
 * The rules are in `@engine/economy/idle`; this is the bookkeeping — what the chest holds at this
 * instant, and what opening it pays into the wallet, the energy pool, the racks and the chronicle.
 * Only one number is stored: when the chest was last emptied.
 */
import { IDLE_ENERGY_PER_FILL } from '@content/balance/idle';
import type { Element } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import { addEnergy } from '@engine/economy/energy';
import {
  farmSettlement,
  farmTierOf,
  idleCapacityHours,
  idleFill,
  idleGuaranteed,
  idleHaul,
  idleNextCapacity,
  type IdleFill,
  type IdleGuaranteed,
} from '@engine/economy/idle';
import { grant, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import type { Rng } from '@engine/rng/rng';
import type { SaveGame } from '@engine/schema/save';
import { progressOf } from './campaign';
import { applyPlayerXp, NO_LEVEL_UP, type LevelUpResult } from './progression';

export interface IdleView {
  fill: IdleFill;
  capacityHours: number;
  /** The band the chronicle is levelling towards, or `null` at the widest one. */
  nextCapacity: { level: number; hours: number } | null;
  tier: number;
  /** Settlement 1–12 the tier farms; 0 before the first boss falls. */
  settlementIndex: number;
  /** What the chest owes for certain if it were opened now — the preview. */
  guaranteed: IdleGuaranteed;
}

/** The chest as the hub and the dialog show it. */
export function idleView(save: SaveGame, now: number): IdleView {
  const tier = farmTierOf(progressOf(save));
  const fill = idleFill({ now, lastClaimAt: save.idle.lastClaimAt, level: save.profile.level });
  return {
    fill,
    capacityHours: idleCapacityHours(save.profile.level),
    nextCapacity: idleNextCapacity(save.profile.level),
    tier,
    settlementIndex: farmSettlement(tier),
    guaranteed: idleGuaranteed({ tier, hours: fill.hours, brewElement: brewElement(tier) }),
  };
}

/** The dominant element of the settlement the chest farms — the only brew it can turn up. */
function brewElement(tier: number): Element | null {
  const settlement = farmSettlement(tier);
  if (settlement <= 0) return null;
  return content.settlementByIndex(settlement)?.element ?? null;
}

export interface IdleClaimSummary {
  /** Hours the chest was holding when it was opened. */
  hours: number;
  tier: number;
  /** Everything the chest paid, energy included, in display order. */
  rewards: CurrencyAmount[];
  changes: CurrencyChange[];
  playerXp: number;
  levelUp: LevelUpResult;
  /** Which chance rolls fired, for the dialog's lucky lines. */
  procs: Record<string, number>;
  /** True when the chest was opened full — the "you left it too long" line. */
  wasFull: boolean;
}

export interface IdleClaimInput {
  now: number;
  /** Seeded from `idle.lastClaimAt` by the caller, so reading the chest cannot reroll it. */
  rng: Rng;
}

/** Opens the chest: the wallet, the energy pool and the chronicle each take their share. */
export function applyIdleClaim(save: SaveGame, input: IdleClaimInput): Result<IdleClaimSummary> {
  const view = idleView(save, input.now);
  if (view.tier <= 0) return fail('invalid_argument', 'No settlement boss has fallen yet');
  if (!view.fill.claimable) return fail('invalid_argument', 'The chest is still empty');

  const haul = idleHaul(
    { tier: view.tier, hours: view.fill.hours, brewElement: brewElement(view.tier) },
    input.rng,
  );
  const energy = haul.currencies.find((entry) => entry.currency === 'energy')?.amount ?? 0;
  const amounts = haul.currencies.filter((entry) => entry.currency !== 'energy');

  const granted = grant(save.wallet, amounts);
  save.wallet = granted.wallet;
  const changes: CurrencyChange[] = [...granted.changes];
  if (energy > 0) {
    // Energy is a pool with a cap and a tick, not a wallet row (ECONOMY.md §5).
    save.energy = addEnergy(
      save.energy,
      Math.min(energy, IDLE_ENERGY_PER_FILL),
      save.profile.level,
      input.now,
    );
    changes.push({ currency: 'energy', delta: energy, total: save.energy.value });
  }

  // Chronicle XP last, so a level-up's energy refill lands on the new cap.
  const levelUp = haul.playerXp > 0 ? applyPlayerXp(save, haul.playerXp, input.now) : NO_LEVEL_UP;
  changes.push(...levelUp.changes);

  save.idle.lastClaimAt = input.now;
  bump(save, 'idle.claims', 1);
  bump(save, 'idle.hours', Math.floor(view.fill.hours));

  return ok({
    hours: view.fill.hours,
    tier: view.tier,
    rewards: haul.currencies,
    changes,
    playerXp: haul.playerXp,
    levelUp,
    procs: haul.procs,
    wasFull: view.fill.full,
  });
}

function bump(save: SaveGame, key: string, by: number): void {
  if (by <= 0) return;
  save.stats[key] = (save.stats[key] ?? 0) + by;
}
