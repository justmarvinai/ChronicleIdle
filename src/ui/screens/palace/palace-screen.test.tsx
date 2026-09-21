/**
 * The Glorious Palace screen (docs/tech/UI_DESIGN.md §5.22): what the ledger says, what a node
 * does when it is pressed, and what the tree looks like around it afterwards.
 *
 * The arithmetic lives in `state/palace.test.ts` and the geometry in `palace-view.test.ts`; these
 * are the presses a player's hands make.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { PALACE_TREE_COST } from '@content/balance/palace';
import { PALACE_CORE_ID } from '@content/palace/index';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import PalaceScreen from './PalaceScreen';

vi.mock('@render/ambient/AmbientLayer', () => ({ AmbientLayer: () => null }));
vi.mock('@ui/hooks/useSceneAudio', () => ({ useSceneAudio: () => undefined }));
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

const PALACE = { name: 'palace' } as const;
const VALOR_1 = 'palace.valor.r1.0';
const save = () => {
  const current = useGameStore.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};

/**
 * A chronicle with `points` earned and nothing spent.
 *
 * Reduced motion is on: the points counter eases towards its new value, and a test that pressed a
 * node would otherwise read the number mid-tween.
 */
function chronicler(points: number): void {
  document.documentElement.dataset['reducedMotion'] = 'true';
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (state.save) state.save.palace.earned = points;
    return state;
  });
}

const node = (id: string) => screen.getByTestId(`palace-node-${id}`);

describe('the Glorious Palace', () => {
  beforeEach(() => chronicler(6));

  it('opens on the whole tree with the points still to spend', () => {
    render(stage(<PalaceScreen route={PALACE} />));

    expect(screen.getByTestId('screen-palace')).toBeInTheDocument();
    expect(screen.getByTestId('palace-available')).toHaveTextContent('6');
    expect(screen.getByTestId('palace-spent')).toHaveTextContent(`0 of ${PALACE_TREE_COST} spent`);
    expect(screen.getByTestId('palace-nodes-lit')).toHaveTextContent('0 of 133 nodes lit');
    // Every branch is drawn, and every one of them is untouched.
    for (const element of ['justice', 'valor', 'faith', 'eclipse'])
      expect(screen.getByTestId(`palace-branch-${element}`)).toHaveTextContent('0/59');
  });

  it('offers the core first and nothing beyond it', () => {
    render(stage(<PalaceScreen route={PALACE} />));

    expect(node(PALACE_CORE_ID)).toHaveAttribute('data-state', 'ready');
    expect(node(VALOR_1)).toHaveAttribute('data-state', 'unreachable');
    // A node nothing leads to is not a tab stop: there are 133 of them.
    expect(node(VALOR_1)).toHaveAttribute('tabindex', '-1');
  });

  it('lights a node when it is pressed, and takes the points for it', async () => {
    const user = userEvent.setup();
    render(stage(<PalaceScreen route={PALACE} />));

    await user.click(node(PALACE_CORE_ID));
    expect(node(PALACE_CORE_ID)).toHaveAttribute('data-state', 'owned');
    expect(save().palace.nodes).toEqual([PALACE_CORE_ID]);
    expect(screen.getByTestId('palace-spent')).toHaveTextContent(`1 of ${PALACE_TREE_COST} spent`);
    expect(screen.getByTestId('palace-nodes-lit')).toHaveTextContent('1 of 133 nodes lit');
    // The core opens the first ring of all four branches.
    expect(node(VALOR_1)).toHaveAttribute('data-state', 'ready');

    await user.click(node(VALOR_1));
    expect(save().palace.nodes).toEqual([PALACE_CORE_ID, VALOR_1]);
    expect(screen.getByTestId('palace-branch-valor')).toHaveTextContent('1/59');
  });

  it('says what the tree is worth as it is bought', async () => {
    const user = userEvent.setup();
    render(stage(<PalaceScreen route={PALACE} />));

    expect(screen.getByText('Nothing yet — spend a point to light the Heart.')).toBeInTheDocument();
    await user.click(node(PALACE_CORE_ID));
    await user.click(node(VALOR_1));

    expect(screen.getByTestId('palace-gains')).toHaveTextContent('+1% HP to every champion you own.');
    expect(screen.getByTestId('palace-gain-valor')).toHaveTextContent('+50 HP');
    expect(screen.queryByTestId('palace-gain-faith')).not.toBeInTheDocument();
  });

  it('refuses a node the points do not cover, and leaves the tree as it was', async () => {
    const user = userEvent.setup();
    chronicler(1);
    render(stage(<PalaceScreen route={PALACE} />));

    await user.click(node(PALACE_CORE_ID));
    expect(node(VALOR_1)).toHaveAttribute('data-state', 'tooShort');
    await user.click(node(VALOR_1));
    expect(save().palace.nodes).toEqual([PALACE_CORE_ID]);
    expect(screen.getByTestId('palace-available')).toHaveTextContent('0');
  });

  it('opens the reclaim dialog only once something is spent', async () => {
    const user = userEvent.setup();
    render(stage(<PalaceScreen route={PALACE} />));

    expect(screen.getByTestId('palace-reset')).toBeDisabled();
    await user.click(node(PALACE_CORE_ID));
    expect(screen.getByTestId('palace-reset')).toBeEnabled();

    await user.click(screen.getByTestId('palace-reset'));
    expect(useGameStore.getState().ui.dialog).toEqual({ name: 'palace-reset' });
  });
});
