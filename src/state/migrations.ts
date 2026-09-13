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
