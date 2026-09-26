/**
 * The page an instant clear writes (docs/tech/UI_DESIGN.md §5.30): what it counted, spent and
 * paid, the team that took the XP, and *Again* — which clears the stand once more for as long as
 * the energy lasts, and says so when it does not.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { STAGE_MAX_STARS } from '@content/balance/campaign';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { progressKey, type StagePointer } from '@engine/campaign/progress';
import type { InstantClearSummary } from '@state/instant';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import InstantClearDialog from './InstantClearDialog';

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

const STAND: StagePointer = { settlement: 1, stage: 1, difficulty: 'intro' };
/** A 1-1 run costs four energy. */
const COST = 4;

const save = () => {
  const current = useGameStore.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};

/** A level-11 chronicle with 1-1 mastered, `energy` to spend and its first three champions seated. */
function chronicle(energy: number): string[] {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (!state.save) return state;
    state.save.profile.level = FEATURE_UNLOCK_LEVEL.instant_clear;
    state.save.energy.value = energy;
    state.save.campaign.stars[progressKey('stage.01.01', 'intro')] = STAGE_MAX_STARS;
    state.save.campaign.bestTurns[progressKey('stage.01.01', 'intro')] = 9;
    return state;
  });
  return Object.keys(save().roster).slice(0, 3);
}

function clear(team: string[], runs: number): InstantClearSummary {
  const result = useGameStore.getState().actions.instantClear({ pointer: STAND, runs, party: team });
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('the instant clear dialog', () => {
  let team: string[] = [];
  beforeEach(() => {
    team = chronicle(60);
  });

  it('counts the runs written down, what they cost, and who took the XP', async () => {
    const summary = clear(team, 5);
    render(
      stage(<InstantClearDialog summary={summary} team={team} requested={5} onClose={() => undefined} />),
    );

    expect(screen.getByTestId('instant-ledger')).toHaveAttribute('data-runs', '5');
    expect(await screen.findByText('×5', undefined, { timeout: 3_000 })).toBeInTheDocument();
    expect(screen.getByTestId('instant-spent')).toHaveTextContent(`${5 * COST} ⚡ spent`);
    const cards = within(screen.getByTestId('instant-team')).getAllByRole('listitem');
    expect(cards).toHaveLength(team.length);
    expect(cards[0]).toHaveTextContent(`+${summary.championXp.toLocaleString('en-US')} XP`);
    // The spoils are the result screen's own: gold first among them.
    expect(screen.getByTestId('result-rewards')).toHaveTextContent(/gold/i);
    expect(screen.queryByTestId('instant-short')).toBeNull();
  });

  it('says when the energy covered fewer runs than were asked for', () => {
    team = chronicle(3 * COST);
    const summary = clear(team, 10);
    render(
      stage(<InstantClearDialog summary={summary} team={team} requested={10} onClose={() => undefined} />),
    );
    expect(summary.runs).toBe(3);
    expect(screen.getByTestId('instant-short')).toHaveTextContent('3 of the 10');
  });

  it('clears the stand again with the same team and count', async () => {
    const user = userEvent.setup();
    const summary = clear(team, 5);
    render(
      stage(<InstantClearDialog summary={summary} team={team} requested={5} onClose={() => undefined} />),
    );
    const energy = save().energy.value;
    expect(screen.getByTestId('instant-again')).toHaveTextContent(`Again ×5 · ${5 * COST} ⚡`);

    await user.click(screen.getByTestId('instant-again'));
    expect(save().energy.value).toBe(energy - 5 * COST);
    expect(save().stats['campaign.instant']).toBe(10);
    expect(screen.getByTestId('instant-ledger')).toHaveAttribute('data-runs', '5');
  });

  it('will not go again once the energy is spent, and says why', () => {
    team = chronicle(2 * COST);
    const summary = clear(team, 2);
    render(
      stage(<InstantClearDialog summary={summary} team={team} requested={2} onClose={() => undefined} />),
    );
    expect(save().energy.value).toBe(0);
    expect(screen.getByTestId('instant-again')).toBeDisabled();
    expect(screen.getByTestId('instant-again')).toHaveTextContent(/Not enough energy/);
  });

  it('closes on Done', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      stage(<InstantClearDialog summary={clear(team, 1)} team={team} requested={1} onClose={onClose} />),
    );
    await user.click(screen.getByTestId('instant-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
