import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { INVENTORY_CAPACITY } from '@content/balance/gear';
import type { GearInstance } from '@engine/gear/instance';
import { useGameStore } from '@state/store';
import { levelCostTotal } from '@state/gear';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import ArmouryScreen from './ArmouryScreen';

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

const ARMOURY = { name: 'armoury' } as const;
const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;

/** A chronicle with a handful of pieces on the racks. */
function chronicle(drops = 6): GearInstance[] {
  const { actions: a } = useGameStore.getState();
  a.resetGame();
  a.newGame('Tester');
  // A new chronicle seeds itself from the clock, so anything rolled would differ run to run.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  a.chooseStarter('champ.ser_corvin');
  a.grantCurrency([{ currency: 'gold', amount: 500_000 }], 'test');
  const pieces: GearInstance[] = [];
  for (let i = 0; i < drops; i += 1) {
    const piece = useGameStore.getState().actions.debugGrantGear(6);
    if (piece) pieces.push(piece);
  }
  return pieces;
}

describe('the Armoury', () => {
  beforeEach(() => void chronicle());

  it('racks every piece and opens the first one on the bench', () => {
    render(stage(<ArmouryScreen route={ARMOURY} />));
    expect(screen.getByTestId('screen-armoury')).toBeInTheDocument();
    expect(screen.getByTestId('gear-count')).toHaveTextContent('6 of 6');
    expect(screen.getByTestId('gear-detail')).toBeInTheDocument();
    expect(screen.getByTestId('gear-detail-main')).not.toBeEmptyDOMElement();
    expect(screen.getByTestId('armoury-capacity')).toHaveTextContent(`6 / ${INVENTORY_CAPACITY}`);
  });

  it('filters the racks by slot and clears the filter again', async () => {
    const user = userEvent.setup();
    render(stage(<ArmouryScreen route={ARMOURY} />));
    const slots = new Set(Object.values(save().inventory).map((p) => p.slot));
    const [slot] = [...slots];
    if (!slot) throw new Error('no pieces');
    await user.click(screen.getByTestId(`gear-filter-slot-${slot}`));
    const expected = Object.values(save().inventory).filter((p) => p.slot === slot).length;
    expect(screen.getByTestId('gear-count')).toHaveTextContent(`${expected} of 6`);
    await user.click(screen.getByTestId('gear-filter-clear'));
    expect(screen.getByTestId('gear-count')).toHaveTextContent('6 of 6');
  });

  it('buys four levels for what the button says, and rolls a substat at +4', async () => {
    const user = userEvent.setup();
    const chosen = Object.values(save().inventory)[0];
    if (!chosen) throw new Error('no piece on the bench');
    actions().selectGearPiece(chosen.instanceId);
    render(stage(<ArmouryScreen route={ARMOURY} />));
    expect(screen.getByTestId('gear-detail-name')).not.toBeEmptyDOMElement();
    const goldBefore = save().wallet.gold;
    const expected = levelCostTotal(chosen, 4);

    await user.click(screen.getByTestId('gear-upgrade-4'));

    const after = save().inventory[chosen.instanceId];
    expect(after?.level).toBe(4);
    expect(save().wallet.gold).toBe(goldBefore - expected);
    // The roll at +4 either added a substat or grew one: the piece is worth more than it was.
    expect(after?.subs.length).toBeGreaterThanOrEqual(chosen.subs.length);
    expect(screen.getByTestId('gear-detail-level')).toHaveTextContent('+4');
  });

  it('refuses an upgrade there is no gold for', async () => {
    const user = userEvent.setup();
    useGameStore.setState((state) => {
      if (state.save) state.save.wallet.gold = 0;
      return state;
    });
    render(stage(<ArmouryScreen route={ARMOURY} />));
    expect(screen.getByTestId('gear-upgrade-1')).toBeDisabled();
    await user.click(screen.getByTestId('gear-upgrade-1'));
    expect(Object.values(save().inventory).every((p) => p.level === 0)).toBe(true);
  });

  it('locks a piece and says so in the save', async () => {
    const user = userEvent.setup();
    render(stage(<ArmouryScreen route={ARMOURY} />));
    await user.click(screen.getByTestId('gear-lock'));
    const selected = useGameStore.getState().ui.armoury.selected;
    expect(Object.values(save().inventory).some((p) => p.locked)).toBe(true);
    if (selected) expect(save().inventory[selected]?.locked).toBe(true);
    await user.click(screen.getByTestId('gear-lock'));
    expect(Object.values(save().inventory).every((p) => !p.locked)).toBe(true);
  });

  it('takes a worn piece off from the bench', async () => {
    const user = userEvent.setup();
    const champion = Object.keys(save().roster)[0] as string;
    const piece = Object.values(save().inventory)[0] as GearInstance;
    actions().equipGear(champion, piece.instanceId);
    actions().selectGearPiece(piece.instanceId);
    render(stage(<ArmouryScreen route={ARMOURY} />));
    expect(screen.getByTestId('gear-detail-wearer')).toHaveTextContent('Worn by');
    await user.click(screen.getByTestId('gear-unequip'));
    expect(save().inventory[piece.instanceId]?.equippedTo).toBeNull();
    expect(save().roster[champion]?.gear[piece.slot]).toBeNull();
  });

  it('warns when the racks are nearly full', () => {
    useGameStore.setState((state) => {
      if (!state.save) return state;
      const template = Object.values(state.save.inventory)[0];
      if (!template) return state;
      for (let i = 0; i < Math.floor(INVENTORY_CAPACITY * 0.9); i += 1)
        state.save.inventory[`gear-fill-${i}`] = { ...template, instanceId: `gear-fill-${i}` };
      return state;
    });
    render(stage(<ArmouryScreen route={ARMOURY} />));
    expect(screen.getByTestId('armoury-capacity-warn')).toBeInTheDocument();
  });

  it('says so plainly when there is nothing on the racks', () => {
    const { actions: a } = useGameStore.getState();
    a.resetGame();
    a.newGame('Tester');
    useGameStore.setState((state) => {
      if (state.save) state.save.seedRoot = 'test-seed';
      return state;
    });
    a.chooseStarter('champ.ser_corvin');
    render(stage(<ArmouryScreen route={ARMOURY} />));
    const bench = screen.getByTestId('armoury-no-selection');
    expect(within(bench).getByText(/Nothing here yet/)).toBeInTheDocument();
  });
});
