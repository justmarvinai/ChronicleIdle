/**
 * What the result screen says when a clear paid skill points (`GLORIOUS_PALACE.md` §2).
 *
 * The plate is the one place a player is told a fight moved the Palace, and it is a button because
 * the point is no use where it was won. The arithmetic that decides the number is in
 * `state/palace.test.ts`; this is what the screen does with it.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { content } from '@content/registry';
import { NO_LEVEL_UP } from '@state/progression';
import { battleController } from '@state/battle/index';
import { campaignSession, clearCampaignSession } from '@state/campaign-session';
import type { RunSummary } from '@state/campaign';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import BattleResultScreen from './BattleResultScreen';

vi.mock('@render/ambient/AmbientLayer', () => ({ AmbientLayer: () => null }));
vi.mock('@ui/hooks/useSceneAudio', () => ({ useSceneAudio: () => undefined }));
vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));

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
      {children}
    </ViewportContext.Provider>
  );
}

const ENCOUNTER = 'encounter.stage.01.10.intro';

/** A finished stand, with whatever the Palace paid for it. */
function summary(palacePoints: number): RunSummary {
  return {
    stars: 3,
    starsBefore: 0,
    firstClear: true,
    newRecord: false,
    chestThresholds: [],
    rewards: null,
    changes: [],
    levelUps: [],
    gear: [],
    gearLost: 0,
    playerLevelsGained: 0,
    levelUp: NO_LEVEL_UP,
    completedDifficulty: false,
    palacePoints,
  };
}

/** Puts the screen where it would be after a won stand, with `points` owed to the Palace. */
function afterTheStand(points: number): void {
  const encounter = content.encounterById(ENCOUNTER);
  if (!encounter) throw new Error('no encounter');
  campaignSession.setState({
    pointer: { settlement: 1, stage: 10, difficulty: 'intro' },
    team: [],
    control: 'auto',
    cost: 6,
    runIndex: 0,
    requested: 1,
    completed: 1,
    stopping: false,
    endedBecause: 'done',
    summaries: [summary(points)],
  });
  battleController.store.setState({
    status: 'ended',
    encounter,
    outcome: {
      kind: 'victory',
      turns: 20,
      allyTurns: 9,
      wavesCleared: 3,
      waveCount: 3,
      units: [],
      enemyHpLeft: 0,
      seed: 'seed',
      decisions: [],
    },
  });
}

describe('the result screen', () => {
  beforeEach(() => {
    const actions = useGameStore.getState().actions;
    actions.resetGame();
    actions.newGame('Chronicler');
    actions.chooseStarter('champ.ser_corvin');
    clearCampaignSession();
    battleController.end();
  });

  it('says when a stand paid a skill point, and takes you to the Palace', async () => {
    const user = userEvent.setup();
    afterTheStand(1);
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    const plate = screen.getByTestId('result-palace-points');
    expect(plate).toHaveTextContent('The Glorious Palace');
    expect(plate).toHaveTextContent('+1 Skill Point');

    await user.click(plate);
    expect(useGameStore.getState().ui.stack.at(-1)).toEqual({ name: 'palace' });
  });

  it('counts a batch as one plate, and stays quiet when nothing was paid', () => {
    afterTheStand(0);
    const { rerender } = render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));
    expect(screen.queryByTestId('result-palace-points')).not.toBeInTheDocument();

    campaignSession.setState({ summaries: [summary(1), summary(0), summary(1)], completed: 3 });
    rerender(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));
    expect(screen.getByTestId('result-palace-points')).toHaveTextContent('+2 Skill Points');
  });
});
