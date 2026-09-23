/**
 * The settings (docs/tech/UI_DESIGN.md §5.17): a rail of sections that the arrows walk, each
 * setting a card whose control applies at once and is saved with the chronicle, and the battle
 * speed as plates — the speeds not yet earned are chained and say so rather than apply.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { SettingsDialog } from './SettingsDialog';

vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));
// The bootstrap registers the app's services; the dialog reads only the version off them.
vi.mock('@state/services', () => ({ services: () => ({ appVersion: '0.0.0-test' }) }));

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

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

const settings = () => {
  const saved = useGameStore.getState().save?.settings;
  if (!saved) throw new Error('no chronicle');
  return saved;
};

describe('the settings', () => {
  beforeEach(() => {
    const actions = useGameStore.getState().actions;
    actions.resetGame();
    actions.newGame('Chronicler');
    actions.chooseStarter('champ.ser_corvin');
  });

  it('opens on Audio, with every section on the rail, and walks the rail with the arrows', async () => {
    const user = userEvent.setup();
    render(stage(<SettingsDialog onClose={() => undefined} />));

    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual([
      'Audio',
      'Display',
      'Battle',
      'Save data',
      'About',
    ]);
    expect(screen.getByRole('tab', { name: 'Audio' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('settings-pane-audio')).toBeInTheDocument();

    screen.getByRole('tab', { name: 'Audio' }).focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Display' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Display' })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'About' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Audio' })).toHaveAttribute('aria-selected', 'true');
  });

  it('applies a switch at once and keeps it in the chronicle', async () => {
    const user = userEvent.setup();
    render(stage(<SettingsDialog onClose={() => undefined} />));

    await user.click(screen.getByRole('tab', { name: 'Display' }));
    const motion = screen.getByRole('switch', { name: 'Reduce menu motion' });
    expect(motion).toHaveAttribute('aria-checked', 'false');
    await user.click(motion);
    expect(settings().reducedMotion).toBe(true);
    expect(motion).toHaveAttribute('aria-checked', 'true');
    expect(motion).toHaveTextContent('On');
  });

  it('sets a volume from its card', () => {
    render(stage(<SettingsDialog onClose={() => undefined} />));

    fireEvent.change(screen.getByLabelText('Music'), { target: { value: '0.25' } });
    expect(settings().musicVolume).toBe(0.25);
  });

  it('offers the earned speeds as plates, and says where a chained one is earned', async () => {
    const user = userEvent.setup();
    render(stage(<SettingsDialog onClose={() => undefined} />));

    await user.click(screen.getByRole('tab', { name: 'Battle' }));
    await user.click(screen.getByTestId('settings-speed-2'));
    expect(settings().battleSpeed).toBe(2);
    expect(screen.getByTestId('settings-speed-2')).toHaveAttribute('aria-checked', 'true');

    // A new chronicle has earned ×1 and ×2; ×3 is the Normal campaign's to give.
    await user.click(screen.getByTestId('settings-speed-3'));
    expect(settings().battleSpeed).toBe(2);
    expect(screen.getByTestId('settings-speed-3')).toHaveAttribute('aria-disabled', 'true');
    expect(useGameStore.getState().ui.toasts.at(-1)?.textKey).toBe('settings.battleSpeedLocked');
  });
});
