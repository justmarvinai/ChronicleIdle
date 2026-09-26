/**
 * The battle setup's face-off (docs/tech/UI_DESIGN.md §5.8): seats that can be emptied, filled and
 * reordered, presets that remember a team, the enemy's waves as cards with a scout's report, and
 * the numbers on both sides measured with one ruler.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { content } from '@content/registry';
import { STAGE_MAX_STARS } from '@content/balance/campaign';
import { ELEMENT_BEATS } from '@content/balance/element';
import { FEATURE_UNLOCK_LEVEL } from '@content/balance/unlocks';
import { ELEMENTS } from '@content/champions/types';
import { scaledEnemyStats } from '@engine/battle/index';
import { progressKey } from '@engine/campaign/progress';
import { power } from '@engine/champions/stats';
import { useGameStore } from '@state/store';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import BattleSetupScreen from './BattleSetupScreen';
import { seatWidth, SEAT_MAX } from './setup-layout';
import {
  enemyPower,
  makeLeader,
  powerShare,
  scoutWave,
  stagePointerOf,
  toggleMember,
  wavePower,
} from './setup-view';

vi.mock('@render/ambient/AmbientLayer', () => ({ AmbientLayer: () => null }));
vi.mock('@ui/hooks/useSceneAudio', () => ({ useSceneAudio: () => undefined }));
vi.mock('@audio/index', () => ({ playSfx: () => undefined, playMusic: () => undefined }));
// The flows start a real battle; the screen's job ends at handing them the team.
const launched = vi.hoisted(() => ({ campaign: [] as unknown[] }));
vi.mock('@ui/flows/campaign', () => ({
  launchCampaignRun: (input: unknown) => {
    launched.campaign.push(input);
    return { ok: true, value: undefined };
  },
}));

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

const STAND = 'encounter.stage.01.01.intro';
const SETUP = { name: 'battle-setup', encounterId: STAND } as const;
const save = () => useGameStore.getState().save!;
const actions = () => useGameStore.getState().actions;
const idOf = (defId: string): string =>
  Object.values(save().roster).find((instance) => instance.defId === defId)!.instanceId;

/** A chronicle with a bench: more champions than a three-seat team can take. */
function chronicle(): void {
  const a = actions();
  a.resetGame();
  a.newGame('Captain');
  a.chooseStarter('champ.ser_corvin');
  for (const defId of ['champ.reva_ashblade', 'champ.bran_militia', 'champ.sister_maelis'] as const)
    a.grantChampion(defId, 'summon', 'test');
  a.updateSettings({ autoBattle: false });
}

const seated = (index: number): string | null =>
  screen.getByTestId(`team-slot-${index}`).getAttribute('data-champion');

describe('what the setup reads off an encounter', () => {
  const encounter = content.encounterById(STAND)!;

  it('weighs a wave as the sum of its enemies’ power, at the encounter’s scale', () => {
    const expected = encounter.waves[0]!.enemies.reduce((sum, spawn) => {
      const def = content.enemyById(spawn.enemyId)!;
      return sum + power(scaledEnemyStats(def, encounter, spawn.statMult ?? 1));
    }, 0);
    expect(wavePower(encounter, 0)).toBe(expected);
    expect(wavePower(encounter, 99)).toBe(0);
    expect(enemyPower(encounter)).toBe(
      Math.max(...encounter.waves.map((_, wave) => wavePower(encounter, wave))),
    );
  });

  it('shares the bar between the two sides, level when they are', () => {
    expect(powerShare(100, 100)).toBe(0.5);
    expect(powerShare(300, 100)).toBe(0.75);
    expect(powerShare(0, 0)).toBe(0.5);
  });

  it('reads a stand’s pointer from its encounter id, and nothing else’s', () => {
    expect(stagePointerOf(STAND)).toEqual({ settlement: 1, stage: 1, difficulty: 'intro' });
    expect(stagePointerOf('encounter.tower.floor.001')).toBeNull();
  });

  it('seats, unseats and replaces the last seat of a full team', () => {
    expect(toggleMember(['a', 'b'], 'c', 3)).toEqual(['a', 'b', 'c']);
    expect(toggleMember(['a', 'b', 'c'], 'b', 3)).toEqual(['a', 'c']);
    expect(toggleMember(['a', 'b', 'c'], 'd', 3)).toEqual(['a', 'b', 'd']);
  });

  it('hands the leader’s seat to another champion without shuffling the rest', () => {
    expect(makeLeader(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b']);
    expect(makeLeader(['a', 'b', 'c'], 0)).toEqual(['a', 'b', 'c']);
    expect(makeLeader(['a'], 3)).toEqual(['a']);
  });

  it('shares the row between three or four seats and never grows one past the cap', () => {
    expect(seatWidth(3)).toBe(SEAT_MAX);
    expect(seatWidth(4)).toBeLessThan(SEAT_MAX);
    expect(seatWidth(1)).toBe(SEAT_MAX);
  });

  it('reports which elements a wave fears and hunts, and a healer among it', () => {
    const report = scoutWave(encounter, 0);
    const elements = new Set(
      encounter.waves[0]!.enemies.map((spawn) => content.enemyById(spawn.enemyId)!.element),
    );
    // Strong against them: whatever beats one of their elements. Strong against you: what they beat.
    expect(report.strong).toEqual(ELEMENTS.filter((e) => elements.has(ELEMENT_BEATS[e] ?? 'eclipse')));
    expect(report.weak).toEqual(ELEMENTS.filter((e) => [...elements].some((x) => ELEMENT_BEATS[x] === e)));

    const mender = content.settlements
      .flatMap((settlement) => settlement.stages)
      .find((stand) =>
        stand.waves.some((wave) => wave.some((id) => content.enemyById(id)?.archetype === 'mender')),
      );
    expect(mender).toBeDefined();
    const healers = content.encounterById(`encounter.${mender!.id}.intro`)!;
    const wave = mender!.waves.findIndex((w) =>
      w.some((id) => content.enemyById(id)?.archetype === 'mender'),
    );
    expect(scoutWave(healers, wave).healer).toBe(true);
    expect(report.healer).toBe(
      encounter.waves[0]!.enemies.some((spawn) => content.enemyById(spawn.enemyId)?.archetype === 'mender'),
    );
  });
});

describe('the battle setup screen', () => {
  beforeEach(() => {
    chronicle();
    launched.campaign.length = 0;
  });

  it('seats the strongest three, sets the two powers side by side, and prices the press', () => {
    render(stage(<BattleSetupScreen route={SETUP} />));
    expect(screen.getAllByTestId(/^team-slot-\d$/)).toHaveLength(3);
    for (const i of [0, 1, 2]) expect(seated(i)).not.toBeNull();
    const encounter = content.encounterById(STAND)!;
    expect(screen.getByTestId('enemy-power')).toHaveTextContent(
      enemyPower(encounter).toLocaleString('en-US'),
    );
    expect(Number(screen.getByTestId('team-power').textContent?.replaceAll(',', ''))).toBeGreaterThan(0);
    expect(screen.getByTestId('start-battle')).toHaveTextContent(/Start battle · \d+ ⚡/);
    // A stand never cleared lights none of its stars.
    const stars = within(screen.getByTestId('star-conditions')).getAllByRole('listitem');
    expect(stars).toHaveLength(3);
    for (const star of stars) expect(star).toHaveAttribute('data-earned', 'false');
  });

  it('lights the stars a stand has already given', () => {
    useGameStore.setState((state) => {
      if (state.save) state.save.campaign.stars[progressKey('stage.01.01', 'intro')] = 2;
      return state;
    });
    render(stage(<BattleSetupScreen route={SETUP} />));
    const stars = within(screen.getByTestId('star-conditions')).getAllByRole('listitem');
    expect(stars.map((star) => star.getAttribute('data-earned'))).toEqual(['true', 'true', 'false']);
  });

  it('empties a seat, fills it from the roster, and hands the lead to another seat', async () => {
    const user = userEvent.setup();
    render(stage(<BattleSetupScreen route={SETUP} />));
    const third = seated(2)!;
    await user.click(screen.getByTestId('team-slot-2'));
    expect(seated(2)).toBeNull();
    expect(screen.getByTestId('team-slot-2')).toHaveTextContent('Choose a champion');

    const bench = ['champ.ser_corvin', 'champ.reva_ashblade', 'champ.bran_militia', 'champ.sister_maelis']
      .map(idOf)
      .find((id) => ![seated(0), seated(1)].includes(save().roster[id]!.defId));
    await user.click(screen.getByTestId(`pick-${bench!}`));
    expect(seated(2)).toBe(save().roster[bench!]!.defId);
    expect(seated(2)).not.toBe(null);
    expect(third).not.toBeNull();

    const second = seated(1);
    await user.click(screen.getByTestId('team-lead-1'));
    expect(seated(0)).toBe(second);
  });

  it('writes the team into a preset and loads it back', async () => {
    const user = userEvent.setup();
    render(stage(<BattleSetupScreen route={SETUP} />));
    expect(screen.getByTestId('preset-load-0')).toBeDisabled();
    await user.click(screen.getByTestId('team-slot-2'));
    const pair = [seated(0), seated(1)];
    await user.click(screen.getByTestId('preset-save-0'));
    expect(save().teams.campaign.presets[0]).toHaveLength(2);
    expect(screen.getByTestId('preset-load-0')).toBeEnabled();

    await user.click(screen.getByTestId('team-slot-0'));
    await user.click(screen.getByTestId('preset-load-0'));
    expect([seated(0), seated(1)]).toEqual(pair);
    expect(seated(2)).toBeNull();
  });

  it('shows the chosen wave’s enemies, and the scout’s report on them', async () => {
    const user = userEvent.setup();
    const encounter = content.encounterById(STAND)!;
    render(stage(<BattleSetupScreen route={SETUP} />));
    const cards = () => within(screen.getByTestId('wave-enemies')).getAllByRole('listitem');
    expect(cards()).toHaveLength(encounter.waves[0]!.enemies.length);
    expect(screen.getByTestId('setup-scout')).toHaveTextContent('Scout’s report');
    if (encounter.waves.length > 1) {
      await user.click(screen.getByTestId('wave-tab-2'));
      expect(screen.getByTestId('wave-tab-2')).toHaveAttribute('aria-selected', 'true');
      expect(cards()).toHaveLength(encounter.waves[1]!.enemies.length);
      expect(screen.getByTestId('wave-power')).toHaveTextContent(
        wavePower(encounter, 1).toLocaleString('en-US'),
      );
    }
  });

  it('switches who commands the fight, and hands the team to the stand’s flow', async () => {
    const user = userEvent.setup();
    render(stage(<BattleSetupScreen route={SETUP} />));
    const control = within(screen.getByTestId('setup-auto')).getByRole('switch');
    expect(control).toHaveAttribute('aria-checked', 'false');
    await user.click(control);
    expect(save().settings.autoBattle).toBe(true);
    expect(control).toHaveAttribute('aria-checked', 'true');

    const team = [0, 1, 2].map((i) => seated(i));
    await user.click(screen.getByTestId('start-battle'));
    expect(launched.campaign).toHaveLength(1);
    const input = launched.campaign[0] as { instanceIds: string[]; control: string };
    expect(input.control).toBe('auto');
    expect(input.instanceIds.map((id) => save().roster[id]!.defId)).toEqual(team);
  });

  it('narrows the roster by element with one press, and widens it again', async () => {
    const user = userEvent.setup();
    render(stage(<BattleSetupScreen route={SETUP} />));
    const cards = () => screen.getAllByTestId(/^pick-/);
    const all = Object.keys(save().roster).length;
    expect(cards()).toHaveLength(all);
    const valor = Object.values(save().roster).filter(
      (instance) => content.championById(instance.defId)?.element === 'valor',
    ).length;
    await user.click(screen.getByTestId('setup-filter-valor'));
    expect(screen.queryAllByTestId(/^pick-/)).toHaveLength(valor);
    await user.click(screen.getByTestId('setup-filter-valor'));
    expect(cards()).toHaveLength(all);
  });
});

describe('an instant clear (CAMPAIGN.md §10)', () => {
  const OPEN = FEATURE_UNLOCK_LEVEL.instant_clear;
  beforeEach(() => {
    launched.campaign.length = 0;
  });

  /** The chronicle at `level`, the stand at `stars` on Intro, and `energy` to spend. */
  function standing({ level = OPEN, stars = STAGE_MAX_STARS, energy = 60 } = {}): void {
    chronicle();
    useGameStore.setState((state) => {
      if (!state.save) return state;
      state.save.profile.level = level;
      state.save.energy.value = energy;
      state.save.campaign.stars[progressKey('stage.01.01', 'intro')] = stars;
      state.save.campaign.bestTurns[progressKey('stage.01.01', 'intro')] = 9;
      state.save.campaign.autoRepeat = 10;
      return state;
    });
  }

  it('is not offered before the level it opens at', () => {
    standing({ level: OPEN - 1 });
    render(stage(<BattleSetupScreen route={SETUP} />));
    expect(screen.queryByTestId('instant-clear')).toBeNull();
  });

  it('shows, dead, on a stand short of its stars — and says what would open it', () => {
    standing({ stars: 2 });
    render(stage(<BattleSetupScreen route={SETUP} />));
    expect(screen.getByTestId('instant-clear')).toBeDisabled();
    expect(screen.getByTestId('instant-note')).toHaveTextContent(/three stars/i);
  });

  it('names the runs the energy covers and their price on a mastered stand', () => {
    // A 1-1 run costs 4: 30 energy covers 7 of the 10 asked for.
    standing({ energy: 30 });
    render(stage(<BattleSetupScreen route={SETUP} />));
    const button = screen.getByTestId('instant-clear');
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent('Instant ×7');
    expect(button).toHaveTextContent('28 ⚡');
  });

  it('clears the stand without a fight and opens the page of what it paid', async () => {
    const user = userEvent.setup();
    standing();
    render(stage(<BattleSetupScreen route={SETUP} />));
    const gold = save().wallet.gold ?? 0;
    await user.click(screen.getByTestId('instant-clear'));

    expect(save().energy.value).toBe(60 - 10 * 4);
    expect(save().wallet.gold ?? 0).toBeGreaterThan(gold);
    expect(save().stats['campaign.instant']).toBe(10);
    expect(launched.campaign).toHaveLength(0);
    const dialog = useGameStore.getState().ui.dialog;
    expect(dialog?.name).toBe('instant-clear');
    if (dialog?.name === 'instant-clear') {
      expect(dialog.summary.runs).toBe(10);
      expect(dialog.team).toEqual([0, 1, 2].map((i) => seated(i)).map((defId) => idOf(defId ?? '')));
    }
  });
});
