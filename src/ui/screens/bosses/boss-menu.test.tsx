/**
 * The Bosses menu (docs/tech/UI_DESIGN.md §5.13a): two cards, each the boss's own, each carrying
 * its own gate. The gate's rules live in `state/bosses.test.ts`; this is what a player sees one
 * click behind Battle → Bosses.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import BossMenuScreen from './BossMenuScreen';

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

/** A chronicle at `level`, which is the only thing either gate asks for. */
function chronicler(level: number): void {
  document.documentElement.dataset['reducedMotion'] = 'true';
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (state.save) state.save.profile.level = level;
    return state;
  });
}

const MENU = { name: 'boss-menu' } as const;

describe('the Bosses menu', () => {
  beforeEach(() => chronicler(20));

  it('gives each boss its own card, by name', () => {
    render(stage(<BossMenuScreen route={MENU} />));

    expect(screen.getByTestId('screen-boss-menu')).toBeInTheDocument();
    // Neither card says "daily" or "weekly": the cadence is a line, the name is the headline.
    expect(screen.getByTestId('mode-daily')).toHaveTextContent('Gargoyle');
    expect(screen.getByTestId('mode-daily')).toHaveTextContent('Two keys every day');
    expect(screen.getByTestId('mode-weekly')).toHaveTextContent('Titan');
    expect(screen.getByTestId('mode-weekly')).toHaveTextContent('Three keys every week');
    expect(screen.queryByText(/Daily Boss|Weekly Boss/)).not.toBeInTheDocument();
  });

  it('reports the keys each gate is holding', () => {
    render(stage(<BossMenuScreen route={MENU} />));

    expect(screen.getByTestId('note-daily')).toHaveTextContent('2 of 2 keys left');
    expect(screen.getByTestId('note-weekly')).toHaveTextContent('3 of 3 keys left');
  });

  it('walks to the gate of the boss that was pressed', async () => {
    const user = userEvent.setup();
    render(stage(<BossMenuScreen route={MENU} />));

    await user.click(screen.getByTestId('enter-weekly'));
    expect(useGameStore.getState().ui.stack.at(-1)).toEqual({ name: 'bosses', boss: 'boss.titan' });
  });

  it('keeps the Titan shut until its own level, and says so on its card', async () => {
    const user = userEvent.setup();
    chronicler(10);
    render(stage(<BossMenuScreen route={MENU} />));

    expect(screen.getByTestId('enter-daily')).toHaveTextContent('Enter');
    expect(screen.getByTestId('enter-weekly')).toHaveTextContent('Unlocks at level 15');
    // A shut gate reports no keys, because a number nobody can spend is not worth printing.
    expect(screen.queryByTestId('note-weekly')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('enter-weekly'));
    expect(useGameStore.getState().ui.stack.at(-1)).toMatchObject({
      name: 'locked',
      feature: 'weekly_boss',
    });
  });
});
