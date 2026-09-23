import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { DEFAULT_GEAR_VIEW } from '@engine/gear/query';
import type { GearInstance } from '@engine/gear/instance';
import { useGameStore } from '@state/store';
import { DialogHost } from '@ui/dialogs/DialogHost';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import ChampionsScreen from './ChampionsScreen';

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
const starter = (): string =>
  Object.values(save().roster).find((i) => i.defId === 'champ.ser_corvin')!.instanceId;

function chronicle(): void {
  const a = actions();
  a.resetGame();
  a.newGame('Tester');
  // A new chronicle seeds itself from the clock, so anything rolled would differ run to run.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  a.chooseStarter('champ.ser_corvin');
  a.grantCurrency([{ currency: 'gold', amount: 500_000 }], 'test');
  // Level 3 opens the gear feature (`unlocks.ts`), which the tab is gated on.
  a.grantPlayerXp(4_000, 'test');
  // The rack view lives outside the save, so each test starts from the default filters.
  a.setGearView({ ...DEFAULT_GEAR_VIEW, filters: { ...DEFAULT_GEAR_VIEW.filters } });
}

/** One piece of a named slot and set, straight onto the racks. */
function stock(slot: GearInstance['slot'], setId: string, serial: number): GearInstance {
  const piece: GearInstance = {
    instanceId: `gear-test-${serial}`,
    slot,
    setId,
    rarity: 'epic',
    stars: 5,
    level: 0,
    mainStat: slot === 'weapon' ? 'atk' : slot === 'helmet' ? 'hp' : 'def',
    subs: [{ stat: 'spd', value: 6, rolls: 1 }],
    equippedTo: null,
    locked: false,
    acquiredAt: Date.UTC(2026, 8, 12) + serial,
    source: 'campaign_drop',
  };
  useGameStore.setState((state) => {
    if (state.save) state.save.inventory[piece.instanceId] = piece;
    return state;
  });
  return piece;
}

function openGearTab(instanceId: string) {
  actions().selectChampion(instanceId);
  return render(
    stage(
      <>
        <ChampionsScreen route={{ name: 'champions', instanceId, tab: 'gear' }} />
        <DialogHost />
      </>,
    ),
  );
}

describe('the champion Gear tab', () => {
  beforeEach(chronicle);

  it('shows six empty slots and no set bonus on a bare champion', () => {
    openGearTab(starter());
    expect(screen.getByTestId('panel-gear')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^gear-slot-/)).toHaveLength(6);
    expect(screen.getByTestId('gear-sets-none')).toBeInTheDocument();
  });

  it('equips a piece through the picker and shows the compare before it does', async () => {
    const user = userEvent.setup();
    const piece = stock('weapon', 'gear_set.warcry', 1);
    openGearTab(starter());

    await user.click(within(screen.getByTestId('gear-slot-weapon')).getByRole('button'));
    const picker = await screen.findByTestId('dialog-gear-picker');
    expect(screen.getByTestId('gear-equip')).toBeDisabled();

    await user.click(within(picker).getAllByRole('button', { name: /Warcry/ })[0] as HTMLElement);
    // The compare panel answers before anything is spent.
    expect(screen.getByTestId('gear-compare-name')).toHaveTextContent('Warcry Weapon');
    const atk = within(screen.getByTestId('compare-atk')).getAllByRole('definition');
    expect(atk[1]).toHaveAttribute('data-delta', 'up');

    await user.click(screen.getByTestId('gear-equip'));
    expect(save().roster[starter()]?.gear.weapon).toBe(piece.instanceId);
    expect(save().inventory[piece.instanceId]?.equippedTo).toBe(starter());
    expect(screen.getByTestId('gear-main-weapon')).toHaveTextContent('ATK');
  });

  it('counts a complete set as a live bonus', async () => {
    const user = userEvent.setup();
    const first = stock('weapon', 'gear_set.warcry', 2);
    const second = stock('helmet', 'gear_set.warcry', 3);
    actions().equipGear(starter(), first.instanceId);
    actions().equipGear(starter(), second.instanceId);
    openGearTab(starter());
    const line = screen.getByTestId('gear-set-gear_set.warcry');
    expect(line).toHaveTextContent('Warcry');
    expect(line).toHaveTextContent('1 ×');
    // And the power on the tab is the geared one, above the bare champion's.
    const powered = Number(screen.getByTestId('gear-power').textContent?.replace(/,/g, ''));
    await user.click(screen.getByTestId('gear-remove-weapon'));
    const bare = Number(screen.getByTestId('gear-power').textContent?.replace(/,/g, ''));
    expect(powered).toBeGreaterThan(bare);
  });

  it('never offers a piece another champion is wearing', async () => {
    const user = userEvent.setup();
    const other = Object.keys(save().roster).find((id) => id !== starter()) as string;
    // Distinct serials: `stock` keys the piece by serial, so a shared one would silently be the
    // same piece and the test would pass without proving anything.
    const worn = stock('weapon', 'gear_set.warcry', 41);
    actions().equipGear(other, worn.instanceId);
    const spare = stock('weapon', 'gear_set.swiftfoot', 42);

    openGearTab(starter());
    await user.click(within(screen.getByTestId('gear-slot-weapon')).getByRole('button'));
    const picker = await screen.findByTestId('dialog-gear-picker');

    // Only the spare is on offer. The other champion's weapon used to be listed here, which read
    // as a bigger armoury than the chronicle had and stripped them when taken (owner's batch).
    expect(within(picker).queryAllByRole('button', { name: /Warcry/ })).toHaveLength(0);
    const offered = within(picker).getAllByRole('button', { name: /Swiftfoot/ });
    expect(offered.length).toBeGreaterThan(0);
    await user.click(offered[0] as HTMLElement);
    await user.click(screen.getByTestId('gear-equip'));

    expect(save().roster[starter()]?.gear.weapon).toBe(spare.instanceId);
    // And the other champion still has theirs.
    expect(save().roster[other]?.gear.weapon).toBe(worn.instanceId);
  });

  it('sends a worn piece to the bench, because the armoury no longer lists it', async () => {
    const user = userEvent.setup();
    const piece = stock('chestplate', 'gear_set.ironhide', 43);
    actions().equipGear(starter(), piece.instanceId);
    openGearTab(starter());
    await user.click(screen.getByTestId('gear-upgrade-chestplate'));
    // The Armoury opens on that piece: upgrading happens at its bench, reached from the champion
    // it is being upgraded for.
    const route = useGameStore.getState().ui.stack.at(-1);
    expect(route).toEqual({ name: 'armoury', pieceId: piece.instanceId });
  });

  it('says what a worn piece is on hover: its stats and its set', async () => {
    const user = userEvent.setup();
    const layer = document.createElement('div');
    layer.id = 'tooltip-layer';
    document.body.append(layer);
    const piece = stock('weapon', 'gear_set.warcry', 44);
    actions().equipGear(starter(), piece.instanceId);
    openGearTab(starter());

    const slot = within(screen.getByTestId('gear-slot-weapon')).getByRole('button', { name: 'Weapon' });
    await user.hover(slot);
    const tip = await screen.findByTestId('gear-tooltip');
    expect(tip).toHaveTextContent('Warcry Weapon');
    expect(tip).toHaveTextContent('Main stat');
    expect(tip).toHaveTextContent('SPD +6');
    // The set, with what a complete group gives.
    expect(tip.querySelector('[data-emblem="emblem.warcry"]')).not.toBeNull();
    expect(tip).toHaveTextContent('+15 % ATK while two pieces are worn.');

    // An empty slot has nothing to say.
    await user.unhover(slot);
    await user.hover(within(screen.getByTestId('gear-slot-boots')).getByRole('button'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(screen.queryByTestId('gear-tooltip')).not.toBeInTheDocument();
    layer.remove();
  });

  it('takes a piece off from the slot itself', async () => {
    const user = userEvent.setup();
    const piece = stock('boots', 'gear_set.swiftfoot', 5);
    actions().equipGear(starter(), piece.instanceId);
    openGearTab(starter());
    await user.click(screen.getByTestId('gear-remove-boots'));
    expect(save().roster[starter()]?.gear.boots).toBeNull();
    expect(save().inventory[piece.instanceId]?.equippedTo).toBeNull();
  });

  it('offers every candidate, whatever the Armoury is filtered to', async () => {
    const user = userEvent.setup();
    stock('weapon', 'gear_set.warcry', 7);
    // The racks are showing Mythics only; the picker must still offer the Epic piece.
    actions().setGearView({
      filters: { ...DEFAULT_GEAR_VIEW.filters, rarities: ['mythic'], minStars: 6 },
    });
    openGearTab(starter());
    await user.click(within(screen.getByTestId('gear-slot-weapon')).getByRole('button'));
    const picker = await screen.findByTestId('dialog-gear-picker');
    expect(within(picker).queryByTestId('gear-picker-empty')).not.toBeInTheDocument();
    expect(within(picker).getAllByRole('button', { name: /Warcry/ }).length).toBeGreaterThan(0);
  });

  it('adds the gear bonus to the Info tab’s stat table', async () => {
    const user = userEvent.setup();
    const piece = stock('weapon', 'gear_set.warcry', 6);
    actions().equipGear(starter(), piece.instanceId);
    openGearTab(starter());
    await user.click(screen.getByTestId('tab-info'));
    expect(screen.getByTestId('stat-bonus-atk')).not.toBeEmptyDOMElement();
    expect(screen.getByTestId('stat-bonus-atk')).toHaveTextContent('+');
  });
});
