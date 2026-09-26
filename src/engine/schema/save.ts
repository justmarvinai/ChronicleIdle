/**
 * Save-game schema (docs/tech/ARCHITECTURE.md §4.1). Only the slices that exist in the current
 * phase are present; later phases add fields together with a migration.
 */
import { z } from 'zod';
import { DIFFICULTY_MULT, type Difficulty } from '@content/balance/battle';
import { SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { CHAMPION_IDS, GEAR_SLOTS, OBTAIN_SOURCES, RARITIES } from '@content/champions/types';
import { GEAR_SOURCES } from '@content/balance/gear';
import { GEAR_MAX_LEVEL, GEAR_MAX_STARS, GEAR_STATS, MAX_SUBSTATS } from '@content/balance/gear';
import { CURRENCY_IDS } from '@content/currencies/types';
import { HISTORY_LIMIT, SHARD_IDS, type ShardId } from '@content/balance/summon';
import { MINE_MAX_LEVEL } from '@content/balance/mine';
import { ACHIEVEMENT_TIERS } from '@content/balance/deeds';

export const SAVE_VERSION = 21 as const;

export const walletSchema = z.object(
  Object.fromEntries(CURRENCY_IDS.map((id) => [id, z.number().min(0)])) as Record<
    (typeof CURRENCY_IDS)[number],
    z.ZodNumber
  >,
);

export const settingsSchema = z.object({
  musicVolume: z.number().min(0).max(1),
  ambienceVolume: z.number().min(0).max(1),
  sfxVolume: z.number().min(0).max(1),
  masterVolume: z.number().min(0).max(1),
  muted: z.boolean(),
  launchFullscreen: z.boolean(),
  reducedMotion: z.boolean(),
  battleSpeed: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  autoBattle: z.boolean(),
  language: z.literal('en'),
});

/** One owned copy of a champion (docs/design/CHAMPIONS.md §6). */
export const championInstanceSchema = z.object({
  instanceId: z.string().min(1),
  defId: z.enum(CHAMPION_IDS),
  level: z.number().int().min(1).max(60),
  xp: z.number().int().min(0),
  stars: z.number().int().min(1).max(6),
  skillUpgrades: z.record(z.string(), z.number().int().min(0).max(4)),
  gear: z.object(
    Object.fromEntries(GEAR_SLOTS.map((slot) => [slot, z.string().nullable()])) as Record<
      (typeof GEAR_SLOTS)[number],
      z.ZodNullable<z.ZodString>
    >,
  ),
  locked: z.boolean(),
  favourite: z.boolean(),
  acquiredAt: z.number().int().nonnegative(),
  source: z.enum(OBTAIN_SOURCES),
});

/** Team presets per party-size mode (docs/tech/ARCHITECTURE.md §4.1, owner's answer Q25). */
export const teamModeSchema = z.object({
  /** Three presets of ordered roster instance ids; slot 0 is the leader. */
  presets: z.array(z.array(z.string())).length(3),
  /** The team last sent into battle in this mode. */
  lastUsed: z.array(z.string()),
});
export const TEAM_MODES = ['campaign', 'boss', 'dungeon'] as const;
export type TeamMode = (typeof TEAM_MODES)[number];

const DIFFICULTIES = Object.keys(DIFFICULTY_MULT) as [Difficulty, ...Difficulty[]];

/** Where the player is pointed: the map, stage list and battle setup reopen here. */
export const stagePointerSchema = z.object({
  settlement: z.number().int().min(1).max(SETTLEMENT_COUNT),
  stage: z.number().int().min(1).max(STAGES_PER_SETTLEMENT),
  difficulty: z.enum(DIFFICULTIES),
});

/**
 * Campaign progress (docs/design/CAMPAIGN.md §3). Only what was played is stored: stars and best
 * turns per `<stageId>|<difficulty>`. Unlocks, chests and "where am I" are derived from these by
 * `@engine/campaign/progress`, so the save can never disagree with itself (CLAUDE.md §5.5).
 */
export const campaignSchema = z.object({
  stars: z.record(z.string(), z.number().int().min(1).max(3)),
  bestTurns: z.record(z.string(), z.number().int().min(1)),
  selected: stagePointerSchema.nullable(),
  /** Runs the auto-repeat selector is set to; 1 is a single run (CAMPAIGN.md §9). */
  autoRepeat: z.number().int().min(1).max(50),
});

/** One piece of gear (docs/design/GEAR.md §8); the main stat's value follows from star and level. */
export const gearInstanceSchema = z.object({
  instanceId: z.string().min(1),
  slot: z.enum(GEAR_SLOTS),
  setId: z.string().min(1),
  rarity: z.enum(RARITIES),
  stars: z.number().int().min(1).max(GEAR_MAX_STARS),
  level: z.number().int().min(0).max(GEAR_MAX_LEVEL),
  mainStat: z.enum(GEAR_STATS),
  subs: z
    .array(
      z.object({
        stat: z.enum(GEAR_STATS),
        value: z.number().min(0),
        rolls: z.number().int().min(1),
      }),
    )
    .max(MAX_SUBSTATS),
  equippedTo: z.string().nullable(),
  locked: z.boolean(),
  acquiredAt: z.number().int().nonnegative(),
  source: z.enum(GEAR_SOURCES),
});

/**
 * One pull, as the portal's history shows it (docs/design/SUMMONING.md §5). The copy it became is
 * named, so "View champion" still works for a pull from a hundred summons ago.
 */
export const summonRecordSchema = z.object({
  at: z.number().int().nonnegative(),
  shard: z.enum(SHARD_IDS),
  bannerId: z.string().min(1),
  championId: z.enum(CHAMPION_IDS),
  rarity: z.enum(RARITIES),
  instanceId: z.string().min(1),
  /** The chronicle already had a copy — rank-up material, never auto-converted (owner's Q8). */
  duplicate: z.boolean(),
  /** Mercy, not the dice, decided the rarity. */
  mercy: z.boolean(),
  /** The champion was one of the rotation's featured. */
  featured: z.boolean(),
});

/** Pulls since each rarity on one shard type; a missing key is zero (`@engine/summon/pity`). */
const pityCountersSchema = z.record(z.string(), z.number().int().min(0));

/**
 * A champion choice that has been taken (`CHAMPION_CHOICES` in `balance/campaign.ts`). Which
 * choices are *owed* is derived from the campaign's stars, so only the taking is stored — a
 * chronicle that mastered Intro before the Portal existed is still owed its Epic (CLAUDE.md §5.5).
 */
export const championChoiceSchema = z.object({
  championId: z.enum(CHAMPION_IDS),
  instanceId: z.string().min(1),
  at: z.number().int().nonnegative(),
});

/** The Summoning Portal's save slice (docs/design/SUMMONING.md §2, §5). */
export const summonSchema = z.object({
  /** Mercy counters per shard type; they persist across banners. */
  pity: z.object(
    Object.fromEntries(SHARD_IDS.map((shard) => [shard, pityCountersSchema])) as Record<
      ShardId,
      typeof pityCountersSchema
    >,
  ),
  /** Newest first; older pulls fall off the end at `HISTORY_LIMIT`. */
  history: z.array(summonRecordSchema).max(HISTORY_LIMIT),
  /** Roster copies the Portal delivered that the player has not opened yet — the "NEW" badge. */
  unseen: z.array(z.string()),
  /** Taken champion choices, keyed by choice id. */
  choices: z.record(z.string(), championChoiceSchema),
});

/**
 * One boss's period (docs/design/BOSSES.md §1). `periodKey` is the same daily/weekly key the rest
 * of the game resets on: a record from an older period reads as a fresh one, so keys, damage and
 * claims come back without anything having to run at midnight. `records` outlive the reset.
 */
const bossRecordSchema = z.object({
  damage: z.number().min(0),
  at: z.number().int().nonnegative(),
  team: z.array(z.string()),
});

const bossSaveSchema = z.object({
  periodKey: z.string(),
  keysUsed: z.number().int().min(0),
  damage: z.record(z.string(), z.number().min(0)),
  claimed: z.array(z.string()),
  records: z.record(z.string(), bossRecordSchema),
});

/**
 * One period's quest board as the save keeps it (QUESTS_MISSIONS.md §2). Everything else about a
 * board — which quests are shown, how far along they are, the points, the chests — is derived from
 * these fields and the lifetime counters (`@engine/quests/board`).
 */
const questPeriodSchema = z.object({
  /** The period these claims belong to; an older one reads as a fresh board. */
  periodKey: z.string(),
  /**
   * The counters as they stood when the period began. A `count`-style goal measures the delta, so
   * yesterday's play cannot finish today's quest.
   */
  baseline: z.record(z.string(), z.number()),
  /** Quest ids claimed this period. */
  claimed: z.array(z.string()),
  /** Chest thresholds taken this period. */
  chests: z.array(z.number().int().min(1).max(100)),
  /**
   * Whether finishing this board has already been counted for the weekly quest that counts days
   * (`quests.daily.days`). A chronicle that levels past a feature gate mid-period sees a new
   * quest appear on a board it had already finished; this is what keeps that one day one day.
   * Written on the daily board only — the weekly board has nothing that counts weeks.
   */
  dayCounted: z.boolean(),
});

/**
 * The Chronicler's Path as the save keeps it (QUESTS_MISSIONS.md §4). The line is derived from
 * `claimed` — the mission being walked is the first one not in it — so nothing here can disagree
 * with the content (ADR-040's discipline, applied to the Path).
 */
const missionsSchema = z.object({
  /** Mission ids claimed, in the order they were claimed. */
  claimed: z.array(z.string()),
  /** The counters when the open mission became open; its counter goals measure the delta. */
  baseline: z.record(z.string(), z.number()),
  /** Chapter indices whose chest has been taken. */
  chests: z.array(z.number().int().min(1).max(10)),
  /** The piece Eldric's parting gift was struck as, once the chronicle named it. */
  gearChoice: z.string().nullable(),
});

/**
 * The tutorial (TUTORIAL.md). What is kept is what Eldric has already taught and which chapters
 * the player waved off; *which* lesson is open follows from those, the chronicle and where the
 * player is standing (`@engine/tutorial`), so a save can never disagree with the step it is on.
 */
const tutorialSchema = z.object({
  /** Step ids finished, in the order they were taught. */
  completedSteps: z.array(z.string()),
  /** Chapter ids the player pressed "Skip this lesson" on — or that predate the tutorial. */
  skippedChapters: z.array(z.string()),
});

/**
 * The Eternal Tower (ETERNAL_TOWER.md). Three facts and a key pool: when this season began, how
 * high the climb got, and the best it has ever got. Which floors are behind the player follows
 * from the climb — floors are taken in order — so there is no per-floor list to keep in step.
 */
export const towerSchema = z.object({
  /** 0 while the tower has never been entered; every season is measured from this instant. */
  firstAttemptAt: z.number().int().nonnegative(),
  /** Which season (0-based, from the anchor) `highestFloor` belongs to. */
  climbSeason: z.number().int().min(0),
  highestFloor: z.number().int().min(0),
  /** Outlives the season, as a boss record outlives its period. */
  bestFloor: z.number().int().min(0),
  /** Eternal Keys: a value that a grant may carry above the cap, and its last tick. */
  keys: z.object({ value: z.number().min(0), lastTickAt: z.number().int().nonnegative() }),
});

/**
 * The Glorious Palace (GLORIOUS_PALACE.md §3). `earned` is a running total because two of the four
 * sources repeat — the tower each season, the bosses each period — and no look at today's progress
 * could recover what last month paid. The watermarks beside it are what stops a source paying
 * twice; `spent` is never stored, because it is always the sum of what is bought.
 */
export const palaceSchema = z.object({
  /** Node ids bought, in the order they were bought. */
  nodes: z.array(z.string().min(1)),
  earned: z.number().int().min(0),
  /** `<difficulty>.<settlement>` for each settlement already paid; 36 of them at most. */
  settlementsPaid: z.array(z.string().min(1)),
  /** The season the floor watermark belongs to, and the highest floor paid inside it. */
  tower: z.object({
    season: z.number().int().min(0),
    floorPaid: z.number().int().min(0),
  }),
  /** Boss id → the period key whose pool has already paid, so one kill pays once. */
  bossesPaid: z.record(z.string(), z.string()),
});

/**
 * The Brewery (BREWERY.md §2). The day's allowance and how deep each hall has been taken: a record
 * stamped with an older day reads as a fresh one, so the twenty runs come back at the door rather
 * than at midnight. Which stages are behind the player follows from the deepest clear, because
 * stages are taken in order — there is no per-stage list to fall out of step.
 */
export const brewerySchema = z.object({
  /** The game day the count belongs to; `''` before the first run. */
  periodKey: z.string(),
  /** Runs spent today, across every hall together. */
  runs: z.number().int().min(0),
  /** Hall id → the deepest stage cleared in it. */
  cleared: z.record(z.string(), z.number().int().min(0)),
});

/**
 * The Dungeons (DUNGEONS.md §4). Two numbers per keep — the deepest stage cleared on each
 * difficulty — and nothing else. Which stages are behind the player follows from those, because
 * stages are taken in order; whether Hard is open follows from `normal` reaching the twentieth.
 * There is no per-stage list to fall out of step and no "unlocked" flag to disagree with it.
 *
 * Keyed by dungeon **slug** rather than id: the slug is what the route and the screens already
 * carry, and a save that stores the shorter of two equivalent keys is a save that stays readable.
 */
export const dungeonProgressSchema = z.object({
  normal: z.number().int().min(0),
  hard: z.number().int().min(0),
});

export const dungeonsSchema = z.object({
  /** Dungeon slug → how deep it has been taken. Absent until the first keeper falls. */
  cleared: z.record(z.string(), dungeonProgressSchema),
});

/**
 * The Bag (MARKET.md §5): item id → how many are held. A consumable has no instance identity —
 * one Brewery Token is every Brewery Token — so unlike gear this is a count, not a record per
 * object. An id that is absent is held zero times, and a count never reaches zero and stays.
 */
export const bagSchema = z.record(z.string(), z.number().int().positive());

/**
 * The three timed boosts (MARKET.md §4): boost id → **the instant it runs out**, never a duration
 * left. A save closed over a weekend comes back with its boosts correctly spent rather than owing
 * two days, and nothing has to tick (CLAUDE.md §5.5). A boost that has never run has no row.
 */
export const boostsSchema = z.record(z.string(), z.number().int().nonnegative());

/**
 * The Market (MARKET.md §1). The Gold Market's shelf is **not** here: it is derived from the hour
 * and the chronicle's seed, so what a save keeps is only which slots of *this* hour have been
 * bought, and which one-time bundles have been taken for good.
 *
 * `hour` stamps the taken list. A list stamped with an older hour reads as an untouched stall,
 * which is how the shelf comes back at the top of the hour with nothing having run.
 */
export const marketSchema = z.object({
  /** The market hour `taken` belongs to; -1 before the first purchase. */
  hour: z.number().int(),
  /** Slot index → how many have been bought from it this hour. */
  taken: z.record(z.string(), z.number().int().nonnegative()),
  /** Ids of one-time bundles already taken; they never come back. */
  bundles: z.array(z.string()),
});

/**
 * The Login Calendar (LOGIN.md §3): the two numbers everything else is read off. `claimed` counts
 * days ever taken and never resets, so `(claimed mod 30) + 1` is the day owed and the board loops
 * forever; `lastKey` is the day key of the last claim, so a second visit the same day pays
 * nothing and a fortnight away costs nothing.
 */
export const loginSchema = z.object({
  claimed: z.number().int().nonnegative(),
  lastKey: z.string(),
});

/**
 * The Mine (MINE.md §6): the level dug, when its store was last emptied, and the fractions of a
 * gem or a Sigil the last collection could not pay whole. What the store holds is derived from
 * those and the clock (CLAUDE.md §5.5), never stored.
 */
export const mineSchema = z.object({
  level: z.number().int().min(1).max(MINE_MAX_LEVEL),
  collectedAt: z.number().int().nonnegative(),
  carry: z.object({ gems: z.number().min(0).lt(1), sigils: z.number().min(0).lt(1) }),
});

/**
 * The Hall of Deeds (ACHIEVEMENTS.md §10): what has been *claimed*, and the frame worn — nothing
 * else. Renown, the rank renown has reached, every achievement's progress, every earned frame and
 * title are derived from these and the chronicle (CLAUDE.md §5.5), so a save edited by hand
 * cannot mint renown it never claimed.
 */
export const deedsSchema = z.object({
  /** Achievement id → tiers claimed (1–5). An achievement never claimed has no row. */
  achievements: z.record(z.string(), z.number().int().min(1).max(ACHIEVEMENT_TIERS)),
  /** Ids of the challenges claimed. */
  challenges: z.array(z.string()),
  /** Ranks of the Hall claimed, in order: 0 before the first. */
  ranks: z.number().int().min(0),
  /** The portrait frame worn, or null for the chronicle's own gold. */
  frame: z.string().nullable(),
});

export const saveSchemaV13 = z.object({
  saveVersion: z.literal(13),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  /** Root seed from which every subsystem derives its own stream. */
  seedRoot: z.string().min(1),
  profile: z.object({
    name: z.string().min(1).max(32),
    level: z.number().int().min(1).max(100),
    xp: z.number().int().min(0),
    /** Champion whose avatar the profile shows; null until one is chosen. */
    avatarChampionId: z.enum(CHAMPION_IDS).nullable(),
    /**
     * The title shown beside the name, or null for none. Which titles are *earned* is derived
     * from the play (`@engine/progression/titles`) and never stored (CLAUDE.md §5.5); only the
     * player's choice of which one to wear lives here.
     */
    title: z.string().nullable(),
  }),
  wallet: walletSchema,
  energy: z.object({ value: z.number().min(0), lastTickAt: z.number().int().nonnegative() }),
  /**
   * Ids of one-time grants already paid: the Chronicler's Provisions of `balance/energy.ts` and
   * anything else a tutorial step hands over once (`tutorial.gift.*`).
   */
  provisionsClaimed: z.array(z.string()),
  /** Owned champions by instance id; empty until the starter is chosen. */
  roster: z.record(z.string(), championInstanceSchema),
  /** Running counters that mint stable ids. */
  counters: z.object({ instances: z.number().int().min(0), gear: z.number().int().min(0) }),
  /** Every piece of gear the chronicle owns, worn or not (GEAR.md §7). */
  inventory: z.record(z.string(), gearInstanceSchema),
  teams: z.object({ campaign: teamModeSchema, boss: teamModeSchema }),
  campaign: campaignSchema,
  /** The Portal: mercy counters, pull history and the champion choices already taken. */
  summon: summonSchema,
  /**
   * The Idle Chest (docs/design/ECONOMY.md §6): when it was last emptied, and nothing else. What
   * it holds is derived from that instant and the clock, so it cannot disagree with the wait.
   */
  idle: z.object({ lastClaimAt: z.number().int().nonnegative() }),
  /** The period bosses, by boss id (BOSSES.md §1). Absent until the first key is spent. */
  bosses: z.record(z.string(), bossSaveSchema),
  settings: settingsSchema,
  /** Lifetime counters used by quests, missions and the profile screen. */
  stats: z.record(z.string(), z.number()),
  periods: z.object({ lastDailyKey: z.string(), lastWeeklyKey: z.string() }),
  /** The quest boards, by period (QUESTS_MISSIONS.md §2–§3). Shipped in save v10. */
  quests: z.object({ daily: questPeriodSchema, weekly: questPeriodSchema }),
  /** The Chronicler's Path (QUESTS_MISSIONS.md §4). Shipped in save v11. */
  missions: missionsSchema,
  /** The tutorial script's progress (TUTORIAL.md). Shipped in save v12; step ids rotated in v13. */
  tutorial: tutorialSchema,
});

/** v14 adds the Eternal Tower; everything else is v13's. */
export const saveSchemaV14 = saveSchemaV13.extend({
  saveVersion: z.literal(14),
  tower: towerSchema,
});

/** v15 adds the Glorious Palace; everything else is v14's. */
export const saveSchemaV15 = saveSchemaV14.extend({
  saveVersion: z.literal(15),
  palace: palaceSchema,
});

/** v16 adds the Brewery; everything else is v15's. */
export const saveSchemaV16 = saveSchemaV15.extend({
  saveVersion: z.literal(16),
  brewery: brewerySchema,
});

/**
 * v17 changes no shape at all: it is the version the boss rename (0.7.1) hangs on, so the ids a
 * save stores for the two period bosses can be moved by a migration rather than read as a
 * chronicle that never fought them.
 */
export const saveSchemaV17 = saveSchemaV16.extend({ saveVersion: z.literal(17) });

/**
 * v18 adds the Dungeons, and a third team preset row for them — a dungeon fields four champions
 * like a boss fight, but a player's dungeon four and their boss four are rarely the same four.
 */
export const saveSchemaV18 = saveSchemaV17.extend({
  saveVersion: z.literal(18),
  teams: z.object({ campaign: teamModeSchema, boss: teamModeSchema, dungeon: teamModeSchema }),
  dungeons: dungeonsSchema,
});

export type SaveGameV13 = z.infer<typeof saveSchemaV13>;
export type SaveGameV14 = z.infer<typeof saveSchemaV14>;
export type SaveGameV15 = z.infer<typeof saveSchemaV15>;
export type SaveGameV16 = z.infer<typeof saveSchemaV16>;
export type SaveGameV17 = z.infer<typeof saveSchemaV17>;
export type SaveGameV18 = z.infer<typeof saveSchemaV18>;
export type SaveGameV19 = z.infer<typeof saveSchemaV19>;
export type SaveGameV20 = z.infer<typeof saveSchemaV20>;
export type SaveGameV21 = z.infer<typeof saveSchemaV21>;
export type SaveGame = SaveGameV21;
export type DeedsSave = z.infer<typeof deedsSchema>;
export type MineSave = z.infer<typeof mineSchema>;
export type PalaceSave = z.infer<typeof palaceSchema>;
export type BrewerySave = z.infer<typeof brewerySchema>;
export type DungeonsSave = z.infer<typeof dungeonsSchema>;
export type TowerSaveData = z.infer<typeof towerSchema>;
export type QuestPeriodSave = z.infer<typeof questPeriodSchema>;
export type MissionsSave = z.infer<typeof missionsSchema>;
export type TutorialSave = z.infer<typeof tutorialSchema>;
export type TeamPresets = SaveGame['teams'];
export type CampaignSave = SaveGame['campaign'];
export type StagePointer = z.infer<typeof stagePointerSchema>;
export type SummonSave = SaveGame['summon'];
export type SummonRecord = z.infer<typeof summonRecordSchema>;
export type ChampionChoiceRecord = z.infer<typeof championChoiceSchema>;
/**
 * v19 adds the Market and everything it needed to exist: a Bag to buy into, the three boosts a
 * purchase can start, the hour's purchases, and the Login Calendar's two numbers.
 */
export const saveSchemaV19 = saveSchemaV18.extend({
  saveVersion: z.literal(19),
  bag: bagSchema,
  boosts: boostsSchema,
  market: marketSchema,
  login: loginSchema,
});

/** v20 adds the Mine; everything else is v19's. */
export const saveSchemaV20 = saveSchemaV19.extend({
  saveVersion: z.literal(20),
  mine: mineSchema,
});

/** v21 adds the Hall of Deeds; everything else is v20's. */
export const saveSchemaV21 = saveSchemaV20.extend({
  saveVersion: z.literal(21),
  deeds: deedsSchema,
});

/** The schema of the current SAVE_VERSION. */
export const saveSchema = saveSchemaV21;

/** A Hall nobody has claimed in: no tiers, no challenges, no ranks and the chronicle's own frame. */
export function emptyDeeds(): DeedsSave {
  return { achievements: {}, challenges: [], ranks: 0, frame: null };
}

/** A Palace nobody has spent in: no nodes, no points, and nothing paid yet. */
export function emptyPalace(): PalaceSave {
  return { nodes: [], earned: 0, settlementsPaid: [], tower: { season: 0, floorPaid: 0 }, bossesPaid: {} };
}

/** A Brewery nobody has walked into: no day, no runs spent, no hall taken. */
export function emptyBrewery(): BrewerySave {
  return { periodKey: '', runs: 0, cleared: {} };
}

/** Dungeons nobody has entered: no keep taken, on either difficulty. */
export function emptyDungeons(): DungeonsSave {
  return { cleared: {} };
}

export function emptyCampaign(): CampaignSave {
  return { stars: {}, bestTurns: {}, selected: null, autoRepeat: 1 };
}

/** A Portal nobody has used yet. */
export function emptySummon(): SummonSave {
  return {
    pity: Object.fromEntries(SHARD_IDS.map((shard) => [shard, {}])) as SummonSave['pity'],
    history: [],
    unseen: [],
    choices: {},
  };
}

/** A chronicle that has never opened the Market or taken a login day. */
export function emptyMarket(): SaveGame['market'] {
  return { hour: -1, taken: {}, bundles: [] };
}

export function emptyLogin(): SaveGame['login'] {
  return { claimed: 0, lastKey: '' };
}

export function emptyTeams(): TeamPresets {
  return {
    campaign: { presets: [[], [], []], lastUsed: [] },
    boss: { presets: [[], [], []], lastUsed: [] },
    dungeon: { presets: [[], [], []], lastUsed: [] },
  };
}
export type Settings = z.infer<typeof settingsSchema>;
export type Profile = SaveGame['profile'];

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.7,
  ambienceVolume: 0.6,
  sfxVolume: 0.8,
  masterVolume: 1,
  muted: false,
  launchFullscreen: true,
  reducedMotion: false,
  battleSpeed: 1,
  autoBattle: false,
  language: 'en',
};
