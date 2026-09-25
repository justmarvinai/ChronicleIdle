/**
 * The Chronicler's Path screen (docs/tech/UI_DESIGN.md §5.15): what a card says about the mission
 * it holds, what the press pays, and how the line moves on. The Path's arithmetic is tested in
 * `engine/missions/path.test.ts` and `state/missions.test.ts`; these are the flows a player's
 * hands take.
 */
import { readFileSync } from 'node:fs';
import type { ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetManifest } from '@assets/manifest-types';
import { setManifestForTests } from '@assets/manifest';
import { flatMissions } from '@engine/missions/path';
import { content } from '@content/registry';
import type { SaveGame } from '@engine/schema/save';
import { useGameStore } from '@state/store';
import { DialogHost } from '@ui/dialogs/DialogHost';
import { ViewportContext, VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import MissionsScreen from './MissionsScreen';

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

const PATH = { name: 'missions' } as const;
const ALL = flatMissions(content.missionChapters).map((mission) => mission.id);
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

function patch(apply: (save: SaveGame) => void): void {
  act(() => {
    useGameStore.setState((state) => {
      if (state.save) apply(state.save);
      return state;
    });
  });
}

/** Marks a stand cleared, which is what the Path's first mission asks for. */
const cleared = (s: SaveGame, settlement: number, stage: number): void => {
  s.campaign.stars[`stage.${`${settlement}`.padStart(2, '0')}.${`${stage}`.padStart(2, '0')}|intro`] = 3;
};

describe('the Path on screen', () => {
  beforeEach(() => chronicle());

  it('shows the chapter the Path is on, with one card open and the rest locked', () => {
    render(stage(<MissionsScreen route={PATH} />));
    expect(screen.getByTestId('screen-missions')).toBeInTheDocument();
    expect(screen.getByTestId('missions-progress')).toHaveTextContent('0 / 120 missions');
    expect(screen.getByTestId('missions-eldric')).toHaveTextContent('Every chronicle opens');

    const first = screen.getByTestId('mission-card-mission.01.01');
    expect(first).toHaveTextContent('Clear Thornwood Crossing 1-1 (Intro)');
    expect(first).toHaveTextContent('Gold ×2,000');
    // Nothing to claim yet: the card names where it is played and offers the way there instead,
    // and a card still to come offers no press at all.
    expect(screen.queryByTestId('mission-claim-mission.01.01')).not.toBeInTheDocument();
    expect(screen.getByTestId('mission-where-mission.01.01')).toHaveTextContent('Thornwood Crossing');
    expect(screen.getByTestId('mission-go-mission.01.01')).toHaveAccessibleName('Go to Thornwood Crossing');
    expect(screen.queryByTestId('mission-claim-mission.01.03')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mission-go-mission.01.03')).not.toBeInTheDocument();
    expect(screen.getByTestId('mission-card-mission.01.03')).toHaveTextContent('Locked');
    expect(screen.getByTestId('missions-chapter-progress')).toHaveTextContent('0 / 12');
    expect(screen.getByTestId('chapter-chest-1')).toBeDisabled();
  });

  it('pays the mission the chronicle has finished and opens the next one', async () => {
    const user = userEvent.setup();
    patch((s) => cleared(s, 1, 1));
    render(stage(<MissionsScreen route={PATH} />));

    const gold = held('gold');
    const claim = screen.getByTestId('mission-claim-mission.01.01');
    expect(claim).toBeEnabled();
    await user.click(claim);

    expect(held('gold')).toBe(gold + 2_000);
    expect(screen.getByTestId('mission-claimed-mission.01.01')).toHaveTextContent('Claimed');
    expect(screen.getByTestId('missions-progress')).toHaveTextContent('1 / 120 missions');
    expect(screen.getByTestId('missions-chapter-progress')).toHaveTextContent('1 / 12');
    // The next mission is the open one now, and it is not finished: it points at the Campaign.
    expect(screen.queryByTestId('mission-claim-mission.01.02')).not.toBeInTheDocument();
    expect(screen.getByTestId('mission-go-mission.01.02')).toHaveAccessibleName('Go to the Campaign');
  });

  it('goes to where the open mission is played', async () => {
    const user = userEvent.setup();
    render(stage(<MissionsScreen route={PATH} />));
    await user.click(screen.getByTestId('mission-go-mission.01.01'));
    const stack = useGameStore.getState().ui.stack;
    expect(stack[stack.length - 1]).toEqual({ name: 'settlement', settlement: 1 });
  });

  it('offers no way into a place the chronicle has not opened yet', () => {
    // Mission 3.2 asks for the Gargoyle, which a chronicle this young cannot fight.
    chronicle({ level: 1 });
    patch((s) => {
      s.missions.claimed = ALL.slice(0, 25);
      s.missions.chests = [1, 2];
    });
    render(stage(<MissionsScreen route={PATH} />));
    expect(screen.getByTestId('mission-where-mission.03.02')).toHaveTextContent('The Gargoyle');
    expect(screen.queryByTestId('mission-go-mission.03.02')).not.toBeInTheDocument();
  });

  it('lets a chronicle read a chapter it has not reached', async () => {
    const user = userEvent.setup();
    render(stage(<MissionsScreen route={PATH} />));
    await user.click(screen.getByTestId('missions-tab-7'));
    // Chapter 7 is Normal; its cards are locked, and they still say what they will ask for.
    expect(screen.getByTestId('mission-card-mission.07.01')).toHaveTextContent(
      'Clear Thornwood Crossing 1-10 (Normal)',
    );
    expect(screen.getByTestId('mission-card-mission.07.01')).toHaveTextContent('Locked');
    expect(screen.getByTestId('missions-eldric')).toHaveTextContent('heavier hand');
  });

  it('offers a finished chapter’s chest, and the Path’s own reward at the end of it', async () => {
    const user = userEvent.setup();
    // Everything but the last mission claimed, every earlier chest taken.
    patch((s) => {
      s.missions.claimed = ALL.slice(0, ALL.length - 1);
      s.missions.chests = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    });
    // The gift arrives as a dialog, so the host is on the stage too.
    render(
      stage(
        <>
          <MissionsScreen route={PATH} />
          <DialogHost />
        </>,
      ),
    );

    const gems = held('gems');
    await user.click(screen.getByTestId('mission-claim-mission.10.12'));
    expect(held('gems')).toBe(gems + 500);
    expect(screen.getByTestId('missions-progress')).toHaveTextContent('120 / 120 missions');
    expect(screen.getByTestId('missions-eldric')).toHaveTextContent('Every mission is done');

    const roster = Object.keys(save().roster).length;
    await user.click(screen.getByTestId('chapter-chest-10'));
    expect(Object.keys(save().roster)).toHaveLength(roster + 1);
    expect(
      Object.values(save().roster).some((champion) => champion.defId === 'champ.eldric_chronicler'),
    ).toBe(true);
    // And his gift asks the chronicle to name it.
    expect(screen.getByTestId('dialog-mission-gift')).toBeInTheDocument();
    await user.click(screen.getByTestId('gift-slot-boots'));
    await user.click(screen.getByTestId('gift-strike'));
    const piece = Object.values(save().inventory)[0];
    expect(piece).toMatchObject({ slot: 'boots', rarity: 'legendary', stars: 6, source: 'mission' });
    expect(screen.getByTestId('gift-result')).toBeInTheDocument();
  });
});
