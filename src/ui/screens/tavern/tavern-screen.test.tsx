import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { content } from '@content/registry';
import { levelCap } from '@engine/champions/stats';
import { useGameStore } from '@state/store';
import { DialogHost } from '@ui/dialogs/DialogHost';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import TavernScreen from './TavernScreen';

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

const TAVERN = { name: 'tavern' } as const;
const save = () => useGameStore.getState().save!;
const starter = (): string =>
  Object.values(save().roster).find((i) => i.defId === 'champ.ser_corvin')!.instanceId;

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
  actions.grantCurrency(
    [
      { currency: 'gold', amount: 200_000 },
      { currency: 'brew_valor', amount: 4 },
      { currency: 'tome_rare', amount: 2 },
    ],
    'test',
  );
  useGameStore.getState().actions.setTavernTarget(starter());
}

describe('the Tavern levels a champion', () => {
  beforeEach(chronicle);

  it('seats a companion through the picker and pays what the preview shows', async () => {
    const user = userEvent.setup();
    render(
      stage(
        <>
          <TavernScreen route={TAVERN} />
          <DialogHost />
        </>,
      ),
    );
    expect(screen.getByTestId('tavern-portrait')).toHaveAttribute('data-champion', 'champ.ser_corvin');
    expect(screen.getByTestId('tavern-champion-level')).toHaveTextContent('1');

    await user.click(screen.getAllByTestId(/^seat-empty-/)[0] as HTMLElement);
    const picker = await screen.findByTestId('dialog-food-picker');
    const food = within(picker).getAllByTestId(/^food-/)[0] as HTMLElement;
    const foodId = (food.getAttribute('data-testid') ?? '').replace('food-', '');
    await user.click(food);

    expect(screen.getByTestId('tavern-xp')).toHaveTextContent('173');
    expect(screen.getByTestId('tavern-cost')).toHaveTextContent('Gold');
    const goldBefore = save().wallet.gold;

    await user.click(screen.getByTestId('tavern-upgrade'));
    expect(save().roster[starter()]?.level).toBeGreaterThan(1);
    expect(save().roster[foodId]).toBeUndefined();
    expect(save().wallet.gold).toBeLessThan(goldBefore);
    // The table is cleared once the press lands.
    expect(useGameStore.getState().ui.tavern.offering.food).toEqual([]);
  });

  it('pours a brew and prices it into the cost', async () => {
    const user = userEvent.setup();
    render(stage(<TavernScreen route={TAVERN} />));
    await user.click(screen.getByTestId('brew-plus-brew_valor'));
    expect(screen.getByTestId('brew-count-brew_valor')).toHaveTextContent('1');
    // Corvin is Justice, so a Valor brew pours the plain 1,700.
    expect(screen.getByTestId('tavern-xp')).toHaveTextContent('1,700');
    await user.click(screen.getByTestId('tavern-upgrade'));
    expect(save().wallet.brew_valor).toBe(3);
    expect(save().roster[starter()]?.level).toBeGreaterThan(1);
  });

  it('auto-fills the table with the cheapest companions and clears it again', async () => {
    const user = userEvent.setup();
    render(stage(<TavernScreen route={TAVERN} />));
    await user.click(screen.getByTestId('tavern-autofill'));
    const seated = useGameStore.getState().ui.tavern.offering.food;
    expect(seated.length).toBe(3);
    expect(seated).not.toContain(starter());
    await user.click(screen.getByText('Clear the table'));
    expect(useGameStore.getState().ui.tavern.offering.food).toEqual([]);
  });

  it('asks before a levelled companion is retired', async () => {
    const user = userEvent.setup();
    const victim = Object.keys(save().roster).find((id) => id !== starter()) as string;
    useGameStore.setState((state) => {
      const champion = state.save?.roster[victim];
      if (champion) champion.level = 7;
      return state;
    });
    render(
      stage(
        <>
          <TavernScreen route={TAVERN} />
          <DialogHost />
        </>,
      ),
    );
    useGameStore.getState().actions.setTavernOffering({ brews: {}, food: [victim] });
    await user.click(screen.getByTestId('tavern-upgrade'));
    const dialog = await screen.findByTestId('dialog-tavern-confirm');
    expect(within(dialog).getByTestId('tavern-confirm-warnings')).toHaveTextContent('levelled to 7');
    expect(save().roster[victim]).toBeDefined();

    await user.click(screen.getByTestId('tavern-confirm-accept'));
    expect(save().roster[victim]).toBeUndefined();
  });
});

describe('the Tavern ranks and sharpens', () => {
  beforeEach(chronicle);

  it('lights a star once the rank-up table is full', async () => {
    const user = userEvent.setup();
    const { actions } = useGameStore.getState();
    for (let i = 0; i < 3; i += 1) actions.grantChampion('champ.reva_ashblade', 'summon', 'test');
    render(
      stage(
        <>
          <TavernScreen route={TAVERN} />
          <DialogHost />
        </>,
      ),
    );

    await user.click(screen.getByTestId('tavern-tab-rank'));
    expect(screen.getByTestId('tavern-rank-need')).toHaveTextContent('3 × 3★');
    expect(screen.getByTestId('tavern-upgrade')).toBeDisabled();

    await user.click(screen.getByTestId('tavern-autofill-rank'));
    expect(screen.getByTestId('tavern-rank-seated')).toHaveTextContent('3 of 3');
    // Rank-up food is Rare by definition of the star tier, so the Tavern asks first.
    await user.click(screen.getByTestId('tavern-upgrade'));
    await screen.findByTestId('dialog-tavern-confirm');
    await user.click(screen.getByTestId('tavern-confirm-accept'));
    expect(save().roster[starter()]?.stars).toBe(4);
    expect(Object.keys(save().roster)).toHaveLength(4);
  });

  it('spends a tome on the next step and stops when they run out', async () => {
    const user = userEvent.setup();
    render(stage(<TavernScreen route={TAVERN} />));
    await user.click(screen.getByTestId('tavern-tab-skills'));
    const ability = content.championById('champ.ser_corvin')!.abilities[0]!;
    expect(screen.getByTestId('tavern-tomes')).toHaveTextContent('2 held');

    await user.click(screen.getByTestId(`skill-upgrade-${ability.id}`));
    expect(save().roster[starter()]?.skillUpgrades[ability.id]).toBe(1);
    expect(save().wallet.tome_rare).toBe(1);

    useGameStore.setState((state) => {
      if (state.save) state.save.wallet.tome_rare = 0;
      return state;
    });
    await vi.waitFor(() => expect(screen.getByTestId(`skill-upgrade-${ability.id}`)).toBeDisabled());
  });
});

describe('the reworked Tavern', () => {
  beforeEach(chronicle);

  it('pours to the cap, its own element first, and previews the road and the sheet', async () => {
    const user = userEvent.setup();
    useGameStore.getState().actions.grantCurrency(
      [
        { currency: 'brew_justice', amount: 60 },
        { currency: 'brew_universal', amount: 5 },
      ],
      'test',
    );
    render(stage(<TavernScreen route={TAVERN} />));
    await user.click(screen.getByTestId('tavern-pour'));
    const brews = useGameStore.getState().ui.tavern.offering.brews;
    // Corvin is Justice: his own brew does the pouring, and the Valor on the shelf stays there.
    expect(brews.brew_justice ?? 0).toBeGreaterThan(0);
    expect(brews.brew_valor ?? 0).toBe(0);
    expect(screen.getByTestId('tavern-level-now')).toHaveTextContent(`Level 1 → ${levelCap(3)}`);
    expect(screen.getByTestId('tavern-gauge-preview')).toBeInTheDocument();
    // Brews come whole, so a little may spill — never as much as the smallest brew pours.
    const spill = screen.queryByTestId('tavern-spill')?.textContent ?? '0';
    expect(Number(spill.replace(/[^0-9]/g, ''))).toBeLessThan(1_700);
    expect(screen.getByTestId('tavern-growth')).toHaveTextContent('Power');
  });

  it('fills the seats with spare companions but never one somebody has levelled', async () => {
    const user = userEvent.setup();
    const levelled = Object.keys(save().roster).find((id) => id !== starter()) as string;
    useGameStore.setState((state) => {
      const champion = state.save?.roster[levelled];
      if (champion) champion.level = 5;
      return state;
    });
    render(stage(<TavernScreen route={TAVERN} />));
    await user.click(screen.getByTestId('tavern-autofill'));
    const seated = useGameStore.getState().ui.tavern.offering.food;
    expect(seated.length).toBe(2);
    expect(seated).not.toContain(levelled);
    // Each seated guest says what it brings.
    expect(screen.getByTestId(`seat-${seated[0]}`)).toHaveTextContent('+173');
  });

  it('shuts the table at the cap and points the way to Upgrade Rank', async () => {
    const user = userEvent.setup();
    useGameStore.setState((state) => {
      const champion = state.save?.roster[starter()];
      if (champion) champion.level = levelCap(champion.stars);
      return state;
    });
    render(
      stage(
        <>
          <TavernScreen route={TAVERN} />
          <DialogHost />
        </>,
      ),
    );
    expect(screen.getByTestId('tavern-at-cap')).toHaveTextContent('Level 30 is the cap for 3★');
    expect(screen.getByTestId('brew-plus-brew_valor')).toBeDisabled();
    // An empty seat no longer opens the picker.
    await user.click(screen.getAllByTestId(/^seat-empty-/)[0] as HTMLElement);
    expect(screen.queryByTestId('dialog-food-picker')).toBeNull();
    expect(screen.getByTestId('tavern-upgrade')).toBeDisabled();

    await user.click(screen.getByTestId('tavern-to-rank'));
    expect(screen.getByTestId('tavern-rank')).toBeInTheDocument();
    expect(screen.getByTestId('tavern-rank')).toHaveTextContent('Level cap 30 → 40');
  });

  it('seats rank-up food straight from the larder under the champion', async () => {
    const user = userEvent.setup();
    const { actions } = useGameStore.getState();
    for (let i = 0; i < 3; i += 1) actions.grantChampion('champ.reva_ashblade', 'summon', 'test');
    render(stage(<TavernScreen route={TAVERN} />));
    await user.click(screen.getByTestId('tavern-tab-rank'));
    const larder = screen.getByTestId('tavern-spares');
    const cards = within(larder).getAllByTestId(/^tavern-spare-/);
    expect(cards).toHaveLength(3);
    expect(larder).toHaveTextContent('3 free');

    await user.click(cards[0] as HTMLElement);
    expect(screen.getByTestId('tavern-rank-seated')).toHaveTextContent('1 of 3');
    await user.click(cards[0] as HTMLElement);
    expect(screen.getByTestId('tavern-rank-seated')).toHaveTextContent('0 of 3');
    // What the star brings is on the panel before anything is spent.
    expect(screen.getByTestId('tavern-rank-growth')).toHaveTextContent('Power');
  });

  it('names the currency the wallet is short of instead of refusing after the press', async () => {
    const user = userEvent.setup();
    const { actions } = useGameStore.getState();
    for (let i = 0; i < 3; i += 1) actions.grantChampion('champ.reva_ashblade', 'summon', 'test');
    useGameStore.setState((state) => {
      if (state.save) state.save.wallet.gold = 10;
      return state;
    });
    render(stage(<TavernScreen route={TAVERN} />));
    await user.click(screen.getByTestId('tavern-tab-rank'));
    await user.click(screen.getByTestId('tavern-autofill-rank'));
    expect(screen.getByTestId('tavern-short')).toHaveTextContent('Not enough Gold');
    expect(screen.getByTestId('tavern-upgrade')).toBeDisabled();
  });
});
