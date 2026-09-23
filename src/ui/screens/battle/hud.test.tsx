/**
 * The fight's HUD (docs/tech/UI_DESIGN.md §5.9): the counters, the three switches, whose turn it
 * is, a wave's name as it begins — and an ability's tooltip quoting the numbers the fight uses,
 * Skill Tome steps included.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import type { ChampionDef } from '@content/champions/types';
import { content } from '@content/registry';
import type { UnitView } from '@engine/battle/index';
import { abilityNumbers } from '@engine/champions/describe';
import { translate } from '@i18n/index';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { AbilityBar } from './AbilityBar';
import { ControlDock } from './ControlDock';
import { HudCounters } from './HudCounters';
import { TurnBanner } from './TurnBanner';
import { WaveBanner } from './WaveBanner';

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
      <div id="tooltip-layer" />
      {children}
    </ViewportContext.Provider>
  );
}

/** A plate's view of a champion, as the simulation would hand it to the HUD. */
function allyView(def: ChampionDef): UnitView {
  return {
    id: 'a0',
    side: 'ally',
    name: def.name,
    defId: def.id,
    instanceId: 'inst-1',
    slot: 0,
    level: 30,
    element: def.element,
    role: def.role,
    hp: 1000,
    maxHp: 1000,
    shield: 0,
    tm: 0.5,
    alive: true,
    isBoss: false,
    guarding: null,
    statuses: [],
    abilities: def.abilities.map((ability) => ({
      id: ability.id,
      slot: ability.slot,
      cooldown: 0,
      ready: true,
    })),
    art: { model: def.art.model, tint: def.art.tint, facing: def.art.facing, scale: 1, desaturate: false },
    boss: null,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('the counters', () => {
  it('read the wave, the ally turns against the limit, and pause on a press', async () => {
    const user = userEvent.setup();
    const pause = vi.fn();
    render(
      stage(
        <HudCounters wave={2} waveCount={3} allyTurns={7} turnLimit={40} elapsed={95_000} onPause={pause} />,
      ),
    );
    expect(screen.getByTestId('battle-wave')).toHaveTextContent('Wave 2/3');
    expect(screen.getByTestId('battle-turns')).toHaveTextContent('Ally turns 7 of 40');
    expect(screen.getByText(/1:35/)).toBeInTheDocument();
    await user.click(screen.getByTestId('battle-pause'));
    expect(pause).toHaveBeenCalledOnce();
  });
});

describe('the control dock', () => {
  it('says which switches are on, the speed, and what a locked speed needs', async () => {
    const user = userEvent.setup();
    const onAuto = vi.fn();
    const onSpeed = vi.fn();
    render(
      stage(
        <ControlDock
          info={false}
          auto
          speed={2}
          maxSpeed={2}
          onInfo={() => undefined}
          onAuto={onAuto}
          onSpeed={onSpeed}
        />,
      ),
    );
    expect(screen.getByTestId('battle-auto')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('battle-info-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('battle-speed')).toHaveTextContent('×2');
    expect(screen.getByTestId('battle-speed')).toHaveAttribute('title', 'Unlocks by clearing the Campaign');
    await user.click(screen.getByTestId('battle-auto'));
    await user.click(screen.getByTestId('battle-speed'));
    expect(onAuto).toHaveBeenCalledOnce();
    expect(onSpeed).toHaveBeenCalledOnce();
  });
});

describe('whose turn it is', () => {
  const def = content.champions[0]!;

  it('names a champion’s turn, and an enemy acting', () => {
    const ally = allyView(def);
    const view = render(stage(<TurnBanner unit={ally} asking provokedBy={null} lowered={false} />));
    expect(screen.getByTestId('turn-banner')).toHaveTextContent(`${translate(def.name)}'s turn`);
    view.unmount();

    const spawn = content.encounterById('encounter.stage.01.01.intro')!.waves[0]!.enemies[0]!;
    const foe = content.enemyById(spawn.enemyId)!;
    const enemy = { ...ally, id: 'w0e0', side: 'enemy' as const, name: foe.name, defId: foe.id };
    render(stage(<TurnBanner unit={enemy} asking={false} provokedBy={null} lowered={false} />));
    expect(screen.getByTestId('turn-banner')).toHaveTextContent(`${translate(foe.name)} acts`);
  });

  it('says a provoked champion has one move', () => {
    render(stage(<TurnBanner unit={allyView(def)} asking provokedBy="Ox-Bandit" lowered={false} />));
    expect(screen.getByTestId('turn-banner')).toHaveTextContent(
      'Provoked: only the basic attack on Ox-Bandit.',
    );
  });
});

describe('a wave’s name', () => {
  it('holds the middle of the screen as the wave begins, then goes', async () => {
    render(stage(<WaveBanner wave={2} waveCount={3} />));
    expect(screen.getByTestId('wave-banner')).toHaveTextContent('Wave 2');
    expect(screen.getByTestId('wave-banner')).toHaveTextContent('2 of 3');
    await waitFor(() => expect(screen.queryByTestId('wave-banner')).toBeNull(), { timeout: 3000 });
  });
});

describe('the ability bar', () => {
  it('quotes an ability’s numbers with the champion’s Skill Tome steps in them', async () => {
    vi.useFakeTimers();
    // A champion whose first ability grows with a step, so the two readings differ.
    const pick = content.champions
      .flatMap((def) => def.abilities.map((ability) => ({ def, ability })))
      .find(
        ({ ability }) =>
          JSON.stringify(abilityNumbers(ability, 0)) !== JSON.stringify(abilityNumbers(ability, 1)),
      );
    expect(pick).toBeDefined();
    const { def, ability } = pick!;
    render(
      stage(
        <AbilityBar
          unit={allyView(def)}
          request={null}
          selectedAbilityId={null}
          onSelect={() => undefined}
          skillUpgrades={{ [ability.id]: 1 }}
        />,
      ),
    );
    expect(screen.getByTestId('ability-bar')).toHaveTextContent(translate(def.name));
    fireEvent.pointerEnter(screen.getByTestId(`ability-${ability.slot}`).parentElement!, {
      clientX: 1500,
      clientY: 900,
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const upgraded = translate(ability.description, { ...abilityNumbers(ability, 1) });
    expect(document.getElementById('tooltip-layer')).toHaveTextContent(upgraded);
    expect(upgraded).not.toBe(translate(ability.description, { ...abilityNumbers(ability, 0) }));
  });
});
