/**
 * The tutorial overlay (docs/tech/UI_DESIGN.md §5.18, ROADMAP Phase 14 acceptance): Eldric speaks,
 * the player answers, and the lesson is recorded. What the tests pin down is the two-beat rule —
 * nothing about the world is watched until the line has been read — and that skipping a chapter
 * takes the overlay off the screen without leaving the chronicle stuck.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { TUTORIAL_SPOTLIGHT_PAD } from '@content/balance/tutorial';
import { content } from '@content/registry';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { TutorialOverlay } from './TutorialOverlay';

vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

function stage(children: ReactNode) {
  return (
    <ViewportContext.Provider
      value={{
        scale: 1,
        windowWidth: VIRTUAL_WIDTH,
        windowHeight: VIRTUAL_HEIGHT,
        offsetX: 0,
        offsetY: 0,
        backdrop: null,
        setBackdrop: () => undefined,
      }}
    >
      {children}
    </ViewportContext.Provider>
  );
}

const actions = () => useGameStore.getState().actions;

/** Continue arms a beat after a lesson opens, so a held-over click cannot answer two lessons. */
async function pressContinue(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const button = await screen.findByTestId('tutorial-continue');
  await waitFor(() => expect(button).toBeEnabled());
  await user.click(button);
}
const save = () => useGameStore.getState().save;
const tutorial = () => save()?.tutorial ?? { completedSteps: [], skippedChapters: [] };

/** Everything up to (not including) `stepId` taught, and the player standing on `screen`. */
function walkTo(stepId: string, screen: Parameters<ReturnType<typeof actions>['resetStack']>[0]): void {
  const ids = content.tutorialSteps.map((step) => step.id);
  act(() => {
    const a = actions();
    a.resetGame();
    a.newGame('Marvin');
    a.chooseStarter('champ.ser_corvin');
    for (const id of ids.slice(0, ids.indexOf(stepId))) a.completeTutorialStep(id);
    a.resetStack(screen);
  });
}

/** Lays the elements with these test ids out at these boxes; everything else is not laid out. */
function layOut(boxes: Record<string, { x: number; y: number; width: number; height: number }>): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const box = boxes[this.dataset['testid'] ?? ''] ?? { x: 0, y: 0, width: 0, height: 0 };
    return {
      ...box,
      left: box.x,
      top: box.y,
      right: box.x + box.width,
      bottom: box.y + box.height,
      toJSON: () => ({}),
    };
  });
}

describe('the tutorial overlay', () => {
  beforeEach(() => {
    act(() => actions().resetGame());
  });
  afterEach(() => vi.restoreAllMocks());

  it('speaks the lesson, then waits for the player to do the thing', async () => {
    const user = userEvent.setup();
    // 1.3 — "To the crossing!": triggered on the hub, finished by the campaign map opening.
    walkTo('tut.1.3', { name: 'hub' });
    render(stage(<TutorialOverlay />));
    const overlay = await screen.findByTestId('tutorial-overlay');
    expect(overlay.dataset['step']).toBe('tut.1.3');
    expect(overlay.dataset['phase']).toBe('dialogue');
    expect(screen.getByTestId('tutorial-lesson')).toHaveTextContent('Lesson 3 of 11');
    // Clicking the panel reveals the whole line rather than waiting it out.
    await user.click(screen.getByTestId('tutorial-line'));
    expect(screen.getByTestId('tutorial-line')).toHaveTextContent('The Eclipse took Thornwood first');

    // The world is not watched while the line is being read: arriving early proves nothing.
    await act(async () => {
      actions().push({ name: 'campaign' });
    });
    expect(tutorial().completedSteps).not.toContain('tut.1.3');

    // Back to the hub, read the line, and then the same arrival records the lesson.
    await act(async () => {
      actions().resetStack({ name: 'hub' });
    });
    await pressContinue(user);
    expect(screen.getByTestId('tutorial-overlay').dataset['phase']).toBe('action');
    expect(screen.getByTestId('tutorial-hint')).toBeInTheDocument();
    await act(async () => {
      actions().push({ name: 'campaign' });
    });
    expect(tutorial().completedSteps).toContain('tut.1.3');
  });

  it('finishes a step that only asks to be read, on the Continue press', async () => {
    const user = userEvent.setup();
    // 1.9 — the victory panel: one dialogue, one Continue.
    walkTo('tut.1.9', { name: 'battle-result' });
    render(stage(<TutorialOverlay />));
    await pressContinue(user);
    expect(tutorial().completedSteps).toContain('tut.1.9');
  });

  it('lights what a line that only asks to be read names, and holds the screen until Continue', async () => {
    const user = userEvent.setup();
    // 1.9 names the stars in the result's crest and the spoils beside the team.
    walkTo('tut.1.9', { name: 'battle-result' });
    layOut({
      'result-stars': { x: 790, y: 236, width: 340, height: 56 },
      'result-rewards': { x: 1080, y: 300, width: 760, height: 650 },
    });
    render(
      stage(
        <>
          <div data-testid="result-stars" />
          <div data-testid="result-rewards" />
          <TutorialOverlay />
        </>,
      ),
    );

    // Both are ringed while he speaks — no pointer, since there is nothing to press but Continue.
    const marks = await screen.findAllByTestId('tutorial-mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]).toHaveStyle({ left: `${790 - TUTORIAL_SPOTLIGHT_PAD}px` });
    expect(screen.getByTestId('tutorial-overlay').dataset['phase']).toBe('dialogue');
    expect(screen.queryByTestId('tutorial-spotlight')).toBeNull();
    // They are cut out of the dim to be seen, and the clear layer over them keeps them unpressable.
    expect(screen.getByTestId('tutorial-hold')).toBeInTheDocument();

    await pressContinue(user);
    expect(tutorial().completedSteps).toContain('tut.1.9');
    await waitFor(() => expect(screen.queryByTestId('tutorial-mark')).toBeNull());
  });

  it('lights nothing while a lesson with an action is spoken: the ring waits for the action', async () => {
    // 1.3 points at the campaign gate, but only once the line is read.
    walkTo('tut.1.3', { name: 'hub' });
    layOut({ 'hotspot-campaign': { x: 200, y: 400, width: 180, height: 120 } });
    render(
      stage(
        <>
          <div data-testid="hotspot-campaign" />
          <TutorialOverlay />
        </>,
      ),
    );
    await screen.findByTestId('tutorial-overlay');
    expect(screen.queryByTestId('tutorial-mark')).toBeNull();
    expect(screen.queryByTestId('tutorial-hold')).toBeNull();
    expect(await screen.findByTestId('tutorial-continue')).toBeInTheDocument();
  });

  it('moves its strip to the top when the thing to press stands where the strip would', async () => {
    const user = userEvent.setup();
    // 4.2 — the Portal's presses stand under the gate, low on the screen, not in a bottom bar.
    walkTo('tut.4.2', { name: 'portal' });
    act(() => {
      useGameStore.setState((state) => {
        if (state.save) state.save.profile.level = 4;
        return state;
      });
    });
    layOut({
      'portal-shard-ancient': { x: 24, y: 276, width: 348, height: 124 },
      'portal-summon-1': { x: 600, y: 800, width: 300, height: 84 },
    });
    render(
      stage(
        <>
          <div data-testid="portal-shard-ancient" />
          <div data-testid="portal-summon-1" />
          <TutorialOverlay />
        </>,
      ),
    );
    await pressContinue(user);
    const hint = await screen.findByTestId('tutorial-hint');
    // The cut-outs are measured once the lesson turns to its action.
    await waitFor(() => expect(hint).toHaveAttribute('data-dock', 'top'));
  });

  it('keeps its strip above the bottom bar when the lesson points elsewhere', async () => {
    const user = userEvent.setup();
    walkTo('tut.1.3', { name: 'hub' });
    layOut({ 'hotspot-campaign': { x: 200, y: 400, width: 180, height: 120 } });
    render(
      stage(
        <>
          <div data-testid="hotspot-campaign" />
          <TutorialOverlay />
        </>,
      ),
    );
    await pressContinue(user);
    expect(await screen.findByTestId('tutorial-hint')).toHaveAttribute('data-dock', 'bottom');
  });

  it('hands over the Provisions as Eldric names them, once', async () => {
    walkTo('tut.1.11', { name: 'hub' });
    render(stage(<TutorialOverlay />));
    await screen.findByTestId('tutorial-overlay');
    expect(save()?.provisionsClaimed).toEqual(['tutorial.awakening']);
    const energy = save()?.energy.value ?? 0;
    // Re-rendering the overlay must not pay a second time.
    await act(async () => {
      actions().push({ name: 'campaign' });
    });
    expect(save()?.energy.value).toBe(energy);
    expect(save()?.provisionsClaimed).toEqual(['tutorial.awakening']);
  });

  it('cannot be skipped in the first chapter, and is skipped whole in the later ones', async () => {
    const user = userEvent.setup();
    walkTo('tut.1.3', { name: 'hub' });
    render(stage(<TutorialOverlay />));
    await screen.findByTestId('tutorial-overlay');
    expect(screen.queryByTestId('tutorial-skip')).toBeNull();

    // Chapter 2 — the Path — opens at level 1 with everything else still shut, so the skip is
    // there, it ends that chapter, and nothing steps up behind it.
    act(() => {
      const a = actions();
      for (const step of content.tutorialChapters[0]?.steps ?? []) a.completeTutorialStep(step.id);
      a.resetStack({ name: 'hub' });
    });
    expect((await screen.findByTestId('tutorial-overlay')).dataset['step']).toBe('tut.2.1');
    await user.click(screen.getByTestId('tutorial-skip'));
    expect(tutorial().skippedChapters).toEqual(['tut.the_path']);
    // The panel fades out, so it leaves the DOM a beat later.
    await waitFor(() => expect(screen.queryByTestId('tutorial-overlay')).toBeNull());
    // Skipping cost nothing: the chapter's own Provision is still handed over.
    expect(save()?.provisionsClaimed).toContain('tutorial.the_path');
  });

  it('says nothing once every chapter is walked or waved off', async () => {
    act(() => {
      const a = actions();
      a.resetGame();
      a.newGame('Marvin');
      a.chooseStarter('champ.ser_corvin');
      for (const step of content.tutorialChapters[0]?.steps ?? []) a.completeTutorialStep(step.id);
      for (const chapter of content.tutorialChapters.slice(1)) a.skipTutorialChapter(chapter.id);
      a.resetStack({ name: 'hub' });
    });
    render(stage(<TutorialOverlay />));
    expect(screen.queryByTestId('tutorial-overlay')).toBeNull();
  });
});
