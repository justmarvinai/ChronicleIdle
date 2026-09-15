import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { IDLE_GOLD_BASE } from '@content/balance/idle';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { MS_PER_HOUR } from '@engine/time/clock';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { IdleChestDialog } from './IdleChestDialog';

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

const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;
const held = (id: string): number => save().wallet[id as 'gold'] ?? 0;

/** A chronicle at level 10 (six-hour chest) whose chest has been filling for `hours`. */
function chronicle({ hours = 0, boss = 0 } = {}): void {
  const a = actions();
  a.resetGame();
  a.newGame('Keeper');
  a.chooseStarter('champ.ser_corvin');
  act(() => {
    useGameStore.setState((state) => {
      if (!state.save) return state;
      state.save.profile.level = 10;
      state.save.idle.lastClaimAt = Date.now() - hours * MS_PER_HOUR;
      if (boss > 0) state.save.campaign.stars[progressKey(stageIdOf(boss, 10), 'intro')] = 3;
      return state;
    });
  });
}

describe('the Idle Chest dialog', () => {
  beforeEach(() => chronicle());

  it('shows the fill, the wait and what is waiting inside', () => {
    chronicle({ hours: 3, boss: 4 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));

    expect(screen.getByTestId('idle-timer')).toHaveTextContent(/Full in/);
    expect(screen.getByTestId('idle-tier')).toHaveTextContent('tier 4');
    // The band line is where the game teaches that levelling widens the chest.
    expect(screen.getByTestId('idle-capacity')).toHaveTextContent('Holds 6h 00m');
    expect(screen.getByTestId('idle-capacity')).toHaveTextContent('12h 00m from chronicle level 20');
    const rewards = screen.getByTestId('idle-rewards');
    expect(within(rewards).getByText('Gold')).toBeInTheDocument();
    expect(screen.getByTestId('idle-claim')).toBeEnabled();
  });

  it('will not open an empty chest', () => {
    chronicle({ hours: 0, boss: 2 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    expect(screen.getByTestId('idle-claim')).toBeDisabled();
  });

  it('says what to do when no boss has fallen', () => {
    chronicle({ hours: 4 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    expect(screen.getByTestId('idle-no-farm')).toBeInTheDocument();
    expect(screen.getByTestId('idle-claim')).toBeDisabled();
  });

  it('pays the chest and reports the haul', async () => {
    const user = userEvent.setup();
    chronicle({ hours: 3, boss: 1 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    const goldBefore = held('gold');

    await user.click(screen.getByTestId('idle-claim'));

    expect(held('gold')).toBe(goldBefore + Math.floor(IDLE_GOLD_BASE * 3));
    expect(screen.getByTestId('idle-continue')).toBeInTheDocument();
    expect(screen.getByTestId('idle-rewards')).toHaveTextContent('Gold');
    // The chest is empty again, and the claim button has given way to Continue.
    expect(screen.queryByTestId('idle-claim')).toBeNull();
    expect(save().stats['idle.claims']).toBe(1);
  });

  it('warns that a full chest has stopped counting', () => {
    chronicle({ hours: 30, boss: 6 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    expect(screen.getByTestId('idle-timer')).toHaveTextContent(/Full/);
  });
});
