/**
 * What a dungeon run pays (docs/design/DUNGEONS.md §5).
 *
 * Every roll goes through the injected `Rng`, so a run's haul replays exactly from its seed and
 * `tools/sim` can measure drop rates over ten thousand runs. A gear drop is reported as *which
 * set, stars and rarity* fell; minting the piece itself is `@state/gear`'s job, from the same
 * stream.
 *
 * The shape of the haul is the band's (`balance/dungeon.ts`), which is what makes a dungeon
 * legible: a player reads the price and knows what they are buying.
 */
import {
  DUNGEON_ANCIENT_SHARD_CHANCE,
  DUNGEON_FADED_SHARD_CHANCE,
  DUNGEON_GOLD_BASE,
  DUNGEON_GOLD_DIFFICULTY,
  DUNGEON_GOLD_STAGE_GROWTH,
  DUNGEON_XP_DIFFICULTY,
  dungeonBand,
  dungeonStarEntries,
  type DungeonDifficulty,
} from '@content/balance/dungeon';
import { CHAMPION_XP_PER_ENERGY, PLAYER_XP_PER_ENERGY } from '@content/balance/campaign';
import type { Rarity } from '@content/champions/types';
import type { CurrencyId } from '@content/currencies/types';
import type { Rng } from '@engine/rng/rng';

/** One piece a run knocked loose, described rather than minted. */
export interface DungeonGearDrop {
  setId: string;
  stars: number;
  rarity: Rarity;
}

export interface DungeonRunRewards {
  /** Per champion that fought. */
  championXp: number;
  playerXp: number;
  /** Gold and, rarely, a shard. */
  currencies: { currency: CurrencyId; amount: number }[];
  /** One guaranteed, plus the band's chance at a second. */
  gear: DungeonGearDrop[];
}

export interface DungeonRunInput {
  /** The sets this keep holds; the piece is rolled from them, evenly. */
  sets: readonly string[];
  stage: number;
  difficulty: DungeonDifficulty;
  /** What the run cost, which is the band's own energy — XP is paid per point of it. */
  energySpent: number;
}

/** A band's rarity row as the weighted entries the roll takes (`GEAR.md` §2: no dead zeroes). */
function rarityEntries(
  rarity: Readonly<Partial<Record<Rarity, number>>>,
): { item: Rarity; weight: number }[] {
  return Object.entries(rarity)
    .filter(([, weight]) => (weight ?? 0) > 0)
    .map(([id, weight]) => ({ item: id as Rarity, weight: weight ?? 0 }));
}

/** `DUNGEON_GOLD_BASE × (1 + growth × (stage − 1)) × difficulty`. */
export function dungeonGold(stage: number, difficulty: DungeonDifficulty): number {
  const gold =
    DUNGEON_GOLD_BASE *
    (1 + DUNGEON_GOLD_STAGE_GROWTH * (Math.max(1, stage) - 1)) *
    DUNGEON_GOLD_DIFFICULTY[difficulty];
  return Math.round(gold);
}

/**
 * Champion and player XP, at the campaign's own per-energy rates times the dungeon's difficulty
 * multiplier — so a dungeon pays the same XP per point of energy as a campaign stand and more per
 * *run* only because it costs more (`DUNGEONS.md` §5).
 */
export function dungeonXp(input: Pick<DungeonRunInput, 'difficulty' | 'energySpent'>): {
  championXp: number;
  playerXp: number;
} {
  const multiplier = DUNGEON_XP_DIFFICULTY[input.difficulty];
  return {
    championXp: Math.round(CHAMPION_XP_PER_ENERGY * input.energySpent * multiplier),
    playerXp: Math.round(PLAYER_XP_PER_ENERGY * input.energySpent * multiplier),
  };
}

/** One piece: a set from the keep, then the band's stars and rarity. */
function rollPiece(input: DungeonRunInput, rng: Rng): DungeonGearDrop | null {
  if (!input.sets.length) return null;
  const band = dungeonBand(input.stage, input.difficulty);
  const setId = rng.pick(input.sets);
  return {
    setId,
    stars: rng.weighted(dungeonStarEntries(band)),
    rarity: rng.weighted(rarityEntries(band.rarity)),
  };
}

/**
 * The haul a cleared stage pays. **Every clear drops a piece** — a gear farm that sometimes pays
 * nothing is a gear farm nobody runs — and the band's `extraPiece` is the chance of a second on
 * top of it, which is most of what makes a deeper stage worth its higher price.
 */
export function rollDungeonRewards(input: DungeonRunInput, rng: Rng): DungeonRunRewards {
  const band = dungeonBand(input.stage, input.difficulty);
  const gains = new Map<CurrencyId, number>();
  const add = (currency: CurrencyId, amount: number): void => {
    if (amount > 0) gains.set(currency, (gains.get(currency) ?? 0) + amount);
  };

  add('gold', dungeonGold(input.stage, input.difficulty));
  if (rng.chance(DUNGEON_FADED_SHARD_CHANCE[input.difficulty])) add('shard_faded', 1);
  if (rng.chance(DUNGEON_ANCIENT_SHARD_CHANCE[input.difficulty])) add('shard_ancient', 1);

  const gear: DungeonGearDrop[] = [];
  const first = rollPiece(input, rng);
  if (first) gear.push(first);
  // The roll happens whether or not a second piece is wanted, so the stream stays aligned.
  const extra = rng.chance(band.extraPiece);
  if (extra) {
    const second = rollPiece(input, rng);
    if (second) gear.push(second);
  }

  const { championXp, playerXp } = dungeonXp(input);
  return {
    championXp,
    playerXp,
    currencies: [...gains].map(([currency, amount]) => ({ currency, amount })),
    gear,
  };
}
