/**
 * What a campaign run pays (docs/design/CAMPAIGN.md §7).
 *
 * Every roll goes through the injected `Rng`, so a run's drops replay exactly from its seed and
 * `tools/sim` can measure drop rates over 10k runs. A gear drop is reported as *that* a piece
 * fell and which pool it came from; the piece is rolled by `@engine/gear` from the same stream.
 */
import type { Difficulty } from '@content/balance/battle';
import {
  BREW_DROP_CHANCE,
  CHAMPION_XP_PER_ENERGY,
  FIRST_CLEAR,
  GEAR_DROP_CHANCE,
  GEAR_DROP_CHANCE_BOSS,
  GEAR_SET_FROM_POOL_CHANCE,
  GOLD_BASE,
  GOLD_BOSS_MULT,
  GOLD_DIFFICULTY,
  GOLD_STAGE_GROWTH,
  MATERIAL_DROPS,
  MILESTONE_CHESTS,
  PLAYER_XP_PER_ENERGY,
  SHARD_DROP_CHANCE,
  STAR_CHESTS,
  STAR_CHEST_THRESHOLDS,
  XP_DIFFICULTY,
  type RewardBundle,
} from '@content/balance/campaign';
import type { Element } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';
import type { Rng } from '@engine/rng/rng';

/** A currency amount, the shape every reward finally reduces to. */
export interface CurrencyGain {
  currency: CurrencyId;
  amount: number;
}

export interface GearDrop {
  /** The settlement's own sets, or the whole catalogue when the roll goes wide. */
  fromSetPool: boolean;
}

export interface RunRewards {
  /** Per champion that fought. */
  championXp: number;
  playerXp: number;
  /** Gold, materials, shards and brews, merged and ordered. */
  currencies: CurrencyGain[];
  /** Energy paid back by first clears and chests (rewards ignore the cap, Q15). */
  energy: number;
  gems: number;
  /** One entry per dropped piece (a run drops at most one; a repeat batch merges them). */
  gear: GearDrop[];
  /** Which bundles were paid, for the result screen's "first clear" and "star chest" rows. */
  firstClear: RewardBundle | null;
  starChests: { threshold: number; bundle: RewardBundle }[];
  /** The difficulty's milestone chest, when this run earned it. */
  milestone: RewardBundle | null;
}

export interface RunRewardInput {
  settlementIndex: number;
  stageNumber: number;
  /** Global stage index 0..119. */
  globalIndex: number;
  difficulty: Difficulty;
  boss: boolean;
  /** The settlement's dominant element decides which brew can drop. */
  element: Element;
  energySpent: number;
  /** First clear of this stage on this difficulty. */
  firstClear: boolean;
  /** Star-chest thresholds this run crossed (from `recordRun`). */
  chestThresholds: readonly number[];
  /** This run put three stars on every stand of the difficulty (CAMPAIGN.md §7). */
  mastered?: boolean;
}

/** `GOLD_BASE × (1 + GOLD_STAGE_GROWTH × g) × difficulty`, doubled on a boss stand. */
export function runGold(input: Pick<RunRewardInput, 'globalIndex' | 'difficulty' | 'boss'>): number {
  const gold =
    GOLD_BASE *
    (1 + GOLD_STAGE_GROWTH * input.globalIndex) *
    GOLD_DIFFICULTY[input.difficulty] *
    (input.boss ? GOLD_BOSS_MULT : 1);
  return Math.round(gold);
}

/** Champion and player XP both scale with the energy the run cost (CAMPAIGN.md §7). */
export function runXp(input: Pick<RunRewardInput, 'difficulty' | 'energySpent'>): {
  championXp: number;
  playerXp: number;
} {
  const multiplier = XP_DIFFICULTY[input.difficulty];
  return {
    championXp: Math.round(CHAMPION_XP_PER_ENERGY * input.energySpent * multiplier),
    playerXp: Math.round(PLAYER_XP_PER_ENERGY * input.energySpent * multiplier),
  };
}

/** The brew a settlement can drop: the one of its dominant element. The settlement screen lists it. */
export const BREW_OF: Readonly<Record<Element, CurrencyId>> = {
  justice: 'brew_justice',
  valor: 'brew_valor',
  faith: 'brew_faith',
  eclipse: 'brew_eclipse',
};

/** The shard a difficulty can drop: Faded everywhere, and only from the campaign (SUMMONING.md §3). */
export const CAMPAIGN_SHARD: CurrencyId = 'shard_faded';

export function rollRunRewards(input: RunRewardInput, rng: Rng): RunRewards {
  const gains = new Map<CurrencyId, number>();
  const add = (currency: CurrencyId, amount: number): void => {
    if (amount > 0) gains.set(currency, (gains.get(currency) ?? 0) + amount);
  };

  add('gold', runGold(input));
  for (const roll of MATERIAL_DROPS[input.difficulty]) add(roll.currency, rng.int(roll.min, roll.max));
  if (rng.chance(SHARD_DROP_CHANCE[input.difficulty])) add(CAMPAIGN_SHARD, 1);
  if (rng.chance(BREW_DROP_CHANCE)) add(BREW_OF[input.element], 1);

  const gearChance = input.boss ? GEAR_DROP_CHANCE_BOSS : GEAR_DROP_CHANCE[input.difficulty];
  const gear: GearDrop[] = rng.chance(gearChance)
    ? [{ fromSetPool: rng.chance(GEAR_SET_FROM_POOL_CHANCE) }]
    : [];

  let energy = 0;
  let gems = 0;
  const bundle = (b: RewardBundle): void => {
    energy += b.energy ?? 0;
    gems += b.gems ?? 0;
    for (const entry of b.currencies ?? []) add(entry.currency, entry.amount);
  };

  const firstClearBundle = input.firstClear
    ? FIRST_CLEAR[input.difficulty][input.boss ? 'boss' : 'stage']
    : null;
  if (firstClearBundle) bundle(firstClearBundle);

  const starChests: { threshold: number; bundle: RewardBundle }[] = [];
  for (const threshold of input.chestThresholds) {
    const at = STAR_CHEST_THRESHOLDS.indexOf(threshold as (typeof STAR_CHEST_THRESHOLDS)[number]);
    const chest = at >= 0 ? STAR_CHESTS[input.difficulty][at] : undefined;
    if (!chest) continue;
    starChests.push({ threshold, bundle: chest });
    bundle(chest);
  }

  const milestone = input.mastered ? MILESTONE_CHESTS[input.difficulty] : null;
  if (milestone) bundle(milestone);

  const { championXp, playerXp } = runXp(input);
  return {
    championXp,
    playerXp,
    currencies: [...gains.entries()].map(([currency, amount]) => ({ currency, amount })),
    energy,
    gems,
    gear,
    firstClear: firstClearBundle,
    starChests,
    milestone,
  };
}

/** Sums a list of run rewards — the auto-repeat summary (CAMPAIGN.md §9). */
export function mergeRunRewards(runs: readonly RunRewards[]): RunRewards {
  const gains = new Map<CurrencyId, number>();
  let championXp = 0;
  let playerXp = 0;
  let energy = 0;
  let gems = 0;
  const gear: GearDrop[] = [];
  const starChests: { threshold: number; bundle: RewardBundle }[] = [];
  let firstClear: RewardBundle | null = null;
  let milestone: RewardBundle | null = null;
  for (const run of runs) {
    championXp += run.championXp;
    playerXp += run.playerXp;
    energy += run.energy;
    gems += run.gems;
    gear.push(...run.gear);
    for (const entry of run.currencies)
      gains.set(entry.currency, (gains.get(entry.currency) ?? 0) + entry.amount);
    starChests.push(...run.starChests);
    firstClear = firstClear ?? run.firstClear;
    milestone = milestone ?? run.milestone;
  }
  return {
    championXp,
    playerXp,
    currencies: [...gains.entries()].map(([currency, amount]) => ({ currency, amount })),
    energy,
    gems,
    gear,
    firstClear,
    starChests,
    milestone,
  };
}
