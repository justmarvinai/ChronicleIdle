/**
 * Save migrations (docs/tech/ARCHITECTURE.md §4.1). Each step upgrades one version; steps run in
 * order until the current SAVE_VERSION is reached. Unknown newer versions are refused (never
 * downgraded destructively).
 */
import { SaveError } from '@engine/errors';
import { SAVE_VERSION, saveSchema, type SaveGame } from '@engine/schema/save';

export interface MigrationStep {
  from: number;
  to: number;
  migrate: (raw: Record<string, unknown>) => Record<string, unknown>;
}

/** Ordered list; append a step whenever SAVE_VERSION increases. */
export const MIGRATIONS: readonly MigrationStep[] = [
  {
    // Phase 1: the roster arrives; the profile avatar now points at a champion instead of an asset.
    from: 1,
    to: 2,
    migrate: (raw) => {
      const profile = { ...((raw['profile'] as Record<string, unknown> | undefined) ?? {}) };
      delete profile['avatarKey'];
      return {
        ...raw,
        saveVersion: 2,
        profile: { ...profile, avatarChampionId: null },
        roster: {},
        counters: { instances: 0 },
      };
    },
  },
  {
    // Phase 2: team presets per party-size mode.
    from: 2,
    to: 3,
    migrate: (raw) => ({
      ...raw,
      saveVersion: 3,
      teams: {
        campaign: { presets: [[], [], []], lastUsed: [] },
        boss: { presets: [[], [], []], lastUsed: [] },
      },
    }),
  },
  {
    // Phase 3: campaign progress. A chronicle from before the campaign starts at its first stage.
    from: 3,
    to: 4,
    migrate: (raw) => ({
      ...raw,
      saveVersion: 4,
      campaign: { stars: {}, bestTurns: {}, selected: null, autoRepeat: 1 },
    }),
  },
  {
    // Phase 4: titles are earned by play and derived on read, so the stored list goes; what stays
    // is the one the chronicle wears, and a returning chronicle wears none until it picks.
    from: 4,
    to: 5,
    migrate: (raw) => {
      const profile = { ...((raw['profile'] as Record<string, unknown> | undefined) ?? {}) };
      delete profile['titles'];
      return { ...raw, saveVersion: 5, profile: { ...profile, title: null } };
    },
  },
  {
    // Phase 6: gear. A chronicle from before it owns nothing, and its champions wear nothing —
    // the roster's `gear` slots have always been there and have always been null.
    from: 5,
    to: 6,
    migrate: (raw) => {
      const counters = { ...((raw['counters'] as Record<string, unknown> | undefined) ?? {}) };
      return {
        ...raw,
        saveVersion: 6,
        inventory: {},
        counters: { instances: Number(counters['instances'] ?? 0), gear: 0 },
      };
    },
  },
  {
    // Phase 8: the Portal (save v7 — the version and the phase number part ways here). A
    // chronicle from before it has pulled nothing, so every mercy counter starts at zero and no
    // champion choice has been taken — including the Intro milestone's Epic, which is owed the
    // moment the Portal exists because that entitlement is derived from the campaign's stars
    // rather than stored.
    from: 6,
    to: 7,
    migrate: (raw) => ({
      ...raw,
      saveVersion: 7,
      summon: {
        pity: { faded: {}, ancient: {}, sacred: {}, primordial: {} },
        history: [],
        unseen: [],
        choices: {},
      },
    }),
  },
  {
    // Phase 9: the Idle Chest. It starts filling from when the chronicle was last saved, so a
    // returning player is paid for the time they were away (capped at capacity, as always) rather
    // than finding an empty chest for having been offline before it existed.
    from: 7,
    to: 8,
    migrate: (raw) => ({
      ...raw,
      saveVersion: 8,
      idle: { lastClaimAt: Number(raw['updatedAt'] ?? 0) },
    }),
  },
  {
    from: 8,
    to: 9,
    // Phase 10: the period bosses. Nobody has spent a key yet, so the record is simply empty —
    // the first fight writes the period it belongs to (BOSSES.md §1).
    migrate: (raw) => ({ ...raw, saveVersion: 9, bosses: {} }),
  },
  {
    from: 9,
    to: 10,
    /*
     * Phase 12: the quest boards. A chronicle that predates them starts both periods *now*, with
     * the counters it has already earned as the baseline — so the first board is a fresh day's
     * work rather than a handful of quests that complete themselves on the strength of a hundred
     * hours of play. The period keys come from the save's own clock reading (`periods`), which the
     * offline pass has always kept up to date.
     */
    migrate: (raw) => {
      const periods = (raw['periods'] ?? {}) as { lastDailyKey?: unknown; lastWeeklyKey?: unknown };
      const stats = (raw['stats'] ?? {}) as Record<string, number>;
      const period = (key: unknown) => ({
        periodKey: typeof key === 'string' ? key : '',
        baseline: { ...stats },
        claimed: [],
        chests: [],
        dayCounted: false,
      });
      return {
        ...raw,
        saveVersion: 10,
        quests: { daily: period(periods.lastDailyKey), weekly: period(periods.lastWeeklyKey) },
      };
    },
  },
];

export interface MigrationResult {
  save: SaveGame;
  fromVersion: number;
  migrated: boolean;
}

function versionOf(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('save_invalid', 'Save is not an object');
  const v = (raw as { saveVersion?: unknown }).saveVersion;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0)
    throw new SaveError('save_invalid', 'Save has no valid saveVersion');
  return v;
}

export function migrateSave(raw: unknown, steps: readonly MigrationStep[] = MIGRATIONS): MigrationResult {
  const fromVersion = versionOf(raw);
  if (fromVersion > SAVE_VERSION) {
    throw new SaveError(
      'save_version_unsupported',
      `Save version ${fromVersion} is newer than supported ${SAVE_VERSION}`,
      { version: fromVersion },
    );
  }
  let current = raw as Record<string, unknown>;
  let version = fromVersion;
  while (version < SAVE_VERSION) {
    const step = steps.find((s) => s.from === version);
    if (!step) throw new SaveError('save_invalid', `No migration from save version ${version}`);
    current = step.migrate(structuredClone(current));
    version = step.to;
  }
  const parsed = saveSchema.safeParse(current);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    throw new SaveError('save_invalid', `Save failed validation (${detail})`, {
      issues: parsed.error.issues,
    });
  }
  return { save: parsed.data, fromVersion, migrated: fromVersion !== SAVE_VERSION };
}
