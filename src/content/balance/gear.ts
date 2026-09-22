/**
 * Gear numbers (docs/design/GEAR.md). Every table here is read by the generator, the upgrade
 * screen and the stat calculator; changing a row changes what every future drop is worth, so the
 * tables are keyed by star and stated in the doc's own units.
 */
import type { GearSlot, StatId } from '@content/champions/types';
import { RARITIES, type Rarity } from '@content/champions/types';
import type { Difficulty } from './battle';

/**
 * Gear's own stat space: champions have eight stats, but gear can carry HP/ATK/DEF as a flat
 * value *or* as a percentage of the champion's base, so those three are split in two.
 */
export const GEAR_STATS = [
  'hp',
  'hpPct',
  'atk',
  'atkPct',
  'def',
  'defPct',
  'spd',
  'critRate',
  'critDmg',
  'res',
  'acc',
] as const;
export type GearStat = (typeof GEAR_STATS)[number];

/** Stats whose value is a percentage of something rather than a flat addition. */
export const PERCENT_GEAR_STATS: ReadonlySet<GearStat> = new Set<GearStat>([
  'hpPct',
  'atkPct',
  'defPct',
  'critRate',
  'critDmg',
  'res',
  'acc',
]);

/**
 * Where a piece came from. Champions have their own `OBTAIN_SOURCES`; the two vocabularies are
 * deliberately separate, because a champion is never struck at the Forge and a piece is never
 * summoned. Every value a save has ever stored must stay in this list.
 */
/** Where a piece came from; kept on the instance so a save can always say (`GEAR.md` §8). */
export const GEAR_SOURCES = ['campaign_drop', 'dungeon', 'craft', 'boss_chest', 'mission'] as const;
export type GearSource = (typeof GEAR_SOURCES)[number];

/** Gear levels run 0 → 16 (GEAR.md §3). */
export const GEAR_MAX_LEVEL = 16;
/** Levels that roll a substat: a new one while the piece has fewer than four, else an upgrade. */
export const SUBSTAT_ROLL_LEVELS: readonly number[] = [4, 8, 12, 16];
export const MAX_SUBSTATS = 4;
export const GEAR_MAX_STARS = 6;

/** Weapon, helmet and shield always carry the same main stat (GEAR.md §1). */
export const FIXED_MAIN_STAT: Readonly<Partial<Record<GearSlot, GearStat>>> = {
  weapon: 'atk',
  helmet: 'hp',
  shield: 'def',
};

/**
 * Weighted main-stat pools for the three slots that roll one (GEAR.md §1: the three percentage
 * stats are equally likely and together take three quarters of the rolls).
 */
export const MAIN_STAT_WEIGHTS: Readonly<Partial<Record<GearSlot, Readonly<Record<string, number>>>>> = {
  gauntlets: { hpPct: 250, atkPct: 250, defPct: 250, critRate: 125, critDmg: 125 },
  chestplate: { hpPct: 250, atkPct: 250, defPct: 250, res: 125, acc: 125 },
  boots: { hpPct: 250, atkPct: 250, defPct: 250, spd: 250 },
};

/**
 * Main-stat value at +0 and at +16, by star (GEAR.md §3). Stats that share a row share a family;
 * the value grows linearly between the two ends.
 */
export type MainStatFamily = 'atkDefFlat' | 'hpFlat' | 'pct' | 'spd' | 'critRate' | 'critDmg' | 'resAcc';

export const MAIN_STAT_FAMILY: Readonly<Record<GearStat, MainStatFamily>> = {
  hp: 'hpFlat',
  atk: 'atkDefFlat',
  def: 'atkDefFlat',
  hpPct: 'pct',
  atkPct: 'pct',
  defPct: 'pct',
  spd: 'spd',
  critRate: 'critRate',
  critDmg: 'critDmg',
  res: 'resAcc',
  acc: 'resAcc',
};

/** `[+0, +16]` per star, 1★ first (GEAR.md §3). */
export const MAIN_STAT_TABLE: Readonly<Record<MainStatFamily, readonly (readonly [number, number])[]>> = {
  atkDefFlat: [
    [10, 50],
    [15, 75],
    [22, 110],
    [32, 160],
    [42, 210],
    [53, 265],
  ],
  hpFlat: [
    [150, 750],
    [240, 1_200],
    [350, 1_750],
    [520, 2_600],
    [660, 3_300],
    [820, 4_100],
  ],
  pct: [
    [7, 13],
    [10, 19],
    [14, 26],
    [18, 34],
    [24, 45],
    [32, 60],
  ],
  spd: [
    [3, 11],
    [4, 15],
    [6, 22],
    [8, 30],
    [10, 37],
    [12, 45],
  ],
  critRate: [
    [5, 15],
    [7, 22],
    [10, 30],
    [13, 40],
    [17, 50],
    [20, 60],
  ],
  critDmg: [
    [7, 20],
    [10, 30],
    [14, 40],
    [18, 53],
    [23, 66],
    [26, 80],
  ],
  resAcc: [
    [8, 24],
    [12, 36],
    [16, 48],
    [21, 64],
    [26, 80],
    [32, 96],
  ],
};

/** Substat families share roll ranges the way main stats share tables (GEAR.md §3). */
export type SubStatFamily = 'pct' | 'spd' | 'critRate' | 'critDmg' | 'resAcc' | 'hpFlat' | 'atkDefFlat';

export const SUB_STAT_FAMILY: Readonly<Record<GearStat, SubStatFamily>> = {
  hp: 'hpFlat',
  atk: 'atkDefFlat',
  def: 'atkDefFlat',
  hpPct: 'pct',
  atkPct: 'pct',
  defPct: 'pct',
  spd: 'spd',
  critRate: 'critRate',
  critDmg: 'critDmg',
  res: 'resAcc',
  acc: 'resAcc',
};

/** Star bands the substat table is written in: 1–2★, 3–4★, 5★, 6★. */
export type StarBand = 0 | 1 | 2 | 3;
export function starBand(stars: number): StarBand {
  if (stars <= 2) return 0;
  if (stars <= 4) return 1;
  if (stars === 5) return 2;
  return 3;
}

/** `[min, max]` per roll and star band (GEAR.md §3), before the rarity multiplier. */
export const SUB_STAT_TABLE: Readonly<Record<SubStatFamily, readonly (readonly [number, number])[]>> = {
  pct: [
    [2, 4],
    [3, 6],
    [4, 8],
    [6, 10],
  ],
  spd: [
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 6],
  ],
  critRate: [
    [1, 3],
    [2, 4],
    [3, 6],
    [4, 7],
  ],
  critDmg: [
    [2, 4],
    [3, 5],
    [4, 7],
    [5, 8],
  ],
  resAcc: [
    [4, 8],
    [6, 12],
    [9, 15],
    [12, 20],
  ],
  hpFlat: [
    [60, 120],
    [100, 200],
    [150, 300],
    [200, 400],
  ],
  atkDefFlat: [
    [4, 8],
    [6, 12],
    [9, 18],
    [12, 25],
  ],
};

/** Substats a piece carries at +0, by rarity (GEAR.md §2). */
export const SUBSTATS_AT_ZERO: Readonly<Record<Rarity, number>> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 4,
};

/** Every substat roll of a Legendary is 10 % larger, of a Mythic 25 % (GEAR.md §2). */
export const SUB_ROLL_MULT: Readonly<Record<Rarity, number>> = {
  common: 1,
  uncommon: 1,
  rare: 1,
  epic: 1,
  legendary: 1.1,
  mythic: 1.25,
};

/** `cost(star, level) = LEVEL_COST_BASE[star] × (1 + LEVEL_COST_GROWTH × level)` (GEAR.md §3). */
export const LEVEL_COST_BASE: Readonly<Record<number, number>> = {
  1: 120,
  2: 200,
  3: 320,
  4: 520,
  5: 900,
  6: 1_500,
};
export const LEVEL_COST_GROWTH = 0.35;

/** Refine (star-up) asks for a twin piece, cores and gold (GEAR.md §4; the Forge spends it). */
export const REFINE_GOLD: Readonly<Record<number, number>> = {
  1: 2_000,
  2: 6_000,
  3: 15_000,
  4: 40_000,
  5: 90_000,
};
/** Refining Cores for `n★ → (n+1)★`: `n + 1`. */
export function refineCores(stars: number): number {
  return Math.max(1, Math.round(stars) + 1);
}

/** What a dismantled piece returns, by rarity (GEAR.md §6; the Forge spends it). */
export const DISMANTLE_YIELD: Readonly<Record<Rarity, Readonly<Record<string, number>>>> = {
  common: { mat_scrap_iron: 2 },
  uncommon: { mat_scrap_iron: 4 },
  rare: { mat_scrap_iron: 6, mat_arcane_dust: 2 },
  epic: { mat_ember_alloy: 4, mat_arcane_dust: 4 },
  legendary: { mat_starsteel: 3, mat_arcane_dust: 6, mat_refining_core: 1 },
  mythic: { mat_starsteel: 6, mat_arcane_dust: 10, mat_refining_core: 2 },
};
/** Share of the gold spent on levels that a dismantle gives back. */
export const DISMANTLE_GOLD_REFUND = 0.2;

/** Inventory (GEAR.md §7, owner's answer Q20). Drops past the cap land in the overflow. */
export const INVENTORY_CAPACITY = 400;
export const INVENTORY_WARN_AT = 0.9;
export const INVENTORY_OVERFLOW = 20;

/**
 * How a campaign drop picks its rarity, per difficulty. The settlement index decides the *stars*
 * (`dropStarRange` below), so late settlements drop big pieces wherever they are farmed; the
 * difficulty decides how good the piece is, which is the ladder `CAMPAIGN.md` §7 always described.
 * `CAMPAIGN.md` §7 also decides *whether* a piece drops at all.
 *
 * Re-cut in `0.7.2` (owner's balance pass) from one table shared by all three difficulties —
 * C 30 / U 28 / R 24 / E 13 / L 4 / M 1 — which let the Intro campaign mint Legendaries on a first
 * playthrough. Two rules shape the rows:
 *
 * 1. **A difficulty has a ceiling.** Intro tops out at Rare, Normal opens Epic and a sliver of
 *    Legendary, and only Hard can mint a Mythic. A rarity above a row's ceiling is absent rather
 *    than written as a zero, so the ceiling is visible at a glance and a stray zero cannot be
 *    mistaken for a rate.
 * 2. **Every row leans lower than the old one.** Epic, Legendary and Mythic are each rarer on the
 *    difficulty that still rolls them, and the weight goes to Common, Uncommon and Rare — more
 *    pieces, more modest ones, which with the raised `GEAR_DROP_CHANCE` keeps a run's haul the
 *    same size.
 *
 * Epic and better are not gated out of a chronicle by this: the Forge crafts them from the Ember
 * tier up (`balance/forge.ts`) and both bosses pay them by the chest (`BOSSES.md` §2), which is
 * where a top-rarity piece is supposed to come from.
 *
 * Weights are read as shares of their own row and need not sum to a round number; these do, at
 * 100, so a weight reads as a percentage.
 */
export const DROP_RARITY_WEIGHTS: Readonly<Record<Difficulty, Readonly<Partial<Record<Rarity, number>>>>> = {
  intro: { common: 46, uncommon: 33, rare: 21 },
  normal: { common: 34, uncommon: 30, rare: 27, epic: 8, legendary: 1 },
  hard: { common: 28, uncommon: 28, rare: 28, epic: 12, legendary: 3, mythic: 1 },
};

/**
 * A difficulty's row as the weighted entries the drop roll takes, lowest rarity first. Rarities
 * the row leaves out are above its ceiling and are simply not offered, which is what keeps an
 * Intro drop from ever being an Epic.
 */
export function dropRarityEntries(difficulty: Difficulty): readonly { item: Rarity; weight: number }[] {
  const row = DROP_RARITY_WEIGHTS[difficulty];
  return RARITIES.flatMap((rarity) => {
    const weight = row[rarity];
    return weight === undefined ? [] : [{ item: rarity, weight }];
  });
}

/** Stars a drop can have at a settlement index (1..12), as `[min, max]`. */
export function dropStarRange(settlementIndex: number): readonly [number, number] {
  const index = Math.max(1, Math.min(12, Math.round(settlementIndex)));
  const min = Math.max(1, Math.min(5, Math.ceil(index / 3)));
  const max = Math.max(min, Math.min(GEAR_MAX_STARS, Math.ceil(index / 2) + 1));
  return [min, max];
}

/**
 * The yardstick a single piece is weighed against. A percentage stat is worth nothing on its own
 * — 20 % of what? — so the armoury's power column measures every piece against one imaginary
 * mid-campaign champion. Raising these numbers makes percentage rolls look better next to flat
 * ones; it changes no gameplay, only the order pieces sort in.
 */
export const GEAR_POWER_REFERENCE: Readonly<Record<StatId, number>> = {
  hp: 12_000,
  atk: 900,
  def: 700,
  spd: 100,
  critRate: 15,
  critDmg: 50,
  res: 15,
  acc: 15,
};
