/**
 * The step machine (docs/design/TUTORIAL.md, ROADMAP Phase 14 acceptance). Three promises run
 * through these tests:
 *
 * - **one lesson at a time**: a chapter that is not finished holds the ones behind it, and a step
 *   that is not triggered holds the ones behind it inside its chapter — except in Steel and Bone;
 * - **skipping never locks a chronicle**: a skipped chapter is over, the next one opens, and the
 *   energy it carried is still handed over;
 * - **nothing is stored that can be derived**: the same `completedSteps` plus the same world
 *   always give the same open step.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import type { TutorialChapterDef } from '@content/tutorial/types';
import { stageIdOf, progressKey } from '@engine/campaign/progress';
import { createInstance } from '@engine/champions/instance';
import { createNewGame } from '@engine/save/new-game';
import type { SaveGame } from '@engine/schema/save';
import {
  activeStep,
  chapterStatus,
  conditionHolds,
  emptyTutorialState,
  owedGrants,
  stepSatisfied,
  tutorialFinished,
  tutorialView,
  type TutorialContext,
  type TutorialState,
} from './script';

const NOW = new Date(2026, 8, 16, 9, 0).getTime();
const CHAPTERS = content.tutorialChapters;

function newSave(): SaveGame {
  return createNewGame({ name: 'Chronicler', now: NOW, seedRoot: 'tutorial' });
}

/** A chronicle that has bound its starter — what `chooseStarter` leaves behind. */
function withStarter(): SaveGame {
  const save = newSave();
  const def = content.championById('champ.sister_maelis');
  if (!def) throw new Error('no starter');
  const instance = createInstance(def, { instanceId: 'inst-1', now: NOW, source: 'starter' });
  save.roster[instance.instanceId] = instance;
  return save;
}

function ctx(patch: Partial<TutorialContext> = {}): TutorialContext {
  return {
    save: patch.save === undefined ? newSave() : patch.save,
    screen: patch.screen ?? null,
    dialog: patch.dialog ?? null,
    dialogOpen: patch.dialogOpen ?? patch.dialog !== undefined,
    playerLevel: patch.playerLevel ?? 1,
    battle: patch.battle ?? null,
  };
}

/** A tutorial state with everything up to (not including) `stepId` already taught. */
function upTo(stepId: string): TutorialState {
  const ids = CHAPTERS.flatMap((chapter) => chapter.steps.map((step) => step.id));
  const at = ids.indexOf(stepId);
  expect(at, stepId).toBeGreaterThanOrEqual(0);
  return { completedSteps: ids.slice(0, at), skippedChapters: [] };
}

const chapter = (index: number): TutorialChapterDef => {
  const found = CHAPTERS.find((one) => one.index === index);
  if (!found) throw new Error(`no chapter ${index}`);
  return found;
};

describe('the tutorial script', () => {
  it('opens on the name, before a chronicle exists', () => {
    const fresh = emptyTutorialState();
    // No save, no dialog: Eldric waits.
    expect(activeStep(CHAPTERS, fresh, ctx({ save: null, screen: 'title' }))).toBeNull();
    const step = activeStep(CHAPTERS, fresh, ctx({ save: null, screen: 'title', dialog: 'new-game' }));
    expect(step?.id).toBe('tut.1.1');
    expect(step?.dialogue).toBe('tut.1.1.text');
    // And it is over the moment the starter screen opens.
    expect(stepSatisfied(step!, ctx({ save: null, screen: 'starter' }))).toBe(true);
  });

  it('walks chapter 1 in order, each step waiting for its own trigger', () => {
    // 1.2 follows 1.1 with no trigger of its own, and ends when the binding is done.
    const binding = activeStep(CHAPTERS, upTo('tut.1.2'), ctx({ screen: 'starter' }));
    expect(binding?.id).toBe('tut.1.2');
    expect(stepSatisfied(binding!, ctx({ screen: 'starter' }))).toBe(false);
    expect(stepSatisfied(binding!, ctx({ save: withStarter(), screen: 'hub' }))).toBe(true);
    // 1.3 waits until the player is standing in Emberhold.
    expect(activeStep(CHAPTERS, upTo('tut.1.3'), ctx({ screen: 'starter' }))).toBeNull();
    expect(activeStep(CHAPTERS, upTo('tut.1.3'), ctx({ screen: 'hub' }))?.id).toBe('tut.1.3');
    // 1.6 waits for an ally's turn; 1.7 for one in the second wave.
    const onTurn = ctx({
      screen: 'battle',
      battle: { allyTurn: true, wave: 1, used: [], ready: ['a1', 'a2'], auto: false },
    });
    expect(activeStep(CHAPTERS, upTo('tut.1.6'), onTurn)?.id).toBe('tut.1.6');
    expect(activeStep(CHAPTERS, upTo('tut.1.7'), onTurn)).toBeNull();
    const waveTwo = ctx({
      screen: 'battle',
      battle: { allyTurn: true, wave: 2, used: ['a1'], ready: ['a2'], auto: false },
    });
    expect(activeStep(CHAPTERS, upTo('tut.1.7'), waveTwo)?.id).toBe('tut.1.7');
    expect(stepSatisfied(chapter(1).steps[5]!, waveTwo)).toBe(true);
    expect(stepSatisfied(chapter(1).steps[6]!, waveTwo)).toBe(false);
    // A second-wave turn on a champion with no second ability is not the cooldown lesson's moment.
    const novice = ctx({
      screen: 'battle',
      battle: { allyTurn: true, wave: 2, used: ['a1'], ready: ['a1'], auto: false },
    });
    expect(activeStep(CHAPTERS, upTo('tut.1.7'), novice)).toBeNull();
  });

  it('finishes 1.10 on the third stand, whatever difficulty it fell on', () => {
    const step = chapter(1).steps[9]!;
    expect(step.allow).toBe('all');
    const save = newSave();
    expect(stepSatisfied(step, ctx({ save }))).toBe(false);
    save.campaign.stars[progressKey(stageIdOf(1, 3), 'hard')] = 1;
    expect(stepSatisfied(step, ctx({ save }))).toBe(true);
  });

  it('holds the next chapter until the level that opens it', () => {
    const afterOne = { completedSteps: chapter(1).steps.map((s) => s.id), skippedChapters: [] };
    // The Path follows the Awakening with no wait at all: the missions open at level 1 because
    // they are what guides the player, not a reward for reaching level 6 (the owner's first batch).
    expect(chapterStatus(chapter(2), afterOne, ctx({ playerLevel: 1 }))).toBe('open');
    expect(activeStep(CHAPTERS, afterOne, ctx({ playerLevel: 1, screen: 'hub' }))?.id).toBe('tut.2.1');
    // The Hold behind it still waits for the Tavern at level 2.
    const afterPath = upTo('tut.3.1');
    expect(chapterStatus(chapter(3), afterPath, ctx({ playerLevel: 1 }))).toBe('locked');
    expect(activeStep(CHAPTERS, afterPath, ctx({ playerLevel: 1, screen: 'hub' }))).toBeNull();
    expect(chapterStatus(chapter(3), afterPath, ctx({ playerLevel: 2 }))).toBe('open');
    expect(activeStep(CHAPTERS, afterPath, ctx({ playerLevel: 2, screen: 'hub' }))?.id).toBe('tut.3.1');
    // The Hold's gear lesson follows the Tavern's with no wait of its own: gear is equippable
    // from level 1 (the owner's third batch), so the chapter teaches both in one sitting.
    expect(activeStep(CHAPTERS, upTo('tut.3.5'), ctx({ playerLevel: 2, screen: 'hub' }))?.id).toBe('tut.3.5');
  });

  it('teaches one thing at a time: an unfinished chapter holds the ones behind it', () => {
    // Level 6 and the Hold still half-walked: Routine's lesson waits its turn, open though it is.
    const state = upTo('tut.3.5');
    expect(activeStep(CHAPTERS, state, ctx({ playerLevel: 6, screen: 'quests' }))).toBeNull();
    expect(chapterStatus(chapter(5), state, ctx({ playerLevel: 6 }))).toBe('open');
  });

  it('teaches the Mine at level 6, after the chest: on the hub, then inside, then the level below', () => {
    const state = upTo('tut.5.4');
    // Level 5 has the board and the chest, but not the Mine: Routine waits on the hub.
    expect(activeStep(CHAPTERS, state, ctx({ playerLevel: 5, screen: 'hub' }))).toBeNull();
    // At 6 the lesson opens on the hub, or already inside the Mine if the player went in first.
    expect(activeStep(CHAPTERS, state, ctx({ playerLevel: 6, screen: 'hub' }))?.id).toBe('tut.5.4');
    expect(activeStep(CHAPTERS, state, ctx({ playerLevel: 6, dialog: 'mine' }))?.id).toBe('tut.5.4');
    // The first collection is what finishes it — the store is full the moment the Mine opens.
    const collected = withStarter();
    collected.stats['mine.collections'] = 1;
    const step = CHAPTERS.flatMap((one) => one.steps).find((one) => one.id === 'tut.5.4');
    if (!step) throw new Error('no Mine lesson');
    expect(stepSatisfied(step, ctx({ save: collected, playerLevel: 6, dialog: 'mine' }))).toBe(true);
    expect(stepSatisfied(step, ctx({ save: withStarter(), playerLevel: 6, dialog: 'mine' }))).toBe(false);
    // Then, still inside, the level below it — read rather than done.
    const next = upTo('tut.5.5');
    expect(activeStep(CHAPTERS, next, ctx({ playerLevel: 6, dialog: 'mine' }))?.id).toBe('tut.5.5');
    expect(activeStep(CHAPTERS, next, ctx({ playerLevel: 6, screen: 'hub' }))).toBeNull();
  });

  it("lets Steel and Bone's lessons stand alone", () => {
    const state: TutorialState = {
      completedSteps: CHAPTERS.slice(0, 5).flatMap((one) => one.steps.map((step) => step.id)),
      skippedChapters: [],
    };
    // Level 8 in the Forge: the Forge lesson opens although the rank-up one is still unread.
    expect(activeStep(CHAPTERS, state, ctx({ playerLevel: 8, screen: 'forge' }))?.id).toBe('tut.6.2');
    // Back at the Tavern, the rank-up lesson is the one waiting.
    expect(activeStep(CHAPTERS, state, ctx({ playerLevel: 8, screen: 'tavern' }))?.id).toBe('tut.6.1');
    // Nowhere in particular: nothing to say.
    expect(activeStep(CHAPTERS, state, ctx({ playerLevel: 8, screen: 'hub' }))).toBeNull();
  });

  it('skips a chapter without leaving the game locked, and still pays what it carried', () => {
    const afterOne = { completedSteps: chapter(1).steps.map((s) => s.id), skippedChapters: [] };
    const skipped: TutorialState = {
      completedSteps: [...afterOne.completedSteps, ...chapter(2).steps.map((s) => s.id)],
      skippedChapters: ['tut.the_hold'],
    };
    expect(chapterStatus(chapter(3), skipped, ctx({ playerLevel: 3 }))).toBe('skipped');
    // The Binding is next in line the moment its level arrives.
    expect(activeStep(CHAPTERS, skipped, ctx({ playerLevel: 4, screen: 'hub' }))?.id).toBe('tut.4.1');
    // The Hold's 250 energy is still owed, and the id is what keeps it to once.
    const ids = owedGrants(CHAPTERS, skipped, ctx({ playerLevel: 4, screen: 'hub' })).map((g) => g.id);
    expect(ids).toContain('tutorial.the_hold');
    expect(ids).toContain('tutorial.gift.ancient_shard');
    expect(ids.filter((id) => id === 'tutorial.the_hold')).toHaveLength(1);
  });

  it('owes a step’s grant as it opens, and every earlier one', () => {
    const fresh = emptyTutorialState();
    expect(owedGrants(CHAPTERS, fresh, ctx({ save: null, dialog: 'new-game' }))).toEqual([]);
    // 1.11 is the Provisions step: the energy is owed while Eldric is still naming it.
    const owed = owedGrants(CHAPTERS, upTo('tut.1.11'), ctx({ screen: 'hub' }));
    expect(owed.map((grant) => grant.id)).toEqual(['tutorial.awakening']);
    expect(owed[0]?.currencies).toEqual([{ currency: 'energy', amount: 500 }]);
  });

  it('is finished only when every chapter is walked or waved off', () => {
    const all = CHAPTERS.flatMap((one) => one.steps.map((step) => step.id));
    expect(tutorialFinished(CHAPTERS, emptyTutorialState())).toBe(false);
    expect(tutorialFinished(CHAPTERS, { completedSteps: all, skippedChapters: [] })).toBe(true);
    expect(
      tutorialFinished(CHAPTERS, {
        completedSteps: chapter(1).steps.map((s) => s.id),
        skippedChapters: CHAPTERS.slice(1).map((one) => one.id),
      }),
    ).toBe(true);
  });

  it('reads every condition kind off the world, and never answers for the overlay', () => {
    const save = withStarter();
    expect(conditionHolds({ type: 'starter_bound' }, ctx({ save: null }))).toBe(false);
    expect(conditionHolds({ type: 'starter_bound' }, ctx({ save: newSave() }))).toBe(false);
    expect(conditionHolds({ type: 'starter_bound' }, ctx({ save }))).toBe(true);
    expect(conditionHolds({ type: 'counter', key: 'gear.levels', count: 1 }, ctx({ save }))).toBe(false);
    save.stats['gear.levels'] = 1;
    expect(conditionHolds({ type: 'counter', key: 'gear.levels', count: 1 }, ctx({ save }))).toBe(true);
    const worn = Object.values(save.roster)[0];
    expect(conditionHolds({ type: 'gear_worn', slot: 'weapon' }, ctx({ save }))).toBe(false);
    expect(worn).toBeDefined();
    if (worn) worn.gear.weapon = 'gear-1';
    expect(conditionHolds({ type: 'gear_worn', slot: 'weapon' }, ctx({ save }))).toBe(true);
    expect(conditionHolds({ type: 'dialog', dialog: 'gear-picker' }, ctx({ dialog: 'gear-picker' }))).toBe(
      true,
    );
    expect(
      conditionHolds(
        {
          type: 'all',
          of: [
            { type: 'feature', feature: 'gear' },
            { type: 'screen', screen: 'hub' },
          ],
        },
        ctx({ playerLevel: 3, screen: 'hub' }),
      ),
    ).toBe(true);
    expect(
      conditionHolds(
        {
          type: 'any',
          of: [
            { type: 'screen', screen: 'hub' },
            { type: 'screen', screen: 'campaign' },
          ],
        },
        ctx({ screen: 'campaign' }),
      ),
    ).toBe(true);
    expect(
      conditionHolds(
        { type: 'auto_battle' },
        ctx({ battle: { allyTurn: false, wave: 1, used: [], ready: [], auto: true } }),
      ),
    ).toBe(true);
    // The overlay's own two answers are never satisfied by the world.
    expect(conditionHolds({ type: 'acknowledged' }, ctx({ screen: 'hub' }))).toBe(false);
    expect(conditionHolds({ type: 'clicked' }, ctx({ screen: 'hub' }))).toBe(false);
  });

  it('waits while the game is asking its own question', () => {
    // A dialog the lesson does not name — the Welcome Back report, a level-up — keeps Eldric
    // quiet, because a lesson holds the screen while it speaks and the player could not answer it.
    const hub = ctx({ screen: 'hub' });
    expect(activeStep(CHAPTERS, upTo('tut.1.3'), hub)?.id).toBe('tut.1.3');
    expect(activeStep(CHAPTERS, upTo('tut.1.3'), { ...hub, dialogOpen: true, dialog: null })).toBeNull();
    // A lesson that names the dialog it is taught in is the exception.
    const picker = ctx({ screen: 'champions', dialog: 'gear-picker' });
    expect(activeStep(CHAPTERS, upTo('tut.3.7'), { ...picker, playerLevel: 3 })?.id).toBe('tut.3.7');
  });

  it('counts the lesson for the overlay’s label', () => {
    const view = tutorialView(CHAPTERS, upTo('tut.1.3'), ctx({ screen: 'hub' }));
    expect(view?.number).toBe(3);
    expect(view?.count).toBe(11);
    expect(view?.skippable).toBe(false);
    expect(view?.chapter.name).toBe('tut.chapter.awakening.name');
  });
});
