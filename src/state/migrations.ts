/**
 * Save migrations (docs/tech/ARCHITECTURE.md §4.1). Each step upgrades one version; steps run in
 * order until the current SAVE_VERSION is reached. Unknown newer versions are refused (never
 * downgraded destructively).
 */
import { TUTORIAL_CHAPTERS } from '@content/tutorial/index';
import { SaveError } from '@engine/errors';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import { newMine } from '@engine/mine/index';
import { stepFeatureGates } from '@engine/tutorial/index';
import { TOWER_KEY_CAP } from '@content/balance/tower';
import { BOSS_STAGE_NUMBER, SETTLEMENT_COUNT } from '@content/balance/campaign';
import { DIFFICULTY_MULT } from '@content/balance/battle';
import { PALACE_POINT_SOURCES } from '@content/balance/palace';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { settlementKey } from '@engine/palace/index';
import { SAVE_VERSION, emptyDeeds, saveSchema, type SaveGame } from '@engine/schema/save';

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
  {
    from: 14,
    to: 15,
    /*
     * The Glorious Palace. A chronicle that predates it has already finished settlements, and a
     * veteran who opens the Palace to find it empty has been robbed of what they earned — so the
     * migration pays for every settlement boss already beaten, on every difficulty, and records
     * them as paid. That is the same courtesy the Idle Chest was given (Q40).
     *
     * The tower and the bosses are not backpaid: both repeat, and what they owe is measured
     * against a season and a period that have already turned over.
     */
    migrate: (raw) => {
      const campaign = (raw['campaign'] ?? {}) as { stars?: Record<string, number> };
      const stars = campaign.stars ?? {};
      const paid: string[] = [];
      for (const difficulty of DIFFICULTIES)
        for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1) {
          const key = progressKey(stageIdOf(settlement, BOSS_STAGE_NUMBER), difficulty);
          if ((stars[key] ?? 0) > 0) paid.push(settlementKey(difficulty, settlement));
        }
      return {
        ...raw,
        saveVersion: 15,
        palace: {
          nodes: [],
          earned: paid.length * PALACE_POINT_SOURCES.settlement,
          settlementsPaid: paid,
          tower: { season: 0, floorPaid: 0 },
          bossesPaid: {},
        },
      };
    },
  },
  {
    from: 15,
    to: 16,
    /*
     * The Brewery. Nothing is back-paid and nothing can be: a chronicle's campaign says nothing
     * about which cellar doors it has been through, and the day's twenty runs belong to today. A
     * migrated chronicle walks in with all twenty in hand and stage 1 of every hall open, which is
     * where a new one starts too.
     */
    migrate: (raw) => ({
      ...raw,
      saveVersion: 16,
      brewery: { periodKey: '', runs: 0, cleared: {} },
    }),
  },
  {
    from: 16,
    to: 17,
    /*
     * The two period bosses were renamed (0.7.1), and a save stores their ids in three places: the
     * `bosses` slice, the Palace's record of which period each one last paid a skill point for, and
     * the lifetime counters a quest or a mission can name. Renaming the content without moving
     * these would read as a chronicle that had never fought either of them — every key spent, every
     * damage record and every chest taken, silently gone.
     */
    migrate: (raw) => ({
      ...raw,
      saveVersion: 17,
      bosses: renameBossIds(raw['bosses'], renameBossEntry),
      palace: isRecord(raw['palace'])
        ? { ...raw['palace'], bossesPaid: renameBossIds(raw['palace']['bossesPaid']) }
        : raw['palace'],
      stats: renameKeys(raw['stats']),
      // A board's baseline is a copy of the counters taken when the period opened, and a mission's
      // is the same at the Path's first page. Moving the counters without moving their baselines
      // would read every boss fight the chronicle has ever had as one fought this period.
      quests: renameBaselines(raw['quests'], ['daily', 'weekly']),
      missions: withBaseline(raw['missions']),
    }),
  },
  {
    from: 17,
    to: 18,
    /*
     * The Dungeons (0.8.0). Two new things a save carries: how deep each keep has been taken, and
     * a third team preset row for the four champions a dungeon fields.
     *
     * Both start empty. There is nothing to back-pay — a chronicle that predates the mode has
     * cleared nothing in it — and an empty preset row is what every chronicle starts with anyway;
     * the battle setup fills it from the roster the first time a keep is entered.
     */
    migrate: (raw) => ({
      ...raw,
      saveVersion: 18,
      teams: withDungeonTeam(raw['teams']),
      dungeons: { cleared: {} },
    }),
  },
  {
    from: 18,
    to: 19,
    /*
     * The Market, the Bag, the boosts and the Login Calendar (0.9.0).
     *
     * Everything starts empty, and **the calendar starts at day 1** for a chronicle that predates
     * it. Back-paying days for time already played would be wrong twice over: the board counts
     * logins rather than dates, so there is no history to read; and a veteran opening the game to
     * a fortnight of free tiles would skip the part of the board that is meant to be walked.
     *
     * `market.hour` starts at -1 rather than 0. Zero is a real market hour — the one containing
     * the epoch — and a save stamped with it would read as "this hour's stall has already been
     * shopped" for anyone whose clock said 1970. -1 is never a real hour.
     */
    migrate: (raw) => ({
      ...raw,
      saveVersion: 19,
      bag: {},
      boosts: {},
      market: { hour: -1, taken: {}, bundles: [] },
      login: { claimed: 0, lastKey: '' },
    }),
  },
  {
    from: 19,
    to: 20,
    /*
     * The Mine (0.10.0). A chronicle that predates it gets the Mine a new one gets: level 1, its
     * first store already full, stamped from the chronicle's last save. Nothing is back-paid for
     * the months the Mine did not exist — a store holds half a day at most, and a veteran opening
     * the update to a vein already dug to level 7 would skip the part of the Mine that is a
     * decision. What they do find is the first store waiting, which is what the lesson collects.
     */
    migrate: (raw) => ({
      ...raw,
      saveVersion: 20,
      mine: newMine(typeof raw['updatedAt'] === 'number' ? raw['updatedAt'] : 0),
    }),
  },
  {
    from: 20,
    to: 21,
    /*
     * The Hall of Deeds (0.12.0). A chronicle that predates it has claimed nothing — and needs to
     * be given nothing: the Hall reads the whole chronicle from its lifetime counters, so every
     * tier the veteran already passed is waiting to be claimed the day the Hall opens.
     */
    migrate: (raw) => ({ ...raw, saveVersion: 21, deeds: emptyDeeds() }),
  },
];

/** The v18 team row. A save that somehow already has one keeps it; anything else starts empty. */
function withDungeonTeam(value: unknown): unknown {
  const empty = { presets: [[], [], []], lastUsed: [] };
  if (!isRecord(value)) return { campaign: empty, boss: empty, dungeon: empty };
  return { ...value, dungeon: isRecord(value['dungeon']) ? value['dungeon'] : empty };
}

/**
 * What 0.7.1 renamed (`BOSSES.md` §1), old → new. Both spellings a boss's slug has ever appeared
 * under are listed: `boss.<slug>` is the id itself and the prefix of every tier key a save holds
 * today, and `tier.<slug>` is what those keys looked like before v10 numbered them. A save is
 * rewritten by *substring*, because the slug sits inside keys as well as being one.
 */
const RENAMED_BOSSES: readonly (readonly [string, string])[] = [
  ['boss.gravemaw', 'boss.gargoyle'],
  ['boss.nyxara', 'boss.titan'],
  ['tier.gravemaw', 'tier.gargoyle'],
  ['tier.nyxara', 'tier.titan'],
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The new spelling of any id, key or claim string the rename touches. */
function renamed(text: string): string {
  let out = text;
  for (const [from, to] of RENAMED_BOSSES) out = out.split(from).join(to);
  return out;
}

/** Re-keys a record whose keys carry a boss id, optionally rewriting each value as well. */
function renameBossIds(value: unknown, entry?: (value: unknown) => unknown): unknown {
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([id, held]) => [renamed(id), entry ? entry(held) : held]),
  );
}

/**
 * One boss's own record. Its damage and its records are keyed by tier and its claimed chests are
 * `<tierKey>.<n>` strings — all three carry the slug, so all three move with it. This is the part
 * a player would actually notice: the period's damage, the chests already taken, and every
 * personal best the chronicle has ever set.
 */
function renameBossEntry(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const claimed = value['claimed'];
  return {
    ...value,
    damage: renameBossIds(value['damage']),
    records: renameBossIds(value['records']),
    ...(Array.isArray(claimed)
      ? { claimed: claimed.map((one) => (typeof one === 'string' ? renamed(one) : one)) }
      : {}),
  };
}

/** A slice that carries its own `baseline` of the counters. */
function withBaseline(value: unknown): unknown {
  if (!isRecord(value)) return value;
  return { ...value, baseline: renameKeys(value['baseline']) };
}

/** The quest boards: one baseline per period, each a snapshot of the counters. */
function renameBaselines(value: unknown, periods: readonly string[]): unknown {
  if (!isRecord(value)) return value;
  const out = { ...value };
  for (const period of periods) out[period] = withBaseline(value[period]);
  return out;
}

/**
 * The lifetime counters, which hold the boss id inside keys like `boss.fights.<bossId>.<tierId>`.
 * A chronicle that somehow held both spellings keeps the sum, which is the only answer that loses
 * nothing.
 */
function renameKeys(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, count] of Object.entries(value)) {
    const moved = renamed(key);
    const before = out[moved];
    out[moved] = typeof before === 'number' && typeof count === 'number' ? before + count : (before ?? count);
  }
  return out;
}

/** The three difficulties, in order, read off the table that defines them. */
const DIFFICULTIES = Object.keys(DIFFICULTY_MULT) as (keyof typeof DIFFICULTY_MULT)[];

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
