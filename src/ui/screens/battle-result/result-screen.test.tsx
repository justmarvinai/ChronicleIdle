/**
 * The result screen's presses (docs/tech/UI_DESIGN.md §5.10): the one that matters sits on the
 * right — the next stand after a win, the team after a loss, a mode's own way back after its fight
 * — the team is never offered twice, and a lost stand says what to try and where, one press away.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { content } from '@content/registry';
import type { BattleOutcome, BattleOutcomeKind, UnitReport } from '@engine/battle/index';
import { battleController } from '@state/battle/index';
import type { RunSummary } from '@state/campaign';
import { campaignSession, clearCampaignSession } from '@state/campaign-session';
import { NO_LEVEL_UP } from '@state/progression';
import { useGameStore } from '@state/store';
import { clearTowerSession, towerSession } from '@state/tower-session';
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

const ENCOUNTER = 'encounter.stage.01.01.intro';
const COST = 4;

/** The chronicle's champions as a fight's allies, the second dealing the most. */
function allies(): UnitReport[] {
  const roster = Object.values(useGameStore.getState().save?.roster ?? {});
  return roster.slice(0, 3).map((instance, n) => ({
    unitId: `a${n}`,
    defId: instance.defId,
    instanceId: instance.instanceId,
    side: 'ally',
    alive: n !== 2,
    died: n === 2,
    damageDealt: n === 1 ? 900 : 300,
    damageTaken: 100,
    healingDone: 0,
    kills: n,
    hp: 100,
    maxHp: 100,
  }));
}

function outcomeOf(kind: BattleOutcomeKind, over: Partial<BattleOutcome> = {}): BattleOutcome {
  return {
    kind,
    turns: 12,
    allyTurns: 8,
    wavesCleared: kind === 'victory' ? 2 : 1,
    waveCount: 2,
    units: allies(),
    enemyHpLeft: kind === 'victory' ? 0 : 0.34,
    seed: 'seed',
    decisions: [],
    ...over,
  };
}

/** A won run of stage 1-1 that carried the first ally a level. */
function wonRun(): RunSummary {
  const first = allies()[0]?.instanceId ?? '';
  return {
    stars: 3,
    starsBefore: 0,
    firstClear: false,
    newRecord: false,
    chestThresholds: [],
    rewards: {
      championXp: 100,
      playerXp: 10,
      currencies: [{ currency: 'gold', amount: 500 }],
      energy: 0,
      gems: 0,
      gear: [],
      firstClear: null,
      starChests: [],
      milestone: null,
    },
    changes: [],
    levelUps: [{ instanceId: first, level: 2, levelsGained: 1 }],
    gear: [],
    gearLost: 0,
    playerLevelsGained: 0,
    levelUp: NO_LEVEL_UP,
    completedDifficulty: false,
    palacePoints: 0,
  };
}

/** The screen after a stand of stage 1-1 that ended `kind`. */
function afterTheStand(kind: BattleOutcomeKind, over: Partial<BattleOutcome> = {}): void {
  const encounter = content.encounterById(ENCOUNTER);
  if (!encounter) throw new Error('no encounter');
  if (kind === 'victory')
    // The stand is banked as the chronicle's first clear, so the next stand is 1-2.
    useGameStore.setState((state) => {
      if (state.save) state.save.campaign.stars['stage.01.01|intro'] = 3;
    });
  campaignSession.setState({
    pointer: { settlement: 1, stage: 1, difficulty: 'intro' },
    team: [],
    control: 'auto',
    cost: COST,
    runIndex: 0,
    requested: 1,
    completed: 1,
    stopping: false,
    endedBecause: kind === 'victory' ? 'done' : 'defeat',
    summaries: kind === 'victory' ? [wonRun()] : [],
  });
  battleController.store.setState({ status: 'ended', encounter, outcome: outcomeOf(kind, over) });
}

const top = () => useGameStore.getState().ui.stack.at(-1);

describe('the result of a stand', () => {
  beforeEach(() => {
    const actions = useGameStore.getState().actions;
    actions.resetGame();
    actions.newGame('Chronicler');
    actions.chooseStarter('champ.ser_corvin');
    clearCampaignSession();
    clearTowerSession();
    battleController.end();
  });

  it('after a win leads on to the next stand, offers the team once and replays at its price', () => {
    afterTheStand('victory');
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    expect(screen.getByTestId('result-title')).toHaveTextContent('Victory');
    expect(screen.getByTestId('result-next')).toBeInTheDocument();
    expect(screen.getAllByTestId('result-team')).toHaveLength(1);
    expect(screen.getByTestId('result-replay')).toHaveTextContent(`Replay · ${COST} ⚡`);
    // A won stand has no advice and no reckoning of what was left of the enemy.
    expect(screen.queryByTestId('result-advice')).not.toBeInTheDocument();
    expect(screen.queryByTestId('result-enemy-left')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('result-next'));
    expect(top()).toEqual({ name: 'battle-setup', encounterId: 'encounter.stage.01.02.intro' });
  });

  it('draws the team as cards: the top dealer is the MVP, the fallen say so, a level-up shows', () => {
    afterTheStand('victory');
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    expect(screen.getByTestId('result-report')).toBeInTheDocument();
    expect(screen.getByTestId('result-champion-a1')).toHaveAttribute('data-mvp', 'true');
    expect(screen.getByTestId('result-champion-a0')).toHaveAttribute('data-mvp', 'false');
    expect(screen.getByTestId('result-champion-a2')).toHaveTextContent('Fallen');
    expect(screen.getByTestId('result-levelup-a0')).toHaveTextContent('Level up');
    expect(screen.queryByTestId('result-levelup-a1')).not.toBeInTheDocument();
    // The fight in numbers sits at the end of the team's heading.
    expect(screen.getByTestId('result-turns')).toHaveTextContent('8');
  });

  it('after a loss puts the team on the right, once, and says how close it came', () => {
    afterTheStand('defeat');
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    expect(screen.getByTestId('result-title')).toHaveTextContent('Defeat');
    expect(screen.queryByTestId('result-next')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('result-team')).toHaveLength(1);
    expect(screen.getByTestId('result-replay')).toHaveTextContent(`Try again · ${COST} ⚡`);
    expect(screen.getByTestId('result-enemy-left')).toHaveTextContent('34%');
    expect(screen.getByTestId('result-advice')).toHaveTextContent('A lost stand pays nothing');

    fireEvent.click(screen.getByTestId('result-team'));
    expect(top()).toEqual({ name: 'battle-setup', encounterId: ENCOUNTER });
    expect(campaignSession.getState().pointer).toBeNull();
  });

  it('turns each reason for a loss into advice with the place to act on it one press away', () => {
    // Out-sped: the enemy took three turns to the team's one.
    afterTheStand('defeat', { turns: 32, allyTurns: 8 });
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    expect(screen.getByTestId('result-advice-battleResult.hint.outsped')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('result-go-champions'));
    expect(top()).toEqual({ name: 'champions' });
    expect(battleController.store.getState().outcome).toBeNull();
  });

  it('offers the three places a team grows stronger after a loss', () => {
    afterTheStand('defeat');
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    for (const place of ['tavern', 'champions', 'portal'])
      expect(screen.getByTestId(`result-grow-${place}`)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('result-grow-tavern'));
    expect(top()).toEqual({ name: 'tavern' });
  });

  it('after a retreat leads back to the team, without a reckoning of the enemy or any advice', () => {
    afterTheStand('retreat');
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    expect(screen.getByTestId('result-title')).toHaveTextContent('Retreat');
    expect(screen.getAllByTestId('result-team')).toHaveLength(1);
    expect(screen.queryByTestId('result-enemy-left')).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^result-advice-/)).not.toBeInTheDocument();
  });
});

describe('the result of a tower floor', () => {
  beforeEach(() => {
    const actions = useGameStore.getState().actions;
    actions.resetGame();
    actions.newGame('Chronicler');
    actions.chooseStarter('champ.ser_corvin');
    clearCampaignSession();
    clearTowerSession();
    battleController.end();
  });

  it('leads back to the tower, and offers neither the campaign nor a stand’s team or replay', () => {
    const encounter = content.encounterById(ENCOUNTER);
    if (!encounter) throw new Error('no encounter');
    towerSession.setState({
      floor: 3,
      team: [],
      control: 'auto',
      summary: {
        floor: 3,
        boss: false,
        cleared: true,
        highestFloor: 3,
        newBest: true,
        playerXp: 10,
        championXp: 20,
        levelUps: [],
        levelUp: NO_LEVEL_UP,
        changes: [],
        shards: [],
        palacePoints: 0,
      },
    });
    battleController.store.setState({ status: 'ended', encounter, outcome: outcomeOf('victory') });
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    expect(screen.getByTestId('result-tower')).toBeInTheDocument();
    for (const id of ['result-team', 'result-campaign', 'result-replay', 'result-next', 'result-stars'])
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('result-tower'));
    expect(top()).toEqual({ name: 'tower' });
    expect(towerSession.getState().summary).toBeNull();
  });
});
