import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { xpToNextLevel } from '@engine/progression/player-level';
import { content } from '@content/registry';
import { useGameStore } from '@state/store';
import HubScreen from '@ui/screens/hub/HubScreen';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { DialogHost } from './DialogHost';
import { LevelUpDialog } from './LevelUpDialog';
import { ProfileDialog } from './ProfileDialog';
import { TitlePickerDialog } from './TitlePickerDialog';

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
  actions.resetStack({ name: 'hub' });
}

describe('the level-up dialog', () => {
  beforeEach(chronicle);

  it('shows the level, what it paid and what it opened', async () => {
    const user = userEvent.setup();
    useGameStore.getState().actions.grantPlayerXp(xpToNextLevel(1), 'test');
    render(stage(<LevelUpDialog onClose={() => undefined} />));

    expect(screen.getByTestId('level-up-level')).toHaveTextContent('2');
    const rewards = within(screen.getByTestId('level-up-rewards'));
    expect(rewards.getByText('Gold').closest('li')).toHaveTextContent('+400');
    // The refill is the new cap, granted on top of what was left (owner's answer Q15).
    expect(screen.getByTestId('level-up-energy')).toHaveTextContent('+70');
    expect(screen.getByTestId('level-up-unlocks')).toHaveTextContent('Tavern: Levelling');

    await user.click(screen.getByTestId('level-up-continue'));
    expect(useGameStore.getState().ui.levelUp).toBeNull();
  });

  it('covers a whole run of levels at once', () => {
    let xp = 0;
    for (let level = 1; level < 5; level += 1) xp += xpToNextLevel(level);
    useGameStore.getState().actions.grantPlayerXp(xp, 'test');
    render(stage(<LevelUpDialog onClose={() => undefined} />));
    expect(screen.getByTestId('level-up-level')).toHaveTextContent('5');
    expect(screen.getByText('Level 1 → 5')).toBeTruthy();
    expect(screen.getByTestId('level-up-unlocks')).toHaveTextContent('Summoning Portal');
  });

  it('opens itself once the player is off the battlefield', async () => {
    const { actions } = useGameStore.getState();
    actions.resetStack({ name: 'battle' });
    actions.grantPlayerXp(xpToNextLevel(1), 'test');
    const view = render(stage(<DialogHost />));
    // A fight is never interrupted…
    expect(screen.queryByTestId('dialog-level-up')).toBeNull();
    actions.resetStack({ name: 'hub' });
    await vi.waitFor(() => expect(screen.getByTestId('dialog-level-up')).toBeTruthy());
    view.unmount();
  });
});

describe('the profile dialog', () => {
  beforeEach(chronicle);

  it('reports the chronicle standing from the save', () => {
    const { actions } = useGameStore.getState();
    actions.debugClearCampaign('intro', 3);
    actions.recordBattle(
      {
        kind: 'victory',
        turns: 10,
        allyTurns: 5,
        wavesCleared: 1,
        waveCount: 1,
        units: [],
        enemyHpLeft: 0,
        seed: 's',
        decisions: [],
      },
      'encounter.stage.01.01.intro',
    );
    render(stage(<ProfileDialog onClose={() => undefined} />));

    expect(screen.getByTestId('profile-name')).toHaveTextContent('Tester');
    expect(screen.getByTestId('stat-cleared')).toHaveTextContent('120');
    // The starter and the three tutorial companions (TUTORIAL.md 1.2).
    expect(screen.getByTestId('stat-champions')).toHaveTextContent('4');
    expect(Number(screen.getByTestId('stat-power').textContent?.replace(/,/g, ''))).toBeGreaterThan(0);
    expect(screen.getByTestId('stat-battles')).toHaveTextContent('1');
    expect(screen.getByTestId('stat-victories')).toHaveTextContent('1');
    expect(screen.getByTestId('profile-stars')).toHaveTextContent('360 / 360');
    // Titles follow the play: clearing Intro is Gatebreaker, three stars everywhere is not enough
    // for the Hard milestone.
    expect(screen.getByTestId('profile-titles')).toHaveTextContent('Gatebreaker');
    expect(screen.getByTestId('profile-next-unlocks')).toHaveTextContent('Tavern: Levelling');
  });

  it('lists every title, lighting the earned ones and framing the one worn', () => {
    const { actions } = useGameStore.getState();
    actions.debugClearCampaign('intro', 3);
    actions.setTitle('title.gatebreaker');
    render(stage(<ProfileDialog onClose={() => undefined} />));

    expect(within(screen.getByTestId('profile-titles')).getAllByRole('listitem')).toHaveLength(
      content.titles.length,
    );
    expect(screen.getByTestId('profile-title-title.gatebreaker')).toHaveAttribute('data-earned', 'true');
    expect(screen.getByTestId('profile-title-title.loremaster')).toHaveAttribute('data-earned', 'false');
    expect(screen.getByTestId('profile-worn-title')).toHaveTextContent('Gatebreaker');
  });

  it('shows the XP to the next level and the whole roster’s power on the chronicler’s card', () => {
    useGameStore.setState((state) => {
      if (state.save) state.save.profile.xp = 40;
      return state;
    });
    render(stage(<ProfileDialog onClose={() => undefined} />));

    expect(screen.getByTestId('dialog-profile')).toHaveTextContent('40 / ');
    expect(Number(screen.getByTestId('profile-power').textContent?.replace(/,/g, ''))).toBeGreaterThan(0);
    expect(screen.getByTestId('profile-level')).toHaveTextContent('1');
  });

  it('renames the chronicle', async () => {
    const user = userEvent.setup();
    render(stage(<ProfileDialog onClose={() => undefined} />));
    await user.click(screen.getByTestId('rename'));
    const input = screen.getByTestId('rename-input');
    await user.clear(input);
    await user.type(input, 'Marvin');
    await user.click(screen.getByTestId('rename-confirm'));
    expect(useGameStore.getState().save?.profile.name).toBe('Marvin');
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Marvin');
  });
});

describe('the title picker', () => {
  beforeEach(chronicle);

  it('wears an earned title and refuses a locked one', async () => {
    const user = userEvent.setup();
    render(stage(<TitlePickerDialog />));
    expect(screen.getByTestId('title-title.loremaster')).toBeDisabled();

    await user.click(screen.getByTestId('title-title.chronicler'));
    expect(useGameStore.getState().save?.profile.title).toBe('title.chronicler');
  });

  it('lets the chronicle wear nothing again', async () => {
    const user = userEvent.setup();
    useGameStore.getState().actions.setTitle('title.chronicler');
    render(stage(<TitlePickerDialog />));
    await user.click(screen.getByTestId('title-none'));
    expect(useGameStore.getState().save?.profile.title).toBeNull();
  });
});

describe('level gates', () => {
  beforeEach(chronicle);

  it('open and close the hub as the chronicle level changes', async () => {
    const { actions } = useGameStore.getState();
    const view = render(stage(<HubScreen route={{ name: 'hub' }} />));
    expect(screen.getByTestId('hotspot-forge')).toHaveAccessibleName(/Unlocks at level 8/);

    actions.debugSetPlayerLevel(8);
    await vi.waitFor(() => expect(screen.getByTestId('hotspot-forge')).toHaveAccessibleName('Forge'));
    // …and a level lost in a debug session closes the gate again.
    actions.debugSetPlayerLevel(1);
    await vi.waitFor(() =>
      expect(screen.getByTestId('hotspot-forge')).toHaveAccessibleName(/Unlocks at level 8/),
    );
    view.unmount();
  });
});
