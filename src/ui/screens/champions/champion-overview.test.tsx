/**
 * The Champions overview around the portrait (docs/tech/UI_DESIGN.md §5.3): the kit strip under
 * the painting and the worn gear under the stats — both a glance at a tab, and both a way into it.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import type { GearInstance } from '@engine/gear/instance';
import { useGameStore } from '@state/store';
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
      <div id="tooltip-layer" />
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
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  a.chooseStarter('champ.ser_corvin');
  // Level 3 opens the gear feature (`unlocks.ts`).
  a.grantPlayerXp(4_000, 'test');
}

/** One Warcry piece of a slot, straight onto the champion. */
function wear(slot: GearInstance['slot'], serial: number): GearInstance {
  const piece: GearInstance = {
    instanceId: `gear-overview-${serial}`,
    slot,
    setId: 'gear_set.warcry',
    rarity: 'epic',
    stars: 5,
    level: 4,
    mainStat: slot === 'weapon' ? 'atk' : 'hp',
    subs: [{ stat: 'spd', value: 6, rolls: 1 }],
    equippedTo: null,
    locked: false,
    acquiredAt: Date.UTC(2026, 8, 20) + serial,
    source: 'campaign_drop',
  };
  useGameStore.setState((state) => {
    if (state.save) state.save.inventory[piece.instanceId] = piece;
    return state;
  });
  actions().equipGear(starter(), piece.instanceId);
  return piece;
}

function open() {
  actions().selectChampion(starter());
  return render(stage(<ChampionsScreen route={{ name: 'champions', instanceId: starter() }} />));
}

describe('the champion overview', () => {
  beforeEach(chronicle);

  it('shows the kit under the portrait, says what each does, and opens the Abilities tab', async () => {
    const user = userEvent.setup();
    open();
    // Ser Corvin carries two actives and a passive, and no aura: the strip holds exactly those.
    const kit = screen.getByTestId('hero-kit');
    expect(within(kit).getByTestId('hero-kit-a1')).toHaveTextContent('A1');
    expect(within(kit).getByTestId('hero-kit-a2')).toHaveTextContent('A2');
    expect(within(kit).getByTestId('hero-kit-passive')).toHaveTextContent('Passive');
    expect(within(kit).queryByTestId('hero-kit-aura')).toBeNull();

    await user.hover(within(screen.getByTestId('hero-kit-a2')).getByRole('button'));
    const tip = await screen.findByRole('tooltip');
    expect(tip).toHaveTextContent('A2');
    expect(tip).toHaveTextContent(/Cooldown \d|No cooldown/);

    // A passive reads rather than casts, so it presses like the rest.
    await user.click(within(screen.getByTestId('hero-kit-passive')).getByRole('button'));
    expect(screen.getByTestId('panel-abilities')).toBeInTheDocument();
  });

  it('names the three stat columns in their colours, where a hint line used to explain them', () => {
    open();
    const info = screen.getByTestId('panel-info');
    expect(info).toHaveTextContent('Base');
    expect(info).toHaveTextContent('Gear');
    expect(info).toHaveTextContent('Palace');
    expect(info).not.toHaveTextContent('Base stats first');
  });

  it('lists what the champion wears under the stats, and opens the Gear tab from any slot', async () => {
    const user = userEvent.setup();
    wear('weapon', 1);
    wear('helmet', 2);
    open();
    const worn = screen.getByTestId('info-worn');
    const weapon = within(worn).getByTestId('info-worn-weapon');
    expect(weapon).toHaveAccessibleName('Warcry Weapon');
    expect(weapon).toHaveTextContent('+4');
    expect(weapon.querySelector('[data-emblem]')).toHaveAttribute('data-emblem', 'emblem.warcry');
    expect(within(worn).getByTestId('info-worn-boots')).toHaveAccessibleName('Nothing on the Boots slot.');
    // Two Warcry pieces complete the set, and the strip says so with its emblem.
    expect(within(worn).getByTestId('info-worn-sets')).toHaveTextContent('Warcry');

    await user.hover(weapon);
    expect(await screen.findByTestId('gear-tooltip')).toHaveTextContent('Warcry Weapon');

    await user.click(within(worn).getByTestId('info-worn-boots'));
    expect(screen.getByTestId('panel-gear')).toBeInTheDocument();
  });
});
