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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
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

describe('the tutorial overlay', () => {
  beforeEach(() => {
    act(() => actions().resetGame());
  });

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
