/**
 * The Forge's numbers (docs/design/GEAR.md §4, §6). Three craft tiers, what each one costs and
 * what it may roll; the dismantle and refine tables live in `gear.ts` beside the rest of a
 * piece's own maths, because a dismantle reads a piece's rarity and a refine reads its star row.
 *
 * Changing a tier changes what a craft is worth: the materials come out of the campaign's drop
 * tables (`campaign.ts`), so a cost rise here is felt as more runs, not as a different screen.
 */
import type { CurrencyId } from '@content/currencies/types';
import type { Rarity } from '@content/champions/types';

export const CRAFT_TIERS = ['scrap', 'ember', 'star'] as const;
export type CraftTier = (typeof CRAFT_TIERS)[number];

export interface CraftCost {
  currency: CurrencyId;
  amount: number;
}

export interface CraftTierDef {
  /** Player level that opens the tier; the Forge itself opens at `FEATURE_UNLOCK_LEVEL.forge`. */
  level: number;
  materials: readonly CraftCost[];
  gold: number;
  /** Integer weights, as the doc's percentages. */
  rarity: Readonly<Partial<Record<Rarity, number>>>;
  /** Star weights keyed by star rank. */
  stars: Readonly<Record<number, number>>;
  /** `two` = the eight two-piece sets only; `any` = the whole catalogue. */
  setPool: 'two' | 'any';
}

/**
 * The three recipes (GEAR.md §6). A tier is a promise about the *band* a piece lands in: Scrap
 * makes early gear in bulk, Ember is the mid-campaign workhorse, Star is where a 6★ comes from.
 */
export const CRAFT_TIER: Readonly<Record<CraftTier, CraftTierDef>> = {
  scrap: {
    level: 8,
    materials: [
      { currency: 'mat_scrap_iron', amount: 20 },
      { currency: 'mat_arcane_dust', amount: 5 },
    ],
    gold: 2_000,
    rarity: { common: 40, uncommon: 35, rare: 20, epic: 5 },
    stars: { 1: 30, 2: 45, 3: 25 },
    setPool: 'two',
  },
  ember: {
    level: 8,
    materials: [
      { currency: 'mat_ember_alloy', amount: 15 },
      { currency: 'mat_arcane_dust', amount: 10 },
    ],
    gold: 12_000,
    rarity: { rare: 45, epic: 40, legendary: 15 },
    stars: { 3: 30, 4: 45, 5: 25 },
    setPool: 'any',
  },
  star: {
    level: 8,
    materials: [
      { currency: 'mat_starsteel', amount: 10 },
      { currency: 'mat_arcane_dust', amount: 20 },
    ],
    gold: 60_000,
    rarity: { epic: 40, legendary: 50, mythic: 10 },
    stars: { 5: 60, 6: 40 },
    setPool: 'any',
  },
};

/** One Glyph Sigil buys the right to name the set a craft comes out as (GEAR.md §6). */
export const CRAFT_SIGIL: CraftCost = { currency: 'mat_glyph_sigil', amount: 1 };

/** How many pieces one dismantle press may take at once, so a misclick cannot empty the racks. */
export const DISMANTLE_MAX_SELECTION = 50;
