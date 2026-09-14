import { describe, expect, it } from 'vitest';
import { TITLES, TITLE_BY_ID } from '@content/titles/index';
import { content } from '@content/registry';
import { emptyCampaignProgress, recordRun, type CampaignProgress } from '@engine/campaign/progress';
import { currentTitle, earnedTitles, isTitleEarned } from './titles';

function clear(
  progress: CampaignProgress,
  difficulty: 'intro' | 'normal' | 'hard',
  stars: number,
  settlements = 12,
): CampaignProgress {
  let next = progress;
  for (let settlement = 1; settlement <= settlements; settlement += 1)
    for (let stage = 1; stage <= 10; stage += 1)
      next = recordRun(next, { settlement, stage, difficulty, stars, allyTurns: 10 }).progress;
  return next;
}

const ctx = (over: Partial<Parameters<typeof earnedTitles>[1]> = {}) => ({
  level: 1,
  progress: emptyCampaignProgress(),
  championsOwned: 4,
  ...over,
});

describe('titles (ECONOMY.md §4)', () => {
  it('gives a new chronicle its first title and nothing else', () => {
    const earned = earnedTitles(TITLES, ctx());
    expect(earned.map((t) => t.id)).toEqual(['title.chronicler']);
    expect(currentTitle(TITLES, ctx())?.id).toBe('title.chronicler');
  });

  it('earns the campaign titles from the stands actually beaten', () => {
    const first = recordRun(emptyCampaignProgress(), {
      settlement: 1,
      stage: 10,
      difficulty: 'intro',
      stars: 1,
      allyTurns: 12,
    }).progress;
    expect(earnedTitles(TITLES, ctx({ progress: first })).map((t) => t.id)).toEqual([
      'title.chronicler',
      'title.wayfarer',
    ]);

    const intro = clear(emptyCampaignProgress(), 'intro', 1);
    const ids = earnedTitles(TITLES, ctx({ progress: intro })).map((t) => t.id);
    expect(ids).toContain('title.road_warden');
    expect(ids).toContain('title.gatebreaker');
    expect(ids).not.toContain('title.lorekeeper');
  });

  it('reserves Warden of Veyrath for three stars on every stand of Hard', () => {
    const cleared = clear(emptyCampaignProgress(), 'hard', 1);
    expect(
      isTitleEarned({ kind: 'difficulty_cleared', difficulty: 'hard' }, ctx({ progress: cleared })),
    ).toBe(true);
    expect(
      isTitleEarned({ kind: 'difficulty_mastered', difficulty: 'hard' }, ctx({ progress: cleared })),
    ).toBe(false);
    const mastered = clear(cleared, 'hard', 3);
    expect(
      isTitleEarned({ kind: 'difficulty_mastered', difficulty: 'hard' }, ctx({ progress: mastered })),
    ).toBe(true);
    expect(currentTitle(TITLES, ctx({ progress: mastered, level: 60 }))?.id).toBe('title.warden_of_veyrath');
  });

  it('counts levels and champions', () => {
    expect(earnedTitles(TITLES, ctx({ level: 25 })).map((t) => t.id)).toContain('title.seasoned');
    expect(earnedTitles(TITLES, ctx({ level: 24 })).map((t) => t.id)).not.toContain('title.seasoned');
    expect(earnedTitles(TITLES, ctx({ championsOwned: 10 })).map((t) => t.id)).toContain('title.collector');
  });

  it('names every title with strings the game ships', () => {
    for (const title of TITLES) {
      expect(TITLE_BY_ID[title.id]).toBe(title);
      expect(title.id).toMatch(/^title\.[a-z0-9_]+$/);
    }
    // Every settlement a title points at exists.
    for (const title of TITLES)
      if (title.condition.kind === 'settlement_boss')
        expect(content.settlementByIndex(title.condition.settlement), title.id).toBeDefined();
  });
});
