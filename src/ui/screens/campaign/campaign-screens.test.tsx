import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import CampaignScreen from './CampaignScreen';
import SettlementScreen from '@ui/screens/settlement/SettlementScreen';

// The ambient Pixi layer and the audio runtime need a GPU and an AudioContext; the screens under
// test are DOM.
vi.mock('@render/ambient/AmbientLayer', () => ({ AmbientLayer: () => null }));
vi.mock('@ui/hooks/useSceneAudio', () => ({ useSceneAudio: () => undefined }));
vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));

/** The screens read the viewport for parallax; a fixed 1:1 stage is enough for the DOM. */
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

const MAP = { name: 'campaign' } as const;
const THORNWOOD = { name: 'settlement', settlement: 1 } as const;

function chronicle(): void {
  const { actions } = useGameStore.getState();
  actions.resetGame();
  actions.newGame('Tester');
  // A new chronicle seeds itself from the clock, so anything rolled would differ run to run.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  actions.chooseStarter('champ.ser_corvin');
}

describe('campaign map', () => {
  beforeEach(chronicle);

  it('shows twelve settlements with only the first open, and enters it', async () => {
    const user = userEvent.setup();
    render(stage(<CampaignScreen route={MAP} />));
    expect(screen.getByTestId('campaign-map').children).toHaveLength(12);
    expect(screen.getByTestId('campaign-stars')).toHaveTextContent('0 / 360');
    expect(screen.getByTestId('settlement-1')).toHaveTextContent('Thornwood Crossing');
    expect(screen.getByTestId('settlement-1')).toHaveTextContent('You are here');
    // Settlement 2 is chained to Thornwood's boss and has no Enter button at all.
    expect(screen.getByTestId('settlement-2')).toHaveTextContent('Beat the boss of Thornwood Crossing');
    expect(screen.queryByTestId('enter-2')).toBeNull();

    await user.click(screen.getByTestId('enter-1'));
    const stack = useGameStore.getState().ui.stack;
    expect(stack[stack.length - 1]).toEqual({ name: 'settlement', settlement: 1 });
    expect(useGameStore.getState().save?.campaign.selected).toEqual({
      settlement: 1,
      stage: 1,
      difficulty: 'intro',
    });
  });

  it('gates Normal until Intro is done, then moves the map onto it', () => {
    render(stage(<CampaignScreen route={MAP} />));
    const select = screen.getByTestId('difficulty-select');
    expect(select.querySelector('[role="combobox"]')).toHaveTextContent('Intro');
    expect(select).toHaveTextContent('Clear every stage of Intro');
    expect(screen.getByTestId('campaign-stars')).toHaveTextContent('0 / 360');

    // With Intro cleared the gate is gone and the map follows the player onto Normal…
    useGameStore.getState().actions.debugClearCampaign('intro');
    cleanup();
    render(stage(<CampaignScreen route={MAP} />));
    expect(screen.getByTestId('difficulty-select').querySelector('[role="combobox"]')).toHaveTextContent(
      'Normal',
    );
    expect(screen.getByTestId('campaign-stars')).toHaveTextContent('0 / 360');

    // …and Intro is still there, with every star in it.
    useGameStore.getState().actions.selectStage({ settlement: 4, stage: 2, difficulty: 'intro' });
    cleanup();
    render(stage(<CampaignScreen route={MAP} />));
    expect(screen.getByTestId('campaign-stars')).toHaveTextContent('360 / 360');
    expect(screen.getByTestId('settlement-12')).toHaveTextContent('30 / 30');
  });
});

describe('settlement stands', () => {
  beforeEach(chronicle);

  it('lists ten stands, prices the open one and locks the rest', async () => {
    const user = userEvent.setup();
    render(stage(<SettlementScreen route={THORNWOOD} />));
    const list = screen.getByTestId('stage-list');
    expect(list.children).toHaveLength(10);
    expect(screen.getByTestId('settlement-stars')).toHaveTextContent('0 / 30');

    const first = screen.getByTestId('stage-stage-01-01');
    expect(first).toHaveTextContent('4 enemies over 2 waves');
    expect(first).toHaveTextContent('Thornwood Cutpurse');
    expect(within(first).getByTestId('battle-stage-01-01')).toHaveTextContent('4 energy');

    const second = screen.getByTestId('stage-stage-01-02');
    expect(second).toHaveTextContent('Clear stage 1-1 first');
    expect(within(second).queryByTestId('battle-stage-01-02')).toBeNull();

    // The boss stand asks for more turns and costs one energy more.
    const boss = screen.getByTestId('stage-stage-01-10');
    expect(boss).toHaveTextContent('Boss stand');
    expect(boss).toHaveTextContent('Finish within 30 ally turns');

    await user.click(within(first).getByTestId('battle-stage-01-01'));
    const stack = useGameStore.getState().ui.stack;
    expect(stack[stack.length - 1]).toEqual({
      name: 'battle-setup',
      encounterId: 'encounter.stage.01.01.intro',
    });
    // Opening the setup screen costs nothing: the energy leaves when the battle starts.
    expect(useGameStore.getState().save?.energy.value).toBe(60);
  });

  it('opens the stands a clear unlocked and shows their stars and record', () => {
    const { actions } = useGameStore.getState();
    actions.debugClearCampaign('intro', 2);
    actions.selectStage({ settlement: 1, stage: 2, difficulty: 'intro' });
    render(stage(<SettlementScreen route={THORNWOOD} />));
    expect(screen.getByTestId('settlement-stars')).toHaveTextContent('20 / 30');
    const second = screen.getByTestId('stage-stage-01-02');
    expect(second).toHaveTextContent('Best: 10 turns');
    expect(within(second).getByTestId('battle-stage-01-02')).toBeInTheDocument();
  });
});
