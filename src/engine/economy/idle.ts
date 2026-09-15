/**
 * The Idle Chest (docs/design/ECONOMY.md §6): how fast it fills, how much it holds, and what it
 * pays when it is opened.
 *
 * The chest stores one timestamp — when it was last emptied — and everything else is derived from
 * it and the clock (CLAUDE.md §5.5). Nothing accrues in the save, so a reload, an import or a
 * clock that jumped cannot desynchronise the chest from the time the player actually waited.
 *
 * The chance rolls are seeded from that same timestamp by the caller, so reloading before opening
 * the chest re-rolls nothing: the chest's contents are decided by when it started filling, not by
 * when the player happened to look.
 */
import {
  FARM_TIER_BAND,
  FARM_TIER_MAX,
  IDLE_CAPACITY_BANDS,
  IDLE_CHANCES,
  IDLE_ENERGY_PER_FILL,
  IDLE_ENERGY_PER_HOUR,
  IDLE_GOLD_BASE,
  IDLE_GOLD_POWER,
  IDLE_MATERIALS,
  IDLE_MIN_CLAIM_MINUTES,
  IDLE_PLAYER_XP_PER_TIER,
} from '@content/balance/idle';
import type { Element } from '@content/champions/types';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { DIFFICULTY_ORDER, highestBossCleared, type CampaignProgress } from '@engine/campaign/progress';
import type { Rng } from '@engine/rng/rng';
import { MS_PER_HOUR, MS_PER_MINUTE } from '@engine/time/clock';

/** Hours the chest takes to fill at a chronicle level (ECONOMY.md §6). */
export function idleCapacityHours(level: number): number {
  for (const band of IDLE_CAPACITY_BANDS) if (level <= band.upTo) return band.hours;
  return IDLE_CAPACITY_BANDS[IDLE_CAPACITY_BANDS.length - 1]?.hours ?? 24;
}

export function idleCapacityMs(level: number): number {
  return idleCapacityHours(level) * MS_PER_HOUR;
}

/**
 * The next band that holds more than this level's does, and the level it starts at — what the
 * chest tells the player they are levelling towards. `null` once the last band is reached.
 */
export function idleNextCapacity(level: number): { level: number; hours: number } | null {
  const current = idleCapacityHours(level);
  for (let index = 0; index < IDLE_CAPACITY_BANDS.length; index += 1) {
    const band = IDLE_CAPACITY_BANDS[index];
    if (!band || band.hours <= current) continue;
    // Bands are inclusive ranges, so the one after `upTo` starts on the next level.
    const previous = IDLE_CAPACITY_BANDS[index - 1];
    return { level: (previous?.upTo ?? 0) + 1, hours: band.hours };
  }
  return null;
}

/** The elemental brew the chest pays, by name. */
const BREW_OF: Readonly<Record<Element, CurrencyId>> = {
  justice: 'brew_justice',
  valor: 'brew_valor',
  faith: 'brew_faith',
  eclipse: 'brew_eclipse',
};

export interface IdleFill {
  /** Real time since the chest was last emptied, never negative (a clock moved back reads 0). */
  elapsedMs: number;
  /** What the chest is actually holding: the elapsed time capped at capacity. */
  heldMs: number;
  capacityMs: number;
  /** Held time in hours, truncated to the minute — the resolution the table is read at. */
  hours: number;
  /** 0..1 of capacity. */
  fraction: number;
  full: boolean;
  /** Milliseconds until the chest is full; 0 when it already is. */
  msToFull: number;
  claimable: boolean;
}

/** What the chest holds at `now`. */
export function idleFill(input: { now: number; lastClaimAt: number; level: number }): IdleFill {
  const capacityMs = idleCapacityMs(input.level);
  // A clock moved backwards must not pay out and must not go negative; it simply waits.
  const elapsedMs = Math.max(0, input.now - input.lastClaimAt);
  const heldMs = Math.min(elapsedMs, capacityMs);
  const minutes = Math.floor(heldMs / MS_PER_MINUTE);
  return {
    elapsedMs,
    heldMs,
    capacityMs,
    hours: minutes / 60,
    fraction: capacityMs > 0 ? Math.min(1, heldMs / capacityMs) : 0,
    full: heldMs >= capacityMs,
    msToFull: Math.max(0, capacityMs - elapsedMs),
    claimable: minutes >= IDLE_MIN_CLAIM_MINUTES,
  };
}

/**
 * Farm tier 1–36 (ECONOMY.md §6): the highest settlement whose boss has fallen, counted across
 * the three difficulties end to end. Taking the best of the three keeps the tier monotone — a
 * chronicle that has just unlocked Normal still farms at the Intro tier it earned.
 */
export function farmTier(bossesCleared: readonly number[]): number {
  let tier = 0;
  bossesCleared.forEach((highestSettlement, index) => {
    if (highestSettlement <= 0) return;
    tier = Math.max(tier, index * FARM_TIER_BAND + highestSettlement);
  });
  return Math.min(FARM_TIER_MAX, tier);
}

/** The farm tier a chronicle's campaign progress has earned (ECONOMY.md §6). */
export function farmTierOf(progress: CampaignProgress): number {
  return farmTier(DIFFICULTY_ORDER.map((difficulty) => highestBossCleared(progress, difficulty)));
}

/** The settlement the farm tier sits in, 1–12 — whose element the chest's brews lean towards. */
export function farmSettlement(tier: number): number {
  return tier <= 0 ? 0 : ((tier - 1) % FARM_TIER_BAND) + 1;
}

export interface IdleGuaranteed {
  currencies: CurrencyAmount[];
  playerXp: number;
}

export interface IdleHaulInput {
  tier: number;
  /** Held hours, from `idleFill`. */
  hours: number;
  /** The farm settlement's own element — the brew the chest can turn up (ECONOMY.md §6). */
  brewElement: Element | null;
}

/** Gold per hour at a farm tier. */
export function idleGoldPerHour(tier: number): number {
  return tier <= 0 ? 0 : IDLE_GOLD_BASE * Math.pow(tier, IDLE_GOLD_POWER);
}

/**
 * Everything the chest owes for certain: gold, the band's material, energy and chronicle XP. No
 * dice — the preview can show this before the chest is opened. Brews are luck, not a line here
 * (`IDLE_CHANCES`), and the chest pays no Arcane Dust at all: the campaign drops it every run.
 */
export function idleGuaranteed(input: IdleHaulInput): IdleGuaranteed {
  if (input.tier <= 0 || input.hours <= 0) return { currencies: [], playerXp: 0 };
  const { tier, hours } = input;
  const amounts = new Map<CurrencyId, number>();
  const add = (currency: CurrencyId, amount: number): void => {
    if (amount <= 0) return;
    amounts.set(currency, (amounts.get(currency) ?? 0) + amount);
  };

  add('gold', Math.floor(idleGoldPerHour(tier) * hours));
  // The tier's own band and no other: one material line, not one for every band beneath it —
  // that is what keeps the three Forge tiers on three different farms (ECONOMY.md §6).
  const material = IDLE_MATERIALS.findLast((entry) => tier >= entry.minTier);
  if (material) add(material.currency, Math.floor(material.perHour * hours));
  add('energy', Math.min(IDLE_ENERGY_PER_FILL, Math.floor(IDLE_ENERGY_PER_HOUR * hours)));

  return {
    currencies: [...amounts].map(([currency, amount]) => ({ currency, amount })),
    playerXp: Math.floor(IDLE_PLAYER_XP_PER_TIER * tier * hours),
  };
}

export interface IdleRolls {
  currencies: CurrencyAmount[];
  /** How many times each chance fired, for the dialog's lucky lines. */
  procs: Record<string, number>;
}

/**
 * The chest's luck: one roll per chance per whole hour it held, each capped per fill. The rolls
 * walk hour by hour so the stream is the same however the chest is read.
 */
export function idleRolls(input: IdleHaulInput, rng: Rng): IdleRolls {
  const procs: Record<string, number> = {};
  const amounts = new Map<CurrencyId, number>();
  if (input.tier <= 0) return { currencies: [], procs };

  const wholeHours = Math.floor(input.hours);
  for (let hour = 0; hour < wholeHours; hour += 1) {
    for (const def of IDLE_CHANCES) {
      const fired = procs[def.id] ?? 0;
      const chance =
        def.betterFrom !== undefined && input.tier >= def.betterFrom
          ? (def.betterChance ?? def.chance)
          : def.chance;
      // The roll is taken even when the cap is reached, so the stream does not depend on luck.
      const hit = rng.chance(chance);
      if (!hit || fired >= def.perFill) continue;
      procs[def.id] = fired + 1;
      // A brew is whichever element the chest farms; everything else names its own currency.
      const currency = def.brew ? input.brewElement && BREW_OF[input.brewElement] : def.currency;
      if (currency && def.amount) amounts.set(currency, (amounts.get(currency) ?? 0) + def.amount);
    }
  }
  return { currencies: [...amounts].map(([currency, amount]) => ({ currency, amount })), procs };
}

export interface IdleHaul extends IdleGuaranteed, IdleRolls {}

/** The whole payout: what is owed plus what was rolled. */
export function idleHaul(input: IdleHaulInput, rng: Rng): IdleHaul {
  const guaranteed = idleGuaranteed(input);
  const rolls = idleRolls(input, rng);
  const merged = new Map<CurrencyId, number>();
  for (const { currency, amount } of [...guaranteed.currencies, ...rolls.currencies])
    merged.set(currency, (merged.get(currency) ?? 0) + amount);
  return {
    currencies: [...merged].map(([currency, amount]) => ({ currency, amount })),
    playerXp: guaranteed.playerXp,
    procs: rolls.procs,
  };
}
