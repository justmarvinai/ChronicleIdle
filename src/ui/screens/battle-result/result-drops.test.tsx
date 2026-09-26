/**
 * How the result screen shows what a campaign run dropped (GEAR.md §5.1): each piece as its own
 * painting badged with its set's emblem and named in its rarity, so a drop says which set it is
 * before a word of it is read — and a long batch as a dozen of those and a count, not a wall.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { imageUrl, setManifestForTests } from '@assets/manifest';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { GEAR_SLOTS } from '@content/champions/types';
import { content } from '@content/registry';
import type { GearInstance } from '@engine/gear/instance';
import { NO_LEVEL_UP } from '@state/progression';
import { battleController } from '@state/battle/index';
import { campaignSession, clearCampaignSession } from '@state/campaign-session';
import type { RunSummary } from '@state/campaign';
import { useGameStore } from '@state/store';
import { pieceName } from '@ui/gear/gear-view';
import { RARITY_COLOR } from '@ui/styles/display-maps';
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

/** The `n`th piece of a batch: the sets and slots turn over so no two neighbours look alike. */
function drop(n: number): GearInstance {
  const set = content.gearSets[n % content.gearSets.length];
  if (!set) throw new Error('no sets');
  return {
    instanceId: `gear-drop-${n}`,
    slot: GEAR_SLOTS[n % GEAR_SLOTS.length] ?? 'weapon',
    setId: set.id,
    rarity: n % 2 ? 'rare' : 'epic',
    stars: 3,
    level: 0,
    mainStat: 'atk',
    subs: [],
    equippedTo: null,
    locked: false,
    acquiredAt: 0,
    source: 'campaign_drop',
  };
}

/** One won run that dropped `gear`. */
function run(gear: GearInstance[]): RunSummary {
  return {
    stars: 3,
    starsBefore: 3,
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
    levelUps: [],
    gear,
    gearLost: 0,
    playerLevelsGained: 0,
    levelUp: NO_LEVEL_UP,
    completedDifficulty: false,
    palacePoints: 0,
  };
}

/** The screen after a batch of `runs`, each dropping what it is given. */
function afterTheBatch(runs: GearInstance[][]): void {
  const encounter = content.encounterById(ENCOUNTER);
  if (!encounter) throw new Error('no encounter');
  campaignSession.setState({
    pointer: { settlement: 1, stage: 1, difficulty: 'intro' },
    team: [],
    control: 'auto',
    cost: 4,
    runIndex: runs.length - 1,
    requested: runs.length,
    completed: runs.length,
    stopping: false,
    endedBecause: 'done',
    summaries: runs.map(run),
  });
  battleController.store.setState({
    status: 'ended',
    encounter,
    outcome: {
      kind: 'victory',
      turns: 6,
      allyTurns: 4,
      wavesCleared: 2,
      waveCount: 2,
      units: [],
      enemyHpLeft: 0,
      seed: 'seed',
      decisions: [],
    },
  });
}

describe('the drops on a campaign result', () => {
  beforeEach(() => {
    const actions = useGameStore.getState().actions;
    actions.resetGame();
    actions.newGame('Chronicler');
    actions.chooseStarter('champ.ser_corvin');
    clearCampaignSession();
    battleController.end();
  });

  it('draws each piece as its painting and its set’s emblem, named in its rarity', () => {
    const [first, second] = [drop(0), drop(1)];
    afterTheBatch([[first], [], [second]]);
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    for (const piece of [first, second]) {
      const set = content.gearSetById(piece.setId);
      if (!set) throw new Error('no set');
      const chip = screen.getByTestId(`result-gear-${piece.instanceId}`);
      // The painting of that set's piece in that slot…
      expect(chip.querySelector('img')?.getAttribute('src')).toBe(imageUrl(set.art[piece.slot], 80));
      // …the set's emblem on it…
      expect(chip.querySelector(`[data-emblem="${set.emblem}"]`)).not.toBeNull();
      // …and the piece's name, in the colour of its rarity.
      const name = within(chip).getByText(pieceName(piece));
      expect(name.style.color).toBe(RARITY_COLOR[piece.rarity]);
    }
    expect(screen.queryByTestId('result-gear-more')).not.toBeInTheDocument();
  });

  it('draws a dozen of a long batch and counts the rest', () => {
    const runs = Array.from({ length: 20 }, (_, n) => [drop(n)]);
    afterTheBatch(runs);
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));

    expect(within(screen.getByTestId('result-gear')).getAllByRole('listitem')).toHaveLength(12);
    expect(screen.getByTestId('result-gear-more')).toHaveTextContent('8 more');
  });
});

describe('a stand taken to its last star', () => {
  beforeEach(() => {
    const actions = useGameStore.getState().actions;
    actions.resetGame();
    actions.newGame('Chronicler');
    actions.chooseStarter('champ.ser_corvin');
    clearCampaignSession();
    battleController.end();
  });

  /** The screen after one run that took the stand from `before` stars to `after`. */
  function afterTheRun(before: number, after: number): void {
    afterTheBatch([[]]);
    campaignSession.setState({ summaries: [{ ...run([]), starsBefore: before, stars: after }] });
  }

  const atLevel = (level: number): void =>
    useGameStore.setState((state) => {
      if (state.save) state.save.profile.level = level;
      return state;
    });

  it('says it can be cleared instantly from now on', () => {
    atLevel(FEATURE_UNLOCK_LEVEL.instant_clear);
    afterTheRun(2, 3);
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));
    expect(screen.getByTestId('result-mastered')).toHaveTextContent(/clear it instantly/i);
  });

  it('names the level instant clears open at, before the chronicle reaches it', () => {
    atLevel(FEATURE_UNLOCK_LEVEL.instant_clear - 1);
    afterTheRun(1, 3);
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));
    expect(screen.getByTestId('result-mastered')).toHaveTextContent(
      `chronicle level ${FEATURE_UNLOCK_LEVEL.instant_clear}`,
    );
  });

  it('says nothing of a stand that was mastered already, or still is not', () => {
    atLevel(FEATURE_UNLOCK_LEVEL.instant_clear);
    afterTheRun(3, 3);
    const { unmount } = render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));
    expect(screen.queryByTestId('result-mastered')).toBeNull();
    unmount();
    afterTheRun(1, 2);
    render(stage(<BattleResultScreen route={{ name: 'battle-result' }} />));
    expect(screen.queryByTestId('result-mastered')).toBeNull();
  });
});
