/**
 * The tutorial's step machine (docs/design/TUTORIAL.md, ADR-042).
 *
 * Pure, and derived from as little as possible. What a save keeps is the set of steps already
 * finished and the chapters the player skipped; *which* step is open right now is arithmetic over
 * that set, the chronicle and where the player is standing — the discipline of ADR-041 applied to
 * the script, so a save can never disagree with the lesson it is on.
 *
 * One lesson at a time: chapters are walked in order, and a chapter whose gate has not opened
 * holds the ones behind it. Inside a chapter the steps are sequential too, except in Steel and
 * Bone, whose lessons each wait on their own feature and so stand alone (`TUTORIAL.md` §6).
 *
 * The two answers only the overlay can give — the Continue press and a click on the spotlit
 * element — are *not* evaluated here. `stepSatisfied` returns false for them; the overlay reports
 * them and the state layer records them, which is also what stops a counter goal from finishing a
 * step before its line has been read.
 */
import type { FeatureId } from '@content/balance/unlocks';
import type { AbilitySlot } from '@content/champions/types';
import type {
  TutorialChapterDef,
  TutorialCondition,
  TutorialDialog,
  TutorialGrant,
  TutorialScreen,
  TutorialStepDef,
} from '@content/tutorial/types';
import { DIFFICULTY_ORDER, isStageCleared, stageIdOf } from '@engine/campaign/progress';
import { counter } from '@engine/progression/counters';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import type { SaveGame } from '@engine/schema/save';

/** What the save keeps: what has been taught, and what the player waved off. */
export interface TutorialState {
  completedSteps: readonly string[];
  skippedChapters: readonly string[];
}

/** What the live fight tells the script, while one is running. */
export interface TutorialBattleSignal {
  /** An ally's decision is open — the moment a "when it is your turn" step waits for. */
  allyTurn: boolean;
  /** The wave the fight is on, 1-based. */
  wave: number;
  /** Ability slots the party has cast in this fight. */
  used: readonly AbilitySlot[];
  /** Ability slots the open turn offers, ready to use. */
  ready: readonly AbilitySlot[];
  /** The AI has had the wheel at some point in this fight. */
  auto: boolean;
}

/** Where the player is standing, as the script sees it. */
export interface TutorialContext {
  /** Null before the chronicle exists: step 1.1 is taught over the new-game dialog. */
  save: SaveGame | null;
  screen: TutorialScreen | null;
  /** The dialog on top, when it is one the script knows by name. */
  dialog: TutorialDialog | null;
  /**
   * Whether *any* dialog is open, named or not. Eldric waits his turn: a lesson that does not
   * itself name the dialog on screen does not open over it, because a dialog is the game asking
   * the player a question and a lesson holds the screen while it speaks.
   */
  dialogOpen: boolean;
  playerLevel: number;
  battle: TutorialBattleSignal | null;
}

export type ChapterStatus = 'locked' | 'open' | 'done' | 'skipped';

/** What the overlay draws: the step, where it sits, and whether it can be waved off. */
export interface TutorialView {
  chapter: TutorialChapterDef;
  step: TutorialStepDef;
  /** 1-based position of the step in its chapter, for "Lesson 3 of 11". */
  number: number;
  count: number;
  skippable: boolean;
}

export function emptyTutorialState(): TutorialState {
  return { completedSteps: [], skippedChapters: [] };
}

/** Whether a chapter's own gate has opened. */
export function chapterTriggered(chapter: TutorialChapterDef, ctx: TutorialContext): boolean {
  // The first chapter is open to any chronicle that has not walked or skipped it already; a save
  // older than the tutorial has it marked skipped by the migration, which is what closes it.
  if (chapter.trigger.type === 'new_game') return true;
  return isFeatureUnlocked(chapter.trigger.feature, ctx.playerLevel);
}

/** Every step of a chapter finished. */
export function chapterComplete(chapter: TutorialChapterDef, state: TutorialState): boolean {
  const done = new Set(state.completedSteps);
  return chapter.steps.every((step) => done.has(step.id));
}

export function chapterStatus(
  chapter: TutorialChapterDef,
  state: TutorialState,
  ctx: TutorialContext,
): ChapterStatus {
  if (state.skippedChapters.includes(chapter.id)) return 'skipped';
  if (chapterComplete(chapter, state)) return 'done';
  return chapterTriggered(chapter, ctx) ? 'open' : 'locked';
}

/**
 * The chapter being taught: the first one that is neither finished nor skipped. It is returned
 * even when its gate is shut, because a chapter waiting on a level is what holds the ones behind
 * it — Eldric teaches one thing at a time.
 */
export function currentChapter(
  chapters: readonly TutorialChapterDef[],
  state: TutorialState,
  ctx: TutorialContext,
): TutorialChapterDef | null {
  for (const chapter of chapters) {
    const status = chapterStatus(chapter, state, ctx);
    if (status === 'done' || status === 'skipped') continue;
    return chapter;
  }
  return null;
}

/**
 * Whether a step may open where the player is standing: its own trigger holds, and nothing else is
 * asking them a question — a dialog the step does not name keeps Eldric quiet until it is answered
 * (the Welcome Back report, a level-up).
 */
function openable(step: TutorialStepDef, ctx: TutorialContext): boolean {
  if (step.when && !conditionHolds(step.when, ctx)) return false;
  if (!ctx.dialogOpen) return true;
  return step.when
    ? flatten(step.when).some((one) => one.type === 'dialog' && one.dialog === ctx.dialog)
    : false;
}

/** A condition and, for `all`/`any`, everything inside it. */
function flatten(condition: TutorialCondition): TutorialCondition[] {
  return condition.type === 'all' || condition.type === 'any'
    ? [condition, ...condition.of.flatMap(flatten)]
    : [condition];
}

/** The step the overlay is showing, or null when Eldric has nothing to say right now. */
export function activeStep(
  chapters: readonly TutorialChapterDef[],
  state: TutorialState,
  ctx: TutorialContext,
): TutorialStepDef | null {
  const chapter = currentChapter(chapters, state, ctx);
  if (!chapter || chapterStatus(chapter, state, ctx) !== 'open') return null;
  const done = new Set(state.completedSteps);
  const waiting = chapter.steps.filter((step) => !done.has(step.id));
  if (chapter.sequential) {
    const next = waiting[0];
    return next && openable(next, ctx) ? next : null;
  }
  return waiting.find((step) => openable(step, ctx)) ?? null;
}

/** `activeStep` with the chrome the overlay needs around it. */
export function tutorialView(
  chapters: readonly TutorialChapterDef[],
  state: TutorialState,
  ctx: TutorialContext,
): TutorialView | null {
  const step = activeStep(chapters, state, ctx);
  if (!step) return null;
  const chapter = chapters.find((one) => one.index === step.chapter);
  if (!chapter) return null;
  return {
    chapter,
    step,
    number: step.index,
    count: chapter.steps.length,
    skippable: chapter.skippable,
  };
}

/** Nothing left to teach: every chapter is finished or waved off. */
export function tutorialFinished(chapters: readonly TutorialChapterDef[], state: TutorialState): boolean {
  // Asked on every render the overlay does, including one per battle event, so the set of taught
  // ids is built once rather than once per chapter.
  const taught = new Set(state.completedSteps);
  return chapters.every(
    (chapter) =>
      state.skippedChapters.includes(chapter.id) || chapter.steps.every((step) => taught.has(step.id)),
  );
}

/**
 * Whether the step's own completion can be seen in the world. `acknowledged` and `clicked` are
 * answers the overlay gives, so they are never satisfied here.
 */
export function stepSatisfied(step: TutorialStepDef, ctx: TutorialContext): boolean {
  return conditionHolds(step.complete, ctx);
}

/**
 * Every grant the chronicle is owed: from the steps it has finished, from the one it is on (the
 * Provisions arrive as Eldric names them), and from every step of a chapter it skipped — waving a
 * lesson off never costs the energy it carried. Ids are idempotent, so this can be handed over on
 * every tick without paying twice.
 */
export function owedGrants(
  chapters: readonly TutorialChapterDef[],
  state: TutorialState,
  ctx: TutorialContext,
): TutorialGrant[] {
  const done = new Set(state.completedSteps);
  const open = activeStep(chapters, state, ctx);
  const grants: TutorialGrant[] = [];
  for (const chapter of chapters) {
    const skipped = state.skippedChapters.includes(chapter.id);
    for (const step of chapter.steps) {
      if (!step.grant) continue;
      if (skipped || done.has(step.id) || step.id === open?.id) grants.push(step.grant);
    }
  }
  return grants;
}

/**
 * The features a step's own gate waits for. A save older than the tutorial has no business being
 * taught a lesson about a feature it has been using for weeks, so the v12 migration reads these to
 * decide which of Steel and Bone's standalone lessons are already behind the chronicle.
 */
export function stepFeatureGates(step: TutorialStepDef): FeatureId[] {
  return step.when ? conditionFeatures(step.when) : [];
}

function conditionFeatures(condition: TutorialCondition): FeatureId[] {
  if (condition.type === 'all' || condition.type === 'any') return condition.of.flatMap(conditionFeatures);
  return condition.type === 'feature' ? [condition.feature] : [];
}

/** Whether one condition holds right now. */
export function conditionHolds(condition: TutorialCondition, ctx: TutorialContext): boolean {
  switch (condition.type) {
    case 'all':
      return condition.of.every((one) => conditionHolds(one, ctx));
    case 'any':
      return condition.of.some((one) => conditionHolds(one, ctx));
    case 'screen':
      return ctx.screen === condition.screen;
    case 'dialog':
      return ctx.dialog === condition.dialog;
    case 'feature':
      return isFeatureUnlocked(condition.feature, ctx.playerLevel);
    case 'starter_bound':
      return ctx.save !== null && Object.keys(ctx.save.roster).length > 0;
    case 'stage_cleared': {
      const save = ctx.save;
      if (!save) return false;
      // The lesson asks for the stand, not the difficulty it fell on.
      const stageId = stageIdOf(condition.settlement, condition.stage);
      return DIFFICULTY_ORDER.some((difficulty) => isStageCleared(save.campaign, stageId, difficulty));
    }
    case 'counter':
      return ctx.save !== null && counter(ctx.save, condition.key) >= condition.count;
    case 'gear_worn': {
      const save = ctx.save;
      if (!save) return false;
      return Object.values(save.roster).some((instance) => instance.gear[condition.slot] !== null);
    }
    case 'battle_turn': {
      const battle = ctx.battle;
      if (!battle || !battle.allyTurn) return false;
      if (condition.wave !== undefined && battle.wave < condition.wave) return false;
      return condition.slot === undefined || battle.ready.includes(condition.slot);
    }
    case 'ability_used':
      return ctx.battle !== null && ctx.battle.used.includes(condition.slot);
    case 'auto_battle':
      return ctx.battle !== null && ctx.battle.auto;
    // The overlay's own two answers (see the module comment).
    case 'acknowledged':
    case 'clicked':
      return false;
  }
}
