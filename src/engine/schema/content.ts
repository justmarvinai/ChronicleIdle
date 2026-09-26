import { z } from 'zod';
import { RARITY_KIT, STAT_DEVIATION_TOLERANCE } from '@content/balance/stats';
import { CHAMPION_IDS, STARTER_IDS, type ChampionDef, type PassiveEffect } from '@content/champions/types';
import { CURRENCY_IDS } from '@content/currencies/types';
import { PLACE_IDS } from '@content/places/types';
import { PARTY_SIZE_BOSS, PARTY_SIZE_CAMPAIGN } from '@content/balance/battle';
import type { EncounterDef } from '@content/encounters/types';
import { FACTION_ARCHETYPES, type EnemyDef } from '@content/enemies/types';
import type { FactionDef } from '@content/enemies/faction';
import type { SettlementDef } from '@content/stages/types';
import type { GearSetDef } from '@content/sets/types';
import type { TitleDef } from '@content/titles/types';
import type { ReleaseDef } from '@content/changelog/types';
import type { PalaceNodeDef } from '@content/palace/types';
import { PALACE_BRANCH_COST, PALACE_BRANCH_TOTALS, PALACE_CORE_HP_PCT } from '@content/balance/palace';
import { BREWERY_BOSS_STAGE, BREWERY_STAGES } from '@content/balance/brewery';
import { brewerySchema } from './brewery';
import {
  DUNGEON_BANDS,
  DUNGEON_DIFFICULTIES,
  DUNGEON_STAGES,
  type DungeonDifficulty,
} from '@content/balance/dungeon';
import { dungeonSchema } from './dungeon';
import { LOGIN_DAYS, LOGIN_FINALE_FROM } from '@content/balance/login';
import { consumableSchema, gemShelfEntrySchema, grantSchema, loginDaySchema } from './market';
import { GEAR_MAX_STARS } from '@content/balance/gear';
import { ELEMENTS, STAT_IDS } from '@content/champions/types';
import { CHAMPION_CHOICES, SETTLEMENT_COUNT, STARS_PER_SETTLEMENT } from '@content/balance/campaign';
import { MISSION_CHAPTER_COUNT } from '@content/balance/missions';
import { TUTORIAL_CHAPTER_COUNT } from '@content/balance/tutorial';
import { ENERGY_PROVISIONS } from '@content/balance/energy';
import type { TutorialCondition } from '@content/tutorial/types';
import { SHARD_RATES } from '@content/balance/summon';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { levelCap, statDeviation } from '@engine/champions/stats';
import { unlockLevel } from '@engine/progression/unlocks';
import { championSchema } from './champion';
import { encounterSchema } from './encounter';
import { enemySchema } from './enemy';
import { settlementSchema, stageShapeIssues } from './stage';
import { bannerSchema } from './banner';
import { bossSchema } from './boss';
import { missionChapterSchema } from './mission';
import { tutorialChapterSchema } from './tutorial';
import { FEATURE_IDS } from '@content/balance/unlocks';
import type { Goal, QuestBoardDef } from '@content/quests/types';
import { GOAL_COUNTERS, goalCounterKeys } from '@engine/quests/goals';
import { visibleQuests } from '@engine/quests/board';
import { isCounterKey } from '@engine/progression/counters';
import { gearSetSchema } from './gear-set';
import { questBoardSchema } from './quest';
import { titleSchema } from './title';
import { compareReleases, releaseSchema } from './changelog';
import { palaceNodeSchema } from './palace';

export const currencySchema = z.object({
  id: z.enum(CURRENCY_IDS),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  tint: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i)
    .optional(),
  category: z.enum(['core', 'keys', 'shards', 'brews', 'tomes', 'materials']),
  topBar: z.boolean(),
  sources: z.array(z.enum(PLACE_IDS)).min(1),
  uses: z.array(z.enum(PLACE_IDS)).min(1),
  version: z.number().int().positive(),
});

export type ValidationIssue = { path: string; message: string; severity: 'error' | 'warning' };

export interface ContentRefs {
  assetKeys: ReadonlySet<string>;
  i18nKeys: ReadonlySet<string>;
  /** English text per key, used to check description placeholders; optional. */
  i18nText?: (key: string) => string | undefined;
}

/** Placeholders an ability description may use (engine/champions/describe.ts `AbilityNumbers`). */
export const DESCRIPTION_TOKENS: ReadonlySet<string> = new Set([
  'dmg',
  'dmg2',
  'hits',
  'chance',
  'turns',
  'value',
  'heal',
  'shield',
  'tm',
  'cooldown',
  'defIgnore',
]);

const PLACEHOLDER_MODEL = 'model.teritorial_lizard';

/**
 * Validates every content object and its cross-references. `assetKeys` and `i18nKeys` are
 * injected so the engine stays free of asset/i18n imports. Warnings never fail the build.
 */
export function validateContentRegistry(
  registry: {
    currencies: readonly unknown[];
    champions: readonly unknown[];
    enemies: readonly unknown[];
    encounters: readonly unknown[];
    factions: readonly FactionDef[];
    settlements: readonly unknown[];
    titles: readonly unknown[];
    releases: readonly unknown[];
    palace: { nodes: readonly unknown[] };
    gearSets: readonly unknown[];
    banners: readonly unknown[];
    bosses: readonly unknown[];
    breweries: readonly unknown[];
    dungeons: readonly unknown[];
    consumables: readonly unknown[];
    gemShelf: readonly unknown[];
    loginBoard: readonly unknown[];
    questBoards: readonly unknown[];
    missionChapters: readonly unknown[];
    tutorialChapters: readonly unknown[];
    summonPool: readonly { id: string; rarity: string }[];
  },
  refs: ContentRefs,
): ValidationIssue[] {
  const enemies = validateEnemies(registry.enemies, refs);
  const factions = validateFactions(registry.factions, enemies.ids, refs);
  const settlements = validateSettlements(registry.settlements, registry.factions, enemies.ids, refs);
  return [
    ...validateCurrencies(registry.currencies, refs),
    ...validateChampions(registry.champions, refs),
    ...enemies.issues,
    ...validateEncounters(registry.encounters, enemies.ids, refs),
    ...factions,
    ...settlements.issues,
    ...validateEnemyReach(
      enemies.ids,
      settlements.spawned,
      registry.encounters,
      registry.bosses,
      registry.dungeons,
    ),
    ...validateTitles(registry.titles, refs),
    ...validateReleases(registry.releases, refs),
    ...validatePalace(registry.palace.nodes, refs),
    ...validateBrewery(
      registry.breweries,
      registry.settlements as SettlementDef[],
      registry.factions as FactionDef[],
      new Set(registry.currencies.map((c) => (c as { id: string }).id)),
      refs,
    ),
    ...validateDungeons(registry.dungeons, registry.gearSets, enemies.ids, registry.factions, refs),
    ...validateMarket(
      registry.consumables,
      registry.gemShelf,
      registry.loginBoard,
      new Set(registry.currencies.map((c) => (c as { id: string }).id)),
      refs,
    ),
    ...validateGearSets(registry.gearSets, settlements.setPools, refs),
    ...validateBanners(registry.banners, registry.summonPool, refs),
    ...validateBosses(registry.bosses, refs),
    ...validateQuestBoards(registry.questBoards, registry.bosses, refs),
    ...validateMissionChapters(registry.missionChapters, registry.bosses, registry.champions, refs),
    ...validateTutorialChapters(registry.tutorialChapters, refs),
  ];
}

/**
 * The quest boards (QUESTS_MISSIONS.md §2–§3). Three promises the design makes, each of which a
 * content edit could quietly break:
 *
 * - **The hundred is always reachable.** A quest whose feature is locked is hidden and the
 *   replacement quest carries its points, so the board's total must come to a hundred at *every*
 *   unlock state — checked here at every player level the features open at.
 * - **A goal measures something the game counts.** A counter goal's key must be one
 *   `@engine/progression/counters` writes, and a `boss_fights` goal must name a boss that exists.
 * - **The ladder ends at the full board**, which the schema checks, and every chest must be
 *   reachable by the points the quests can actually pay.
 */
function validateQuestBoards(
  boards: readonly unknown[],
  bosses: readonly unknown[],
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const bossIds = new Set(
    bosses.map((raw) => (raw as { id?: unknown }).id).filter((id): id is string => typeof id === 'string'),
  );
  const seen = new Set<string>();

  boards.forEach((raw, index) => {
    const result = questBoardSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`quests[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const board = result.data;
    const path = `quests.${board.period}`;
    if (seen.has(board.period)) error(path, 'duplicate board period');
    seen.add(board.period);

    const quests = [...board.quests, board.replacement];
    for (const quest of quests) {
      const questPath = `${path}.${quest.id}`;
      if (!refs.i18nKeys.has(quest.name)) error(questPath, `missing i18n key ${quest.name}`);
      if (!refs.assetKeys.has(quest.icon)) error(questPath, `missing icon ${quest.icon}`);
      if (quest.period !== board.period) error(questPath, `belongs to ${quest.period}, not this board`);
      for (const goal of flattenGoals(quest.goal as Goal)) {
        if (goal.type === 'boss_fights' && !bossIds.has(goal.boss))
          error(questPath, `goal names an unknown boss ${goal.boss}`);
        const key = GOAL_COUNTERS[goal.type];
        if (key && !isCounterKey(key)) error(questPath, `goal counts ${key}, which nothing writes`);
      }
      // A quest nobody can see is a reward nobody can earn.
      if (quest.feature && unlockLevel(quest.feature) > PLAYER_MAX_LEVEL)
        error(questPath, `needs ${quest.feature}, which never unlocks`);
    }
    if (board.quests.some((quest) => quest.id === board.replacement.id))
      error(path, 'the replacement quest shares an id with a real one');

    // Every unlock state the game passes through, plus the board's own level and the cap.
    const levels = [
      unlockLevel(board.feature),
      ...FEATURE_IDS.map((feature) => unlockLevel(feature)),
      PLAYER_MAX_LEVEL,
    ].filter((level) => level >= unlockLevel(board.feature));
    const target = board.chests[board.chests.length - 1]?.points ?? 100;
    for (const level of [...new Set(levels)].sort((a, b) => a - b)) {
      const total = visibleQuests(board as QuestBoardDef, level).reduce(
        (sum, quest) => sum + quest.points,
        0,
      );
      if (total !== target)
        error(path, `a level-${level} chronicle sees ${total} points, not the ${target} the ladder needs`);
    }
  });
  return issues;
}

/** A goal and, for `any`, everything inside it. */
function flattenGoals(goal: Goal): Goal[] {
  return goal.type === 'any' ? [goal, ...goal.goals.flatMap(flattenGoals)] : [goal];
}

/**
 * A goal's references, whatever family it belongs to: the boss it names, the settlement and stand
 * it asks for, the counter it measures. A mission that names a stand nobody can fight, or counts
 * something nothing writes, would sit unfinishable at the head of the line — so it is a build
 * error, not a surprise on somebody's save.
 */
function goalIssues(goal: Goal, tiersByBoss: ReadonlyMap<string, readonly string[]>): string[] {
  const problems: string[] = [];
  const bossTiers = (id: string): readonly string[] => tiersByBoss.get(id) ?? [];
  const known = (id: string): boolean => tiersByBoss.has(id);
  switch (goal.type) {
    case 'boss_fights':
      if (!known(goal.boss)) problems.push(`names an unknown boss ${goal.boss}`);
      else if (goal.tier && !bossTiers(goal.boss).includes(goal.tier))
        problems.push(`names ${goal.boss} tier ${goal.tier}, which does not exist`);
      break;
    case 'boss_damage':
    case 'boss_percent':
      if (!known(goal.boss)) problems.push(`names an unknown boss ${goal.boss}`);
      else if (!bossTiers(goal.boss).includes(goal.tier))
        problems.push(`names ${goal.boss} tier ${goal.tier}, which does not exist`);
      break;
    case 'clear_stage':
      if (goal.settlement > SETTLEMENT_COUNT) problems.push(`settlement ${goal.settlement} does not exist`);
      break;
    case 'settlement_stars':
      if (goal.settlement > SETTLEMENT_COUNT) problems.push(`settlement ${goal.settlement} does not exist`);
      if (goal.stars > STARS_PER_SETTLEMENT)
        problems.push(`asks for ${goal.stars} stars; a settlement holds ${STARS_PER_SETTLEMENT}`);
      break;
    case 'difficulty_stars': {
      const most = SETTLEMENT_COUNT * STARS_PER_SETTLEMENT;
      if (goal.stars > most) problems.push(`asks for ${goal.stars} stars; a difficulty holds ${most}`);
      break;
    }
    case 'champion_reach_level':
      if (goal.level > levelCap(goal.stars ?? 6))
        problems.push(`asks for level ${goal.level}, past the cap at ${goal.stars ?? 6}★`);
      break;
    default:
      break;
  }
  for (const key of goalCounterKeys([goal]))
    if (!isCounterKey(key)) problems.push(`counts ${key}, which nothing writes`);
  return problems;
}

/** Tier ids per boss, read straight off the boss content the registry hands over. */
function tiersByBoss(bosses: readonly unknown[]): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  for (const raw of bosses) {
    const boss = raw as { id?: unknown; tiers?: readonly { id?: unknown }[] };
    if (typeof boss.id !== 'string') continue;
    map.set(
      boss.id,
      (boss.tiers ?? []).map((tier) => tier.id).filter((id): id is string => typeof id === 'string'),
    );
  }
  return map;
}

/**
 * The Chronicler's Path (QUESTS_MISSIONS.md §4). The line is the spine of a chronicle's first
 * weeks, so the shape is checked hard: ten chapters of twelve, walked in order, every goal
 * reachable, every reward real, and the last page the one that hands Eldric over.
 */
function validateMissionChapters(
  chapters: readonly unknown[],
  bosses: readonly unknown[],
  champions: readonly unknown[],
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const tiers = tiersByBoss(bosses);
  // Which champions the Path may hand over: the ones whose own definition says so.
  const fromMissions = new Set(
    champions
      .map((raw) => raw as { id?: unknown; obtain?: readonly unknown[] })
      .filter((champion) => (champion.obtain ?? []).includes('mission'))
      .map((champion) => champion.id)
      .filter((id): id is string => typeof id === 'string'),
  );
  const championIds = new Set(
    champions.map((raw) => (raw as { id?: unknown }).id).filter((id): id is string => typeof id === 'string'),
  );
  if (chapters.length !== MISSION_CHAPTER_COUNT)
    error('missions', `${chapters.length} chapters; the Path has ${MISSION_CHAPTER_COUNT}`);

  const seenIndices = new Set<number>();
  const seenIds = new Set<string>();
  chapters.forEach((raw, position) => {
    const result = missionChapterSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`missions[${position}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const chapter = result.data;
    const path = `missions.${chapter.id}`;
    if (chapter.index !== position + 1)
      error(path, `is chapter ${chapter.index} but sits at position ${position + 1}`);
    if (seenIndices.has(chapter.index)) error(path, 'duplicate chapter index');
    seenIndices.add(chapter.index);
    if (!refs.i18nKeys.has(chapter.name)) error(path, `missing i18n key ${chapter.name}`);
    if (!refs.i18nKeys.has(chapter.eldric)) error(path, `missing i18n key ${chapter.eldric}`);

    chapter.missions.forEach((mission, order) => {
      const missionPath = `${path}.${mission.id}`;
      if (seenIds.has(mission.id)) error(missionPath, 'duplicate mission id');
      seenIds.add(mission.id);
      if (mission.chapter !== chapter.index) error(missionPath, `belongs to chapter ${mission.chapter}`);
      if (mission.index !== order + 1) error(missionPath, `is ${mission.index} but sits at ${order + 1}`);
      if (mission.id !== `mission.${pad2(chapter.index)}.${pad2(order + 1)}`)
        error(missionPath, 'id does not match where it sits');
      if (!refs.i18nKeys.has(mission.name)) error(missionPath, `missing i18n key ${mission.name}`);
      if (!refs.assetKeys.has(mission.icon)) error(missionPath, `missing icon ${mission.icon}`);
      for (const goal of flattenGoals(mission.goal as Goal))
        for (const problem of goalIssues(goal, tiers)) error(missionPath, `goal ${problem}`);
      // The Path is walked in order, so only its last page may ask for everything before it.
      const last = chapter.index === MISSION_CHAPTER_COUNT && mission.index === chapter.missions.length;
      if ((mission.goal as Goal).type === 'all_previous' && !last)
        error(missionPath, 'only the last mission may ask for every mission before it');
      if (last && (mission.goal as Goal).type !== 'all_previous')
        error(missionPath, 'the last mission is the one that asks for every mission before it');
    });

    // Eldric is the Path's own reward, and he arrives exactly once, in the last chapter's chest.
    const chest = chapter.chest;
    const finale = chapter.index === MISSION_CHAPTER_COUNT;
    if (chest.champion !== undefined) {
      if (!finale) error(path, 'only the last chapter hands over a champion');
      if (!championIds.has(chest.champion)) error(path, `chest names an unknown champion ${chest.champion}`);
      else if (!fromMissions.has(chest.champion))
        error(path, `${chest.champion} is not obtainable from the Path (obtain: ['mission'])`);
    } else if (finale) {
      error(path, 'the last chapter hands over Eldric');
    }
    if (chest.gearChoice && !finale) error(path, 'only the last chapter hands over a gear choice');
    if (chest.currencies.length === 0 && !finale) error(path, 'a chapter chest pays something');
  });
  return issues;
}

/**
 * The tutorial script (TUTORIAL.md). The script is the one system that can lock a chronicle out of
 * its own game: a step waiting on something that cannot happen would leave the overlay up for ever.
 * So the shape is checked hard here —
 *
 * - **a step can be finished.** Its completion names a screen or dialog that exists (the schema),
 *   a counter something writes, a stand that exists, or one of the two answers the overlay itself
 *   reports; and `acknowledged`/`clicked` are answers, never gates, so a `when` may not use them.
 * - **a step can be acted on.** Everything the pointer rests on is also something the player is
 *   allowed to touch.
 * - **the chapters open in the order they are written**, by unlock level, with the new game first.
 * - **the Provisions in `balance/energy.ts` and the script agree**: every grant in the table is
 *   handed over by the chapter it is named for, and no step pays energy the table does not know.
 */
function validateTutorialChapters(chapters: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  if (chapters.length !== TUTORIAL_CHAPTER_COUNT)
    error('tutorial', `${chapters.length} chapters; the script has ${TUTORIAL_CHAPTER_COUNT}`);

  const seenIds = new Set<string>();
  const scripted = new Map<string, string>();
  /** Provision id → the step that hands it over, for the cross-check against the balance table. */
  const provisions = new Map<string, string>();
  let previousLevel = 0;

  chapters.forEach((raw, position) => {
    const result = tutorialChapterSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`tutorial[${position}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const chapter = result.data;
    const path = `tutorial.${chapter.id}`;
    const first = position === 0;
    if (chapter.index !== position + 1)
      error(path, `is chapter ${chapter.index} but sits at position ${position + 1}`);
    if (!refs.i18nKeys.has(chapter.name)) error(path, `missing i18n key ${chapter.name}`);
    // The first chapter is the new game; every other one waits for the feature it teaches, and
    // they are written in the order those features open.
    if (chapter.trigger.type === 'new_game') {
      if (!first) error(path, 'only the first chapter is triggered by a new game');
    } else {
      if (first) error(path, 'the first chapter is triggered by a new game');
      const level = unlockLevel(chapter.trigger.feature);
      if (level < previousLevel)
        error(path, `opens at level ${level}, before chapter ${chapter.index - 1} at ${previousLevel}`);
      previousLevel = level;
    }
    // Chapter 1 is the one that has to be walked (owner's answer Q4).
    if (first && chapter.skippable) error(path, 'the first chapter cannot be skippable');
    if (!first && !chapter.skippable) error(path, 'every chapter after the first is skippable');

    chapter.steps.forEach((step, order) => {
      const stepPath = `${path}.${step.id}`;
      if (seenIds.has(step.id)) error(stepPath, 'duplicate step id');
      seenIds.add(step.id);
      if (step.chapter !== chapter.index) error(stepPath, `belongs to chapter ${step.chapter}`);
      if (step.index !== order + 1) error(stepPath, `is ${step.index} but sits at ${order + 1}`);
      if (step.id !== `tut.${chapter.index}.${order + 1}`) error(stepPath, 'id does not match where it sits');
      if (!refs.i18nKeys.has(step.dialogue)) error(stepPath, `missing i18n key ${step.dialogue}`);

      // What the pointer rests on is what the player may press.
      if (step.allow !== 'all')
        for (const target of step.spotlight)
          if (!step.allow.includes(target))
            error(stepPath, `points at ${target}, which the step does not allow`);

      for (const condition of flattenConditions(step.complete as TutorialCondition))
        for (const problem of conditionIssues(condition)) error(stepPath, `completion ${problem}`);
      // A lesson that does not say where it speaks will speak somewhere silly — over the title
      // screen, or on a screen its pointer has nothing to rest on — and while Eldric speaks the
      // screen is held. So every step names a screen, a dialog or a turn of the fight.
      const trigger = step.when ? flattenConditions(step.when as TutorialCondition) : [];
      if (
        !trigger.some((one) => one.type === 'screen' || one.type === 'dialog' || one.type === 'battle_turn')
      )
        error(stepPath, 'does not say where it is taught (a screen, a dialog or a turn)');
      for (const condition of trigger) {
        for (const problem of conditionIssues(condition)) error(stepPath, `trigger ${problem}`);
        if (condition.type === 'acknowledged' || condition.type === 'clicked')
          error(stepPath, `is triggered by ${condition.type}, which only finishes a step`);
      }

      if (step.script) {
        const already = scripted.get(step.script);
        if (already) error(stepPath, `a second scripted ${step.script} (${already} is the first)`);
        else scripted.set(step.script, step.id);
      }

      const grant = step.grant;
      if (!grant) return;
      if (grant.id in ENERGY_PROVISIONS) {
        const owed = ENERGY_PROVISIONS[grant.id as keyof typeof ENERGY_PROVISIONS];
        const paid = grant.currencies.reduce(
          (sum, entry) => sum + (entry.currency === 'energy' ? entry.amount : 0),
          0,
        );
        if (paid !== owed) error(stepPath, `pays ${paid} energy for ${grant.id}, which is ${owed}`);
        if (grant.currencies.length !== 1) error(stepPath, `${grant.id} is a provision and pays energy only`);
        if (grant.id !== `tutorial.${chapter.id.slice('tut.'.length)}`)
          error(stepPath, `hands over ${grant.id}, which belongs to another chapter`);
        if (provisions.has(grant.id)) error(stepPath, `${grant.id} is handed over twice`);
        provisions.set(grant.id, step.id);
      } else if (!grant.id.startsWith('tutorial.gift.')) {
        error(stepPath, `grant id ${grant.id} is neither a provision nor a tutorial.gift.*`);
      } else if (grant.currencies.some((entry) => entry.currency === 'energy')) {
        error(stepPath, `${grant.id} pays energy outside ENERGY_PROVISIONS`);
      }
    });
  });

  // Nothing in the balance table may be orphaned: a provision no step hands over is energy the
  // design promised and the game never pays.
  for (const id of Object.keys(ENERGY_PROVISIONS))
    if (!provisions.has(id)) error('tutorial', `${id} is in ENERGY_PROVISIONS but no step grants it`);
  return issues;
}

/** A condition and, for `all`/`any`, everything inside it. */
function flattenConditions(condition: TutorialCondition): TutorialCondition[] {
  return condition.type === 'all' || condition.type === 'any'
    ? [condition, ...condition.of.flatMap(flattenConditions)]
    : [condition];
}

/** What a single condition references, where that is something content can get wrong. */
function conditionIssues(condition: TutorialCondition): string[] {
  const problems: string[] = [];
  if (condition.type === 'counter' && !isCounterKey(condition.key))
    problems.push(`counts ${condition.key}, which nothing writes`);
  if (condition.type === 'feature' && unlockLevel(condition.feature) > PLAYER_MAX_LEVEL)
    problems.push(`waits for ${condition.feature}, which never unlocks`);
  return problems;
}

const pad2 = (n: number): string => `${n}`.padStart(2, '0');

/**
 * Gear sets are passives a champion wears (GEAR.md §5). Every set must be reachable: some
 * settlement's drop pool names it, and its homes must agree with those pools.
 */
function validateGearSets(
  sets: readonly unknown[],
  setPools: ReadonlyMap<number, readonly string[]>,
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  const emblems = new Map<string, string>();
  const paintings = new Map<string, string>();
  const parsed: GearSetDef[] = [];
  sets.forEach((raw, index) => {
    const result = gearSetSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues) error(`sets[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = result.data as GearSetDef;
    const path = `sets.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
    // The emblem and the paintings are how a player tells one set from another (GEAR.md §5.1), so
    // each must exist, a slot must show that slot, and neither may be shared with another set.
    if (!refs.assetKeys.has(def.emblem)) error(path, `missing emblem ${def.emblem}`);
    const emblemOwner = emblems.get(def.emblem);
    if (emblemOwner) error(path, `emblem ${def.emblem} is already ${emblemOwner}'s`);
    emblems.set(def.emblem, def.id);
    for (const [slot, key] of Object.entries(def.art)) {
      if (!refs.assetKeys.has(key)) error(`${path}.art.${slot}`, `missing painting ${key}`);
      if (!key.endsWith(`.${slot}`)) error(`${path}.art.${slot}`, `the ${slot} slot shows ${key}`);
      const paintingOwner = paintings.get(key);
      if (paintingOwner) error(`${path}.art.${slot}`, `${key} is already ${paintingOwner}'s`);
      paintings.set(key, def.id);
    }
    for (const passive of def.passives) {
      for (const key of [passive.name, passive.description])
        if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
      if (!refs.assetKeys.has(passive.icon)) error(path, `missing icon ${passive.icon}`);
    }
    for (const home of def.homes)
      if (!(setPools.get(home) ?? []).includes(def.id))
        error(path, `settlement ${home} does not list this set in its drop pool`);
    parsed.push(def);
  });
  // The other direction: a settlement may not favour a set that does not exist.
  for (const [settlement, pool] of setPools)
    for (const id of pool)
      if (!seen.has(id)) error(`settlements.${settlement}.setPool`, `unknown gear set ${id}`);
  return issues;
}

/**
 * Banners (SUMMONING.md §3). Every shard's rate table must sum to 100 — a row that does not is a
 * silent rate change — every rarity a shard can roll must have someone in the pool to roll, and a
 * featured champion must be summonable at the rarity its slot claims.
 */
/**
 * A boss is a damage race with a ladder (BOSSES.md §1): the tiers must climb, every tier must be
 * harder than the one below it, and the chest ladder must end in the kill. The tier enemies are
 * validated with every other enemy, so this checks the boss's own shape and its strings.
 */
function validateBosses(bosses: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  bosses.forEach((raw, index) => {
    const result = bossSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`bosses[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = result.data;
    const path = `bosses.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);
    for (const key of [def.name, def.title, def.lore])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
    if (!refs.assetKeys.has(def.backdrop)) error(path, `missing backdrop ${def.backdrop}`);
    if (!refs.assetKeys.has(def.art.model)) error(path, `missing model ${def.art.model}`);
    if (def.unlockLevel > unlockLevel(def.feature))
      error(path, `unlocks at ${def.unlockLevel} but its feature opens at ${unlockLevel(def.feature)}`);
    if (def.adds) {
      if (!refs.i18nKeys.has(def.adds.name)) error(path, `missing i18n key ${def.adds.name}`);
      if (!refs.assetKeys.has(def.adds.art.model)) error(path, `missing model ${def.adds.art.model}`);
      // An escort with nothing to guard, or a phase gate with no phases, is authored by mistake.
      if (!def.phases.length) error(path, 'adds come back at every phase change, so declare phases');
    }
    const gated = def.tiers[0]?.enemy.abilities.filter((a) => (a.minPhase ?? 1) > 1) ?? [];
    for (const ability of gated)
      if ((ability.minPhase ?? 1) > def.phases.length + 1)
        error(path, `${ability.id} opens in phase ${ability.minPhase}, past the last one`);
    def.tiers.forEach((tier, t) => {
      const tierPath = `${path}.${tier.id}`;
      if (!refs.i18nKeys.has(tier.name)) error(tierPath, `missing i18n key ${tier.name}`);
      if (tier.enemy.id !== `enemy.${def.id.replace('boss.', '')}_${tier.id}`)
        error(tierPath, `enemy id ${tier.enemy.id} does not match the tier`);
      if (tier.enemy.stats.hp !== tier.stats.hp)
        error(tierPath, 'the tier enemy does not carry the tier stats');
      if (tier.enemy.boss?.fixedStats !== true)
        error(tierPath, 'a period boss fights at its printed stats (`fixedStats`)');
      if (tier.enemy.boss?.enrageEvery !== def.enrageEvery)
        error(tierPath, 'the tier enemy does not carry the boss enrage cadence');
      if ((tier.enemy.boss?.phases ?? []).join() !== def.phases.join())
        error(tierPath, 'the tier enemy does not carry the boss phases');
      if (def.adds) {
        if (!tier.adds) error(tierPath, 'the boss fields an escort but this tier has none');
        else if (tier.enemy.boss?.adds?.enemyId !== tier.adds.id)
          error(tierPath, `the boss block points at ${tier.enemy.boss?.adds?.enemyId}, not ${tier.adds.id}`);
        // The escort is a speed bump, not a second boss: a pool it could hide behind for the whole
        // race would make the fight about the adds (BOSSES.md §3).
        if (tier.adds && tier.adds.stats.hp * def.adds.count > tier.stats.hp / 10)
          error(tierPath, 'the escort holds more than a tenth of the pool between them');
      } else if (tier.adds) error(tierPath, 'a tier fields an escort the boss does not declare');
      // A boss takes roughly half the ally-turn limit in own turns (measured in tools/sim), so a
      // first step later than that is a mechanic that never fires.
      if (tier.enrageTurn + def.enrageEvery > tier.turnLimit / 2)
        error(tierPath, 'it would never enrage inside a race this long');
      const previous = def.tiers[t - 1];
      if (previous && tier.stats.hp <= previous.stats.hp)
        error(tierPath, 'every tier is a bigger pool than the one below it');
      if (previous && tier.playerXp <= previous.playerXp)
        error(tierPath, 'every tier pays more chronicle XP than the one below it');
    });
    if (def.tiers.length !== new Set(def.tiers.map((tier) => tier.id)).size) error(path, 'duplicate tier id');
  });
  return issues;
}

function validateBanners(
  banners: readonly unknown[],
  pool: readonly { id: string; rarity: string }[],
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const rarityOf = new Map(pool.map((def) => [def.id, def.rarity]));
  const byRarity = new Map<string, number>();
  for (const def of pool) byRarity.set(def.rarity, (byRarity.get(def.rarity) ?? 0) + 1);

  // The tables themselves, once: they are shared by every banner.
  for (const [shard, table] of Object.entries(SHARD_RATES)) {
    const total = Object.values(table).reduce((sum, pp) => sum + (pp ?? 0), 0);
    if (Math.abs(total - 100) > 0.001) error(`balance.summon.${shard}`, `rates sum to ${total}, not 100`);
    for (const rarity of Object.keys(table))
      if (!byRarity.get(rarity))
        error(`balance.summon.${shard}`, `no summonable champion of rarity ${rarity}`);
  }

  const seen = new Set<string>();
  banners.forEach((raw, index) => {
    const result = bannerSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`banners[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = result.data;
    const path = `banners.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
    if (def.kind === 'featured' && (def.rotations ?? []).length === 0)
      error(path, 'a featured banner needs at least one rotation');
    if (def.kind === 'standard' && def.rotations) error(path, 'the standard portal features nobody');
    (def.rotations ?? []).forEach((rotation, r) => {
      const named: [string, string][] = [
        [rotation.legendary, 'legendary'],
        ...rotation.epics.map((id): [string, string] => [id, 'epic']),
        ...(rotation.mythic ? ([[rotation.mythic, 'mythic']] as [string, string][]) : []),
      ];
      for (const [id, expected] of named) {
        const rarity = rarityOf.get(id);
        if (!rarity) error(`${path}.rotations[${r}]`, `${id} is not in the summon pool`);
        else if (rarity !== expected)
          error(`${path}.rotations[${r}]`, `${id} is ${rarity}, featured as ${expected}`);
      }
      if (new Set(rotation.epics).size !== rotation.epics.length)
        error(`${path}.rotations[${r}]`, 'the two featured Epics must differ');
    });
    // A Primordial Rotation is every fourth, and a cycle meets them on different rows each time it
    // comes round, so a banner that features a Mythic names it on every row.
    const mythics = new Set((def.rotations ?? []).map((rotation) => rotation.mythic ?? null));
    if (mythics.size > 1) error(path, 'every rotation names the same Mythic, or none does');
  });
  return issues;
}

/** Titles name a condition the save can meet; the engine derives the rest (ECONOMY.md §4). */
function validateTitles(titles: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  titles.forEach((raw, index) => {
    const parsed = titleSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`titles[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as TitleDef;
    const path = `titles.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
    if (def.condition.kind === 'level' && def.condition.level > PLAYER_MAX_LEVEL)
      error(`${path}.condition`, `level ${def.condition.level} is past the cap`);
    if (def.condition.kind === 'settlement_boss' && def.condition.settlement > SETTLEMENT_COUNT)
      error(`${path}.condition`, `settlement ${def.condition.settlement} does not exist`);
  });
  return issues;
}

/**
 * The Brewery (BREWERY.md). Five things a careless edit breaks, none of which typecheck: a hall
 * whose stages stop being 1..5 in order, a stage that stops paying its own number in brews, a
 * ladder that stops getting harder, a hall guarded by a faction of the wrong element — which is
 * the whole reason the mode teaches the element wheel — and a hall with no open days at all,
 * which no player could ever enter.
 */
function validateBrewery(
  halls: readonly unknown[],
  settlements: readonly SettlementDef[],
  factions: readonly FactionDef[],
  currencies: ReadonlySet<string>,
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const elementOf = new Map(settlements.map((s) => [s.index, s.faction]));
  const factionElement = new Map(factions.map((f) => [f.id, f.element]));

  const seen = new Set<string>();
  halls.forEach((raw, index) => {
    const result = brewerySchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`brewery[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const hall = result.data;
    if (seen.has(hall.id)) error(hall.id, 'duplicate id');
    seen.add(hall.id);
    for (const key of [hall.name, hall.description])
      if (!refs.i18nKeys.has(key)) error(hall.id, `missing i18n key ${key}`);
    if (!currencies.has(hall.brew)) error(hall.id, `pays unknown currency ${hall.brew}`);
    if (new Set(hall.openDays).size !== hall.openDays.length) error(hall.id, 'repeats an open day');

    if (hall.stages.length !== BREWERY_STAGES)
      error(hall.id, `has ${hall.stages.length} stages, not the ${BREWERY_STAGES} balance names`);
    let hardest = 0;
    hall.stages.forEach((stage, at) => {
      const path = `${hall.id}.${stage.number}`;
      if (stage.number !== at + 1) error(path, `is stage ${stage.number} in position ${at + 1}`);
      if (stage.brews !== stage.number)
        error(path, `pays ${stage.brews} brews, not its own number (the owner's rule)`);
      if (stage.scale <= hardest) error(path, `is no harder than the stage before it (×${stage.scale})`);
      hardest = stage.scale;
      if (stage.boss && stage.number !== BREWERY_BOSS_STAGE)
        error(path, `fields the captain, who belongs on stage ${BREWERY_BOSS_STAGE}`);
      const factionId = elementOf.get(stage.settlement);
      const element = factionId ? factionElement.get(factionId) : undefined;
      if (!factionId) error(path, `is held by unknown settlement ${stage.settlement}`);
      else if (element !== hall.element)
        error(path, `is held by a ${element ?? 'nameless'} faction, not a ${hall.element} one`);
    });
  });
  return issues;
}

/**
 * The Dungeons (DUNGEONS.md). Five promises a careless edit breaks, none of which typecheck:
 *
 * - **Every gear set is farmable, in exactly one place.** The whole reason to choose a dungeon is
 *   what it holds, so a set owned by two keeps makes the choice meaningless and a set owned by
 *   none makes it unreachable.
 * - **An open keep has something in it.** A keeper and a warband that exist, and at least one set
 *   to pay out; a shut keep has none of the three, because a keep that is shut has no fights.
 * - **The bands tile the ladder.** Twenty stages on each difficulty, every one in exactly one
 *   band — `dungeonBand` throws otherwise, and it is read on every run.
 * - **The price never falls as the prize rises.** Energy is the mode's only cost and the thing a
 *   player reads to know what a stage is worth.
 * - **A band can only roll stars that gear can have**, and every weight it names is a real share.
 */
function validateDungeons(
  dungeons: readonly unknown[],
  gearSets: readonly unknown[],
  enemyIds: ReadonlySet<string>,
  factions: readonly FactionDef[],
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const factionIds = new Set(factions.map((f) => f.id));
  const allSets = new Set(gearSets.map((set) => (set as { id: string }).id));
  const owner = new Map<string, string>();

  const seenId = new Set<string>();
  const seenSlug = new Set<string>();
  const seenOrder = new Set<number>();
  dungeons.forEach((raw, index) => {
    const result = dungeonSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`dungeons[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = result.data;
    const path = def.id;
    if (seenId.has(def.id)) error(path, 'duplicate id');
    seenId.add(def.id);
    if (seenSlug.has(def.slug)) error(path, `duplicate slug ${def.slug}`);
    seenSlug.add(def.slug);
    if (seenOrder.has(def.order)) error(path, `duplicate order ${def.order}`);
    seenOrder.add(def.order);
    if (def.id !== `dungeon.${def.slug}`) error(path, `id does not match slug ${def.slug}`);
    for (const key of [def.name, def.description, def.lore])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);

    const shut = def.lock !== undefined;
    if (shut) {
      if (def.sets.length) error(path, 'is sealed but still holds gear sets');
      if (def.keeperId) error(path, 'is sealed but still names a keeper');
      if (def.factionId) error(path, 'is sealed but still names a warband');
      return;
    }
    if (!def.sets.length) error(path, 'is open but holds no gear sets');
    if (!enemyIds.has(def.keeperId)) error(path, `unknown keeper ${def.keeperId || '(none)'}`);
    if (!factionIds.has(def.factionId)) error(path, `unknown warband ${def.factionId || '(none)'}`);
    for (const setId of def.sets) {
      if (!allSets.has(setId)) error(path, `holds unknown gear set ${setId}`);
      const already = owner.get(setId);
      if (already) error(path, `holds ${setId}, which ${already} already holds`);
      else owner.set(setId, def.id);
    }
  });

  for (const setId of allSets)
    if (!owner.has(setId)) error('dungeons', `no dungeon holds ${setId}, so it can never be farmed`);

  for (const difficulty of DUNGEON_DIFFICULTIES) {
    const bands = DUNGEON_BANDS.filter((band) => band.difficulty === difficulty).sort(
      (a, b) => a.from - b.from,
    );
    let expect = 1;
    let energy = 0;
    for (const band of bands) {
      const path = `dungeon.bands.${difficulty}.${band.from}`;
      if (band.from !== expect) error(path, `starts at ${band.from}, not ${expect}`);
      if (band.to < band.from) error(path, `ends at ${band.to}, before it starts`);
      if (band.energy < energy) error(path, `costs ${band.energy} energy, less than the band above`);
      energy = band.energy;
      expect = band.to + 1;
      const stars = Object.entries(band.stars);
      if (!stars.length) error(path, 'rolls no stars');
      for (const [star, weight] of stars) {
        const value = Number.parseInt(star, 10);
        if (value < 1 || value > GEAR_MAX_STARS) error(path, `rolls ${value}★, which gear cannot be`);
        if ((weight ?? 0) <= 0) error(path, `names ${value}★ at weight ${weight ?? 0}`);
      }
      const rarities = Object.entries(band.rarity);
      if (!rarities.length) error(path, 'rolls no rarities');
      for (const [rarity, weight] of rarities)
        if ((weight ?? 0) <= 0) error(path, `names ${rarity} at weight ${weight ?? 0}`);
      if (band.extraPiece < 0 || band.extraPiece > 1)
        error(path, `second-piece chance ${band.extraPiece} is not a share`);
    }
    if (expect !== DUNGEON_STAGES + 1)
      error(
        `dungeon.bands.${difficulty satisfies DungeonDifficulty}`,
        `covers ${expect - 1} stages, not ${DUNGEON_STAGES}`,
      );
  }
  return issues;
}

/**
 * The Glorious Palace (GLORIOUS_PALACE.md). Four things a careless edit to the ring template
 * breaks, none of which typecheck: a branch that no longer comes to the totals the balance file
 * promises, a branch that costs more or less than the point budget, a node hanging off a parent
 * that does not exist, and the core stopping being the only percentage in the tree.
 */
function validatePalace(nodes: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const parsed: PalaceNodeDef[] = [];
  const seen = new Set<string>();
  nodes.forEach((raw, index) => {
    const result = palaceNodeSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`palace[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const node = result.data as PalaceNodeDef;
    if (seen.has(node.id)) error(`palace.${node.id}`, 'duplicate id');
    seen.add(node.id);
    if (!refs.i18nKeys.has(node.name)) error(`palace.${node.id}`, `missing i18n key ${node.name}`);
    parsed.push(node);
  });
  if (parsed.length === 0) return issues;

  // Every node is reachable: its prerequisites exist, and walking them arrives at the core.
  const byId = new Map(parsed.map((node) => [node.id, node]));
  const core = parsed.filter((node) => node.requires.length === 0);
  if (core.length !== 1) error('palace', `expected one root node, found ${core.length}`);
  for (const node of parsed)
    for (const required of node.requires)
      if (!byId.has(required)) error(`palace.${node.id}`, `requires unknown node ${required}`);
  const rootId = core[0]?.id;
  for (const node of parsed) {
    let walk: PalaceNodeDef | undefined = node;
    for (let hops = 0; walk && hops <= 64; hops += 1) {
      if (walk.id === rootId) break;
      walk = byId.get(walk.requires[0] ?? '');
      if (hops === 64) error(`palace.${node.id}`, 'does not lead back to the core');
    }
    if (!walk) error(`palace.${node.id}`, 'does not lead back to the core');
  }

  // Only the core is a percentage, and it is the one the balance file names.
  for (const node of parsed)
    if (node.hpPct > 0 && node.id !== rootId)
      error(`palace.${node.id}`, 'only the core node may grant a percentage');
  if (core[0] && core[0].hpPct !== PALACE_CORE_HP_PCT)
    error('palace.core', `grants ${core[0].hpPct}% HP, not the ${PALACE_CORE_HP_PCT}% balance names`);

  // Each branch comes to the same promised totals for the same promised price.
  for (const element of ELEMENTS) {
    const branch = parsed.filter((node) => node.element === element);
    const cost = branch.reduce((sum, node) => sum + node.cost, 0);
    if (cost !== PALACE_BRANCH_COST)
      error(`palace.${element}`, `costs ${cost} points, not the ${PALACE_BRANCH_COST} budgeted`);
    for (const stat of STAT_IDS) {
      const total = branch.reduce((sum, node) => sum + (node.grants[stat] ?? 0), 0);
      if (total !== PALACE_BRANCH_TOTALS[stat])
        error(
          `palace.${element}.${stat}`,
          `maxes at ${total}, not the ${PALACE_BRANCH_TOTALS[stat]} budgeted`,
        );
    }
  }
  return issues;
}

/**
 * The Chronicle of Changes (CONTENT_AUTHORING.md §13). It is the game's own news, so it is held to
 * three things a careless edit breaks: every line has a string, the list runs newest first (which
 * is the order the panel prints, unsorted), and a release is named once.
 */
function validateReleases(releases: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  let previous: ReleaseDef | undefined;
  releases.forEach((raw, index) => {
    const parsed = releaseSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`releases[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as ReleaseDef;
    const path = `releases.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);
    if (def.id !== `release.${def.release.replace(/\./g, '_')}`)
      error(path, `id does not match version ${def.release}`);
    if (!refs.i18nKeys.has(def.name)) error(path, `missing i18n key ${def.name}`);
    for (const change of def.changes)
      if (!refs.i18nKeys.has(change.text)) error(path, `missing i18n key ${change.text}`);
    if (previous && compareReleases(previous.release, def.release) <= 0)
      error(path, `out of order: ${def.release} must come before ${previous.release}`);
    previous = def;
  });
  return issues;
}

/** A faction fields the six rank-and-file archetypes plus one named boss (CAMPAIGN.md §5–§6). */
function validateFactions(
  factions: readonly FactionDef[],
  enemyIds: ReadonlySet<string>,
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  for (const faction of factions) {
    const path = `factions.${faction.id}`;
    if (!/^faction\.[a-z0-9_]+$/.test(faction.id)) error(path, 'id must be `faction.<snake_case>`');
    if (seen.has(faction.id)) error(path, 'duplicate id');
    seen.add(faction.id);
    if (!refs.i18nKeys.has(faction.name)) error(`${path}.name`, `missing i18n key ${faction.name}`);
    if (!/^#[0-9a-f]{6}$/i.test(faction.tint)) error(`${path}.tint`, `not a hex colour: ${faction.tint}`);
    const roster = new Set(faction.units.map((u) => u.id));
    for (const archetype of FACTION_ARCHETYPES) {
      const id = faction.byArchetype[archetype];
      if (!id) error(`${path}.byArchetype`, `no unit fields the ${archetype} archetype`);
      else if (!roster.has(id)) error(`${path}.byArchetype`, `${archetype} names ${id}, not in the roster`);
    }
    for (const unit of faction.units) {
      if (!enemyIds.has(unit.id)) error(`${path}.units`, `${unit.id} is not a registered enemy`);
      if (unit.archetype === 'boss') error(`${path}.units`, `${unit.id} is rank and file, not a boss`);
    }
    if (!enemyIds.has(faction.boss.id)) error(`${path}.boss`, `${faction.boss.id} is not a registered enemy`);
    if (faction.boss.archetype !== 'boss') error(`${path}.boss`, `${faction.boss.id} is not a boss`);
  }
  return issues;
}

/**
 * Settlements and their ten stages. The three difficulties are derived at run time, so a stage is
 * validated once: its waves may only field its own faction, and only stage 10 fields the boss.
 */
function validateSettlements(
  settlements: readonly unknown[],
  factions: readonly FactionDef[],
  enemyIds: ReadonlySet<string>,
  refs: ContentRefs,
): { issues: ValidationIssue[]; spawned: Set<string>; setPools: Map<number, readonly string[]> } {
  const issues: ValidationIssue[] = [];
  const spawned = new Set<string>();
  const setPools = new Map<number, readonly string[]>();
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const factionById = new Map(factions.map((f) => [f.id, f]));
  const indices = new Set<number>();
  const stageIds = new Set<string>();
  const usedFactions = new Set<string>();
  const pad = (n: number): string => String(n).padStart(2, '0');

  settlements.forEach((raw, index) => {
    const parsed = settlementSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`settlements[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as SettlementDef;
    const path = `settlements.${def.id}`;
    if (indices.has(def.index)) error(path, `duplicate settlement index ${def.index}`);
    indices.add(def.index);
    setPools.set(def.index, def.setPool);
    if (!def.id.startsWith(`settlement.${pad(def.index)}.`))
      error(`${path}.id`, `id must carry its index (settlement.${pad(def.index)}.…)`);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
    if (!refs.assetKeys.has(def.backdrop)) error(`${path}.backdrop`, `unknown asset key ${def.backdrop}`);

    const faction = factionById.get(def.faction);
    if (!faction) {
      error(`${path}.faction`, `unknown faction ${def.faction}`);
      return;
    }
    if (usedFactions.has(faction.id)) error(`${path}.faction`, `${faction.id} already fields a settlement`);
    usedFactions.add(faction.id);
    if (def.element !== faction.element)
      error(`${path}.element`, `${def.element} does not match the faction's ${faction.element}`);
    const roster = new Set<string>([...faction.units.map((u) => u.id), faction.boss.id]);

    def.stages.forEach((stage, i) => {
      const stagePath = `${path}.${stage.id}`;
      if (stage.number !== i + 1) error(stagePath, `stage ${stage.number} sits at position ${i + 1}`);
      if (stage.id !== `stage.${pad(def.index)}.${pad(stage.number)}`)
        error(stagePath, `id must be stage.${pad(def.index)}.${pad(stage.number)}`);
      if (stageIds.has(stage.id)) error(stagePath, 'duplicate stage id');
      stageIds.add(stage.id);
      for (const problem of stageShapeIssues(stage)) error(stagePath, problem);
      const lastWave = stage.waves.length - 1;
      stage.waves.forEach((wave, w) => {
        wave.forEach((enemyId, slot) => {
          spawned.add(enemyId);
          if (!enemyIds.has(enemyId)) error(`${stagePath}.waves[${w}]`, `unknown enemy ${enemyId}`);
          else if (!roster.has(enemyId))
            error(`${stagePath}.waves[${w}]`, `${enemyId} does not belong to ${faction.id}`);
          if (enemyId !== faction.boss.id) return;
          if (!stage.boss || w !== lastWave || slot !== 0)
            error(`${stagePath}.waves[${w}]`, `${enemyId} may only lead the boss stage's last wave`);
        });
      });
      if (stage.boss && stage.waves[lastWave]?.[0] !== faction.boss.id)
        error(stagePath, `the last wave must be led by ${faction.boss.id}`);
    });
  });

  for (let index = 1; index <= SETTLEMENT_COUNT; index += 1)
    if (!indices.has(index)) error(`settlements[${index}]`, 'settlement index declared but not defined');
  for (const faction of factions)
    if (!usedFactions.has(faction.id)) error(`factions.${faction.id}`, 'no settlement fields this faction');
  return { issues, spawned, setPools };
}

/** The heal stats that read a max-HP pool, whose multiplier is therefore a share of that pool. */
const MAX_HP_HEAL_STATS: ReadonlySet<string> = new Set(['HP', 'CASTER_MAX_HP', 'TARGET_MAX_HP']);

/**
 * Every max-HP heal in a kit whose multiplier is more than the whole pool. Such a heal is written
 * as a fraction (`0.08` is 8 %); a whole number there is a percentage typed as a multiplier, and
 * the engine reads it as that many pools — the Pale Herald healed eight times its own for a whole
 * release that way, a full heal every fourth action.
 */
function oversizedHeals(effects: readonly PassiveEffect[]): number[] {
  const found: number[] = [];
  for (const effect of effects) {
    if (effect.kind === 'heal' && MAX_HP_HEAL_STATS.has(effect.stat) && effect.mult > 1)
      found.push(effect.mult);
    if (effect.kind === 'conditional')
      found.push(...oversizedHeals([...effect.then, ...(effect.else ?? [])]));
    if (effect.kind === 'damage' && effect.onKill) found.push(...oversizedHeals(effect.onKill));
  }
  return found;
}

/** Every authored enemy must be fightable somewhere: a campaign wave or a standalone encounter. */
function validateEnemyReach(
  enemyIds: ReadonlySet<string>,
  spawned: ReadonlySet<string>,
  encounters: readonly unknown[],
  bosses: readonly unknown[],
  dungeons: readonly unknown[],
): ValidationIssue[] {
  const reachable = new Set(spawned);
  for (const raw of encounters) {
    const parsed = encounterSchema.safeParse(raw);
    if (!parsed.success) continue;
    for (const wave of parsed.data.waves) for (const spawn of wave.enemies) reachable.add(spawn.enemyId);
  }
  // A boss tier's enemy is fielded by the encounter a key buys, which is derived rather than
  // authored (`@engine/bosses/encounter`), so the boss itself is what reaches it.
  for (const raw of bosses) {
    const parsed = bossSchema.safeParse(raw);
    if (!parsed.success) continue;
    for (const tier of parsed.data.tiers) {
      reachable.add(tier.enemy.id);
      // The escort stands in that same wave (BOSSES.md §3).
      if (tier.adds) reachable.add(tier.adds.id);
    }
  }
  // A keeper stands on every stage of its dungeon, and those encounters are derived rather than
  // authored (`@engine/dungeon/encounter`), so the dungeon itself is what reaches it.
  for (const raw of dungeons) {
    const parsed = dungeonSchema.safeParse(raw);
    if (parsed.success && parsed.data.keeperId) reachable.add(parsed.data.keeperId);
  }
  return [...enemyIds]
    .filter((id) => !reachable.has(id))
    .map((id) => ({
      path: `enemies.${id}`,
      message: 'no stage, encounter, boss tier or dungeon fields this enemy',
      severity: 'error' as const,
    }));
}

function validateEnemies(
  enemies: readonly unknown[],
  refs: ContentRefs,
): { issues: ValidationIssue[]; ids: Set<string> } {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const text = (key: string, path: string): void => {
    if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
  };
  enemies.forEach((raw, index) => {
    const parsed = enemySchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`enemies[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as EnemyDef;
    const path = `enemies.${def.id}`;
    if (ids.has(def.id)) error(path, 'duplicate id');
    ids.add(def.id);
    text(def.name, `${path}.name`);
    if (!refs.assetKeys.has(def.art.model)) error(`${path}.art`, `unknown asset key ${def.art.model}`);
    if (def.art.model === PLACEHOLDER_MODEL && !def.art.tint)
      error(`${path}.art`, 'placeholder art needs a tint');
    if ((def.archetype === 'boss') !== !!def.boss)
      error(`${path}.boss`, 'boss archetypes carry a boss block, others do not');
    def.abilities.forEach((ability, i) => {
      if (ability.slot !== `a${i + 1}`)
        error(`${path}.abilities[${i}]`, `expected slot a${i + 1}, found ${ability.slot}`);
      if (ability.slot === 'a1' && ability.cooldown !== 0)
        error(`${path}.${ability.id}`, 'A1 must have no cooldown');
      if (ability.slot !== 'a1' && ability.cooldown < 1)
        error(`${path}.${ability.id}`, 'A2–A4 need a cooldown');
      if (!refs.assetKeys.has(ability.icon))
        error(`${path}.${ability.id}.icon`, `unknown asset key ${ability.icon}`);
      text(ability.name, `${path}.${ability.id}.name`);
      text(ability.description, `${path}.${ability.id}.description`);
      for (const mult of oversizedHeals(ability.effects))
        error(
          `${path}.${ability.id}`,
          `a max-HP heal is a fraction of the pool; ${mult} heals ${mult} pools`,
        );
    });
    for (const passive of def.passives) {
      if (!refs.assetKeys.has(passive.icon))
        error(`${path}.${passive.id}.icon`, `unknown asset key ${passive.icon}`);
      text(passive.name, `${path}.${passive.id}.name`);
      text(passive.description, `${path}.${passive.id}.description`);
      for (const mult of oversizedHeals(passive.effects))
        error(
          `${path}.${passive.id}`,
          `a max-HP heal is a fraction of the pool; ${mult} heals ${mult} pools`,
        );
    }
    if (def.boss) {
      const slots = new Set(def.abilities.map((a) => a.slot));
      for (const slot of def.boss.rotation)
        if (!slots.has(slot)) error(`${path}.boss.rotation`, `rotation names ${slot} which the kit lacks`);
    }
  });
  return { issues, ids };
}

function validateEncounters(
  encounters: readonly unknown[],
  enemyIds: ReadonlySet<string>,
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  encounters.forEach((raw, index) => {
    const parsed = encounterSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`encounters[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as EncounterDef;
    const path = `encounters.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
    if (!refs.assetKeys.has(def.backdrop)) error(`${path}.backdrop`, `unknown asset key ${def.backdrop}`);
    const expected = def.kind === 'boss' || def.kind === 'bench' ? PARTY_SIZE_BOSS : PARTY_SIZE_CAMPAIGN;
    if (def.partySize !== expected)
      error(`${path}.partySize`, `${def.kind} encounters field ${expected} champions`);
    def.waves.forEach((wave, w) => {
      for (const spawn of wave.enemies)
        if (!enemyIds.has(spawn.enemyId)) error(`${path}.waves[${w}]`, `unknown enemy ${spawn.enemyId}`);
    });
  });
  return issues;
}

function validateCurrencies(currencies: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const seen = new Set<string>();
  currencies.forEach((raw, index) => {
    const parsed = currencySchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`currencies[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data;
    if (seen.has(def.id)) error(`currencies.${def.id}`, 'duplicate id');
    seen.add(def.id);
    if (!refs.assetKeys.has(def.icon)) error(`currencies.${def.id}.icon`, `unknown asset key ${def.icon}`);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(`currencies.${def.id}`, `missing i18n key ${key}`);
  });
  for (const id of CURRENCY_IDS)
    if (!seen.has(id)) error(`currencies.${id}`, 'currency id declared but not defined');
  return issues;
}

function validateChampions(champions: readonly unknown[], refs: ContentRefs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });
  const warn = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'warning' });
  const seen = new Set<string>();
  const abilityIds = new Set<string>();
  const text = (key: string, path: string): void => {
    if (!refs.i18nKeys.has(key)) error(path, `missing i18n key ${key}`);
  };
  const placeholders = (key: string, path: string): void => {
    const body = refs.i18nText?.(key);
    if (!body) return;
    for (const match of body.matchAll(/\{(\w+)\}/g)) {
      const token = match[1] ?? '';
      if (!DESCRIPTION_TOKENS.has(token)) error(path, `unknown description placeholder {${token}} in ${key}`);
    }
  };

  champions.forEach((raw, index) => {
    const parsed = championSchema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues)
        error(`champions[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = parsed.data as ChampionDef;
    const path = `champions.${def.id}`;
    if (seen.has(def.id)) error(path, 'duplicate id');
    seen.add(def.id);

    text(def.name, `${path}.name`);
    text(def.lore, `${path}.lore`);
    for (const key of [def.art.model, def.art.avatar])
      if (!refs.assetKeys.has(key)) error(`${path}.art`, `unknown asset key ${key}`);
    if (def.art.model === PLACEHOLDER_MODEL) {
      if (!def.art.placeholder) error(`${path}.art`, 'lizard model must be flagged as placeholder');
      if (!def.art.tint) error(`${path}.art`, 'placeholder art needs a tint');
    } else if (def.art.placeholder) error(`${path}.art`, 'finished model flagged as placeholder');

    const kit = RARITY_KIT[def.rarity];
    if (def.abilities.length !== kit.abilities)
      error(
        `${path}.abilities`,
        `${def.rarity} champions have ${kit.abilities} active abilities, found ${def.abilities.length}`,
      );
    def.abilities.forEach((ability, i) => {
      const expectedSlot = `a${i + 1}`;
      if (ability.slot !== expectedSlot)
        error(`${path}.abilities[${i}]`, `expected slot ${expectedSlot}, found ${ability.slot}`);
      if (ability.slot === 'a1' && ability.cooldown !== 0)
        error(`${path}.${ability.id}`, 'A1 must have no cooldown');
      if (ability.slot !== 'a1' && ability.cooldown < 1)
        error(`${path}.${ability.id}`, 'A2–A4 need a cooldown');
      if (abilityIds.has(ability.id)) error(`${path}.${ability.id}`, 'duplicate ability id');
      abilityIds.add(ability.id);
      if (!refs.assetKeys.has(ability.icon))
        error(`${path}.${ability.id}.icon`, `unknown asset key ${ability.icon}`);
      text(ability.name, `${path}.${ability.id}.name`);
      text(ability.description, `${path}.${ability.id}.description`);
      placeholders(ability.description, `${path}.${ability.id}.description`);
      for (const mult of oversizedHeals(ability.effects))
        error(
          `${path}.${ability.id}`,
          `a max-HP heal is a fraction of the pool; ${mult} heals ${mult} pools`,
        );
      const maxUpgrades = ability.slot === 'a1' ? 2 : 4;
      if (ability.upgrades.length > maxUpgrades)
        error(`${path}.${ability.id}.upgrades`, `at most ${maxUpgrades} upgrade steps`);
      if (
        def.rarity !== 'common' &&
        def.rarity !== 'uncommon' &&
        ability.slot !== 'a1' &&
        ability.upgrades.length < 3
      )
        warn(`${path}.${ability.id}.upgrades`, 'non-A1 abilities usually have 3–4 upgrade steps');
      if (
        (def.rarity === 'common' || def.rarity === 'uncommon') &&
        ability.slot !== 'a1' &&
        ability.upgrades.length === 0
      )
        warn(`${path}.${ability.id}.upgrades`, 'uncommon A2 usually lists its upgrade steps');
    });

    if (kit.passive && !def.passive) error(`${path}.passive`, `${def.rarity} champions have a passive`);
    if (!kit.passive && def.passive) error(`${path}.passive`, `${def.rarity} champions have no passive`);
    if (kit.aura && !def.aura) error(`${path}.aura`, `${def.rarity} champions have an aura`);
    if (!kit.aura && def.aura) error(`${path}.aura`, `${def.rarity} champions have no aura`);
    for (const extra of [def.passive, def.aura]) {
      if (!extra) continue;
      if (!refs.assetKeys.has(extra.icon))
        error(`${path}.${extra.id}.icon`, `unknown asset key ${extra.icon}`);
      text(extra.name, `${path}.${extra.id}.name`);
      text(extra.description, `${path}.${extra.id}.description`);
      placeholders(extra.description, `${path}.${extra.id}.description`);
      if (abilityIds.has(extra.id)) error(`${path}.${extra.id}`, 'duplicate ability id');
      abilityIds.add(extra.id);
    }
    for (const mult of oversizedHeals(def.passive?.effects ?? []))
      error(`${path}.passive`, `a max-HP heal is a fraction of the pool; ${mult} heals ${mult} pools`);

    if ((STARTER_IDS as readonly string[]).includes(def.id) && !def.obtain.includes('starter'))
      error(`${path}.obtain`, 'starters must list the starter source');
    // The page says where a champion comes from, so the campaign source is listed exactly when a
    // mastery pick offers the champion (the pick draws from the summonable pool of its rarity).
    const offeredByCampaign =
      def.obtain.includes('summon') && CHAMPION_CHOICES.some((choice) => choice.rarity === def.rarity);
    if (offeredByCampaign !== def.obtain.includes('campaign_drop'))
      error(
        `${path}.obtain`,
        offeredByCampaign
          ? 'a campaign mastery pick offers this champion, so it lists campaign_drop'
          : 'no campaign reward grants this champion, so it does not list campaign_drop',
      );

    const deviation = statDeviation(def.stats, def.role, def.rarity);
    for (const stat of ['hp', 'atk', 'def'] as const)
      if (deviation[stat] > STAT_DEVIATION_TOLERANCE)
        warn(
          `${path}.stats.${stat}`,
          `${Math.round(deviation[stat] * 100)} % off the ${def.role}/${def.rarity} template`,
        );
  });

  for (const id of CHAMPION_IDS)
    if (!seen.has(id)) error(`champions.${id}`, 'champion id declared but not defined');
  return issues;
}

/**
 * The consumables, the Gem Market's shelf and the Login Calendar (MARKET.md, LOGIN.md).
 *
 * Four promises a content edit could quietly break, each of which would be invisible until a
 * player hit it:
 *
 * - **Nothing hands over a thing that does not exist.** Every `consumable` grant names an item on
 *   the shelf's own list, and every `currency` grant a currency in the wallet — otherwise a
 *   calendar day pays into a void.
 * - **A bundle is worth taking.** A one-time entry must cost *less* than its parts bought singly,
 *   or it is a trap rather than a bundle. Singles are exempt, being their own price.
 * - **The calendar is thirty days, numbered 1..30, with no gaps** — the whole board is read by
 *   index, so a missing day would hand a player nothing on their fourteenth login.
 * - **The finale is the last three days and only those.** Days 28–30 are `legendary` and no
 *   earlier day is, which is the one rule the owner put on the shuffle.
 */
function validateMarket(
  consumables: readonly unknown[],
  shelf: readonly unknown[],
  board: readonly unknown[],
  currencyIds: ReadonlySet<string>,
  refs: ContentRefs,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (path: string, message: string): void =>
    void issues.push({ path, message, severity: 'error' });

  const itemIds = new Set<string>();
  consumables.forEach((raw, index) => {
    const result = consumableSchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`consumables[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const def = result.data;
    if (itemIds.has(def.id)) error(def.id, 'duplicate id');
    itemIds.add(def.id);
    for (const key of [def.name, def.description])
      if (!refs.i18nKeys.has(key)) error(def.id, `missing i18n key ${key}`);
    if (!refs.assetKeys.has(def.icon)) error(def.id, `missing icon ${def.icon}`);
  });

  /** Every grant in a list names something that exists. */
  const checkGrants = (path: string, grants: readonly unknown[]): void => {
    for (const raw of grants) {
      const parsed = grantSchema.safeParse(raw);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) error(path, issue.message);
        continue;
      }
      const grant = parsed.data;
      if (grant.kind === 'consumable' && !itemIds.has(grant.item))
        error(path, `hands over unknown item ${grant.item}`);
      if (grant.kind === 'currency' && !currencyIds.has(grant.currency))
        error(path, `hands over unknown currency ${grant.currency}`);
    }
  };

  /** What one of an item costs on the shelf, for the bundle-value check. */
  const singlePrice = new Map<string, number>();
  const entries: { id: string; price: number; once: boolean; contents: readonly unknown[] }[] = [];
  const seenShelf = new Set<string>();
  const seenOrder = new Set<number>();
  shelf.forEach((raw, index) => {
    const result = gemShelfEntrySchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`shelf[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const entry = result.data;
    if (seenShelf.has(entry.id)) error(entry.id, 'duplicate id');
    seenShelf.add(entry.id);
    if (seenOrder.has(entry.order)) error(entry.id, `duplicate order ${entry.order}`);
    seenOrder.add(entry.order);
    for (const key of [entry.name, entry.description])
      if (!refs.i18nKeys.has(key)) error(entry.id, `missing i18n key ${key}`);
    checkGrants(entry.id, entry.contents);
    entries.push({
      id: entry.id,
      price: entry.price,
      once: entry.once === true,
      contents: entry.contents,
    });
    const only = entry.contents[0];
    if (
      !entry.once &&
      entry.contents.length === 1 &&
      only &&
      (only as { kind: string }).kind === 'consumable'
    ) {
      const single = only as { item: string; count: number };
      if (single.count === 1) singlePrice.set(single.item, entry.price);
    }
  });

  // A bundle has to beat buying its parts, or nobody should ever press it.
  for (const entry of entries) {
    if (!entry.once) continue;
    let parts = 0;
    let priceable = true;
    for (const raw of entry.contents) {
      const grant = raw as { kind: string; item?: string; count?: number };
      if (grant.kind !== 'consumable') {
        // A currency bundle has no shelf price to compare against; its value is judged by hand.
        priceable = false;
        break;
      }
      const unit = singlePrice.get(grant.item ?? '');
      if (unit === undefined) {
        priceable = false;
        break;
      }
      parts += unit * (grant.count ?? 0);
    }
    if (priceable && entry.price >= parts)
      error(entry.id, `costs ${entry.price} gems, which is no better than its parts at ${parts}`);
  }

  const days = new Set<number>();
  board.forEach((raw, index) => {
    const result = loginDaySchema.safeParse(raw);
    if (!result.success) {
      for (const issue of result.error.issues)
        error(`login[${index}].${issue.path.join('.')}`, issue.message);
      return;
    }
    const day = result.data;
    const path = `login.day${day.day}`;
    if (days.has(day.day)) error(path, 'duplicate day');
    days.add(day.day);
    checkGrants(path, day.rewards);
    const finale = day.day >= LOGIN_FINALE_FROM;
    if (finale && day.tier !== 'legendary')
      error(
        path,
        `is in the finale but only ${day.tier} — days ${LOGIN_FINALE_FROM}–${LOGIN_DAYS} lead the board`,
      );
    if (!finale && day.tier === 'legendary')
      error(path, 'is legendary before the finale, which would outshine days 28-30');
  });
  for (let day = 1; day <= LOGIN_DAYS; day += 1)
    if (!days.has(day)) error('login', `has no day ${day}, so that login would pay nothing`);

  return issues;
}
