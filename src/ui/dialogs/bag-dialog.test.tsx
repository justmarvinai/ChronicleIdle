/**
 * The Bag (docs/tech/UI_DESIGN.md §5.26): what is held as slots, the chosen one in full with how
 * the thing it acts on stands now, the press that uses it, and a way to fill an empty Bag. What each
 * item does is tested in `state/market.test.ts`; these are the flows a player's hands take.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { BagDialog } from './BagDialog';

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

function chronicle(bag: Record<string, number>): void {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  act(() => {
    useGameStore.setState((state) => {
      if (!state.save) return state;
      state.save.profile.level = 30;
      state.save.bag = bag;
      return state;
    });
  });
}

describe('the Bag', () => {
  beforeEach(() => chronicle({ 'item.champion_xp_boost': 2, 'item.champions_chicken': 1 }));

  it('shows what is held as slots, and the first of them in full', () => {
    render(stage(<BagDialog onClose={() => undefined} />));
    expect(screen.getByTestId('bag-champion_xp_boost')).toHaveTextContent('Champion XP Boost');
    expect(screen.getByTestId('bag-champion_xp_boost')).toHaveTextContent('×2');
    expect(screen.getByTestId('bag-detail')).toHaveAttribute('data-item', 'item.champion_xp_boost');
    expect(screen.getByTestId('bag-detail')).toHaveTextContent('2 held');
    // The boost is not running yet, and the panel says so before the press.
    expect(screen.getByTestId('bag-status')).toHaveTextContent('Not running');
  });

  it('uses the chosen item, says what it did, and shows the boost running', async () => {
    const user = userEvent.setup();
    render(stage(<BagDialog onClose={() => undefined} />));
    await user.click(screen.getByTestId('bag-use-champion_xp_boost'));
    expect(save().bag['item.champion_xp_boost']).toBe(1);
    expect(screen.getByTestId('bag-said')).toHaveTextContent('Used Champion XP Boost.');
    expect(screen.getByTestId('bag-status')).toHaveTextContent('Running now');
  });

  it('asks which champion before using one that acts on a champion', async () => {
    const user = userEvent.setup();
    render(stage(<BagDialog onClose={() => undefined} />));
    await user.click(screen.getByTestId('bag-champions_chicken'));
    expect(screen.getByTestId('bag-detail')).toHaveAttribute('data-item', 'item.champions_chicken');
    await user.click(screen.getByTestId('bag-use-champions_chicken'));
    expect(useGameStore.getState().ui.dialog).toEqual({ name: 'bag-target', item: 'item.champions_chicken' });
    expect(save().bag['item.champions_chicken']).toBe(1);
  });

  it('moves on to what is left once the chosen item is used up', async () => {
    chronicle({ 'item.champion_xp_boost': 1, 'item.brewery_token': 1 });
    const user = userEvent.setup();
    render(stage(<BagDialog onClose={() => undefined} />));
    await user.click(screen.getByTestId('bag-champion_xp_boost'));
    await user.click(screen.getByTestId('bag-use-champion_xp_boost'));
    expect(screen.queryByTestId('bag-champion_xp_boost')).not.toBeInTheDocument();
    expect(screen.getByTestId('bag-detail')).toHaveAttribute('data-item', 'item.brewery_token');
  });

  it('offers the way to what fills an empty Bag', () => {
    chronicle({});
    render(stage(<BagDialog onClose={() => undefined} />));
    expect(screen.getByTestId('bag-empty')).toBeInTheDocument();
    expect(screen.getByTestId('bag-go-market')).toHaveAccessibleName(/Go to the Market/);
  });
});
