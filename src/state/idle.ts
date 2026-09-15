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
  type IdleFill,
  type IdleGuaranteed,
} from '@engine/economy/idle';
import { grant, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import type { GearInstance } from '@engine/gear/instance';
import type { Rng } from '@engine/rng/rng';
import type { SaveGame } from '@engine/schema/save';
import { progressOf } from './campaign';
import { applyGearDrop } from './gear';
import { applyPlayerXp, NO_LEVEL_UP, type LevelUpResult } from './progression';

/** How many settlements back the chest's brews remember (ECONOMY.md §6 "recent settlements"). */
const BREW_MEMORY = 3;

export interface IdleView {
  fill: IdleFill;
  capacityHours: number;
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
    tier,
    settlementIndex: farmSettlement(tier),
    guaranteed: idleGuaranteed({ tier, hours: fill.hours, brewElements: brewElements(tier) }),
  };
}

/** Dominant elements of the settlements the chest has been farming, nearest first. */
function brewElements(tier: number): Element[] {
  const settlement = farmSettlement(tier);
  if (settlement <= 0) return [];
  const elements: Element[] = [];
  for (let index = settlement; index > settlement - BREW_MEMORY && index >= 1; index -= 1) {
    const def = content.settlementByIndex(index);
    if (def) elements.push(def.element);
  }
  return elements;
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
  /** Pieces the chest's luck minted, and how many the racks were too full to hold. */
  gear: GearInstance[];
  gearLost: number;
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

/** Opens the chest: the wallet, the energy pool, the racks and the chronicle all take their share. */
export function applyIdleClaim(save: SaveGame, input: IdleClaimInput): Result<IdleClaimSummary> {
  const view = idleView(save, input.now);
  if (view.tier <= 0) return fail('invalid_argument', 'No settlement boss has fallen yet');
  if (!view.fill.claimable) return fail('invalid_argument', 'The chest is still empty');

  const haul = idleHaul(
    { tier: view.tier, hours: view.fill.hours, brewElements: brewElements(view.tier) },
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

  // A piece rolls from the settlement the chest farms, exactly as a run there would drop it.
  const gear: GearInstance[] = [];
  let gearLost = 0;
  for (let i = 0; i < haul.gearPieces; i += 1) {
    const piece = applyGearDrop(save, {
      settlementIndex: Math.max(1, view.settlementIndex),
      fromSetPool: true,
      source: 'campaign_drop',
      now: input.now,
      rng: input.rng,
    });
    if (piece) gear.push(piece);
    else gearLost += 1;
  }

  // Chronicle XP last, so a level-up's energy refill lands on the new cap.
  const levelUp = haul.playerXp > 0 ? applyPlayerXp(save, haul.playerXp, input.now) : NO_LEVEL_UP;
  changes.push(...levelUp.changes);

  save.idle.lastClaimAt = input.now;
  bump(save, 'idle.claims', 1);
  bump(save, 'idle.hours', Math.floor(view.fill.hours));
  if (gear.length) bump(save, 'idle.gear', gear.length);

  return ok({
    hours: view.fill.hours,
    tier: view.tier,
    rewards: haul.currencies,
    changes,
    playerXp: haul.playerXp,
    levelUp,
    gear,
    gearLost,
    procs: haul.procs,
    wasFull: view.fill.full,
  });
}

function bump(save: SaveGame, key: string, by: number): void {
  if (by <= 0) return;
  save.stats[key] = (save.stats[key] ?? 0) + by;
}
