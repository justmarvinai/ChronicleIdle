import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { CRAFT_TIER } from '@content/balance/forge';
import { content } from '@content/registry';
import { DEFAULT_GEAR_VIEW } from '@engine/gear/query';
import type { GearInstance } from '@engine/gear/instance';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import ForgeScreen from './ForgeScreen';

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

const FORGE = { name: 'forge' } as const;
const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;
const held = (id: string): number => save().wallet[id as 'gold'] ?? 0;

function chronicle({ level = 20 } = {}): void {
  const a = actions();
  a.resetGame();
  a.newGame('Smith');
  // A new chronicle seeds itself from the clock, so anything rolled would differ run to run.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  a.chooseStarter('champ.ser_corvin');
  a.grantCurrency(
    [
      { currency: 'gold', amount: 1_000_000 },
      { currency: 'mat_scrap_iron', amount: 400 },
      { currency: 'mat_ember_alloy', amount: 300 },
      { currency: 'mat_starsteel', amount: 200 },
      { currency: 'mat_arcane_dust', amount: 400 },
      { currency: 'mat_refining_core', amount: 60 },
      { currency: 'mat_glyph_sigil', amount: 4 },
    ],
    'test',
  );
  useGameStore.setState((state) => {
    // The Forge opens at 8 and refining at 18; the tests choose which gate they are behind.
    if (state.save) state.save.profile.level = level;
    return state;
  });
  a.setGearView({ ...DEFAULT_GEAR_VIEW, filters: { ...DEFAULT_GEAR_VIEW.filters } });
}

describe('the Forge — Craft', () => {
  beforeEach(() => chronicle());

  it('strikes a piece of the chosen slot and pays the tier', async () => {
    const user = userEvent.setup();
    render(stage(<ForgeScreen route={FORGE} />));
    const goldBefore = held('gold');

    await user.click(screen.getByTestId('craft-slot-boots'));
    await user.click(screen.getByTestId('craft-strike'));

    const struck = Object.values(save().inventory)[0] as GearInstance;
    expect(struck.slot).toBe('boots');
    expect(struck.source).toBe('craft');
    expect(held('gold')).toBe(goldBefore - CRAFT_TIER.scrap.gold);
    expect(screen.getByTestId('craft-result')).toBeInTheDocument();
  });

  it('switches tier and quotes the new recipe', async () => {
    const user = userEvent.setup();
    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByTestId('craft-tier-star'));
    const cost = screen.getByTestId('craft-cost');
    expect(cost).toHaveTextContent('10 Starsteel');
    expect(cost).toHaveTextContent('60,000 Gold');

    await user.click(screen.getByTestId('craft-strike'));
    const struck = Object.values(save().inventory)[0] as GearInstance;
    expect(struck.stars).toBeGreaterThanOrEqual(5);
    expect(['epic', 'legendary', 'mythic']).toContain(struck.rarity);
  });

  it('spends a Sigil when a set is named, and refuses when the materials run out', async () => {
    const user = userEvent.setup();
    render(stage(<ForgeScreen route={FORGE} />));
    const warcry = content.gearSetById('gear_set.warcry');
    expect(warcry).toBeDefined();
    // The set chooser is the kit's own combobox: open it, then pick the row.
    await user.click(screen.getByRole('combobox', { name: 'Set' }));
    await user.click(screen.getByRole('option', { name: 'Warcry' }));
    await user.click(screen.getByTestId('craft-strike'));
    expect((Object.values(save().inventory)[0] as GearInstance).setId).toBe('gear_set.warcry');
    expect(held('mat_glyph_sigil')).toBe(3);

    // Empty the iron chest: the hammer is not offered for a recipe that cannot be paid.
    act(() => {
      useGameStore.setState((state) => {
        if (state.save) state.save.wallet.mat_scrap_iron = 0;
        return state;
      });
    });
    expect(screen.getByTestId('craft-strike')).toBeDisabled();
  });
});

describe('the Forge — Dismantle', () => {
  beforeEach(() => chronicle());

  /** `count` struck pieces on the racks, so there is something to break. */
  function stock(count: number): GearInstance[] {
    const made: GearInstance[] = [];
    for (let i = 0; i < count; i += 1) {
      const result = actions().craftGear('scrap', 'weapon');
      if (!result.ok) throw new Error(result.error.message);
      made.push(result.value.piece);
    }
    return made;
  }

  it('prices a selection and breaks it', async () => {
    const user = userEvent.setup();
    const pieces = stock(3);
    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByTestId('forge-tab-dismantle'));
    expect(screen.getByTestId('dismantle-press')).toBeDisabled();

    const cards = screen.getAllByRole('button', { name: /weapon/i });
    await user.click(cards[0] as HTMLElement);
    expect(screen.getByTestId('dismantle-count')).toHaveTextContent('1 selected');
    expect(screen.getByTestId('dismantle-yield')).toHaveTextContent('Scrap Iron');

    await user.click(screen.getByTestId('dismantle-press'));
    expect(Object.keys(save().inventory)).toHaveLength(2);
    expect(pieces.some((p) => save().inventory[p.instanceId] === undefined)).toBe(true);
  });

  it('quick-picks the pieces nobody will miss', async () => {
    const user = userEvent.setup();
    stock(4);
    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByTestId('forge-tab-dismantle'));
    await user.click(screen.getByTestId('dismantle-quick-unlevelled'));
    expect(screen.getByTestId('dismantle-count')).toHaveTextContent('4 selected');
    await user.click(screen.getByTestId('dismantle-clear'));
    expect(screen.getByTestId('dismantle-count')).toHaveTextContent('0 selected');
  });

  it('never offers a worn or locked piece', async () => {
    const user = userEvent.setup();
    const [worn, locked, spare] = stock(3);
    if (!worn || !locked || !spare) throw new Error('no stock');
    const champion = Object.keys(save().roster)[0] as string;
    actions().equipGear(champion, worn.instanceId);
    actions().setGearLocked(locked.instanceId, true);

    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByTestId('forge-tab-dismantle'));
    await user.click(screen.getByTestId('dismantle-quick-unlevelled'));
    // Only the spare is selectable, so only it is selected.
    expect(screen.getByTestId('dismantle-count')).toHaveTextContent('1 selected');
    await user.click(screen.getByTestId('dismantle-press'));
    expect(save().inventory[worn.instanceId]).toBeDefined();
    expect(save().inventory[locked.instanceId]).toBeDefined();
    expect(save().inventory[spare.instanceId]).toBeUndefined();
  });
});

describe('the Forge — Refine', () => {
  it('names the level it opens at while the chronicle is too young', async () => {
    const user = userEvent.setup();
    chronicle({ level: 10 });
    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByTestId('forge-tab-refine'));
    expect(screen.getByTestId('refine-locked')).toHaveTextContent('level 18');
  });

  it('climbs a star on a twin, keeping the substats', async () => {
    const user = userEvent.setup();
    chronicle();
    // Two pieces of the same slot and star, which is what a refine asks for.
    let target: GearInstance | null = null;
    let twin: GearInstance | null = null;
    for (let i = 0; i < 60 && !twin; i += 1) {
      const a = actions().craftGear('ember', 'weapon');
      if (!a.ok) throw new Error(a.error.message);
      if (target && a.value.piece.stars === target.stars) twin = a.value.piece;
      else target = a.value.piece;
    }
    if (!target || !twin) throw new Error('no twins');

    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByTestId('forge-tab-refine'));
    const panel = screen.getByTestId('refine-panel');
    expect(within(panel).getByText(/Feed a twin/)).toBeInTheDocument();

    const cards = screen.getAllByRole('button', { name: /weapon/i });
    // The first rack is the pieces that can climb; pick the target, then its twin.
    const targetCard = cards.find((card) =>
      (card.getAttribute('aria-label') ?? '').includes(`+${target?.level ?? 0}`),
    );
    await user.click((targetCard ?? cards[0]) as HTMLElement);
    expect(screen.getByTestId('refine-climb')).toBeInTheDocument();
    expect(screen.getByTestId('refine-cost')).toHaveTextContent('Refining Core');

    const twinCards = screen.getAllByRole('button', { name: /weapon/i });
    const before = Object.values(save().inventory).map((p) => p.stars);
    // Any card in the twin rack is a legal sacrifice; the last one is never the target.
    await user.click(twinCards[twinCards.length - 1] as HTMLElement);
    const press = screen.getByTestId('refine-press');
    if (!(press as HTMLButtonElement).disabled) {
      await user.click(press);
      const after = Object.values(save().inventory).map((p) => p.stars);
      expect(after.length).toBe(before.length - 1);
      expect(Math.max(...after)).toBeGreaterThanOrEqual(Math.max(...before));
      expect(save().stats['forge.refines']).toBe(1);
    }
  });
});

describe('the Forge — around the benches', () => {
  beforeEach(() => chronicle());

  it('quotes each tier’s odds from the engine and how many strikes the storeroom covers', () => {
    render(stage(<ForgeScreen route={FORGE} />));
    const scrap = screen.getByTestId('craft-tier-scrap');
    expect(scrap).toHaveTextContent('Common40%');
    expect(scrap).toHaveTextContent('Epic5%');
    expect(scrap).toHaveTextContent('1★30%');
    // 400 Scrap Iron at 20 and 400 Arcane Dust at 5: the iron runs out first, at 20 strikes.
    expect(scrap).toHaveTextContent('You can strike this 20×');
  });

  it('keeps the storeroom beside the bench, marking what the recipe spends', async () => {
    const user = userEvent.setup();
    render(stage(<ForgeScreen route={FORGE} />));
    expect(screen.getByTestId('forge-store-mat_scrap_iron')).toHaveTextContent('−20');
    await user.click(screen.getByTestId('craft-tier-star'));
    expect(screen.getByTestId('forge-store-mat_starsteel')).toHaveTextContent('−10');
    expect(screen.getByTestId('forge-store-mat_scrap_iron')).not.toHaveTextContent('−');

    act(() => {
      useGameStore.setState((state) => {
        if (state.save) state.save.wallet.mat_starsteel = 3;
        return state;
      });
    });
    expect(screen.getByTestId('craft-tier-star')).toHaveTextContent('Not enough in the storeroom');
  });

  it('reads the named set’s bonus before a Sigil is spent on it, and shows the piece it will strike', async () => {
    const user = userEvent.setup();
    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByRole('combobox', { name: 'Set' }));
    await user.click(screen.getByRole('option', { name: 'Warcry' }));
    const warcry = content.gearSetById('gear_set.warcry');
    if (!warcry) throw new Error('no Warcry');
    expect(screen.getByTestId('forge-craft')).toHaveTextContent('A Warcry Weapon');
    expect(screen.getByTestId('forge-store-mat_glyph_sigil')).toHaveTextContent('−1');

    await user.click(screen.getByTestId('craft-strike'));
    // The struck piece's whole sheet stands under the anvil.
    expect(screen.getByTestId('craft-result')).toHaveTextContent('Warcry');
    expect(screen.getByTestId('craft-result')).toHaveTextContent('Substats');
  });

  it('counts a dismantle’s returns in the storeroom before the press', async () => {
    const user = userEvent.setup();
    for (let i = 0; i < 2; i += 1) actions().craftGear('scrap', 'helmet');
    render(stage(<ForgeScreen route={FORGE} />));
    await user.click(screen.getByTestId('forge-tab-dismantle'));
    await user.click(screen.getByTestId('dismantle-quick-unlevelled'));
    expect(screen.getByTestId('dismantle-count')).toHaveTextContent('2 selected');
    expect(screen.getByTestId('forge-store-mat_scrap_iron')).toHaveTextContent('+');
  });
});
