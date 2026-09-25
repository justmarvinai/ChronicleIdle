/**
 * Daily Rewards (docs/tech/UI_DESIGN.md §5.27): the day owed, what it pays and the one press that
 * pays it — then the day taken, and tomorrow's in its place. The ladder itself is tested in
 * `engine/login` and `state/login`; these are the flows a player's hands take.
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
import { LoginDialog } from './LoginDialog';

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
const held = (id: string): number => save().wallet[id as 'gold'] ?? 0;

/** A chronicle that has taken `claimed` days, the last of them on some earlier day. */
function chronicle(claimed: number): void {
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Keeper');
  actions.chooseStarter('champ.ser_corvin');
  act(() => {
    useGameStore.setState((state) => {
      if (state.save) state.save.login = { claimed, lastKey: claimed > 0 ? 'an-earlier-day' : '' };
      return state;
    });
  });
}

describe('Daily Rewards', () => {
  beforeEach(() => chronicle(3));

  it('shows the whole round at once, with the days behind taken and today’s marked', () => {
    render(stage(<LoginDialog onClose={() => undefined} />));
    expect(screen.getAllByTestId(/^login-day-/)).toHaveLength(30);
    expect(screen.getByTestId('login-day-3')).toHaveAttribute('data-taken', 'true');
    expect(screen.getByTestId('login-day-4')).toHaveAttribute('data-today', 'true');
    expect(screen.getByTestId('login-hero')).toHaveTextContent('Day 4');
    expect(screen.getByTestId('login-hero')).toHaveTextContent('Gems ×60');
  });

  it('draws a day that pays a Bag item with the item, not only its name', () => {
    render(stage(<LoginDialog onClose={() => undefined} />));
    const day = screen.getByTestId('login-day-12');
    expect(day.querySelector('img')).not.toBeNull();
    expect(day).toHaveTextContent('Brewery Token ×1');
  });

  it('pays today’s day, seals it, and shows tomorrow’s in its place', async () => {
    const user = userEvent.setup();
    render(stage(<LoginDialog onClose={() => undefined} />));
    const gems = held('gems');
    await user.click(screen.getByTestId('login-claim'));

    expect(held('gems')).toBe(gems + 60);
    expect(screen.queryByTestId('login-claim')).not.toBeInTheDocument();
    expect(screen.getByTestId('login-day-4')).toHaveAttribute('data-taken', 'true');
    expect(screen.getByTestId('login-day-5')).toHaveAttribute('data-next', 'true');
    expect(screen.getByTestId('login-hero')).toHaveTextContent('Taken');
    expect(screen.getByTestId('login-hero')).toHaveTextContent('Tomorrow is day 5');
    expect(screen.getByTestId('login-foot')).toHaveTextContent('Day 4 taken.');
  });

  it('opens on tomorrow’s day once today’s is in', () => {
    const actions = useGameStore.getState().actions;
    act(() => {
      actions.claimLoginDay();
    });
    render(stage(<LoginDialog onClose={() => undefined} />));
    expect(screen.getByTestId('login-hero')).toHaveAttribute('data-mode', 'tomorrow');
    expect(screen.getByTestId('login-hero')).toHaveTextContent('Day 5');
    expect(screen.getByTestId('login-hero')).toHaveTextContent(/Opens in/);
  });
});
