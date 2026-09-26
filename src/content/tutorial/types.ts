/**
 * The tutorial script as data (docs/design/TUTORIAL.md).
 *
 * Six chapters of steps. A step says when it opens, what the pointer rests on, what Eldric says,
 * what the player may touch while it waits, and what finishes it. Nothing here knows about React
 * or the DOM: a step names a **target**, and the overlay owns the single map from a target to the
 * element it lives on (ADR-042), so no screen has to know the tutorial exists.
 *
 * The same is true of what a step waits for: a condition names a screen, a dialog, an unlock or a
 * lifetime counter — things the save and the router already say — so completion is *observed*,
 * never reported by the screen that happens to be open (the discipline of ADR-040/041).
 */
import type { AbilitySlot, GearSlot } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { FeatureId } from '@content/balance/unlocks';

/**
 * Everything the script is allowed to point at. Each name is mapped to one selector in
 * `@ui/tutorial/targets`; that map is exhaustive in both directions, so a target the UI cannot
 * find, or an element the script never points at, is a compile error rather than a dead spotlight.
 */
export const TUTORIAL_TARGETS = [
  // The first minute: naming the chronicle and binding a starter.
  'name.input',
  'name.begin',
  'starter.cards',
  // Emberhold
  'hub.campaign',
  'hub.champions',
  'hub.tavern',
  'hub.portal',
  'hub.forge',
  'hub.hall',
  'hub.idle',
  'hub.mine',
  'hub.unwritten',
  'hub.deeds',
  'hub.quests',
  'hub.missions',
  'topbar.energy',
  // The campaign
  'modes.campaign',
  'campaign.settlement1',
  'settlement.stage1',
  'settlement.stage2',
  'setup.team',
  'setup.start',
  'setup.repeat',
  'setup.instant',
  // The Hall of Deeds
  'deeds.claimAll',
  // The Unwritten
  'unwritten.omen',
  // The fight
  'battle.ability1',
  'battle.ability2',
  'battle.units',
  'battle.auto',
  'battle.speed',
  'result.stars',
  'result.rewards',
  // The Tavern
  'tavern.roster',
  'tavern.brews',
  'tavern.upgrade',
  'tavern.rankTab',
  'tavern.skillsTab',
  // Champions and gear
  'champions.roster',
  'champions.gearTab',
  'champions.weaponSlot',
  'champions.armoury',
  'gear.picker',
  'gear.equip',
  'armoury.racks',
  'armoury.upgrade',
  // The Portal
  'portal.shard',
  'portal.summon',
  'summon.card',
  // The routine
  'quests.login',
  'quests.track',
  'idle.claim',
  'mine.collect',
  'mine.dig',
  'missions.card',
  // Steel and bone
  'forge.craftTab',
  'forge.refineTab',
  'boss.keys',
  'boss.sheet',
] as const;

export type TutorialTarget = (typeof TUTORIAL_TARGETS)[number];

/**
 * Screens the script may name. They are the router's own names (`@state/ui-types`), checked
 * against it by the map in `@state/tutorial-signals`; content may not import the router.
 */
export const TUTORIAL_SCREENS = [
  'title',
  'starter',
  'hub',
  'champions',
  'tavern',
  'armoury',
  'forge',
  'portal',
  'bosses',
  'quests',
  'missions',
  'deeds',
  'unwritten',
  'game-modes',
  'campaign',
  'settlement',
  'battle-setup',
  'battle',
  'battle-result',
] as const;

export type TutorialScreen = (typeof TUTORIAL_SCREENS)[number];

/** Dialogs the script may name, checked against `DialogRoute` the same way. */
export const TUTORIAL_DIALOGS = ['new-game', 'gear-picker', 'idle-chest', 'mine', 'level-up'] as const;

export type TutorialDialog = (typeof TUTORIAL_DIALOGS)[number];

/**
 * What a step waits for — as a gate before it opens (`when`) or as what finishes it (`complete`).
 *
 * Two families, like the goal DSL of `@content/quests/types`:
 *
 * - **Observed**: a screen is open, a feature has unlocked, a counter has moved, a stand has
 *   fallen. The watcher reads these off the save and the router; the player cannot be handed a
 *   step that is already satisfied by play the tutorial never saw, because the check only starts
 *   once Eldric's line has been read.
 * - **Answered**: `acknowledged` (the player pressed Continue in Eldric's panel) and `clicked`
 *   (the player used the element under the spotlight). These are the two things only the overlay
 *   can see, and they are the only ones it ever reports.
 */
export type TutorialCondition =
  | { type: 'all'; of: TutorialCondition[] }
  | { type: 'any'; of: TutorialCondition[] }
  | { type: 'screen'; screen: TutorialScreen }
  | { type: 'dialog'; dialog: TutorialDialog }
  | { type: 'feature'; feature: FeatureId }
  /** A starter has been bound, which is what opens Emberhold. */
  | { type: 'starter_bound' }
  /** A stand has been cleared on any difficulty (settlement and stage are 1-based). */
  | { type: 'stage_cleared'; settlement: number; stage: number }
  /** A lifetime counter has reached `count` (`@engine/progression/counters`). */
  | { type: 'counter'; key: string; count: number }
  /** Some champion wears a piece in this slot. */
  | { type: 'gear_worn'; slot: GearSlot }
  /**
   * An ally's turn is open in the live fight; `wave` is 1-based. `slot` narrows it to a turn that
   * offers that ability — the lesson about cooldowns has to land on a champion who has a second
   * one, not on the novice healer whose turn happened to come first.
   */
  | { type: 'battle_turn'; wave?: number; slot?: AbilitySlot }
  | { type: 'ability_used'; slot: AbilitySlot }
  /**
   * The battle setup is open on a campaign stand this chronicle holds every star of — the only
   * place the instant clear it teaches can be pressed (CAMPAIGN.md §10).
   */
  | { type: 'stand_mastered' }
  | { type: 'auto_battle' }
  | { type: 'acknowledged' }
  | { type: 'clicked' };

/**
 * A one-time payment a step makes as it opens: the Chronicler's Provisions and the Ancient Shard
 * Eldric kept back. `id` is stored in `save.provisionsClaimed`, so a grant is paid once per
 * chronicle however many times the step is looked at.
 */
export interface TutorialGrant {
  id: string;
  currencies: CurrencyAmount[];
}

/** One taught beat. */
export interface TutorialStepDef {
  /** `tut.<chapter>.<n>`. */
  id: string;
  /** 1-based, and equal to the chapter it sits in. */
  chapter: number;
  /** 1-based position within the chapter. */
  index: number;
  /** i18n key of Eldric's line. */
  dialogue: string;
  /** The step waits for this before it opens; absent means "as soon as the one before it is done". */
  when?: TutorialCondition;
  /**
   * What the pointer rests on, in fallback order: the first target on screen wins. A lesson that
   * crosses a screen ("the Hall, then the card inside it") is therefore still one step, and a step
   * whose target is nowhere shows its line without dimming anything.
   */
  spotlight: TutorialTarget[];
  /** What stays clickable while the step waits; `'all'` is free play (TUTORIAL.md 1.10). */
  allow: 'all' | TutorialTarget[];
  complete: TutorialCondition;
  grant?: TutorialGrant;
  /**
   * The scripted moments (TUTORIAL.md §"Data shape"): the first stand is fought on a fixed seed
   * and the first summon always turns up an Epic, so the lesson lands the same way every time.
   */
  script?: 'battle' | 'summon';
  version: number;
}

/** What opens a chapter. */
export type TutorialTrigger =
  | { type: 'new_game' }
  /** The chapter opens with the feature it teaches (levels come from `balance/unlocks.ts`). */
  | { type: 'feature'; feature: FeatureId };

export interface TutorialChapterDef {
  /** `tut.<slug>`. */
  id: string;
  /** 1-based; chapters open in this order. */
  index: number;
  /** i18n key of the chapter's name. */
  name: string;
  trigger: TutorialTrigger;
  steps: TutorialStepDef[];
  /**
   * Whether the steps are walked in order. Chapter 6's lessons each wait on their own feature and
   * stand alone, so one the player has not reached never blocks another (TUTORIAL.md §6).
   */
  sequential: boolean;
  /** "Skip this lesson" (owner's answer Q4); the first chapter is the one that cannot be skipped. */
  skippable: boolean;
  version: number;
}
