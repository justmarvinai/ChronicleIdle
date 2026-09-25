/**
 * The Wallet (docs/tech/UI_DESIGN.md §5.26): every holding as the amount that can be spent — the
 * pools and the boss keys read from where they live — one currency in full with where it comes
 * from and what it is for, and the gem refill for energy.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { ENERGY_REFILL_AMOUNT, ENERGY_REFILL_GEMS } from '@content/balance/energy';
import { energyCap } from '@engine/economy/energy';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { WalletDialog } from './WalletDialog';

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

const LEVEL = 20;
const save = () => useGameStore.getState().save!;

function chronicle({ gems = 500, energy = 40 } = {}): void {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Purse');
  actions.chooseStarter('champ.ser_corvin');
  act(() => {
    useGameStore.setState((state) => {
      if (!state.save) return state;
      state.save.profile.level = LEVEL;
      state.save.wallet.gems = gems;
      state.save.energy = { value: energy, lastTickAt: Date.now() };
      return state;
    });
  });
}

describe('the Wallet', () => {
  beforeEach(() => chronicle());

  it('shows energy and the keys as what can be spent, out of their cap', () => {
    render(stage(<WalletDialog onClose={() => undefined} />));
    expect(screen.getByTestId('wallet-energy')).toHaveTextContent(`40 / ${energyCap(LEVEL)}`);
    expect(screen.getByTestId('wallet-key_daily')).toHaveTextContent('2 / 2');
    expect(screen.getByTestId('wallet-key_eternal')).toHaveTextContent('/ 10');
  });

  it('opens on the currency whose purse was pressed, and shows any other when it is chosen', async () => {
    const user = userEvent.setup();
    render(stage(<WalletDialog currency="energy" onClose={() => undefined} />));
    expect(screen.getByTestId('wallet-detail')).toHaveAttribute('data-currency', 'energy');
    expect(screen.getByTestId('wallet-sources')).toHaveTextContent('Chronicle level-ups');
    expect(screen.getByTestId('wallet-uses')).toHaveTextContent('Dungeons');

    await user.click(screen.getByTestId('wallet-gold'));
    expect(screen.getByTestId('wallet-detail')).toHaveAttribute('data-currency', 'gold');
    expect(screen.queryByTestId('wallet-refill')).not.toBeInTheDocument();
  });

  it('buys energy with gems, past the cap if need be', async () => {
    const user = userEvent.setup();
    render(stage(<WalletDialog currency="energy" onClose={() => undefined} />));
    await user.click(screen.getByTestId('wallet-refill-buy'));
    expect(save().wallet.gems).toBe(500 - ENERGY_REFILL_GEMS);
    expect(save().energy.value).toBe(40 + ENERGY_REFILL_AMOUNT);
    expect(screen.getByTestId('wallet-held')).toHaveTextContent(
      `${40 + ENERGY_REFILL_AMOUNT} / ${energyCap(LEVEL)}`,
    );
  });

  it('will not sell energy for gems the chronicle does not have', () => {
    chronicle({ gems: ENERGY_REFILL_GEMS - 1 });
    render(stage(<WalletDialog currency="energy" onClose={() => undefined} />));
    expect(screen.getByTestId('wallet-refill-buy')).toBeDisabled();
    expect(screen.getByTestId('wallet-refill')).toHaveTextContent('Not enough gems');
  });

  it('goes to where a currency comes from', async () => {
    const user = userEvent.setup();
    render(stage(<WalletDialog currency="gold" onClose={() => undefined} />));
    await user.click(screen.getByTestId('wallet-go-campaign'));
    const stack = useGameStore.getState().ui.stack;
    expect(stack[stack.length - 1]).toEqual({ name: 'campaign' });
  });
});
