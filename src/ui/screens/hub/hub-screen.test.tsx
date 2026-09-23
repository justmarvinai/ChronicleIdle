/**
 * Emberhold's buildings (docs/tech/UI_DESIGN.md §5.2): each medallion wears what is waiting behind
 * its door — the next stage, a countdown, a count — and a hover card says what the building is for.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import HubScreen from './HubScreen';
import { coarseDuration } from './hub-status';

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

const HUB = { name: 'hub' } as const;

function chronicle(): void {
  const { actions } = useGameStore.getState();
  actions.resetGame();
  actions.newGame('Tester');
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  actions.chooseStarter('champ.ser_corvin');
}

describe('the Emberhold hub', () => {
  beforeEach(chronicle);

  it('marks each building with what stands behind its door', () => {
    render(stage(<HubScreen route={HUB} />));
    // A new chronicle: the starter and the three companions, the first stage ahead.
    expect(screen.getByTestId('hotspot-champions')).toHaveTextContent('4 in the roster');
    expect(screen.getByTestId('hotspot-campaign')).toHaveTextContent('stage 1');
    expect(screen.getByTestId('hotspot-market')).toHaveTextContent(/Restocks in \d+m/);
    // A locked building names its gate on its plate and keeps it in its accessible name.
    expect(screen.getByTestId('hotspot-forge')).toHaveTextContent('Unlocks at level 8');
    expect(screen.getByTestId('hotspot-forge')).toHaveAccessibleName(/Unlocks at level 8/);
  });

  it('counts what is owed on the medallion and says it on the plate', () => {
    const { actions } = useGameStore.getState();
    const granted = actions.grantChampion('champ.reva_ashblade', 'summon', 'test');
    if (!granted.ok) throw new Error(granted.error.message);
    useGameStore.setState((state) => {
      if (!state.save) return state;
      // A copy the Portal brought and nobody has opened yet.
      state.save.summon.unseen = [granted.value];
      // The first settlement's boss stand has fallen: the Palace opens, with three points to spend.
      state.save.campaign.stars[progressKey(stageIdOf(1, 10), 'intro')] = 3;
      state.save.palace.earned = 3;
      return state;
    });
    render(stage(<HubScreen route={HUB} />));
    const champions = screen.getByTestId('hotspot-champions');
    expect(champions).toHaveTextContent('1 new');
    expect(within(champions).getByText('1', { selector: '.num' })).toBeInTheDocument();
    expect(screen.getByTestId('hotspot-palace')).toHaveTextContent('3 points to spend');
    expect(screen.getByTestId('hotspot-palace')).toHaveAccessibleName('Glorious Palace');
  });

  it('says what a building is for on hover', async () => {
    const user = userEvent.setup();
    render(stage(<HubScreen route={HUB} />));
    await user.hover(screen.getByTestId('hotspot-tavern'));
    const card = await screen.findByRole('tooltip');
    expect(card).toHaveTextContent('Tavern');
    expect(card).toHaveTextContent('Level, rank and sharpen');
  });
});

describe('coarseDuration', () => {
  it('counts down in minutes, hours and days — never seconds, and never 0m early', () => {
    expect(coarseDuration(5_000)).toBe('1m');
    expect(coarseDuration(46 * 60_000 + 44_000)).toBe('47m');
    expect(coarseDuration(61 * 60_000)).toBe('1h 01m');
    expect(coarseDuration(25 * 3_600_000)).toBe('1d 1h');
  });
});
