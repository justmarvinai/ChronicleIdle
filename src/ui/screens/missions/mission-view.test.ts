/**
 * What the Path draws about a mission beyond its line (docs/tech/UI_DESIGN.md §5.15): its family,
 * its count, and where each chapter stands for the tabs.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { missionsState } from '@state/missions';
import { useGameStore } from '@state/store';
import { chapterShare, chapterState, FAMILY_TINT, missionFamily, progressLine } from './mission-view';

describe('the Path’s view of a mission', () => {
  it('sorts every goal into one of six families, each with its own crest colour', () => {
    expect(missionFamily('clear_stage')).toBe('campaign');
    expect(missionFamily('rank_up_times')).toBe('champion');
    expect(missionFamily('gear_refine_times')).toBe('gear');
    expect(missionFamily('summon')).toBe('summon');
    expect(missionFamily('boss_percent')).toBe('boss');
    expect(missionFamily('player_level')).toBe('chronicle');
    expect(new Set(Object.values(FAMILY_TINT)).size).toBe(6);
  });

  it('marks the thousands in a count', () => {
    expect(progressLine({ progress: 0, target: 250_000, done: false })).toBe('0 / 250,000');
    expect(progressLine({ progress: 30, target: 30, done: true })).toBe('30 / 30');
  });

  it('reads one chapter as being walked, those behind it as done, those ahead as locked', () => {
    const firstTwo = content.missionChapters
      .slice(0, 2)
      .flatMap((chapter) => chapter.missions.map((mission) => mission.id));
    const actions = useGameStore.getState().actions;
    actions.resetGame();
    actions.newGame('Chronicler');
    actions.chooseStarter('champ.ser_corvin');
    useGameStore.setState((state) => {
      if (state.save) {
        state.save.missions.claimed = [...firstTwo, 'mission.03.01'];
        state.save.missions.chests = [1, 2];
      }
      return state;
    });
    const save = useGameStore.getState().save;
    if (!save) throw new Error('no chronicle');
    const view = missionsState(save, Date.now());
    expect(view.chapters.map(chapterState).slice(0, 4)).toEqual(['done', 'done', 'current', 'locked']);
    const third = view.chapters[2];
    expect(third && chapterShare(third)).toBeCloseTo(1 / 12);
  });
});
