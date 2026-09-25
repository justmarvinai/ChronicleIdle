/**
 * The Quests screen (docs/tech/UI_DESIGN.md §5.14): what a row says, what the press pays, and the
 * points track it fills. The board's arithmetic is tested in `state/quests.test.ts`; these are the
 * flows a player's hands actually take.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import QuestsScreen from './QuestsScreen';

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

const QUESTS = { name: 'quests' } as const;
const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;
const held = (id: string): number => save().wallet[id as 'gold'] ?? 0;

function chronicle({ level = 20 } = {}): void {
  const a = actions();
  a.resetGame();
  a.newGame('Chronicler');
  a.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (state.save) {
      state.save.seedRoot = 'test-seed';
      state.save.profile.level = level;
    }
    return state;
  });
}

/** Plays a counter a goal reads, as the campaign or the Tavern would. */
function played(key: string, by = 1): void {
  act(() => {
    useGameStore.setState((state) => {
      if (state.save) state.save.stats[key] = (state.save.stats[key] ?? 0) + by;
      return state;
    });
  });
}

describe('the ledger', () => {
  beforeEach(() => chronicle());

  it('shows the day’s quests with their progress and pays the one that is done', async () => {
    const user = userEvent.setup();
    played('campaign.cleared', 2);
    render(stage(<QuestsScreen route={QUESTS} />));

    expect(screen.getByTestId('screen-quests')).toBeInTheDocument();
    expect(screen.getByTestId('quests-points')).toHaveTextContent('0 / 100 points');
    const stages = screen.getByTestId('quest-row-quest.daily.clear_stages');
    expect(stages).toHaveTextContent('Clear 5 campaign stages');
    expect(stages).toHaveTextContent('2 / 5');
    // Not done yet: nothing to claim, and the way to where it is played instead.
    expect(screen.queryByTestId('quest-claim-quest.daily.clear_stages')).not.toBeInTheDocument();
    expect(screen.getByTestId('quest-go-quest.daily.clear_stages')).toHaveAccessibleName(
      'Go to the Campaign',
    );

    const shards = held('shard_faded');
    await user.click(screen.getByTestId('quest-claim-quest.daily.login'));
    expect(held('shard_faded')).toBe(shards + 1);
    expect(screen.getByTestId('quests-points')).toHaveTextContent('10 / 100 points');
    expect(screen.getByTestId('quest-claimed-quest.daily.login')).toHaveTextContent('Claimed');
  });

  it('takes every finished quest with one press, then has nothing left to take', async () => {
    const user = userEvent.setup();
    played('campaign.cleared', 5);
    played('idle.claims', 1);
    render(stage(<QuestsScreen route={QUESTS} />));

    const all = screen.getByTestId('quests-claim-all');
    expect(all).toHaveTextContent('Claim all (3)');
    await user.click(all);
    expect(screen.getByTestId('quests-points')).toHaveTextContent('30 / 100 points');
    expect(screen.getByTestId('quests-claim-all')).toBeDisabled();
    expect(screen.getByTestId('quests-claim-all')).toHaveTextContent('Nothing to claim yet');
  });

  it('opens the chest the points have earned, once', async () => {
    const user = userEvent.setup();
    played('campaign.cleared', 5);
    render(stage(<QuestsScreen route={QUESTS} />));
    const chest = () => screen.getByTestId('quest-chest-daily-20');
    expect(chest()).toBeDisabled();

    await user.click(screen.getByTestId('quests-claim-all'));
    const gold = held('gold');
    expect(chest()).toBeEnabled();
    await user.click(chest());
    expect(held('gold')).toBe(gold + 3_000);
    expect(chest()).toBeDisabled();
    expect(save().quests.daily.chests).toEqual([20]);
  });

  it('puts what is owed first and what is taken last', async () => {
    const user = userEvent.setup();
    played('campaign.cleared', 5);
    render(stage(<QuestsScreen route={QUESTS} />));
    const order = (): string[] =>
      screen
        .getAllByTestId(/^quest-row-/)
        .map((row) => row.getAttribute('data-testid')?.replace('quest-row-', '') ?? '');
    // The login quest and the five stands are done: both lead the board.
    expect(order().slice(0, 2)).toEqual(['quest.daily.login', 'quest.daily.clear_stages']);
    await user.click(screen.getByTestId('quest-claim-quest.daily.login'));
    // Taken, it steps to the foot of the board.
    expect(order()[0]).toBe('quest.daily.clear_stages');
    expect(order().at(-1)).toBe('quest.daily.login');
  });

  it('goes to where an open quest is played', async () => {
    const user = userEvent.setup();
    render(stage(<QuestsScreen route={QUESTS} />));
    await user.click(screen.getByTestId('quest-go-quest.daily.level_champions'));
    const stack = useGameStore.getState().ui.stack;
    expect(stack[stack.length - 1]).toEqual({ name: 'tavern', tab: 'level' });
  });

  it('sends the weekly quest that counts daily boards to the daily tab, not to a second ledger', async () => {
    const user = userEvent.setup();
    render(stage(<QuestsScreen route={QUESTS} />));
    await user.click(screen.getByTestId('quests-tab-weekly'));
    const depth = useGameStore.getState().ui.stack.length;
    await user.click(screen.getByTestId('quest-go-quest.weekly.daily_days'));
    expect(useGameStore.getState().ui.stack).toHaveLength(depth);
    expect(screen.getByTestId('quest-row-quest.daily.login')).toBeInTheDocument();
  });

  it('shows what each chest holds and how far off it is', () => {
    render(stage(<QuestsScreen route={QUESTS} />));
    const chest = screen.getByTestId('quest-chest-daily-20').closest('li');
    expect(chest).toHaveTextContent('Gold ×3,000');
    expect(chest).toHaveTextContent('20 more points');
  });

  it('switches to the weekly board and says when it opens', async () => {
    const user = userEvent.setup();
    render(stage(<QuestsScreen route={QUESTS} />));
    await user.click(screen.getByTestId('quests-tab-weekly'));
    expect(screen.getByTestId('quest-row-quest.weekly.clear_stages_weekly')).toHaveTextContent(
      'Clear 60 campaign stages',
    );

    // The same screen at level 6: the daily board is open, the weekly one is not.
    chronicle({ level: 6 });
    await user.click(screen.getByTestId('quests-tab-weekly'));
    expect(screen.getByTestId('quests-locked')).toHaveTextContent('opens at chronicle level 12');
    expect(screen.queryByTestId('quests-points')).not.toBeInTheDocument();
  });
});
