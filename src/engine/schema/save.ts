/**
 * Save-game schema, version 5 (docs/tech/ARCHITECTURE.md §4.1). Only the slices that exist in the
 * current phase are present; later phases add fields together with a migration.
 */
import { z } from 'zod';
import { DIFFICULTY_MULT, type Difficulty } from '@content/balance/battle';
import { SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { CHAMPION_IDS, GEAR_SLOTS, OBTAIN_SOURCES } from '@content/champions/types';
import { CURRENCY_IDS } from '@content/currencies/types';

export const SAVE_VERSION = 5 as const;

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

export const saveSchemaV5 = z.object({
  saveVersion: z.literal(5),
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
  /** Ids of one-time energy grants already claimed (balance/energy.ts ENERGY_PROVISIONS). */
  provisionsClaimed: z.array(z.string()),
  /** Owned champions by instance id; empty until the starter is chosen. */
  roster: z.record(z.string(), championInstanceSchema),
  /** Running counters that mint stable ids. */
  counters: z.object({ instances: z.number().int().min(0) }),
  teams: z.object({ campaign: teamModeSchema, boss: teamModeSchema }),
  campaign: campaignSchema,
  settings: settingsSchema,
  /** Lifetime counters used by quests, missions and the profile screen. */
  stats: z.record(z.string(), z.number()),
  periods: z.object({ lastDailyKey: z.string(), lastWeeklyKey: z.string() }),
});

export type SaveGameV5 = z.infer<typeof saveSchemaV5>;
export type SaveGame = SaveGameV5;
export type TeamPresets = SaveGame['teams'];
export type CampaignSave = SaveGame['campaign'];
export type StagePointer = z.infer<typeof stagePointerSchema>;
/** The schema of the current SAVE_VERSION. */
export const saveSchema = saveSchemaV5;

export function emptyCampaign(): CampaignSave {
  return { stars: {}, bestTurns: {}, selected: null, autoRepeat: 1 };
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
