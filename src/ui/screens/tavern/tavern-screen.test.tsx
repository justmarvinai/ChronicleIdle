import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { content } from '@content/registry';
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
    // Ser Corvin is Justice, so a Valor brew pours the plain 1,500.
    expect(screen.getByTestId('tavern-xp')).toHaveTextContent('1,500');
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
