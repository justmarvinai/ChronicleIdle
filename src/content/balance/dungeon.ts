/**
 * The Dungeons (docs/design/DUNGEONS.md): five keeps where gear is farmed, four of them open from
 * the first hour and the fifth waiting on accessories.
 *
 * A dungeon is twenty stages on Normal and twenty on Hard, and a stage is authored nowhere:
 * everything it fields, costs and pays is derived from its number, its difficulty and the numbers
 * here — the way a tower floor and a brewery stage are. What differs between the four open
 * dungeons is which gear sets they hold, which keeper stands in them and which warband it brings;
 * the ladder itself is the same everywhere, so a player who has learned one dungeon has learned
 * all four.
 *
 * The mode's only price is energy, and it is the most expensive energy in the game.
 */
import type { Rarity } from '@content/champions/types';

/** Stages per difficulty. Normal 1 is the first hour; Hard 20 is the deepest farm in the game. */
export const DUNGEON_STAGES = 20;

/**
 * A dungeon's own two difficulties. Deliberately *not* the campaign's `Difficulty` — a dungeon
 * has no Intro, and a value that can be `'intro'` where no Intro exists is a bug waiting for a
 * `default:` branch.
 */
export const DUNGEON_DIFFICULTIES = ['normal', 'hard'] as const;
export type DungeonDifficulty = (typeof DUNGEON_DIFFICULTIES)[number];

/**
 * Champions per run: four, the bosses' shape rather than the campaign's three (the owner's
 * answer). A dungeon fight is a keeper and its guard, not a stand on a road.
 */
export const DUNGEON_PARTY_SIZE = 4;

/** Ally turns before a run is lost. Longer than a campaign stand: a keeper takes a while. */
export const DUNGEON_TURN_LIMIT = 50;

/**
 * Enemy scaling per stage, in the same `archetypeBase ×` units the campaign, the tower and the
 * Brewery use — a dungeon encounter is pitched at Intro's flat multiplier and stage index 0, so
 * this is the only curve acting on a dungeon enemy.
 *
 * The curve is geometric between two anchors per difficulty, which is what makes twenty stages
 * fittable with four numbers instead of forty:
 *
 * ```
 * dungeonScale(stage, d) = BASE[d] × (TOP[d] / BASE[d]) ^ ((stage − 1) / (DUNGEON_STAGES − 1))
 * ```
 *
 * The anchors, and what each is pitched at (`§7` of the design doc has the measurements):
 *
 * | Anchor | Scale | Pitched at |
 * | --- | --- | --- |
 * | Normal 1 | 0.9 | the three champions a new chronicle is given, on day one |
 * | Normal 20 | 18 | a late-game roster: 5★, half-geared |
 * | Hard 1 | 24 | past Normal 20 by a clear step — Hard is earned, not stumbled into |
 * | Hard 20 | 70 | a finished roster's deepest farm, the hardest repeatable fight in the game |
 *
 * Normal 1 sits under the Brewery's opening stage on purpose: a new chronicle has **three**
 * champions, not four, so its dungeon party is a slot short of the one these numbers assume.
 */
export const DUNGEON_SCALE_BASE: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 0.9,
  hard: 24,
};
export const DUNGEON_SCALE_TOP: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 18,
  hard: 70,
};

/** `DUNGEON_SCALE_BASE → DUNGEON_SCALE_TOP`, geometric over the twenty stages. */
export function dungeonScale(stage: number, difficulty: DungeonDifficulty): number {
  const clamped = Math.max(1, Math.min(DUNGEON_STAGES, Math.round(stage)));
  const base = DUNGEON_SCALE_BASE[difficulty];
  const top = DUNGEON_SCALE_TOP[difficulty];
  return base * Math.pow(top / base, (clamped - 1) / (DUNGEON_STAGES - 1));
}

/** The keeper's own multiplier on top of the stage's scale, before the boss HP/ATK multipliers. */
export const DUNGEON_KEEPER_MULT = 1;

/** Plate level per stage: display only, like the campaign's (owner's answer Q29). */
export const DUNGEON_LEVEL_BASE: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 6,
  hard: 60,
};
export const DUNGEON_LEVEL_PER_STAGE: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 2.3,
  hard: 1.5,
};

// ---------------------------------------------------------------------------------------------
// The bands
// ---------------------------------------------------------------------------------------------

/**
 * A run of stages that drop the same shape of piece and cost the same energy.
 *
 * The bands are the mode: a dungeon is a ladder of gear, and a band is one rung of it. Star range,
 * rarity and price step together on purpose (the owner's brief — energy rises "each time a stage
 * has higher chances for higher star gear drops"), so a player can read the price and know what
 * they are buying.
 */
export interface DungeonBand {
  difficulty: DungeonDifficulty;
  /** Stage range, inclusive. The bands of a difficulty tile 1..`DUNGEON_STAGES` with no gap. */
  from: number;
  to: number;
  /** Energy a run of this band costs. The only thing a dungeon charges. */
  energy: number;
  /** Star weights for a dropped piece; the keys are the stars themselves. */
  stars: Readonly<Partial<Record<number, number>>>;
  /** Rarity weights. A rarity a band cannot drop is absent rather than a zero (`GEAR.md` §2). */
  rarity: Readonly<Partial<Record<Rarity, number>>>;
  /** Chance of a *second* piece on top of the one every clear pays. */
  extraPiece: number;
}

/**
 * The eight bands, Normal first.
 *
 * Normal is the ladder a chronicle climbs while it is still growing: it opens on 1–2★ Commons and
 * ends on 5–6★ pieces that are mostly Rare with a real chance of Epic. Hard starts where Normal
 * stops being worth running and never drops below Rare — its floor is Normal's ceiling, which is
 * the whole reason to earn it.
 *
 * Weights are shares of their own row; each row sums to 100, so a weight reads as a percentage.
 */
export const DUNGEON_BANDS: readonly DungeonBand[] = [
  {
    difficulty: 'normal',
    from: 1,
    to: 3,
    energy: 8,
    stars: { 1: 60, 2: 40 },
    rarity: { common: 50, uncommon: 33, rare: 15, epic: 2 },
    extraPiece: 0,
  },
  {
    difficulty: 'normal',
    from: 4,
    to: 6,
    energy: 9,
    stars: { 2: 60, 3: 40 },
    rarity: { common: 42, uncommon: 34, rare: 20, epic: 4 },
    extraPiece: 0,
  },
  {
    difficulty: 'normal',
    from: 7,
    to: 10,
    energy: 10,
    stars: { 3: 60, 4: 40 },
    rarity: { common: 33, uncommon: 33, rare: 27, epic: 7 },
    extraPiece: 0.08,
  },
  {
    difficulty: 'normal',
    from: 11,
    to: 14,
    energy: 11,
    stars: { 3: 35, 4: 40, 5: 25 },
    rarity: { common: 24, uncommon: 31, rare: 33, epic: 12 },
    extraPiece: 0.12,
  },
  {
    difficulty: 'normal',
    from: 15,
    to: 17,
    energy: 12,
    stars: { 4: 55, 5: 45 },
    rarity: { common: 15, uncommon: 28, rare: 38, epic: 18, legendary: 1 },
    extraPiece: 0.16,
  },
  {
    difficulty: 'normal',
    from: 18,
    to: 20,
    energy: 13,
    stars: { 5: 65, 6: 35 },
    rarity: { common: 8, uncommon: 22, rare: 42, epic: 26, legendary: 2 },
    extraPiece: 0.2,
  },
  {
    difficulty: 'hard',
    from: 1,
    to: 10,
    energy: 15,
    stars: { 4: 35, 5: 40, 6: 25 },
    rarity: { rare: 34, epic: 45, legendary: 19, mythic: 2 },
    extraPiece: 0.25,
  },
  {
    difficulty: 'hard',
    from: 11,
    to: 20,
    energy: 18,
    // The owner's rule for the deepest band: mostly 6★, at 70/30.
    stars: { 5: 30, 6: 70 },
    rarity: { rare: 20, epic: 46, legendary: 30, mythic: 4 },
    extraPiece: 0.3,
  },
];

/** The band a stage belongs to. Every stage of every difficulty has exactly one. */
export function dungeonBand(stage: number, difficulty: DungeonDifficulty): DungeonBand {
  const clamped = Math.max(1, Math.min(DUNGEON_STAGES, Math.round(stage)));
  const band = DUNGEON_BANDS.find(
    (entry) => entry.difficulty === difficulty && clamped >= entry.from && clamped <= entry.to,
  );
  // The validator proves the bands tile 1..20 for both difficulties, so this never fires in a
  // shipped build; it is here so a bad edit fails loudly instead of silently paying band zero.
  if (!band) throw new RangeError(`dungeonBand: no band for ${difficulty} ${stage}`);
  return band;
}

/** A band's star weights as the entries `rng.weighted` takes, lowest star first. */
export function dungeonStarEntries(band: DungeonBand): readonly { item: number; weight: number }[] {
  return Object.entries(band.stars)
    .map(([stars, weight]) => ({ item: Number.parseInt(stars, 10), weight: weight ?? 0 }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => a.item - b.item);
}

// ---------------------------------------------------------------------------------------------
// What a run pays
// ---------------------------------------------------------------------------------------------

/**
 * Gold: `DUNGEON_GOLD_BASE × (1 + growth × (stage − 1)) × difficulty`.
 *
 * Deliberately thin next to the campaign's — a Normal campaign stand deep in the map pays roughly
 * twice a dungeon run's gold *per point of energy*. Gold is what the campaign is for; a dungeon
 * pays in gear, and the only reason it pays gold at all is that levelling what it drops costs gold
 * (the owner's brief: "a little bit of gold").
 */
export const DUNGEON_GOLD_BASE = 260;
export const DUNGEON_GOLD_STAGE_GROWTH = 0.1;
export const DUNGEON_GOLD_DIFFICULTY: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 1,
  hard: 2.6,
};

/**
 * XP multipliers, applied to the campaign's own per-energy rates (`CHAMPION_XP_PER_ENERGY`,
 * `PLAYER_XP_PER_ENERGY`). A dungeon therefore pays the same XP *per point of energy* as a
 * campaign stand of the matching difficulty, and more per **run** only because it costs more —
 * which is what "based on stage and difficulty" means when the price already rises with the stage.
 */
export const DUNGEON_XP_DIFFICULTY: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 1.5,
  hard: 2.2,
};

/**
 * Summoning shards, "sometimes but very rarely" (the owner's brief). A Faded Shard is the
 * campaign's own drop; Hard adds a thin chance at an Ancient one, which is otherwise a chest
 * reward rather than something that falls off an enemy.
 *
 * At Hard's ~28 runs a full bar buys, these come to roughly one Faded Shard a day and an Ancient
 * every eleven — a trickle beside the Portal's real sources (`ECONOMY.md` §7), which is the point.
 */
export const DUNGEON_FADED_SHARD_CHANCE: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 0.02,
  hard: 0.035,
};
export const DUNGEON_ANCIENT_SHARD_CHANCE: Readonly<Record<DungeonDifficulty, number>> = {
  normal: 0,
  hard: 0.007,
};
