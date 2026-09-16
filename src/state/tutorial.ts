/**
 * The tutorial in the save (docs/design/TUTORIAL.md, ADR-042).
 *
 * Two jobs. It translates the world the store and the battle controller hold into the small
 * `TutorialContext` the step machine reads — and it is the only place that knows the script's
 * names for screens and dialogs are the router's own. Then it writes the two things a lesson can
 * add to a save: a step taught, and a chapter waved off.
 *
 * Which step is open, what finishes it and what a chapter still owes all live in
 * `@engine/tutorial`; nothing about position is stored (CLAUDE.md §5.5).
 */
import { content } from '@content/registry';
import type { AbilitySlot } from '@content/champions/types';
import {
  TUTORIAL_DIALOGS,
  TUTORIAL_SCREENS,
  type TutorialDialog,
  type TutorialGrant,
  type TutorialScreen,
  type TutorialStepDef,
} from '@content/tutorial/types';
import { fail, ok, type Result } from '@engine/errors';
import type { SaveGame } from '@engine/schema/save';
import {
  activeStep,
  emptyTutorialState,
  owedGrants,
  tutorialFinished,
  tutorialView,
  type TutorialBattleSignal,
  type TutorialContext,
  type TutorialState,
  type TutorialView,
} from '@engine/tutorial/index';
import type { BattleSessionState } from './battle/controller';
import type { DialogRoute, Route, RouteName } from './ui-types';

/**
 * The script's screen names, mapped to the router's. The record is exhaustive over
 * `TutorialScreen` and its values are typed `RouteName`, so a screen the script names that the
 * router does not have is a compile error rather than a spotlight that never appears.
 */
const ROUTE_OF_SCREEN: Readonly<Record<TutorialScreen, RouteName>> = {
  title: 'title',
  starter: 'starter',
  hub: 'hub',
  champions: 'champions',
  tavern: 'tavern',
  armoury: 'armoury',
  forge: 'forge',
  portal: 'portal',
  bosses: 'bosses',
  quests: 'quests',
  missions: 'missions',
  'game-modes': 'game-modes',
  campaign: 'campaign',
  settlement: 'settlement',
  'battle-setup': 'battle-setup',
  battle: 'battle',
  'battle-result': 'battle-result',
};

/** The same, for the dialogs a lesson can wait on. */
const DIALOG_OF_NAME: Readonly<Record<TutorialDialog, DialogRoute['name']>> = {
  'new-game': 'new-game',
  'gear-picker': 'gear-picker',
  'idle-chest': 'idle-chest',
  'level-up': 'level-up',
};

const SCREEN_BY_ROUTE = new Map<RouteName, TutorialScreen>(
  TUTORIAL_SCREENS.map((screen) => [ROUTE_OF_SCREEN[screen], screen]),
);
const DIALOG_BY_NAME = new Map<DialogRoute['name'], TutorialDialog>(
  TUTORIAL_DIALOGS.map((dialog) => [DIALOG_OF_NAME[dialog], dialog]),
);

/** The script's name for the screen on top, or null for one no lesson mentions. */
export function screenOf(route: Route): TutorialScreen | null {
  return SCREEN_BY_ROUTE.get(route.name) ?? null;
}

export function dialogOf(dialog: DialogRoute | null): TutorialDialog | null {
  return dialog ? (DIALOG_BY_NAME.get(dialog.name) ?? null) : null;
}

/**
 * What the live fight tells the script. Read off the presented session, not the simulation: the
 * lesson waits for the moment the *player* sees — the turn the HUD is asking about, the wave the
 * stage is showing, the ability whose cast has already played.
 */
export function battleSignal(session: BattleSessionState | null): TutorialBattleSignal | null {
  if (!session || session.status === 'idle' || !session.view) return null;
  const allies = new Set(session.view.units.filter((unit) => unit.side === 'ally').map((unit) => unit.id));
  const used = new Set<AbilitySlot>();
  for (const event of session.log)
    if (event.type === 'ability.cast' && allies.has(event.unitId)) used.add(event.slot);
  return {
    // A request is only ever raised for a champion the player commands.
    allyTurn: session.request !== null,
    wave: session.view.wave,
    used: [...used],
    auto: session.usedAuto,
  };
}

export function tutorialStateOf(save: SaveGame | null): TutorialState {
  return save ? save.tutorial : emptyTutorialState();
}

export interface TutorialWorld {
  save: SaveGame | null;
  route: Route;
  dialog: DialogRoute | null;
  battle: BattleSessionState | null;
}

export function tutorialContext(world: TutorialWorld): TutorialContext {
  return {
    save: world.save,
    screen: screenOf(world.route),
    dialog: dialogOf(world.dialog),
    playerLevel: world.save?.profile.level ?? 1,
    battle: battleSignal(world.battle),
  };
}

/** The lesson the overlay should be showing, with the chrome around it. */
export function tutorialStep(world: TutorialWorld): TutorialView | null {
  return tutorialView(content.tutorialChapters, tutorialStateOf(world.save), tutorialContext(world));
}

/** Whether Eldric has nothing left to teach — what stops the overlay from mounting at all. */
export function tutorialOver(save: SaveGame | null): boolean {
  return save !== null && tutorialFinished(content.tutorialChapters, save.tutorial);
}

/**
 * The step that is open, whatever the overlay is doing with it — used by the scripted moments to
 * ask "is this the fight the tutorial set up?" (`TUTORIAL.md` 1.5, 3.2).
 */
export function openTutorialStep(world: TutorialWorld): TutorialStepDef | null {
  return activeStep(content.tutorialChapters, tutorialStateOf(world.save), tutorialContext(world));
}

/** Whether the lesson now open is the scripted fight, or the scripted pull. */
export function tutorialScript(world: TutorialWorld, script: 'battle' | 'summon'): boolean {
  return openTutorialStep(world)?.script === script;
}

/** Grants the chronicle is owed and has not been paid — ids are what keeps it to once. */
export function tutorialGrantsOwed(world: TutorialWorld): TutorialGrant[] {
  const save = world.save;
  if (!save) return [];
  const paid = new Set(save.provisionsClaimed);
  return owedGrants(content.tutorialChapters, save.tutorial, tutorialContext(world)).filter(
    (grant) => !paid.has(grant.id),
  );
}

/** Records a step as taught. Idempotent: a second report of the same step changes nothing. */
export function applyTutorialStep(save: SaveGame, stepId: string): boolean {
  if (save.tutorial.completedSteps.includes(stepId)) return false;
  if (!content.tutorialStepById(stepId)) return false;
  save.tutorial.completedSteps.push(stepId);
  return true;
}

/**
 * Waves a chapter off (owner's answer Q4). The chapter is over — its steps are not marked taught,
 * because they were not — and the next one opens. What it carried is still owed: `owedGrants`
 * pays a skipped chapter's grants, so a skipped lesson never costs the player energy.
 */
export function applyTutorialSkip(save: SaveGame, chapterId: string): Result<void> {
  const chapter = content.tutorialChapters.find((one) => one.id === chapterId);
  if (!chapter) return fail('invalid_argument', `Unknown tutorial chapter ${chapterId}`);
  if (!chapter.skippable) return fail('invalid_argument', `${chapterId} cannot be skipped`);
  if (!save.tutorial.skippedChapters.includes(chapterId)) save.tutorial.skippedChapters.push(chapterId);
  return ok(undefined);
}
