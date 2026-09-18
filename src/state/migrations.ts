/**
 * Save migrations (docs/tech/ARCHITECTURE.md §4.1). Each step upgrades one version; steps run in
 * order until the current SAVE_VERSION is reached. Unknown newer versions are refused (never
 * downgraded destructively).
 */
import { TUTORIAL_CHAPTERS } from '@content/tutorial/index';
import { SaveError } from '@engine/errors';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import { stepFeatureGates } from '@engine/tutorial/index';
import { TOWER_KEY_CAP } from '@content/balance/tower';
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
  {
    from: 10,
    to: 11,
    /*
     * Phase 13: the Chronicler's Path. Every chronicle starts at its first page with the counters
     * it has already earned as the baseline — so the counter missions ask for play from here on,
     * while the state missions ("clear 1-1", "reach level 15") read as already met and a deep
     * chronicle walks them a claim at a time. That is the design's own rule for the two families
     * (`QUESTS_MISSIONS.md` §1), not a special case for old saves.
     */
    migrate: (raw) => ({
      ...raw,
      saveVersion: 11,
      missions: {
        claimed: [],
        baseline: { ...((raw['stats'] ?? {}) as Record<string, number>) },
        chests: [],
        gearChoice: null,
      },
    }),
  },
  {
    from: 11,
    to: 12,
    /*
     * Phase 14: the tutorial. A chronicle that predates it is not sent back to school. Every
     * chapter whose gate its level has already passed counts as waved off, and Steel and Bone —
     * whose lessons stand alone — keeps the ones the chronicle has not reached yet, so a level-8
     * save is still taught Refine when it gets to 18.
     *
     * The grants of the chapters marked off this way are recorded as already paid: a chronicle
     * that played without the lessons is not owed the Provisions that went with them, and
     * `owedGrants` stays honest about paying only for what was taught or genuinely skipped.
     */
    migrate: (raw) => {
      const profile = (raw['profile'] ?? {}) as { level?: unknown };
      const level = typeof profile.level === 'number' ? profile.level : 1;
      const completedSteps: string[] = [];
      const skippedChapters: string[] = [];
      const claimed = new Set(
        ((raw['provisionsClaimed'] ?? []) as unknown[]).filter((id): id is string => typeof id === 'string'),
      );
      for (const chapter of TUTORIAL_CHAPTERS) {
        const open = chapter.trigger.type === 'new_game' || isFeatureUnlocked(chapter.trigger.feature, level);
        if (!open) continue;
        const behind = chapter.sequential
          ? chapter.steps
          : chapter.steps.filter((step) =>
              stepFeatureGates(step).every((feature) => isFeatureUnlocked(feature, level)),
            );
        if (chapter.sequential) skippedChapters.push(chapter.id);
        else for (const step of behind) completedSteps.push(step.id);
        for (const step of behind) if (step.grant) claimed.add(step.grant.id);
      }
      return {
        ...raw,
        saveVersion: 12,
        provisionsClaimed: [...claimed],
        tutorial: { completedSteps, skippedChapters },
      };
    },
  },
  {
    from: 12,
    to: 13,
    /*
     * The missions open at level 1 (the owner's first batch), so the Path is taught second rather
     * than fifth and the three chapters it overtook each moved down one. A step's id carries its
     * chapter number — `tut.<chapter>.<index>` — so ids written before the move now name a
     * different lesson, and a chronicle that had been taught the Tavern would read as having been
     * taught the Path.
     *
     * Chapter ids are slugs (`tut.the_hold`), so `skippedChapters` is untouched; only the step ids
     * rotate, and only for the four chapters that moved.
     */
    migrate: (raw) => {
      const tutorial = (raw['tutorial'] ?? {}) as { completedSteps?: unknown; skippedChapters?: unknown };
      const steps = Array.isArray(tutorial.completedSteps) ? tutorial.completedSteps : [];
      const moved = steps.map((id) => {
        if (typeof id !== 'string') return id;
        const match = /^tut\.(\d)\.(\d{1,2})$/.exec(id);
        const chapter = match ? Number(match[1]) : null;
        const to = chapter === null ? null : (CHAPTER_MOVES[chapter] ?? null);
        return to === null || !match ? id : `tut.${to}.${match[2]}`;
      });
      return {
        ...raw,
        saveVersion: 13,
        tutorial: { ...tutorial, completedSteps: moved },
      };
    },
  },
  {
    from: 13,
    to: 14,
    /*
     * The Eternal Tower. A chronicle that predates it has never climbed, so the slice starts
     * empty — and deliberately with `firstAttemptAt: 0` rather than `now`: a season is anchored
     * to the first floor actually attempted, so a save migrated today and opened in a month still
     * gets a full thirty days when its owner finally walks in (ETERNAL_TOWER.md §7).
     *
     * The keys start full, which is what a new tower is worth: ten floors' worth of welcome.
     * `key_eternal` also joins the wallet, because the wallet holds a row per currency.
     */
    migrate: (raw) => {
      const wallet = (raw['wallet'] ?? {}) as Record<string, number>;
      const updatedAt = typeof raw['updatedAt'] === 'number' ? raw['updatedAt'] : 0;
      return {
        ...raw,
        saveVersion: 14,
        wallet: { ...wallet, key_eternal: wallet['key_eternal'] ?? 0 },
        tower: {
          firstAttemptAt: 0,
          climbSeason: 0,
          highestFloor: 0,
          bestFloor: 0,
          keys: { value: TOWER_KEY_CAP, lastTickAt: updatedAt },
        },
      };
    },
  },
];

/**
 * Where each tutorial chapter went when the Path moved to second place. Chapters 1 and 6 did not
 * move, so they are absent and their ids are left alone.
 */
const CHAPTER_MOVES: Readonly<Record<number, number>> = { 2: 3, 3: 4, 4: 5, 5: 2 };

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
