/**
 * The Hall of Deeds (docs/tech/UI_DESIGN.md §5.31): what a card says, what a press pays, what
 * "Claim all" takes, and the frame a rank hangs up. The arithmetic is tested in
 * `engine/deeds/hall.test.ts` and the bookkeeping in `state/deeds.test.ts`; these are the flows a
 * player's hands take.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import DeedsScreen from './DeedsScreen';

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

const DEEDS = { name: 'deeds' } as const;
const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;

function chronicle({ level = FEATURE_UNLOCK_LEVEL.deeds, stats = {} as Record<string, number> } = {}): void {
  const a = actions();
  a.resetGame();
  a.newGame('Chronicler');
  a.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (state.save) {
      state.save.seedRoot = 'test-seed';
      state.save.profile.level = level;
      state.save.stats = { ...stats };
    }
    return state;
  });
}

describe('the Hall of Deeds', () => {
  beforeEach(() => chronicle({ stats: { 'campaign.cleared': 1_200, 'feat.solo': 1 } }));

  it('shows a met tier as owed, with its numeral, its goal and its renown', () => {
    render(stage(<DeedsScreen route={DEEDS} />));
    const card = screen.getByTestId('achievement-achievement.stand_breaker');
    expect(card).toHaveAttribute('data-state', 'claimable');
    expect(within(card).getByTestId('achievement-tier-achievement.stand_breaker')).toHaveTextContent('I');
    expect(card).toHaveTextContent('Clear 100 campaign stands');
    expect(card).toHaveTextContent('+5');
    // Two tiers of Stand-breaker, Lone Blade — and Starborn's first, for the 3★ starter.
    expect(screen.getByTestId('deeds-claim-all')).toHaveTextContent('Claim all (4)');
  });

  it('claims one tier and moves the card on to the next', async () => {
    const user = userEvent.setup();
    render(stage(<DeedsScreen route={DEEDS} />));
    await user.click(screen.getByTestId('achievement-claim-achievement.stand_breaker'));
    expect(save().deeds.achievements['achievement.stand_breaker']).toBe(1);
    expect(screen.getByTestId('achievement-tier-achievement.stand_breaker')).toHaveTextContent('II');
    expect(screen.getByTestId('achievement-achievement.stand_breaker')).toHaveTextContent(
      'Clear 1,000 campaign stands',
    );
  });

  it('claims everything in one press and hangs up the first rank', async () => {
    const user = userEvent.setup();
    render(stage(<DeedsScreen route={DEEDS} />));
    await user.click(screen.getByTestId('deeds-claim-all'));
    expect(save().deeds.achievements['achievement.stand_breaker']).toBe(2);
    expect(save().deeds.challenges).toEqual(['challenge.lone_blade']);
    // 5 + 10 + 50 + 5 = 70 renown: the first rank, not the second.
    expect(save().deeds.ranks).toBe(1);
    expect(screen.getByTestId('deeds-rank')).toHaveTextContent('Novice of the Hall');
    expect(screen.getByTestId('deeds-claim-all')).toBeDisabled();
  });

  it('shows a challenge on its own tab, sealed once claimed', async () => {
    const user = userEvent.setup();
    render(stage(<DeedsScreen route={DEEDS} />));
    await user.click(screen.getByTestId('deeds-tab-challenges'));
    const card = screen.getByTestId('challenge-challenge.lone_blade');
    expect(card).toHaveTextContent('Win a Normal or Hard stand with a single champion.');
    await user.click(within(card).getByTestId('challenge-claim-challenge.lone_blade'));
    expect(screen.getByTestId('challenge-done-challenge.lone_blade')).toBeVisible();
    // A challenge that hangs up a title says so on its card.
    expect(screen.getByTestId('challenge-challenge.rabble')).toHaveTextContent('Title: Rabble-Rouser');
  });

  it('filters the achievements by ledger and counts what each owes', async () => {
    const user = userEvent.setup();
    render(stage(<DeedsScreen route={DEEDS} />));
    expect(screen.getByTestId('deeds-filter-campaign')).toHaveTextContent('2');
    await user.click(screen.getByTestId('deeds-filter-portal'));
    expect(screen.queryByTestId('achievement-achievement.stand_breaker')).toBeNull();
    expect(screen.getByTestId('achievement-achievement.summoner')).toBeVisible();
  });

  it('reads the "one" form of a line that asks for exactly one thing', () => {
    render(stage(<DeedsScreen route={DEEDS} />));
    expect(screen.getByTestId('achievement-achievement.epic_tidings')).toHaveTextContent(
      'Summon an Epic champion',
    );
  });

  it('is shut before its level, and says which level opens it', () => {
    act(() => chronicle({ level: FEATURE_UNLOCK_LEVEL.deeds - 1, stats: { 'campaign.cleared': 1_200 } }));
    render(stage(<DeedsScreen route={DEEDS} />));
    expect(screen.getByTestId('deeds-locked')).toHaveTextContent(`level ${FEATURE_UNLOCK_LEVEL.deeds}`);
    expect(screen.getByTestId('deeds-claim-all')).toBeDisabled();
  });
});
