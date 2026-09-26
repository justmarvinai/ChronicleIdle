/**
 * The Hall of Deeds as arithmetic (docs/design/ACHIEVEMENTS.md): what is claimable, what renown
 * adds up to, which rank it stands on, which frames it has hung up — all derived from what the
 * save says was claimed and the chronicle as it stands.
 */
import { describe, expect, it } from 'vitest';
import { TIER_RENOWN } from '@content/balance/deeds';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { NO_PALACE } from '@engine/palace/index';
import type { GoalContext } from '@engine/quests/goals';
import { createNewGame } from '@engine/save/new-game';
import { emptyDeeds, type DeedsSave, type SaveGame } from '@engine/schema/save';
import {
  achievementView,
  challengeToClaim,
  challengeView,
  earnedFrames,
  hallView,
  rankToClaim,
  renownOf,
  tierToClaim,
  type HallContent,
} from './hall';

const NOW = new Date(2026, 8, 26, 12, 0).getTime();
const HALL: HallContent = {
  achievements: content.achievements,
  challenges: content.challenges,
  ranks: content.hallRanks,
};

function ctx(stats: Record<string, number>, patch: (save: SaveGame) => void = () => undefined): GoalContext {
  const save: SaveGame = { ...createNewGame({ name: 'Hall', now: NOW, seedRoot: 'hall' }), stats };
  patch(save);
  return {
    save,
    baseline: {},
    now: NOW,
    lookups: {
      champion: (id) => content.championById(id as ChampionId),
      gearSet: (id) => content.gearSetById(id),
      boss: (id) => content.bossById(id),
    },
    palace: NO_PALACE,
  };
}

const def = (id: string) => {
  const found = content.achievementById(id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};
const challenge = (id: string) => {
  const found = content.challengeById(id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};
const claimed = (patch: Partial<DeedsSave>): DeedsSave => ({ ...emptyDeeds(), ...patch });

describe('an achievement', () => {
  const standBreaker = def('achievement.stand_breaker');

  it('opens on its first tier and waits for its goal', () => {
    const view = achievementView(standBreaker, emptyDeeds(), ctx({ 'campaign.cleared': 40 }));
    expect(view).toMatchObject({ claimed: 0, status: 'open', claimable: 0 });
    expect(view.tier?.tier).toBe(1);
    expect(view.progress).toEqual({ progress: 40, target: 100, done: false });
  });

  it('counts every tier the chronicle is already past, so the Hall remembers the years before it', () => {
    const view = achievementView(standBreaker, emptyDeeds(), ctx({ 'campaign.cleared': 4_200 }));
    expect(view).toMatchObject({ status: 'claimable', claimable: 3 });
    expect(tierToClaim(standBreaker, emptyDeeds(), ctx({ 'campaign.cleared': 4_200 }))).toMatchObject({
      ok: true,
      value: { tier: 1 },
    });
  });

  it('moves to the next tier once one is claimed, and is done after the fifth', () => {
    const after = achievementView(
      standBreaker,
      claimed({ achievements: { [standBreaker.id]: 3 } }),
      ctx({ 'campaign.cleared': 4_200 }),
    );
    expect(after).toMatchObject({ claimed: 3, status: 'open', claimable: 0 });
    expect(after.tier?.tier).toBe(4);
    const done = achievementView(
      standBreaker,
      claimed({ achievements: { [standBreaker.id]: 5 } }),
      ctx({ 'campaign.cleared': 99_999 }),
    );
    expect(done).toMatchObject({ claimed: 5, tier: null, progress: null, status: 'done' });
    expect(tierToClaim(standBreaker, claimed({ achievements: { [standBreaker.id]: 5 } }), ctx({})).ok).toBe(
      false,
    );
  });

  it('refuses a tier whose goal is not met', () => {
    expect(tierToClaim(standBreaker, emptyDeeds(), ctx({ 'campaign.cleared': 99 })).ok).toBe(false);
  });

  it('pays what its tier and its ledger say, and adds the tier’s renown', () => {
    const [first] = standBreaker.tiers;
    expect(first?.rewards).toEqual([
      { currency: 'gold', amount: 10_000 },
      { currency: 'energy', amount: 20 },
    ]);
    expect(standBreaker.tiers.map((tier) => tier.renown)).toEqual([...TIER_RENOWN]);
    // Emberhold's gold lands on the tier's own gold as one pile.
    expect(def('achievement.dockhand').tiers[0]?.rewards).toEqual([{ currency: 'gold', amount: 20_000 }]);
  });
});

describe('a challenge', () => {
  const lone = challenge('challenge.lone_blade');

  it('is claimable once its feat is on the record, and only once', () => {
    expect(challengeView(lone, emptyDeeds(), ctx({})).status).toBe('open');
    expect(challengeView(lone, emptyDeeds(), ctx({ 'feat.solo': 1 })).status).toBe('claimable');
    expect(challengeToClaim(lone, emptyDeeds(), ctx({ 'feat.solo': 1 })).ok).toBe(true);
    const taken = claimed({ challenges: [lone.id] });
    expect(challengeToClaim(lone, taken, ctx({ 'feat.solo': 1 })).ok).toBe(false);
  });

  it('keeps its bar full once claimed, whatever the chronicle does after', () => {
    const heart = challenge('challenge.heart_of_the_vein');
    const view = challengeView(heart, claimed({ challenges: [heart.id] }), ctx({}));
    expect(view.status).toBe('done');
    expect(view.progress.done).toBe(true);
    expect(view.progress.progress).toBe(view.progress.target);
  });
});

describe('renown and the ranks', () => {
  it('adds up everything claimed, tiers and challenges alike', () => {
    const save = claimed({
      achievements: { 'achievement.stand_breaker': 2, 'achievement.victor': 1 },
      challenges: ['challenge.lone_blade'],
    });
    expect(renownOf(HALL, save)).toBe(5 + 10 + 5 + 50);
  });

  it('lets a rank be claimed only on renown already claimed, and in order', () => {
    expect(rankToClaim(HALL, emptyDeeds()).ok).toBe(false);
    const enough = claimed({ achievements: { 'achievement.stand_breaker': 3 } }); // 35 renown
    expect(rankToClaim(HALL, enough)).toMatchObject({ ok: true, value: { rank: 1 } });
    expect(rankToClaim(HALL, { ...enough, ranks: 1 }).ok).toBe(false);
  });

  it('shows every rank reached and unclaimed as waiting, and counts it', () => {
    const save = claimed({
      achievements: Object.fromEntries(content.achievements.slice(0, 4).map((a) => [a.id, 5])), // 620
    });
    const view = hallView(HALL, save, ctx({}));
    expect(view.renown).toBe(620);
    expect(view.ranks.filter((rank) => rank.status === 'claimable').map((rank) => rank.def.rank)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(view.next?.rank).toBe(1);
  });

  it('counts tiers, challenges and ranks together for the dot', () => {
    const view = hallView(HALL, emptyDeeds(), ctx({ 'campaign.cleared': 1_000, 'feat.solo': 1 }));
    // Two tiers of Stand-breaker and Lone Blade; nothing claimed yet, so no rank.
    expect(view.claimable).toBe(3);
  });

  it('puts the tenth rank within reach of the whole Hall, and only just', () => {
    const total =
      content.achievements.reduce((sum, a) => sum + a.tiers.reduce((s, tier) => s + tier.renown, 0), 0) +
      content.challenges.reduce((sum, c) => sum + c.renown, 0);
    const last = content.hallRanks[content.hallRanks.length - 1];
    expect(last?.renown).toBeLessThanOrEqual(total);
    expect((last?.renown ?? 0) / total).toBeGreaterThan(0.85);
  });
});

describe('portrait frames', () => {
  it('hang up on the rank or the challenge that names them', () => {
    expect(earnedFrames(content.frames, emptyDeeds())).toEqual([]);
    const ids = (deeds: DeedsSave) => earnedFrames(content.frames, deeds).map((frame) => frame.id);
    expect(ids(claimed({ ranks: 4 }))).toEqual(['frame.bronze', 'frame.silver']);
    expect(ids(claimed({ challenges: ['challenge.titan_falls'] }))).toEqual(['frame.amethyst']);
  });
});
