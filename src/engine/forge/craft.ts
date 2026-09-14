/**
 * Crafting (docs/design/GEAR.md §6). A craft is a recipe — slot plus tier, optionally with a
 * Glyph Sigil naming the set — turned into a piece by the *same* generator a drop goes through,
 * so a crafted piece is exactly as good as a dropped one of its rarity and star.
 *
 * The tier decides the band: which rarities it may roll, which stars, and which sets are on its
 * pool. Everything else — the main stat, the substats, their values — is the generator's.
 */
import { CRAFT_SIGIL, CRAFT_TIER, type CraftTier } from '@content/balance/forge';
import type { GearSource } from '@content/balance/gear';
import type { GearSlot, Rarity } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { fail, ok, type Result } from '@engine/errors';
import type { Rng } from '@engine/rng/rng';
import { generateGear } from '@engine/gear/generate';
import type { GearInstance } from '@engine/gear/instance';

/** Everything a craft press knows, before the rolling starts. */
export interface CraftInput {
  tier: CraftTier;
  slot: GearSlot;
  /** The set the Sigil names; without one the tier's pool is rolled at random. */
  setId?: string;
  /** Ids of every set the tier's pool holds, in a stable order (the caller reads content). */
  pool: readonly string[];
  /** Serial for the instance id, from the save's running counter. */
  serial: number;
  now: number;
  source?: GearSource;
}

/** Materials, gold and — when the recipe names a set — one Glyph Sigil (GEAR.md §6). */
export function craftCost(tier: CraftTier, withSigil: boolean): CurrencyAmount[] {
  const def = CRAFT_TIER[tier];
  const cost: CurrencyAmount[] = [
    ...def.materials.map((m) => ({ currency: m.currency, amount: m.amount })),
    { currency: 'gold' as const, amount: def.gold },
  ];
  if (withSigil) cost.push({ currency: CRAFT_SIGIL.currency, amount: CRAFT_SIGIL.amount });
  return cost;
}

/** The rarity a tier may roll, as `{ item, weight }` pairs for the weighted picker. */
export function rarityTable(tier: CraftTier): { item: Rarity; weight: number }[] {
  return Object.entries(CRAFT_TIER[tier].rarity).map(([rarity, weight]) => ({
    item: rarity as Rarity,
    weight: weight ?? 0,
  }));
}

/** The stars a tier may roll, as `{ item, weight }` pairs. */
export function starTable(tier: CraftTier): { item: number; weight: number }[] {
  return Object.entries(CRAFT_TIER[tier].stars).map(([stars, weight]) => ({
    item: Number(stars),
    weight,
  }));
}

/**
 * Strikes one piece. The set is the Sigil's choice when there is one, otherwise a roll on the
 * tier's pool; a Sigil naming a set the tier does not carry is refused rather than quietly
 * ignored, because the Sigil is spent either way.
 */
export function craftGear(input: CraftInput, rng: Rng): Result<GearInstance> {
  if (input.pool.length === 0) return fail('invalid_argument', `No sets in the ${input.tier} pool`);
  if (input.setId !== undefined && !input.pool.includes(input.setId))
    return fail('invalid_argument', `${input.setId} is not in the ${input.tier} pool`);

  const setId = input.setId ?? rng.pick(input.pool);
  const piece = generateGear(
    {
      serial: input.serial,
      slot: input.slot,
      setId,
      rarity: rng.weighted(rarityTable(input.tier)),
      stars: rng.weighted(starTable(input.tier)),
      source: input.source ?? 'craft',
      now: input.now,
    },
    rng,
  );
  return ok(piece);
}

/**
 * The sets a tier carries (GEAR.md §6): Scrap forges only the two-piece sets, the higher tiers
 * the whole catalogue. The sets themselves come from content, so this stays a rule about tiers.
 */
export function craftPool(tier: CraftTier, sets: readonly { id: string; pieces: number }[]): string[] {
  const pool = CRAFT_TIER[tier].setPool;
  return sets.filter((set) => pool === 'any' || set.pieces === 2).map((set) => set.id);
}
