/**
 * Save-game schema, version 1 (docs/tech/ARCHITECTURE.md §4.1). Only the slices that exist in the
 * current phase are present; later phases add fields together with a migration.
 */
import { z } from 'zod';
import { CHAMPION_IDS, GEAR_SLOTS, OBTAIN_SOURCES } from '@content/champions/types';
import { CURRENCY_IDS } from '@content/currencies/types';

export const SAVE_VERSION = 2 as const;

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

export const saveSchemaV2 = z.object({
  saveVersion: z.literal(2),
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
    titles: z.array(z.string()),
  }),
  wallet: walletSchema,
  energy: z.object({ value: z.number().min(0), lastTickAt: z.number().int().nonnegative() }),
  /** Ids of one-time energy grants already claimed (balance/energy.ts ENERGY_PROVISIONS). */
  provisionsClaimed: z.array(z.string()),
  /** Owned champions by instance id; empty until the starter is chosen. */
  roster: z.record(z.string(), championInstanceSchema),
  /** Running counters that mint stable ids. */
  counters: z.object({ instances: z.number().int().min(0) }),
  settings: settingsSchema,
  /** Lifetime counters used by quests, missions and the profile screen. */
  stats: z.record(z.string(), z.number()),
  periods: z.object({ lastDailyKey: z.string(), lastWeeklyKey: z.string() }),
});

export type SaveGameV2 = z.infer<typeof saveSchemaV2>;
export type SaveGame = SaveGameV2;
/** The schema of the current SAVE_VERSION. */
export const saveSchema = saveSchemaV2;
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
