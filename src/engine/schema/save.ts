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

export const SAVE_VERSION = 13 as const;

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
export const TEAM_MODES = ['campaign', 'boss'] as const;
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

export type SaveGameV13 = z.infer<typeof saveSchemaV13>;
export type SaveGame = SaveGameV13;
export type QuestPeriodSave = z.infer<typeof questPeriodSchema>;
export type MissionsSave = z.infer<typeof missionsSchema>;
export type TutorialSave = z.infer<typeof tutorialSchema>;
export type TeamPresets = SaveGame['teams'];
export type CampaignSave = SaveGame['campaign'];
export type StagePointer = z.infer<typeof stagePointerSchema>;
export type SummonSave = SaveGame['summon'];
export type SummonRecord = z.infer<typeof summonRecordSchema>;
export type ChampionChoiceRecord = z.infer<typeof championChoiceSchema>;
/** The schema of the current SAVE_VERSION. */
export const saveSchema = saveSchemaV13;

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

export function emptyTeams(): TeamPresets {
  return {
    campaign: { presets: [[], [], []], lastUsed: [] },
    boss: { presets: [[], [], []], lastUsed: [] },
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
