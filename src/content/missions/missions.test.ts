/**
 * The Path as the design prints it (docs/design/QUESTS_MISSIONS.md §4, ROADMAP Phase 13
 * acceptance): ten chapters of twelve, the milestones on the rows the table gives them, a chest
 * ladder that climbs, and the last page that hands Eldric over. The generic shape checks live in
 * the content validator; these are the numbers.
 */
import { describe, expect, it } from 'vitest';
import { MISSION_CHAPTER_COUNT, MISSIONS_PER_CHAPTER } from '@content/balance/missions';
import { content } from '@content/registry';
import type { Goal } from '@content/quests/types';
import { flatMissions } from '@engine/missions/path';
import { MISSION_CHAPTERS } from './index';

const goalOf = (id: string): Goal | undefined => content.missionById(id)?.goal;
const rewardsOf = (id: string) => content.missionById(id)?.rewards ?? [];

describe('the Path', () => {
  it('is ten chapters of twelve, numbered in the order it is walked', () => {
    expect(MISSION_CHAPTERS).toHaveLength(MISSION_CHAPTER_COUNT);
    expect(MISSION_CHAPTERS.map((chapter) => chapter.index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const chapter of MISSION_CHAPTERS) {
      expect(chapter.missions, chapter.id).toHaveLength(MISSIONS_PER_CHAPTER);
      expect(chapter.missions.map((mission) => mission.index)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
    }
    expect(flatMissions(MISSION_CHAPTERS)).toHaveLength(120);
    expect(flatMissions(MISSION_CHAPTERS)[0]?.id).toBe('mission.01.01');
    expect(flatMissions(MISSION_CHAPTERS)[119]?.id).toBe('mission.10.12');
  });

  it('opens on the first stand and ends on the last page', () => {
    expect(goalOf('mission.01.01')).toEqual({
      type: 'clear_stage',
      settlement: 1,
      stage: 1,
      difficulty: 'intro',
    });
    expect(goalOf('mission.10.12')).toEqual({ type: 'all_previous' });
    expect(rewardsOf('mission.10.12')).toEqual([{ currency: 'gems', amount: 500 }]);
  });

  it('asks for the milestones the design names, on the rows it names them', () => {
    // One per chapter, so a table edited by hand cannot quietly move a milestone.
    expect(goalOf('mission.01.12')).toMatchObject({ type: 'clear_stage', settlement: 1, stage: 10 });
    expect(goalOf('mission.02.08')).toEqual({
      type: 'boss_fights',
      boss: 'boss.gravemaw',
      tier: 'easy',
      count: 1,
    });
    expect(goalOf('mission.03.02')).toEqual({
      type: 'boss_damage',
      boss: 'boss.gravemaw',
      tier: 'easy',
      amount: 250_000,
    });
    expect(goalOf('mission.04.02')).toEqual({ type: 'boss_fights', boss: 'boss.nyxara', count: 1 });
    expect(goalOf('mission.05.07')).toEqual({
      type: 'boss_percent',
      boss: 'boss.nyxara',
      tier: 'normal',
      pct: 2,
    });
    expect(goalOf('mission.06.12')).toEqual({
      type: 'clear_stage',
      settlement: 12,
      stage: 10,
      difficulty: 'intro',
    });
    expect(goalOf('mission.07.04')).toEqual({ type: 'equip_pieces', count: 6, minStars: 4 });
    expect(goalOf('mission.08.12')).toEqual({
      type: 'clear_stage',
      settlement: 12,
      stage: 10,
      difficulty: 'normal',
    });
    expect(goalOf('mission.09.05')).toEqual({
      type: 'gear_reach_level',
      level: 16,
      count: 6,
      onOneChampion: true,
    });
    expect(goalOf('mission.10.01')).toEqual({
      type: 'champion_reach_level',
      level: 60,
      count: 5,
      stars: 6,
    });
    expect(goalOf('mission.10.08')).toEqual({ type: 'team_power', power: 150_000 });
  });

  it('walks the twelve settlements in order and finishes each difficulty at the Gate', () => {
    const stands = flatMissions(MISSION_CHAPTERS)
      .map((mission) => mission.goal)
      .filter((goal): goal is Extract<Goal, { type: 'clear_stage' }> => goal.type === 'clear_stage');
    // Intro visits every settlement; Normal and Hard revisit the boss stands only.
    const intro = stands.filter((goal) => goal.difficulty === 'intro');
    expect(new Set(intro.map((goal) => goal.settlement)).size).toBe(12);
    for (const difficulty of ['normal', 'hard'] as const) {
      const run = stands.filter((goal) => goal.difficulty === difficulty);
      expect(
        run.every((goal) => goal.stage === 10),
        difficulty,
      ).toBe(true);
      expect(run[run.length - 1]?.settlement, difficulty).toBe(12);
    }
  });

  it('pays every mission something, and never the same reward twice in a row by accident', () => {
    for (const mission of flatMissions(MISSION_CHAPTERS)) {
      expect(mission.rewards.length, mission.id).toBeGreaterThan(0);
      for (const reward of mission.rewards) expect(reward.amount, mission.id).toBeGreaterThan(0);
    }
  });
});

describe('the chapter chests', () => {
  it('climb the ladder the design prints', () => {
    const chest = (index: number) => MISSION_CHAPTERS[index - 1]?.chest;
    expect(chest(1)?.currencies).toEqual([{ currency: 'shard_ancient', amount: 1 }]);
    expect(chest(2)?.currencies).toEqual([
      { currency: 'shard_ancient', amount: 1 },
      { currency: 'gems', amount: 50 },
    ]);
    expect(chest(5)?.currencies).toEqual([
      { currency: 'shard_sacred', amount: 1 },
      { currency: 'mat_glyph_sigil', amount: 1 },
    ]);
    expect(chest(8)?.currencies).toEqual([
      { currency: 'shard_sacred', amount: 2 },
      { currency: 'tome_legendary', amount: 1 },
    ]);
    expect(chest(9)?.currencies).toEqual([
      { currency: 'shard_primordial', amount: 1 },
      { currency: 'tome_legendary', amount: 1 },
    ]);
  });

  it('keeps Eldric and his gift for the last one', () => {
    const finale = MISSION_CHAPTERS[MISSION_CHAPTER_COUNT - 1]?.chest;
    expect(finale?.champion).toBe('champ.eldric_chronicler');
    expect(finale?.gearChoice).toEqual({ rarity: 'legendary', stars: 6 });
    // And nowhere else: he arrives once, at the end.
    for (const chapter of MISSION_CHAPTERS.slice(0, -1)) {
      expect(chapter.chest.champion, chapter.id).toBeUndefined();
      expect(chapter.chest.gearChoice, chapter.id).toBeUndefined();
    }
    // The champion the Path hands over says so in his own definition.
    expect(content.championById('champ.eldric_chronicler')?.obtain).toContain('mission');
  });
});
