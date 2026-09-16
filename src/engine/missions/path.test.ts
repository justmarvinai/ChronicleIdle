/**
 * The Path's mechanics (docs/design/QUESTS_MISSIONS.md §4, ROADMAP Phase 13 acceptance): one
 * mission open at a time, chapters that wait their turn, counter goals measured from the moment a
 * mission opened, and state predicates read live. The real hundred and twenty are checked in the
 * content suite; these are synthetic chapters, so the arithmetic is the subject.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import type { MissionChapterDef, MissionDef } from '@content/missions/types';
import type { Goal } from '@content/quests/types';
import { createNewGame } from '@engine/save/new-game';
import type { GoalContext, GoalLookups } from '@engine/quests/goals';
import type { SaveGame } from '@engine/schema/save';
import { activeMission, flatMissions, missionBaselineKeys, pathView, type PathState } from './path';

const NOW = new Date(2026, 8, 15, 12, 0).getTime();

const LOOKUPS: GoalLookups = {
  champion: (id) => content.championById(id as ChampionId),
  gearSet: (id) => content.gearSetById(id),
  boss: (id) => content.bossById(id),
};

function mission(chapter: number, index: number, goal: Goal): MissionDef {
  return {
    id: `mission.${`${chapter}`.padStart(2, '0')}.${`${index}`.padStart(2, '0')}`,
    chapter,
    index,
    name: 'mission.test.name',
    icon: 'glyph.spell_book',
    goal,
    rewards: [{ currency: 'gold', amount: 1_000 }],
    version: 1,
  };
}

function chapter(index: number, missions: MissionDef[]): MissionChapterDef {
  return {
    id: `chapter.${`${index}`.padStart(2, '0')}`,
    index,
    name: 'chapter.test.name',
    eldric: 'chapter.test.eldric',
    missions,
    chest: { currencies: [{ currency: 'shard_ancient', amount: 1 }] },
    version: 1,
  };
}

/** Two chapters of two: a counter goal, a state predicate, and the same again. */
const CHAPTERS: MissionChapterDef[] = [
  chapter(1, [
    mission(1, 1, { type: 'clear_stages', count: 2 }),
    mission(1, 2, { type: 'player_level', level: 4 }),
  ]),
  chapter(2, [mission(2, 1, { type: 'win_battles', count: 3 }), mission(2, 2, { type: 'all_previous' })]),
];

function ctx(
  patch: (save: SaveGame) => void = () => undefined,
): Omit<GoalContext, 'baseline' | 'allPrevious'> {
  const save = createNewGame({ name: 'Chronicler', now: NOW, seedRoot: 'path' });
  patch(save);
  return { save, now: NOW, lookups: LOOKUPS };
}

const fresh: PathState = { claimed: [], baseline: {}, chests: [] };

describe('the line', () => {
  it('walks in order: chapter by chapter, mission by mission', () => {
    expect(flatMissions(CHAPTERS).map((m) => m.id)).toEqual([
      'mission.01.01',
      'mission.01.02',
      'mission.02.01',
      'mission.02.02',
    ]);
    expect(activeMission(CHAPTERS, [])?.id).toBe('mission.01.01');
    expect(activeMission(CHAPTERS, ['mission.01.01'])?.id).toBe('mission.01.02');
    // Nothing left to walk: the Path is finished.
    expect(
      activeMission(
        CHAPTERS,
        flatMissions(CHAPTERS).map((m) => m.id),
      ),
    ).toBeNull();
  });

  it('opens one mission and locks the rest', () => {
    const view = pathView(CHAPTERS, fresh, ctx());
    expect(view.active?.mission.id).toBe('mission.01.01');
    expect(view.activeChapter).toBe(1);
    expect(view.claimed).toBe(0);
    expect(view.total).toBe(4);
    expect(view.chapters[0]?.missions.map((m) => m.status)).toEqual(['open', 'locked']);
    expect(view.chapters[1]?.unlocked).toBe(false);
    expect(view.finished).toBe(false);
  });

  it('measures the open mission from its baseline and the locked ones from now', () => {
    // Two stages cleared before the mission opened, two after: the mission sees the last two.
    const chronicle = ctx((save) => {
      save.stats['campaign.cleared'] = 4;
      save.stats['battles.victory'] = 9;
    });
    const state: PathState = { ...fresh, baseline: { 'campaign.cleared': 2, 'battles.victory': 9 } };
    const view = pathView(CHAPTERS, state, chronicle);
    expect(view.active?.progress).toEqual({ progress: 2, target: 2, done: true });
    expect(view.active?.status).toBe('claimable');
    // The locked mission in chapter 2 asks for three victories; nine came before it, so it is at
    // zero — it has not started.
    const locked = view.chapters[1]?.missions[0];
    expect(locked?.status).toBe('locked');
    expect(locked?.progress).toEqual({ progress: 0, target: 3, done: false });
  });

  it('shows a locked state predicate the chronicle already satisfies', () => {
    const deep = ctx((save) => {
      save.profile.level = 30;
    });
    const view = pathView(CHAPTERS, fresh, deep);
    // "Reach player level 4" is met, but it is not this mission's turn yet.
    const later = view.chapters[0]?.missions[1];
    expect(later?.status).toBe('locked');
    expect(later?.progress.done).toBe(true);
  });

  it('a claimed mission reads as finished, whatever the chronicle does later', () => {
    // The stages were cleared, the mission claimed, and then the counter was baselined again for
    // the next one: a claimed mission must not fall back to 0/2.
    const state: PathState = {
      claimed: ['mission.01.01'],
      baseline: { 'campaign.cleared': 99 },
      chests: [],
    };
    const view = pathView(
      CHAPTERS,
      state,
      ctx((save) => (save.stats['campaign.cleared'] = 99)),
    );
    expect(view.chapters[0]?.missions[0]).toMatchObject({
      status: 'claimed',
      progress: { progress: 2, target: 2, done: true },
    });
    expect(view.active?.mission.id).toBe('mission.01.02');
  });
});

describe('chapters', () => {
  it('opens the next one only when the one before it is finished', () => {
    const half = pathView(CHAPTERS, { ...fresh, claimed: ['mission.01.01'] }, ctx());
    expect(half.chapters[1]?.unlocked).toBe(false);
    expect(half.chapters[0]?.complete).toBe(false);

    const done = pathView(CHAPTERS, { ...fresh, claimed: ['mission.01.01', 'mission.01.02'] }, ctx());
    expect(done.chapters[0]?.complete).toBe(true);
    expect(done.chapters[0]?.claimed).toBe(2);
    expect(done.chapters[1]?.unlocked).toBe(true);
    expect(done.activeChapter).toBe(2);
  });

  it('offers the chest a finished chapter earned, once', () => {
    const finished = { ...fresh, claimed: ['mission.01.01', 'mission.01.02'] };
    const waiting = pathView(CHAPTERS, finished, ctx());
    expect(waiting.chapters[0]?.chestClaimable).toBe(true);
    expect(waiting.claimableChests).toEqual([1]);

    const taken = pathView(CHAPTERS, { ...finished, chests: [1] }, ctx());
    expect(taken.chapters[0]).toMatchObject({ chestClaimed: true, chestClaimable: false });
    expect(taken.claimableChests).toEqual([]);
  });
});

describe('the last page', () => {
  it('is done the moment it opens, because the line put everything else behind it', () => {
    const state: PathState = {
      claimed: ['mission.01.01', 'mission.01.02', 'mission.02.01'],
      baseline: {},
      chests: [1],
    };
    const view = pathView(CHAPTERS, state, ctx());
    expect(view.active?.mission.id).toBe('mission.02.02');
    expect(view.active?.status).toBe('claimable');
    // Locked, the same goal reads as unmet: nothing is behind a mission nobody has reached.
    const earlier = pathView(CHAPTERS, fresh, ctx());
    expect(earlier.chapters[1]?.missions[1]?.progress.done).toBe(false);
  });

  it('finishes the Path when the last mission is claimed', () => {
    const view = pathView(
      CHAPTERS,
      { claimed: flatMissions(CHAPTERS).map((m) => m.id), baseline: {}, chests: [1, 2] },
      ctx(),
    );
    expect(view.finished).toBe(true);
    expect(view.active).toBeNull();
    expect(view.claimed).toBe(view.total);
    expect(view.activeChapter).toBe(2);
  });
});

describe('the baseline a mission opens with', () => {
  it('names the counters its goal measures, and nothing else', () => {
    expect(missionBaselineKeys(mission(1, 1, { type: 'clear_stages', count: 2 }))).toEqual([
      'campaign.cleared',
    ]);
    // A state predicate measures nothing: there is no counter to snapshot.
    expect(missionBaselineKeys(mission(1, 2, { type: 'player_level', level: 4 }))).toEqual([]);
    expect(missionBaselineKeys(mission(1, 3, { type: 'craft', count: 1, tier: 'star' }))).toEqual([
      'forge.crafts.star',
    ]);
  });
});
