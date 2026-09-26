/**
 * The Mine dialog (docs/tech/UI_DESIGN.md §5.29): the flows that move currency — collecting the
 * store and digging a level deeper — and what the dialog says when either is out of reach.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { MINE_LEVELS, MINE_MAX_LEVEL } from '@content/balance/mine';
import type { CurrencyAmount } from '@content/currencies/types';
import { mineLevel } from '@engine/mine/index';
import { hasKey } from '@i18n/index';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import MineDialog from './MineDialog';

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

const save = () => {
  const current = useGameStore.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};
const held = (id: string): number => save().wallet[id as 'gold'] ?? 0;

/** A chronicle at `level`, its Mine at `mine`, with `wallet` set on top of what it starts with. */
function chronicle({
  level = 6,
  mine = 1,
  wallet = [],
}: { level?: number; mine?: number; wallet?: readonly CurrencyAmount[] } = {}): void {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  act(() => {
    useGameStore.setState((state) => {
      if (!state.save) return state;
      state.save.profile.level = level;
      state.save.mine.level = mine;
      for (const { currency, amount } of wallet) state.save.wallet[currency] = amount;
      return state;
    });
  });
}

describe('the Mine dialog', () => {
  beforeEach(() => chronicle());

  it('opens on a full first store and pays it out on Collect', async () => {
    const user = userEvent.setup();
    render(stage(<MineDialog onClose={() => undefined} />));
    const storeGems = mineLevel(1).storeGems;

    expect(screen.getByTestId('mine-store')).toHaveTextContent(`${storeGems}/${storeGems}`);
    expect(screen.getByTestId('mine-timer')).toHaveTextContent(/Store full/);
    const gems = held('gems');

    await user.click(screen.getByTestId('mine-collect'));
    expect(held('gems')).toBe(gems + storeGems);
    expect(screen.getByTestId('mine-haul')).toHaveTextContent(`+${storeGems}`);
    expect(screen.getByTestId('mine-store')).toHaveTextContent(`0/${storeGems}`);
    // Nothing whole is left to take, and the button says so rather than failing on a press.
    expect(screen.getByTestId('mine-collect')).toBeDisabled();
  });

  it('draws the whole shaft: the stratum being worked, the one below it, and the dark', () => {
    chronicle({ level: 30, mine: 3 });
    render(stage(<MineDialog onClose={() => undefined} />));
    const strata = within(screen.getByTestId('mine-strata')).getAllByRole('listitem');
    expect(strata).toHaveLength(MINE_MAX_LEVEL);
    expect(screen.getByTestId('mine-stratum-2')).toHaveAttribute('data-state', 'dug');
    expect(screen.getByTestId('mine-stratum-3')).toHaveAttribute('data-state', 'here');
    expect(screen.getByTestId('mine-stratum-4')).toHaveAttribute('data-state', 'next');
    expect(screen.getByTestId('mine-stratum-10')).toHaveAttribute('data-state', 'deep');
    // Every stratum says where it stands under its name, and what it digs beside it.
    expect(screen.getByTestId('mine-stratum-2')).toHaveTextContent(/Dug/);
    expect(screen.getByTestId('mine-stratum-3')).toHaveTextContent(/The crews are here/);
    // Level 10 opens at 55, so a level-30 chronicle is told when as well as how much.
    expect(screen.getByTestId('mine-stratum-10')).toHaveTextContent(
      `Opens at chronicle level ${mineLevel(10).opensAt}`,
    );
    expect(screen.getByTestId('mine-stratum-10')).toHaveTextContent(`${mineLevel(10).gemsPerDay}`);
  });

  it('keeps a tally of what the crews have brought up', async () => {
    const user = userEvent.setup();
    render(stage(<MineDialog onClose={() => undefined} />));
    expect(screen.getByTestId('mine-tally-hauls')).toHaveTextContent('0');

    await user.click(screen.getByTestId('mine-collect'));
    expect(screen.getByTestId('mine-tally')).toHaveTextContent(`${mineLevel(1).storeGems}`);
    expect(screen.getByTestId('mine-tally-hauls')).toHaveTextContent('1');
  });

  it('shows the next level waiting on the chronicle, and will not dig it', () => {
    render(stage(<MineDialog onClose={() => undefined} />));
    expect(screen.getByTestId('mine-gate')).toHaveTextContent(`${mineLevel(2).opensAt}`);
    expect(screen.getByTestId('mine-dig')).toBeDisabled();
  });

  it('names what the wallet is short of', () => {
    const cost = mineLevel(2).cost;
    chronicle({ level: mineLevel(2).opensAt, wallet: cost.map((line) => ({ ...line, amount: 0 })) });
    render(stage(<MineDialog onClose={() => undefined} />));
    const lines = within(screen.getByTestId('mine-cost')).getAllByRole('listitem');
    expect(lines).toHaveLength(cost.length);
    for (const line of lines) expect(line).toHaveAttribute('data-short', 'true');
    expect(screen.getByTestId('mine-dig')).toBeDisabled();
  });

  it('digs a level deeper: the price is spent, the store settled, the shaft redrawn', async () => {
    const user = userEvent.setup();
    const cost = mineLevel(2).cost;
    chronicle({ level: mineLevel(2).opensAt, wallet: cost });
    render(stage(<MineDialog onClose={() => undefined} />));
    const gems = held('gems');

    await user.click(screen.getByTestId('mine-dig'));
    expect(save().mine.level).toBe(2);
    for (const { currency } of cost) expect(held(currency)).toBe(0);
    // The full first store came up on the way down.
    expect(held('gems')).toBe(gems + mineLevel(1).storeGems);
    expect(screen.getByTestId('mine-stratum-2')).toHaveAttribute('data-state', 'here');
    expect(screen.getByTestId('mine-stratum-2')).toHaveAttribute('data-fresh', 'true');
    expect(screen.getByTestId('mine-next')).toHaveTextContent(/level 3/i);
  });

  it('says so when there is nowhere deeper to dig', () => {
    chronicle({ level: 100, mine: MINE_MAX_LEVEL });
    render(stage(<MineDialog onClose={() => undefined} />));
    expect(screen.getByTestId('mine-next')).toHaveTextContent(/dug to its heart/);
    expect(screen.queryByTestId('mine-dig')).toBeNull();
  });

  it('has a name for every stratum', () => {
    for (const def of MINE_LEVELS) expect(hasKey(`mine.stratum.${def.level}`)).toBe(true);
  });
});
