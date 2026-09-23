/**
 * The Brewery screen (docs/tech/UI_DESIGN.md §5.23): what the four halls say about themselves,
 * which stage a run may be spent on, and what a barred door does.
 *
 * The rules live in `state/brewery.test.ts` and `engine/brewery/brewery.test.ts`; these are the
 * presses a player's hands make.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { BREWERY_DAILY_RUNS } from '@content/balance/brewery';
import { DAILY_RESET_HOUR } from '@content/balance/economy';
import { dailyKey } from '@engine/time/clock';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import BreweryScreen from './BreweryScreen';

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

/** 2026-09-16 12:00 — a Wednesday, one of the three days the Waning Cellar brews. */
const WEDNESDAY = new Date(2026, 8, 16, 12, 0).getTime();
/** The Monday after, when it is barred. */
const MONDAY = new Date(2026, 8, 21, 12, 0).getTime();

/**
 * A chronicle at level 20 with the Brewery open.
 *
 * Reduced motion is on: the runs counter eases towards its value, and the stage rows fade in, so a
 * test would otherwise read a number mid-tween.
 */
function brewer(now: number): void {
  document.documentElement.dataset['reducedMotion'] = 'true';
  vi.setSystemTime(now);
  const actions = useGameStore.getState().actions;
  actions.resetGame();
  actions.newGame('Brewer');
  actions.chooseStarter('champ.ser_corvin');
  useGameStore.setState((state) => {
    if (state.save) state.save.profile.level = 20;
    return state;
  });
}

const VALOR = { name: 'brewery', hall: 'valor' } as const;
const row = (element: string, stage: number) => screen.getByTestId(`brewery-stage-${element}-${stage}`);
const enter = (element: string, stage: number) => screen.getByTestId(`brewery-enter-${element}-${stage}`);

describe('the Brewery', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    brewer(WEDNESDAY);
  });

  it('opens on the hall it was asked for, with the day’s runs over it', () => {
    render(stage(<BreweryScreen route={VALOR} />));

    expect(screen.getByTestId('screen-brewery')).toBeInTheDocument();
    expect(screen.getByTestId('brewery-hall-name')).toHaveTextContent('The Ember Vats');
    expect(screen.getByTestId('brewery-runs-left')).toHaveTextContent(`${BREWERY_DAILY_RUNS}`);
    expect(screen.getByTestId('brewery-hall-days')).toHaveTextContent('Open every day');
    expect(screen.getByTestId('brewery-doors-valor')).toHaveTextContent('Open today');
    // Justice beats Valor, so the Ember Vats tell the player to bring Justice champions.
    expect(screen.getByTestId('brewery-bring')).toHaveTextContent('Bring Justice champions');
  });

  it('shows five stages, the first open and the rest shut behind it', () => {
    render(stage(<BreweryScreen route={VALOR} />));

    expect(row('valor', 1)).toHaveAttribute('data-state', 'next');
    expect(enter('valor', 1)).toBeEnabled();
    for (const stage of [2, 3, 4, 5]) {
      expect(row('valor', stage)).toHaveAttribute('data-state', 'locked');
      expect(screen.queryByTestId(`brewery-enter-valor-${stage}`)).not.toBeInTheDocument();
    }
    // Stage N pays N brews, which is the whole reward curve.
    expect(row('valor', 1)).toHaveTextContent('1');
    expect(row('valor', 5)).toHaveTextContent('5');
  });

  it('walks to a hall when its tab is pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(stage(<BreweryScreen route={VALOR} />));

    await user.click(screen.getByTestId('brewery-tab-faith'));
    expect(screen.getByTestId('brewery-hall-name')).toHaveTextContent('The Frostwell Cellar');
    expect(screen.getByTestId('brewery-bring')).toHaveTextContent('Valor');
    expect(row('faith', 1)).toHaveAttribute('data-state', 'next');
  });

  it('sends a run to battle setup, spending nothing until the fight is asked for', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(stage(<BreweryScreen route={VALOR} />));

    await user.click(enter('valor', 1));
    const route = useGameStore.getState().ui.stack.at(-1);
    expect(route).toEqual({ name: 'battle-setup', encounterId: 'encounter.brewery.valor.1' });
    // The run is charged by the flow that starts the fight, not by walking to the setup screen.
    expect(useGameStore.getState().save?.brewery.runs).toBe(0);
  });

  it('bars the Waning Cellar on a Monday and says when it opens', () => {
    brewer(MONDAY);
    render(stage(<BreweryScreen route={{ name: 'brewery', hall: 'eclipse' }} />));

    expect(screen.getByTestId('brewery-doors-eclipse')).toHaveTextContent('Closed today');
    expect(screen.getByTestId('brewery-hall-days')).toHaveTextContent('Wed, Sat, Sun');
    expect(screen.getByTestId('brewery-barred')).toHaveTextContent('they open Wednesday');
    expect(enter('eclipse', 1)).toBeDisabled();
    // Every other hall is brewing, so the screen is not a dead end: their tabs say so.
    expect(screen.getByTestId('brewery-tab-eclipse')).toHaveAttribute('data-open', 'false');
    for (const element of ['justice', 'valor', 'faith'])
      expect(screen.getByTestId(`brewery-tab-${element}`)).toHaveAttribute('data-open', 'true');
  });

  it('shows each hall’s depth and the brew it pays already held, on the hall’s card', () => {
    useGameStore.setState((state) => {
      if (state.save) {
        state.save.wallet.brew_valor = 7;
        state.save.brewery.cleared['brewery.valor'] = 2;
      }
      return state;
    });
    render(stage(<BreweryScreen route={VALOR} />));

    expect(screen.getByTestId('brewery-progress-valor')).toHaveTextContent('2/5');
    expect(screen.getByTestId('brewery-held-valor')).toHaveTextContent('7 held');
    expect(row('valor', 2)).toHaveAttribute('data-state', 'cleared');
    expect(row('valor', 3)).toHaveAttribute('data-state', 'next');
  });

  it('draws the Waning Cellar’s week with its three days lit and today marked', () => {
    brewer(MONDAY);
    render(stage(<BreweryScreen route={{ name: 'brewery', hall: 'eclipse' }} />));

    const days = screen.getAllByRole('listitem').filter((item) => item.hasAttribute('data-today'));
    expect(days).toHaveLength(7);
    const open = days.filter((day) => day.getAttribute('data-open') === 'true').map((day) => day.textContent);
    expect(open).toEqual(['Wed', 'Sat', 'Sun']);
    expect(days.find((day) => day.getAttribute('data-today') === 'true')).toHaveTextContent('Mon');
  });

  it('counts the best haul from the runs still in hand, at the deepest cellar taken', () => {
    useGameStore.setState((state) => {
      if (state.save) {
        state.save.brewery.cleared['brewery.valor'] = 3;
        state.save.brewery = {
          ...state.save.brewery,
          periodKey: dailyKey(WEDNESDAY, DAILY_RESET_HOUR),
          runs: 9,
        };
      }
      return state;
    });
    render(stage(<BreweryScreen route={VALOR} />));

    // Eleven runs left at stage 3, three brews a run.
    expect(screen.getByTestId('brewery-haul')).toHaveTextContent('×33');
    // The planning line still speaks for a whole day's twenty.
    expect(screen.getByTestId('brewery-deepest')).toHaveTextContent(`all ${BREWERY_DAILY_RUNS} runs`);
  });

  it('reads every stage’s guards against the roster’s best three', () => {
    render(stage(<BreweryScreen route={VALOR} />));

    // A fresh chronicle out-powers stage 1 and is out-powered at the captain's stage.
    expect(row('valor', 1).querySelector('[data-standing]')).toHaveAttribute('data-standing', 'ahead');
    expect(row('valor', 5).querySelector('[data-standing]')).toHaveAttribute('data-standing', 'behind');
  });

  it('leads to the Tavern, where the brews are poured', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(stage(<BreweryScreen route={VALOR} />));

    await user.click(screen.getByTestId('brewery-tavern'));
    expect(useGameStore.getState().ui.stack.at(-1)).toEqual({ name: 'tavern' });
  });

  it('stops offering runs once the day’s twenty are gone', () => {
    // The ledger is stamped with today's key, or the screen reads it as a fresh day's twenty.
    useGameStore.setState((state) => {
      if (state.save)
        state.save.brewery = {
          ...state.save.brewery,
          periodKey: dailyKey(WEDNESDAY, DAILY_RESET_HOUR),
          runs: BREWERY_DAILY_RUNS,
        };
      return state;
    });
    render(stage(<BreweryScreen route={VALOR} />));

    expect(screen.getByTestId('brewery-runs-left')).toHaveTextContent(`0/${BREWERY_DAILY_RUNS}`);
    expect(screen.getByText('No runs left today')).toBeInTheDocument();
    expect(enter('valor', 1)).toBeDisabled();
  });
});
