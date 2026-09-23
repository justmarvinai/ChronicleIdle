import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { IDLE_GOLD_BASE } from '@content/balance/idle';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { content } from '@content/registry';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { idleGoldPerHour } from '@engine/economy/idle';
import { BREW_OF_ELEMENT } from '@engine/progression/tavern-level';
import { MS_PER_HOUR } from '@engine/time/clock';
import { translate } from '@i18n/index';
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
  // A new chronicle seeds itself from the clock, so anything rolled would differ run to run.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
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

  it('lists the luck it may turn up, with each roll’s chance an hour', () => {
    chronicle({ hours: 3, boss: 4 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    const dialog = screen.getByTestId('dialog-idle-chest');
    expect(dialog).toHaveTextContent('Gems8% an hour');
    // Tier 4 is below the band that improves the Ancient Shard's odds.
    expect(dialog).toHaveTextContent('Ancient Shard1% an hour');
    // The brew is named by the one the farm turns up: the fourth settlement's own element.
    const element = content.settlementByIndex(4)?.element;
    expect(element).toBeDefined();
    const brew = translate(CURRENCY_BY_ID[BREW_OF_ELEMENT[element!]].name);
    expect(dialog).toHaveTextContent(`${brew}6% an hour`);
  });

  it('shows the pace each line fills at, and the farm’s tier', () => {
    chronicle({ hours: 3, boss: 4 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    const perHour = Math.floor(idleGoldPerHour(4)).toLocaleString('en-US');
    expect(screen.getByTestId('idle-rewards')).toHaveTextContent(`Gold${perHour} an hour`);
    expect(screen.getByTestId('idle-tier')).toHaveTextContent(/^Farming .+tier 4$/);
  });

  it('lights the vault by the chest’s state', () => {
    chronicle({ hours: 3, boss: 4 });
    const { unmount } = render(stage(<IdleChestDialog onClose={() => undefined} />));
    expect(screen.getByTestId('idle-vault')).toHaveAttribute('data-state', 'filling');
    unmount();

    chronicle({ hours: 30, boss: 4 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    expect(screen.getByTestId('idle-vault')).toHaveAttribute('data-state', 'brimming');
  });

  it('draws the capacity bands as a road, the one it holds lit', () => {
    chronicle({ hours: 3, boss: 4 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    const band = (hours: string): HTMLElement | null => screen.getByText(hours).closest('li');
    expect(band('3h')).toHaveAttribute('data-state', 'past');
    expect(band('6h')).toHaveAttribute('data-state', 'now');
    expect(band('12h')).toHaveAttribute('data-state', 'ahead');
  });

  it('will not open an empty chest', () => {
    chronicle({ hours: 0, boss: 2 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    expect(screen.getByTestId('idle-claim')).toBeDisabled();
  });

  it('says what to do when no boss has fallen, and shows the way there', async () => {
    const user = userEvent.setup();
    // Past the six-hour chest a level-10 chronicle holds, so the dormant chest is full.
    chronicle({ hours: 8 });
    render(stage(<IdleChestDialog onClose={() => undefined} />));
    expect(screen.getByTestId('idle-no-farm')).toBeInTheDocument();
    expect(screen.getByTestId('idle-claim')).toBeDisabled();
    // The vault sleeps, and a full chest says when it will pay rather than urging an opening.
    expect(screen.getByTestId('idle-vault')).toHaveAttribute('data-state', 'dormant');
    expect(screen.getByTestId('idle-timer')).toHaveTextContent('once the first boss falls');
    // What the first farm pays an hour, so the wait has a point.
    const first = screen.getByTestId('idle-first-farm');
    expect(first).toHaveTextContent(`Goldan hour+${Math.floor(idleGoldPerHour(1)).toLocaleString('en-US')}`);

    await user.click(screen.getByTestId('idle-to-campaign'));
    const stack = useGameStore.getState().ui.stack;
    expect(stack[stack.length - 1]).toEqual({ name: 'campaign' });
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
