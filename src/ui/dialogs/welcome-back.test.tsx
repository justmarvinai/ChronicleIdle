/**
 * The welcome-back panel (docs/tech/UI_DESIGN.md §5.1): what the time away brought. The Mine is
 * derived rather than applied on load, so the panel reads its store from the save itself.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { mineLevel } from '@engine/mine/index';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { WelcomeBackDialog } from './WelcomeBackDialog';

vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));

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

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

function awayAt(level: number): void {
  const { actions } = useGameStore.getState();
  actions.resetGame();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  act(() => {
    useGameStore.setState((state) => {
      if (state.save) state.save.profile.level = level;
      state.lastOffline = {
        elapsedMs: 9 * 3_600_000,
        energyGained: 120,
        newDay: false,
        newWeek: false,
        bossTributes: [],
        questsRolled: [],
      };
      return state;
    });
  });
}

describe('the welcome-back panel', () => {
  beforeEach(() => awayAt(6));

  it('says what the Mine has waiting, and that its store is full', () => {
    render(stage(<WelcomeBackDialog onClose={() => undefined} />));
    const line = screen.getByTestId('welcome-mine');
    expect(line).toHaveTextContent('its store is full');
    expect(line).toHaveTextContent(String(mineLevel(1).storeGems));
  });

  it('says nothing of a Mine the chronicle has not reached', () => {
    awayAt(5);
    render(stage(<WelcomeBackDialog onClose={() => undefined} />));
    expect(screen.queryByTestId('welcome-mine')).toBeNull();
  });
});
