/**
 * The Chronicler's Path through the store (docs/design/QUESTS_MISSIONS.md §4, ROADMAP Phase 13
 * acceptance): one mission open at a time, a claim that pays and opens the next with its own
 * baseline, chapter chests once each, and a finale that hands Eldric over exactly once.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { flatMissions } from '@engine/missions/path';
import { counter } from '@engine/progression/counters';
import { FixedClock } from '@engine/time/clock';
import type { SaveGame } from '@engine/schema/save';
import { missionsClaimable, missionsState } from './missions';
import { createGameStore } from './store';

/** 2026-09-15 12:00 local. */
const T0 = new Date(2026, 8, 15, 12, 0).getTime();
const ALL = flatMissions(content.missionChapters).map((mission) => mission.id);

function chronicle({ level = 20 } = {}) {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Chronicler');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (state.save) state.save.profile.level = level;
    return state;
  });
  return { clock, store, events, actions: store.getState().actions };
}

type Chronicle = ReturnType<typeof chronicle>;
const save = (c: Chronicle): SaveGame => c.store.getState().save!;
const held = (c: Chronicle, id: string): number => save(c).wallet[id as 'gold'] ?? 0;
const state = (c: Chronicle) => missionsState(save(c), c.clock.now());

/** Edits the save the way play would, without playing it. */
function patch(c: Chronicle, apply: (save: SaveGame) => void): void {
  c.store.setState((draft) => {
    if (draft.save) apply(draft.save);
    return draft;
  });
}

/** Marks a stand cleared, which is what most of chapter 1 asks for. */
const cleared = (s: SaveGame, settlement: number, stage: number, difficulty = 'intro'): void => {
  s.campaign.stars[`stage.${`${settlement}`.padStart(2, '0')}.${`${stage}`.padStart(2, '0')}|${difficulty}`] =
    3;
};

/** Walks the line by fiat: everything up to `id` claimed, and `id` itself open. */
function walkTo(c: Chronicle, id: string): void {
  const upTo = ALL.slice(0, ALL.indexOf(id));
  patch(c, (s) => {
    s.missions.claimed = upTo;
    s.missions.baseline = {};
    s.missions.chests = [...new Set(upTo.map((mission) => Number(mission.slice(8, 10))))].filter(
      (chapter) => upTo.filter((m) => Number(m.slice(8, 10)) === chapter).length === 12,
    );
  });
}

describe('the Path on the screen', () => {
  it('opens on the first mission of the first chapter', () => {
    const c = chronicle();
    const view = state(c);
    expect(view.unlocked).toBe(true);
    expect(view.active?.mission.id).toBe('mission.01.01');
    expect(view.total).toBe(120);
    expect(view.claimed).toBe(0);
    expect(view.chapters[0]?.unlocked).toBe(true);
    expect(view.chapters[1]?.unlocked).toBe(false);
  });

  it('is open from the first level, because it is what guides the player', () => {
    // The owner's first batch: the Path leads a new Chronicler through what the game holds, so it
    // cannot be a reward for reaching level 6.
    const c = chronicle({ level: 1 });
    expect(state(c).unlocked).toBe(true);
    expect(state(c).unlockLevel).toBe(1);
  });
});

describe('claiming the open mission', () => {
  it('pays it, opens the next one and refuses a second press', () => {
    const c = chronicle();
    const seen: string[] = [];
    c.events.on((event) => seen.push(event.type));
    patch(c, (s) => cleared(s, 1, 1));
    expect(state(c).active?.status).toBe('claimable');

    const gold = held(c, 'gold');
    const claim = c.actions.claimMission('mission.01.01');
    if (!claim.ok) throw new Error(claim.error.message);
    expect(claim.value.currencies).toEqual([
      { currency: 'gold', amount: 2_000 },
      { currency: 'energy', amount: 100 },
    ]);
    expect(held(c, 'gold')).toBe(gold + 2_000);
    expect(claim.value.next?.id).toBe('mission.01.02');
    expect(counter(save(c), 'missions.claimed')).toBe(1);
    expect(seen).toContain('mission.claimed');

    const again = c.actions.claimMission('mission.01.01');
    expect(again.ok).toBe(false);
    expect(held(c, 'gold')).toBe(gold + 2_000);
    expect(save(c).missions.claimed).toEqual(['mission.01.01']);
  });

  it('refuses a mission that is not finished, and one that is not its turn', () => {
    const c = chronicle();
    expect(c.actions.claimMission('mission.01.01').ok).toBe(false);
    expect(c.actions.claimMission('mission.03.04').ok).toBe(false);
    expect(c.actions.claimMission('mission.99.99').ok).toBe(false);
    expect(save(c).missions.claimed).toEqual([]);
  });

  it('baselines the mission it opens, so its counter goal starts at zero', () => {
    const c = chronicle();
    // 1.1 is a state predicate; 1.2 counts manual victories, and nine came before it.
    patch(c, (s) => {
      cleared(s, 1, 1);
      s.stats['battles.won.manual'] = 9;
    });
    const claim = c.actions.claimMission('mission.01.01');
    if (!claim.ok) throw new Error(claim.error.message);
    expect(save(c).missions.baseline).toEqual({ 'battles.won.manual': 9 });
    expect(state(c).active?.progress).toEqual({ progress: 0, target: 1, done: false });

    patch(c, (s) => (s.stats['battles.won.manual'] = 10));
    expect(state(c).active?.progress.done).toBe(true);
  });

  it('keeps the baseline to the keys the open mission actually measures', () => {
    const c = chronicle();
    patch(c, (s) => {
      cleared(s, 1, 1);
      s.stats['battles.won.manual'] = 4;
      s.stats['campaign.cleared'] = 40;
      s.stats['forge.crafts'] = 7;
    });
    c.actions.claimMission('mission.01.01');
    // The next mission counts manual wins; nothing else is worth storing.
    expect(Object.keys(save(c).missions.baseline)).toEqual(['battles.won.manual']);
  });

  it('walks a whole chapter and offers its chest once', () => {
    const c = chronicle();
    walkTo(c, 'mission.01.12');
    patch(c, (s) => cleared(s, 1, 10));
    const claim = c.actions.claimMission('mission.01.12');
    if (!claim.ok) throw new Error(claim.error.message);
    expect(claim.value.chapterComplete).toBe(true);
    expect(claim.value.next?.id).toBe('mission.02.01');
    expect(state(c).claimableChests).toEqual([1]);
    expect(missionsClaimable(save(c), T0)).toBe(1);

    const shards = held(c, 'shard_ancient');
    const chest = c.actions.claimChapterChest(1);
    if (!chest.ok) throw new Error(chest.error.message);
    expect(held(c, 'shard_ancient')).toBe(shards + 1);
    expect(counter(save(c), 'missions.chests')).toBe(1);
    expect(c.actions.claimChapterChest(1).ok).toBe(false);
    expect(held(c, 'shard_ancient')).toBe(shards + 1);
    // Chapter 2 is open now, and its chest is not.
    expect(state(c).chapters[1]?.unlocked).toBe(true);
    expect(c.actions.claimChapterChest(2).ok).toBe(false);
  });
});

describe('a chronicle that arrives deep', () => {
  it('finds the state missions already met and walks them a claim at a time', () => {
    const c = chronicle({ level: 30 });
    // A chronicle that has cleared the first settlement and levelled: 1.1, 1.4, 1.8 and 1.9 are
    // all satisfied, but only the open one can be claimed.
    patch(c, (s) => {
      for (const stage of [1, 3, 6, 10]) cleared(s, 1, stage);
    });
    const view = state(c);
    expect(view.active?.mission.id).toBe('mission.01.01');
    expect(view.active?.status).toBe('claimable');
    expect(view.chapters[0]?.missions[3]?.progress.done).toBe(true);
    expect(view.chapters[0]?.missions[3]?.status).toBe('locked');

    expect(c.actions.claimMission('mission.01.01').ok).toBe(true);
    // 1.2 asks for a manual victory from here, which a deep chronicle still has to go and do.
    expect(state(c).active?.mission.id).toBe('mission.01.02');
    expect(state(c).active?.status).toBe('open');
  });
});

describe('the last page', () => {
  /** Everything but the final mission claimed, and every earlier chest taken. */
  function atTheEnd(c: Chronicle): void {
    walkTo(c, 'mission.10.12');
    patch(c, (s) => {
      s.missions.chests = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    });
  }

  it('is claimable the moment it opens, and pays the gems', () => {
    const c = chronicle({ level: 30 });
    atTheEnd(c);
    const view = state(c);
    expect(view.active?.mission.id).toBe('mission.10.12');
    expect(view.active?.status).toBe('claimable');

    const gems = held(c, 'gems');
    const claim = c.actions.claimMission('mission.10.12');
    if (!claim.ok) throw new Error(claim.error.message);
    expect(held(c, 'gems')).toBe(gems + 500);
    expect(claim.value.next).toBeNull();
    expect(state(c).finished).toBe(true);
    expect(state(c).claimed).toBe(120);
  });

  it('hands Eldric over once, and strikes his gift to the chronicle’s word', () => {
    const c = chronicle({ level: 30 });
    atTheEnd(c);
    c.actions.claimMission('mission.10.12');

    const before = Object.keys(save(c).roster).length;
    const chest = c.actions.claimChapterChest(10);
    if (!chest.ok) throw new Error(chest.error.message);
    expect(chest.value.champion?.defId).toBe('champ.eldric_chronicler');
    expect(chest.value.gift).toBe(true);
    expect(Object.keys(save(c).roster)).toHaveLength(before + 1);
    // Once: the chest refuses a second press, so Eldric cannot be farmed.
    expect(c.actions.claimChapterChest(10).ok).toBe(false);
    expect(Object.keys(save(c).roster)).toHaveLength(before + 1);

    const gift = c.actions.takeMissionGift('weapon', 'gear_set.warcry');
    if (!gift.ok) throw new Error(gift.error.message);
    expect(gift.value).toMatchObject({
      slot: 'weapon',
      setId: 'gear_set.warcry',
      rarity: 'legendary',
      stars: 6,
      source: 'mission',
    });
    expect(save(c).inventory[gift.value.instanceId]).toBeDefined();
    expect(save(c).missions.gearChoice).toBe(gift.value.instanceId);
    // And only once, whatever the second press names.
    expect(c.actions.takeMissionGift('helmet', 'gear_set.warcry').ok).toBe(false);
    expect(Object.keys(save(c).inventory)).toHaveLength(1);
  });

  it('refuses the gift before the last chest is taken, and refuses nonsense', () => {
    const c = chronicle({ level: 30 });
    atTheEnd(c);
    c.actions.claimMission('mission.10.12');
    expect(c.actions.takeMissionGift('weapon', 'gear_set.nonsense').ok).toBe(false);

    const early = chronicle({ level: 30 });
    expect(early.actions.takeMissionGift('weapon', 'gear_set.warcry').ok).toBe(false);
  });
});
