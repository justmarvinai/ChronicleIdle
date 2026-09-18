/**
 * The Eternal Tower screen (docs/tech/UI_DESIGN.md §5.13a): what the standing panel says, what the
 * ladder shows per floor, and which presses a key may be spent on. The arithmetic is tested in
 * `state/tower.test.ts`; these are the flows a player's hands actually take.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { STAGES_PER_SETTLEMENT, SETTLEMENT_COUNT } from '@content/balance/campaign';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import TowerScreen from './TowerScreen';

vi.mock('@render/ambient/AmbientLayer', () => ({ AmbientLayer: () => null }));
vi.mock('@ui/hooks/useSceneAudio', () => ({ useSceneAudio: () => undefined }));
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

const TOWER = { name: 'tower' } as const;
const save = () => {
  const current = useGameStore.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};
const actions = () => useGameStore.getState().actions;

/** A chronicle with the whole Intro campaign behind it — the only thing the tower asks for. */
function climber(): void {
  const a = actions();
  a.resetGame();
  a.newGame('Chronicler');
  a.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (state.save) {
      state.save.seedRoot = 'test-seed';
      state.save.profile.level = 40;
      for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
        for (let stand = 1; stand <= STAGES_PER_SETTLEMENT; stand += 1)
          state.save.campaign.stars[progressKey(stageIdOf(settlement, stand), 'intro')] = 3;
    }
    return state;
  });
}

/** Moves the climb, as clearing those floors would. */
function climbed(highestFloor: number): void {
  act(() => {
    useGameStore.setState((state) => {
      if (state.save)
        state.save.tower = {
          ...state.save.tower,
          firstAttemptAt: Date.now(),
          highestFloor,
          bestFloor: highestFloor,
        };
      return state;
    });
  });
}

/** Leaves the chronicle without a key to its name. */
function keysSpent(): void {
  act(() => {
    useGameStore.setState((state) => {
      if (state.save) state.save.tower.keys = { value: 0, lastTickAt: Date.now() };
      return state;
    });
  });
}

describe('the climb', () => {
  beforeEach(() => climber());

  it('opens on the first floor with a full ring of keys and no season yet', () => {
    render(stage(<TowerScreen route={TOWER} />));

    expect(screen.getByTestId('screen-tower')).toBeInTheDocument();
    expect(screen.getByTestId('tower-season')).toHaveTextContent('Not begun');
    expect(screen.getByTestId('tower-resets')).toHaveTextContent('—');
    expect(screen.getByTestId('tower-climb')).toHaveTextContent('0 of 100');
    expect(screen.getByTestId('tower-best')).toHaveTextContent('0');
    expect(screen.getByTestId('tower-keys')).toHaveTextContent('10 / 10');
    expect(screen.getByTestId('tower-key-next')).toHaveTextContent('Full');
    expect(screen.getByTestId('tower-climb-next')).toHaveTextContent('Climb floor 1');
  });

  it('draws a hundred rungs: one open, the rest sealed, every tenth a boss floor', () => {
    render(stage(<TowerScreen route={TOWER} />));

    expect(screen.getByTestId('tower-floor-1')).toHaveAttribute('data-state', 'next');
    expect(screen.getByTestId('tower-floor-2')).toHaveAttribute('data-state', 'locked');
    expect(screen.getByTestId('tower-floor-100')).toHaveAttribute('data-state', 'locked');
    // The owner's table, on the ladder itself.
    expect(screen.getByTestId('tower-odds-10')).toHaveTextContent('Ancient 0.1 %');
    expect(screen.getByTestId('tower-odds-50')).toHaveTextContent('Ancient 1 % · Sacred 0.05 %');
    expect(screen.getByTestId('tower-odds-100')).toHaveTextContent('Ancient 5 % · Sacred 0.65 %');
    expect(screen.queryByTestId('tower-odds-11')).not.toBeInTheDocument();
    // Only the floor a key may open carries a button.
    expect(screen.getByTestId('tower-fight-1')).toBeEnabled();
    expect(screen.queryByTestId('tower-fight-2')).not.toBeInTheDocument();
  });

  it('sends the open floor to battle setup, and costs nothing until the fight starts', async () => {
    const user = userEvent.setup();
    render(stage(<TowerScreen route={TOWER} />));

    await user.click(screen.getByTestId('tower-climb-next'));
    // The press picks a team first; `launchTowerFloor` charges the key when the fight starts, so a
    // player who backs out of the setup screen still has it (ETERNAL_TOWER.md §6).
    expect(useGameStore.getState().ui.stack.at(-1)).toEqual({
      name: 'battle-setup',
      encounterId: 'encounter.tower.001',
    });
    expect(save().tower.keys.value).toBe(10);
    expect(save().tower.firstAttemptAt).toBe(0);
  });

  it('sends a repeatable boss floor to its own encounter, not to the next floor', async () => {
    const user = userEvent.setup();
    climbed(12);
    render(stage(<TowerScreen route={TOWER} />));

    await user.click(screen.getByTestId('tower-fight-10'));
    expect(useGameStore.getState().ui.stack.at(-1)).toEqual({
      name: 'battle-setup',
      encounterId: 'encounter.tower.010',
    });
  });

  it('offers the boss floors behind the climb again, and nothing else', () => {
    climbed(12);
    render(stage(<TowerScreen route={TOWER} />));

    expect(screen.getByTestId('tower-climb')).toHaveTextContent('12 of 100');
    expect(screen.getByTestId('tower-best')).toHaveTextContent('12');
    expect(screen.getByTestId('tower-floor-10')).toHaveAttribute('data-state', 'repeatable');
    expect(screen.getByTestId('tower-floor-11')).toHaveAttribute('data-state', 'cleared');
    expect(screen.getByTestId('tower-floor-13')).toHaveAttribute('data-state', 'next');
    expect(screen.getByTestId('tower-fight-10')).toBeEnabled();
    expect(screen.queryByTestId('tower-fight-11')).not.toBeInTheDocument();
    expect(screen.getByTestId('tower-season')).toHaveTextContent('No. 1');
  });

  it('cannot be climbed without a key, and says so on every button', () => {
    keysSpent();
    render(stage(<TowerScreen route={TOWER} />));

    expect(screen.getByTestId('tower-keys')).toHaveTextContent('0 / 10');
    expect(screen.getByTestId('tower-key-next')).toHaveTextContent('Next in');
    expect(screen.getByTestId('tower-climb-next')).toBeDisabled();
    expect(screen.getByTestId('tower-fight-1')).toBeDisabled();
  });

  it('has nothing left to climb at the top of the tower', () => {
    climbed(100);
    render(stage(<TowerScreen route={TOWER} />));

    expect(screen.getByTestId('tower-topped')).toHaveTextContent('begins again when the season turns');
    expect(screen.queryByTestId('tower-climb-next')).not.toBeInTheDocument();
    // The boss floors are still worth a key, which is the point of them.
    expect(screen.getByTestId('tower-fight-100')).toBeEnabled();
    expect(screen.getByTestId('tower-floor-99')).toHaveAttribute('data-state', 'cleared');
  });
});
