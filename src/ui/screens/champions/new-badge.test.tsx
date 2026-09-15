import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { DEFAULT_ROSTER_VIEW } from '@engine/champions/query';
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
      {children}
    </ViewportContext.Provider>
  );
}

setManifestForTests(
  JSON.parse(readFileSync('public/assets/generated/manifest.json', 'utf8')) as AssetManifest,
);

const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;

function chronicle(): void {
  const a = actions();
  a.resetGame();
  a.newGame('Caller');
  // A new chronicle seeds itself from the clock, so anything rolled would differ run to run.
  useGameStore.setState((state) => {
    if (state.save) state.save.seedRoot = 'test-seed';
    return state;
  });
  a.chooseStarter('champ.ser_corvin');
  a.grantCurrency([{ currency: 'shard_ancient', amount: 4 }], 'test');
  a.setRosterView({ ...DEFAULT_ROSTER_VIEW, filters: { ...DEFAULT_ROSTER_VIEW.filters } });
}

/** One summoned copy, so the index has something new to mark. */
function summoned(): string {
  const result = actions().summonChampions('banner.standard', 'ancient', 1);
  if (!result.ok) throw new Error(result.error.message);
  return result.value.pulls[0]!.instance.instanceId;
}

describe('the new-champion badge', () => {
  beforeEach(() => chronicle());

  it('marks a summoned copy until the player opens it', async () => {
    const user = userEvent.setup();
    const instanceId = summoned();
    render(stage(<ChampionsScreen route={{ name: 'champions' }} />));

    const card = screen.getByTestId(`roster-card-${instanceId}`);
    expect(within(card).getByText('NEW')).toBeInTheDocument();
    expect(save().summon.unseen).toContain(instanceId);

    await user.click(card);

    expect(save().summon.unseen).not.toContain(instanceId);
    expect(within(screen.getByTestId(`roster-card-${instanceId}`)).queryByText('NEW')).toBeNull();
  });

  it('marks nothing the chronicle started with', () => {
    render(stage(<ChampionsScreen route={{ name: 'champions' }} />));
    expect(screen.queryByText('NEW')).toBeNull();
  });

  it('clears the badge when the reveal sends the player straight to the champion', () => {
    const instanceId = summoned();
    render(stage(<ChampionsScreen route={{ name: 'champions', instanceId }} />));
    expect(save().summon.unseen).not.toContain(instanceId);
  });
});
