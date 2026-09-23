import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { CONSUMABLES } from '@content/consumables/index';
import { content } from '@content/registry';
import { formatAmount } from '@engine/economy/wallet';
import { goldShelf } from '@engine/market/index';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import MarketScreen from './MarketScreen';
import { StallCard } from './StallCard';
import { bundleSaving, bundleWorth, consumableKind, isRareFind } from './market-view';

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
      <div id="tooltip-layer" />
      {children}
    </ViewportContext.Provider>
  );
}

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

/** A fixed instant, so the stall the test reads is the stall the purchase buys from. */
const NOW = new Date('2026-09-24T22:20:00Z');
const MARKET = { name: 'market' } as const;
const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;
const held = (id: string): number => save().wallet[id as 'gold'] ?? 0;
const shelf = () => goldShelf('test-seed', NOW.getTime());

function chronicle({ gold = 1_000_000, gems = 20_000 } = {}): void {
  const a = actions();
  a.resetGame();
  a.newGame('Merchant');
  // The stall is drawn from the chronicle's seed and the hour: both are pinned.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  a.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (!state.save) return state;
    state.save.wallet.gold = gold;
    state.save.wallet.gems = gems;
    return state;
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('the Gold Market', () => {
  beforeEach(() => chronicle());

  it('lays out the hour’s six wares: what each is, how many are held, the stock and the price', () => {
    render(stage(<MarketScreen route={MARKET} />));
    expect(screen.getByTestId('market-rotates')).toHaveTextContent('New stock in 40m');
    const slots = shelf();
    expect(screen.getAllByTestId(/^stall-slot-\d$/)).toHaveLength(slots.length);
    for (const slot of slots) {
      expect(screen.getByTestId(`stall-price-${slot.index}`)).toHaveAttribute(
        'data-gold',
        String(slot.unitGold),
      );
      expect(screen.getByTestId(`stall-left-${slot.index}`)).toHaveTextContent(`${slot.stock} left`);
      expect(screen.getByTestId(`stall-held-${slot.index}`)).toHaveTextContent('You hold 0');
    }
  });

  it('buys as many as asked for, and the total follows the number', async () => {
    const user = userEvent.setup();
    const slot = shelf().find((entry) => entry.stock >= 3);
    expect(slot).toBeDefined();
    render(stage(<MarketScreen route={MARKET} />));
    const i = slot!.index;

    await user.click(screen.getByTestId(`stall-more-${i}`));
    await user.click(screen.getByTestId(`stall-more-${i}`));
    expect(screen.getByTestId(`stall-qty-${i}`)).toHaveTextContent('3');
    expect(screen.getByTestId(`stall-total-${i}`)).toHaveTextContent(formatAmount(slot!.unitGold * 3));

    const gold = held('gold');
    await user.click(screen.getByTestId(`stall-buy-${i}`));
    expect(held(slot!.currency)).toBe(3);
    expect(held('gold')).toBe(gold - slot!.unitGold * 3);
    expect(screen.getByTestId(`stall-left-${i}`)).toHaveTextContent(`${slot!.stock - 3} left`);
    expect(screen.getByTestId(`stall-held-${i}`)).toHaveTextContent('You hold 3');
    // The picker goes back to one, so the next press is never a surprise.
    expect(screen.getByTestId(`stall-qty-${i}`)).toHaveTextContent('1');
  });

  it('reaches for everything the purse can pay for, and no further', async () => {
    const user = userEvent.setup();
    const slot = shelf().find((entry) => entry.stock >= 3);
    chronicle({ gold: slot!.unitGold * 2 });
    render(stage(<MarketScreen route={MARKET} />));
    const i = slot!.index;
    await user.click(screen.getByTestId(`stall-max-${i}`));
    expect(screen.getByTestId(`stall-qty-${i}`)).toHaveTextContent('2');
    expect(screen.getByTestId(`stall-more-${i}`)).toBeDisabled();
  });

  it('says why a slot cannot be bought: the purse, or an empty slot', async () => {
    const user = userEvent.setup();
    const slot = shelf()[0]!;
    chronicle({ gold: 0 });
    const view = render(stage(<MarketScreen route={MARKET} />));
    expect(screen.getByTestId(`stall-buy-${slot.index}`)).toHaveTextContent('Not enough');
    expect(screen.getByTestId(`stall-buy-${slot.index}`)).toBeDisabled();
    view.unmount();

    chronicle();
    render(stage(<MarketScreen route={MARKET} />));
    if (slot.stock > 1) await user.click(screen.getByTestId(`stall-max-${slot.index}`));
    await user.click(screen.getByTestId(`stall-buy-${slot.index}`));
    const card = screen.getByTestId(`stall-slot-${slot.index}`);
    expect(card).toHaveAttribute('data-sold', 'true');
    expect(screen.getByTestId(`stall-buy-${slot.index}`)).toHaveTextContent('Sold out');
  });

  it('marks the pool’s rare finds, and only them', () => {
    expect(isRareFind('shard_sacred')).toBe(true);
    expect(isRareFind('tome_legendary')).toBe(true);
    expect(isRareFind('mat_scrap_iron')).toBe(false);
    render(
      stage(
        <StallCard
          slot={{
            index: 0,
            currency: 'shard_sacred',
            stock: 1,
            unitGold: 260_000,
            taken: 0,
            left: 1,
            affordable: 1,
          }}
          held={0}
          onBuy={() => true}
        />,
      ),
    );
    const card = screen.getByTestId('stall-slot-0');
    expect(card).toHaveAttribute('data-rare', 'true');
    expect(card).toHaveTextContent('Rare find');
    // A single-stock slot has nothing to count: no picker, just the press.
    expect(screen.queryByTestId('stall-qty-0')).toBeNull();
  });
});

describe('the Gem Market', () => {
  beforeEach(() => chronicle());

  it('shelves nine singles and four bundles, each bundle with its parts and its saving', async () => {
    const user = userEvent.setup();
    render(stage(<MarketScreen route={MARKET} />));
    await user.click(screen.getByTestId('market-tab-gems'));
    expect(screen.queryByTestId('market-rotates')).toBeNull();
    expect(screen.getAllByTestId(/^shelf-buy-/)).toHaveLength(13);

    const satchel = screen.getByTestId('shelf-chroniclers_satchel');
    expect(within(satchel).getByTestId('shelf-bundle-chroniclers_satchel')).toHaveTextContent(
      'Once per chronicle',
    );
    expect(satchel).toHaveTextContent('Brewery Boost');
    expect(screen.getByTestId('shelf-worth-chroniclers_satchel')).toHaveTextContent(
      'Worth 700 bought singly',
    );
    expect(screen.getByTestId('shelf-worth-chroniclers_satchel')).toHaveTextContent('Save 29%');
    // The crate pays currencies that are not sold singly, so it claims no saving it cannot show.
    expect(screen.queryByTestId('shelf-worth-quartermasters_crate')).toBeNull();
    expect(screen.getByTestId('shelf-quartermasters_crate')).toHaveTextContent('Gold400K');
  });

  it('puts a single in the Bag, and its card says how many are held', async () => {
    const user = userEvent.setup();
    render(stage(<MarketScreen route={{ name: 'market', tab: 'gems' }} />));
    expect(screen.getByTestId('shelf-held-champion_xp_boost')).toHaveTextContent('');
    await user.click(screen.getByTestId('shelf-buy-champion_xp_boost'));
    expect(save().bag['item.champion_xp_boost']).toBe(1);
    expect(held('gems')).toBe(20_000 - 200);
    expect(screen.getByTestId('shelf-held-champion_xp_boost')).toHaveTextContent('In your Bag ×1');
  });

  it('lets a bundle go once, and keeps it on the shelf stamped', async () => {
    const user = userEvent.setup();
    render(stage(<MarketScreen route={{ name: 'market', tab: 'gems' }} />));
    expect(screen.getByText(/4 of 4 still on offer/)).toBeInTheDocument();
    await user.click(screen.getByTestId('shelf-buy-chroniclers_satchel'));
    expect(screen.getByTestId('shelf-chroniclers_satchel')).toHaveAttribute('data-taken', 'true');
    expect(screen.getByTestId('shelf-buy-chroniclers_satchel')).toHaveTextContent('Already taken');
    expect(screen.getByTestId('shelf-buy-chroniclers_satchel')).toBeDisabled();
    expect(screen.getByText(/3 of 4 still on offer/)).toBeInTheDocument();
  });
});

describe('what the Market says about its wares', () => {
  it('prices each bundle’s parts as MARKET.md §2.2 does', () => {
    const worth = (id: string): number | null => bundleWorth(content.gemShelfById(id)!, content.gemShelf);
    expect(worth('shelf.chroniclers_satchel')).toBe(700);
    expect(worth('shelf.quartermasters_crate')).toBeNull();
    expect(worth('shelf.stewards_ledger')).toBe(1_040);
    expect(worth('shelf.ascendants_table')).toBe(5_900);
    expect(bundleSaving(500, 700)).toBe(29);
  });

  it('names what every consumable is for, in words', () => {
    for (const def of CONSUMABLES) expect(consumableKind(def)).not.toMatch(/^market\./);
    expect(consumableKind(content.consumableById('item.champion_xp_boost')!)).toBe('Boost · 24 h');
  });
});
