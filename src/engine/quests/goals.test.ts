/**
 * Every goal type the quests use, measured (docs/design/QUESTS_MISSIONS.md §1, ROADMAP Phase 12
 * acceptance). Two promises run through all of them: a counter goal measures only what happened
 * *this* period, and a state predicate reads the chronicle as it stands. Yesterday's play must
 * never complete today's quest, and a quest must never un-complete itself.
 */
import { describe, expect, it } from 'vitest';
import { NO_PALACE } from '@engine/palace/index';
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import type { Goal } from '@content/quests/types';
import { emptyGear, type ChampionInstance } from '@engine/champions/instance';
import type { GearInstance } from '@engine/gear/instance';
import { COUNTER_KEYS, isCounterKey } from '@engine/progression/counters';
import { createNewGame } from '@engine/save/new-game';
import type { SaveGame } from '@engine/schema/save';
import { GOAL_COUNTERS, evaluateGoal, goalCounterKeys, type GoalContext, type GoalLookups } from './goals';

/** 2026-09-15 12:00 local — the instant every goal here is measured at. */
const NOW = new Date(2026, 8, 15, 12, 0).getTime();

/**
 * The registry, as the state layer binds it (`state/goal-lookups.ts`). A predicate that asks about
 * a champion's rarity or a boss's pool has to read the real content for the answer to mean
 * anything.
 */
const LOOKUPS: GoalLookups = {
  champion: (id) => content.championById(id as ChampionId),
  gearSet: (id) => content.gearSetById(id),
  boss: (id) => content.bossById(id),
};

function newSave(): SaveGame {
  return createNewGame({ name: 'Chronicler', now: NOW, seedRoot: 'goals' });
}

/** A chronicle with the given counters and nothing else played. */
function ctx(stats: Record<string, number>, baseline: Record<string, number> = {}): GoalContext {
  return { save: { ...newSave(), stats }, baseline, now: NOW, lookups: LOOKUPS, palace: NO_PALACE };
}

/** A chronicle whose save has been edited by the caller — the state predicates' fixture. */
function withSave(patch: (save: SaveGame) => void, baseline: Record<string, number> = {}): GoalContext {
  const save = newSave();
  patch(save);
  return { save, baseline, now: NOW, lookups: LOOKUPS, palace: NO_PALACE };
}

let serial = 0;

/** A piece on the racks: only what a predicate reads has to be real. */
function piece(patch: Partial<GearInstance> = {}): GearInstance {
  serial += 1;
  return {
    instanceId: `gear-${serial}`,
    slot: 'weapon',
    setId: 'gear_set.warcry',
    rarity: 'legendary',
    stars: 5,
    level: 0,
    mainStat: 'atk',
    subs: [],
    equippedTo: null,
    locked: false,
    acquiredAt: NOW,
    source: 'craft',
    ...patch,
  };
}

/** A champion in the roster, with the pieces it wears put on the racks for it. */
function champion(
  save: SaveGame,
  defId: ChampionId,
  patch: Partial<ChampionInstance> = {},
  wears: GearInstance[] = [],
): ChampionInstance {
  serial += 1;
  const instanceId = `${defId.replace('champ.', '')}-${serial}`;
  const gear = emptyGear();
  for (const worn of wears) {
    save.inventory[worn.instanceId] = { ...worn, equippedTo: instanceId };
    gear[worn.slot] = worn.instanceId;
  }
  const instance: ChampionInstance = {
    instanceId,
    defId,
    level: 1,
    xp: 0,
    stars: 3,
    skillUpgrades: {},
    gear,
    locked: false,
    favourite: false,
    acquiredAt: NOW,
    source: 'summon',
    ...patch,
  };
  save.roster[instanceId] = instance;
  return instance;
}

describe('counter goals measure the period, not the chronicle', () => {
  const goal: Goal = { type: 'clear_stages', count: 5 };

  it('starts at zero however much came before', () => {
    // Four hundred stages cleared in the past; the period began with all of them behind it.
    const view = evaluateGoal(goal, ctx({ 'campaign.cleared': 400 }, { 'campaign.cleared': 400 }));
    expect(view).toEqual({ progress: 0, target: 5, done: false });
  });

  it('counts what the period added', () => {
    expect(evaluateGoal(goal, ctx({ 'campaign.cleared': 403 }, { 'campaign.cleared': 400 }))).toEqual({
      progress: 3,
      target: 5,
      done: false,
    });
  });

  it('completes on the target and never reports past it', () => {
    const view = evaluateGoal(goal, ctx({ 'campaign.cleared': 411 }, { 'campaign.cleared': 400 }));
    expect(view).toEqual({ progress: 5, target: 5, done: true });
  });

  it('never goes negative, whatever a baseline says', () => {
    // A save edited by hand, or a counter that was renamed: the row reads zero, not minus.
    expect(evaluateGoal(goal, ctx({ 'campaign.cleared': 1 }, { 'campaign.cleared': 9 })).progress).toBe(0);
  });
});

describe('each goal type reads the counter it names', () => {
  const cases: { goal: Goal; stats: Record<string, number>; progress: number; target: number }[] = [
    { goal: { type: 'win_battles', count: 3 }, stats: { 'battles.victory': 2 }, progress: 2, target: 3 },
    { goal: { type: 'win_manual', count: 1 }, stats: { 'battles.won.manual': 1 }, progress: 1, target: 1 },
    { goal: { type: 'spend_energy', amount: 60 }, stats: { 'energy.spent': 44 }, progress: 44, target: 60 },
    {
      goal: { type: 'level_champion_times', count: 3 },
      stats: { 'tavern.levelUps': 3 },
      progress: 3,
      target: 3,
    },
    { goal: { type: 'rank_up_times', count: 1 }, stats: { 'tavern.rankUps': 0 }, progress: 0, target: 1 },
    {
      goal: { type: 'skill_upgrades', count: 2 },
      stats: { 'tavern.skillUpgrades': 5 },
      progress: 2,
      target: 2,
    },
    { goal: { type: 'gear_levels', count: 5 }, stats: { 'gear.levels': 4 }, progress: 4, target: 5 },
    { goal: { type: 'craft', count: 1 }, stats: { 'forge.crafts': 1 }, progress: 1, target: 1 },
    { goal: { type: 'dismantle', count: 1 }, stats: { 'forge.dismantles': 2 }, progress: 1, target: 1 },
    { goal: { type: 'summon', count: 10 }, stats: { 'summon.pulls': 10 }, progress: 10, target: 10 },
    { goal: { type: 'claim_idle', count: 7 }, stats: { 'idle.claims': 3 }, progress: 3, target: 7 },
    {
      goal: { type: 'complete_daily_quests_days', count: 5 },
      stats: { 'quests.daily.days': 2 },
      progress: 2,
      target: 5,
    },
  ];

  for (const { goal, stats, progress, target } of cases) {
    it(`${goal.type}`, () => {
      expect(evaluateGoal(goal, ctx(stats))).toEqual({ progress, target, done: progress >= target });
    });
  }

  it('counts a boss by its own id, so one gate does not feed the other', () => {
    const goal: Goal = { type: 'boss_fights', boss: 'boss.nyxara', count: 3 };
    const stats = { 'boss.fights': 12, 'boss.fights.boss.gravemaw': 10, 'boss.fights.boss.nyxara': 2 };
    expect(evaluateGoal(goal, ctx(stats))).toEqual({ progress: 2, target: 3, done: false });
  });
});

describe('goals that read a state rather than a count', () => {
  it('login is its own proof', () => {
    expect(evaluateGoal({ type: 'login' }, ctx({}))).toEqual({ progress: 1, target: 1, done: true });
  });

  it('gear_reach_level looks at the racks, not at what was levelled', () => {
    const goal: Goal = { type: 'gear_reach_level', level: 12, count: 1 };
    const withPiece = withSave((save) => {
      save.inventory = { a: piece({ level: 8 }), b: piece({ level: 12 }) };
    });
    expect(evaluateGoal(goal, withPiece).done).toBe(true);
    // And it does not care that the levelling happened before the period began.
    expect(evaluateGoal(goal, { ...withPiece, baseline: { 'gear.levels': 999 } }).done).toBe(true);
    expect(evaluateGoal(goal, ctx({})).done).toBe(false);
  });
});

describe('the campaign, as it stands', () => {
  /** Stars on one stand, on one difficulty — what `campaign.stars` keys look like. */
  const stars = (save: SaveGame, stageId: string, difficulty: string, count: number): void => {
    save.campaign.stars[`${stageId}|${difficulty}`] = count;
  };

  it('clear_stage asks for that stand on that difficulty, and nothing else', () => {
    const goal: Goal = { type: 'clear_stage', settlement: 1, stage: 10, difficulty: 'intro' };
    expect(evaluateGoal(goal, ctx({})).done).toBe(false);
    // The same stand on Normal is not the same mission.
    expect(
      evaluateGoal(
        goal,
        withSave((s2) => stars(s2, 'stage.01.10', 'normal', 3)),
      ).done,
    ).toBe(false);
    expect(
      evaluateGoal(
        goal,
        withSave((s2) => stars(s2, 'stage.01.10', 'intro', 1)),
      ).done,
    ).toBe(true);
  });

  it('settlement_stars counts one settlement, difficulty_stars the whole difficulty', () => {
    const played = withSave((s2) => {
      for (let stage = 1; stage <= 10; stage += 1)
        stars(s2, `stage.01.${`${stage}`.padStart(2, '0')}`, 'intro', 3);
      stars(s2, 'stage.02.01', 'intro', 2);
    });
    expect(
      evaluateGoal({ type: 'settlement_stars', settlement: 1, difficulty: 'intro', stars: 20 }, played),
    ).toEqual({ progress: 20, target: 20, done: true });
    expect(
      evaluateGoal({ type: 'settlement_stars', settlement: 2, difficulty: 'intro', stars: 30 }, played),
    ).toEqual({ progress: 2, target: 30, done: false });
    // Thirty from the first settlement and two from the second: the difficulty's own total.
    expect(evaluateGoal({ type: 'difficulty_stars', difficulty: 'intro', stars: 360 }, played)).toEqual({
      progress: 32,
      target: 360,
      done: false,
    });
  });
});

describe('the roster, as it stands', () => {
  it('own_champions counts copies, and narrows to a rarity', () => {
    const roster = withSave((save) => {
      champion(save, 'champ.ser_corvin');
      champion(save, 'champ.ser_corvin');
      champion(save, 'champ.anuria');
    });
    expect(evaluateGoal({ type: 'own_champions', count: 3 }, roster).done).toBe(true);
    // Two Rares and one Epic: asking for an Epic sees one of them.
    expect(evaluateGoal({ type: 'own_champions', count: 1, rarity: 'epic' }, roster)).toEqual({
      progress: 1,
      target: 1,
      done: true,
    });
    expect(evaluateGoal({ type: 'own_champions', count: 1, rarity: 'legendary' }, roster).done).toBe(false);
  });

  it('champion_reach_level and _stars read the copies, not the levels bought', () => {
    const roster = withSave((save) => {
      champion(save, 'champ.ser_corvin', { level: 40, stars: 5 });
      champion(save, 'champ.anuria', { level: 25, stars: 6 });
    });
    expect(evaluateGoal({ type: 'champion_reach_level', level: 25, count: 2 }, roster).done).toBe(true);
    expect(evaluateGoal({ type: 'champion_reach_level', level: 40, count: 2 }, roster)).toEqual({
      progress: 1,
      target: 2,
      done: false,
    });
    // "Five champions at 6★ level 60" is one goal, not two.
    expect(evaluateGoal({ type: 'champion_reach_level', level: 25, count: 1, stars: 6 }, roster).done).toBe(
      true,
    );
    expect(evaluateGoal({ type: 'champion_reach_level', level: 40, count: 1, stars: 6 }, roster).done).toBe(
      false,
    );
    expect(evaluateGoal({ type: 'champion_reach_stars', stars: 6, count: 1 }, roster).done).toBe(true);
    expect(evaluateGoal({ type: 'champion_reach_stars', stars: 6, count: 2 }, roster).done).toBe(false);
  });

  it('all_skills_maxed wants every ability of one champion of that rarity', () => {
    const goal: Goal = { type: 'all_skills_maxed', rarity: 'epic' };
    const def = content.championById('champ.anuria');
    if (!def) throw new Error('champ.anuria is missing');
    const maxed = Object.fromEntries(def.abilities.map((a) => [a.id, a.upgrades.length]));
    const short = { ...maxed, [def.abilities[0]?.id ?? '']: 0 };

    expect(
      evaluateGoal(
        goal,
        withSave((save) => champion(save, 'champ.anuria', { skillUpgrades: short })),
      ).done,
    ).toBe(false);
    expect(
      evaluateGoal(
        goal,
        withSave((save) => champion(save, 'champ.anuria', { skillUpgrades: maxed })),
      ).done,
    ).toBe(true);
    // The rarity matters: a finished Rare is not a finished Epic.
    const rare = content.championById('champ.ser_corvin');
    if (!rare) throw new Error('champ.ser_corvin is missing');
    const rareMaxed = Object.fromEntries(rare.abilities.map((a) => [a.id, a.upgrades.length]));
    expect(
      evaluateGoal(
        goal,
        withSave((save) => champion(save, 'champ.ser_corvin', { skillUpgrades: rareMaxed })),
      ).done,
    ).toBe(false);
  });

  it('player_level reads the profile', () => {
    expect(evaluateGoal({ type: 'player_level', level: 15 }, ctx({}))).toEqual({
      progress: 1,
      target: 15,
      done: false,
    });
    const deep = withSave((save) => {
      save.profile.level = 30;
    });
    expect(evaluateGoal({ type: 'player_level', level: 15 }, deep).done).toBe(true);
  });

  it('team_power sums the best four, however many the chronicle owns', () => {
    const many = withSave((save) => {
      for (let i = 0; i < 6; i += 1) champion(save, 'champ.ser_corvin', { level: 30, stars: 5 });
    });
    const four = withSave((save) => {
      for (let i = 0; i < 4; i += 1) champion(save, 'champ.ser_corvin', { level: 30, stars: 5 });
    });
    const power = evaluateGoal({ type: 'team_power', power: 1 }, four).progress;
    expect(power).toBeGreaterThan(0);
    // Six copies of the same champion cannot beat four of them: only a party's worth counts.
    expect(evaluateGoal({ type: 'team_power', power: 1_000_000 }, many).progress).toBe(
      evaluateGoal({ type: 'team_power', power: 1_000_000 }, four).progress,
    );
  });
});

describe('the racks, as they stand', () => {
  it('equip_pieces counts one champion’s slots, at a rank when asked', () => {
    const geared = withSave((save) => {
      champion(save, 'champ.ser_corvin', {}, [
        piece({ slot: 'weapon', stars: 5 }),
        piece({ slot: 'helmet', stars: 3 }),
        piece({ slot: 'boots', stars: 4 }),
      ]);
      // A second champion wearing one piece must not add to the first one's three.
      champion(save, 'champ.anuria', {}, [piece({ slot: 'weapon', stars: 6 })]);
    });
    expect(evaluateGoal({ type: 'equip_pieces', count: 3 }, geared).done).toBe(true);
    expect(evaluateGoal({ type: 'equip_pieces', count: 4 }, geared).progress).toBe(3);
    expect(evaluateGoal({ type: 'equip_pieces', count: 2, minStars: 4 }, geared)).toEqual({
      progress: 2,
      target: 2,
      done: true,
    });
    expect(evaluateGoal({ type: 'equip_pieces', count: 3, minStars: 4 }, geared).done).toBe(false);
  });

  it('equip_full_set wants a complete group of that size', () => {
    const two = content.gearSets.find((set) => set.pieces === 2);
    const four = content.gearSets.find((set) => set.pieces === 4);
    if (!two || !four) throw new Error('the sets are missing');
    const wearing = withSave((save) => {
      champion(save, 'champ.ser_corvin', {}, [
        piece({ slot: 'weapon', setId: two.id }),
        piece({ slot: 'helmet', setId: two.id }),
        piece({ slot: 'shield', setId: four.id }),
        piece({ slot: 'boots', setId: four.id }),
      ]);
    });
    expect(evaluateGoal({ type: 'equip_full_set', pieces: 2 }, wearing).done).toBe(true);
    // Two pieces of a four-piece set is not a group.
    expect(evaluateGoal({ type: 'equip_full_set', pieces: 4 }, wearing).done).toBe(false);
  });

  it('gear_reach_level can ask about one champion’s six slots', () => {
    const spread = withSave((save) => {
      save.inventory['loose-1'] = piece({ instanceId: 'loose-1', level: 16 });
      champion(save, 'champ.ser_corvin', {}, [
        piece({ slot: 'weapon', level: 16 }),
        piece({ slot: 'helmet', level: 16 }),
      ]);
    });
    // Three pieces at +16 in the racks…
    expect(evaluateGoal({ type: 'gear_reach_level', level: 16, count: 3 }, spread).done).toBe(true);
    // …but only two of them on the same champion.
    expect(
      evaluateGoal({ type: 'gear_reach_level', level: 16, count: 3, onOneChampion: true }, spread),
    ).toEqual({ progress: 2, target: 3, done: false });
  });
});

describe('the bosses', () => {
  const GRAVEMAW_EASY = 250_000;

  /** A boss record in the save: this period's damage, and the best a tier ever took. */
  const banked = (save: SaveGame, damage: number, best: number): void => {
    save.bosses['boss.gravemaw'] = {
      periodKey: '2026-09-15',
      keysUsed: 1,
      damage: { easy: damage },
      claimed: [],
      records: { easy: { damage: best, at: NOW, team: [] } },
    };
  };

  it('boss_damage counts this period, and reads zero once the period turns over', () => {
    const goal: Goal = { type: 'boss_damage', boss: 'boss.gravemaw', tier: 'easy', amount: 250_000 };
    const today = withSave((save) => banked(save, 120_000, 120_000));
    expect(evaluateGoal(goal, today)).toEqual({ progress: 120_000, target: 250_000, done: false });
    // A day later the pool is empty again: the mission asks for the damage "in a day".
    expect(evaluateGoal(goal, { ...today, now: NOW + 36 * 60 * 60 * 1000 }).progress).toBe(0);
  });

  it('boss_percent reads the record, so it outlives every reset', () => {
    const goal: Goal = { type: 'boss_percent', boss: 'boss.gravemaw', tier: 'easy', pct: 30 };
    const record = withSave((save) => banked(save, 0, GRAVEMAW_EASY * 0.3));
    expect(evaluateGoal(goal, record)).toEqual({ progress: 30, target: 30, done: true });
    // Tomorrow, with nothing banked, the record still counts.
    expect(evaluateGoal(goal, { ...record, now: NOW + 36 * 60 * 60 * 1000 }).done).toBe(true);
    // A kill is a hundred per cent, never more.
    const killed = withSave((save) => banked(save, 0, GRAVEMAW_EASY * 2));
    expect(evaluateGoal({ ...goal, pct: 100 }, killed)).toEqual({ progress: 100, target: 100, done: true });
  });

  it('counts a tier’s keys apart from the boss’s own', () => {
    const goal: Goal = { type: 'boss_fights', boss: 'boss.gravemaw', tier: 'easy', count: 1 };
    const stats = { 'boss.fights.boss.gravemaw': 9, 'boss.fights.boss.gravemaw.easy': 0 };
    expect(evaluateGoal(goal, ctx(stats)).done).toBe(false);
    expect(evaluateGoal(goal, ctx({ ...stats, 'boss.fights.boss.gravemaw.easy': 1 })).done).toBe(true);
  });
});

describe('the narrowed counter goals', () => {
  it('craft can ask for one bench, summon for one shard', () => {
    expect(evaluateGoal({ type: 'craft', count: 1, tier: 'star' }, ctx({ 'forge.crafts': 20 })).done).toBe(
      false,
    );
    expect(
      evaluateGoal({ type: 'craft', count: 1, tier: 'star' }, ctx({ 'forge.crafts.star': 1 })).done,
    ).toBe(true);
    expect(
      evaluateGoal({ type: 'summon', count: 1, shard: 'ancient' }, ctx({ 'summon.pulls': 30 })).done,
    ).toBe(false);
    expect(
      evaluateGoal({ type: 'summon', count: 1, shard: 'ancient' }, ctx({ 'summon.pulls.ancient': 1 })).done,
    ).toBe(true);
  });

  it('five daily quests in a day is its own count of days', () => {
    const five: Goal = { type: 'complete_daily_quests_days', count: 1, quests: 5 };
    expect(evaluateGoal(five, ctx({ 'quests.daily.days': 3 })).done).toBe(false);
    expect(evaluateGoal(five, ctx({ 'quests.daily.days5': 1 })).done).toBe(true);
  });

  it('gear_refine_times counts the Forge’s third bench', () => {
    expect(evaluateGoal({ type: 'gear_refine_times', count: 1 }, ctx({ 'forge.refines': 1 })).done).toBe(
      true,
    );
  });
});

describe('the Path’s last page', () => {
  it('is done only when the line says everything before it is', () => {
    const goal: Goal = { type: 'all_previous' };
    expect(evaluateGoal(goal, ctx({})).done).toBe(false);
    expect(evaluateGoal(goal, { ...ctx({}), allPrevious: true }).done).toBe(true);
  });
});

describe('a goal with several ways to finish', () => {
  const either: Goal = {
    type: 'any',
    goals: [
      { type: 'craft', count: 1 },
      { type: 'dismantle', count: 1 },
    ],
  };

  it('reports the closest of them', () => {
    expect(evaluateGoal(either, ctx({ 'forge.dismantles': 1 }))).toEqual({
      progress: 1,
      target: 1,
      done: true,
    });
    expect(evaluateGoal(either, ctx({}))).toEqual({ progress: 0, target: 1, done: false });
  });

  it('is done when either side is', () => {
    expect(evaluateGoal(either, ctx({ 'forge.crafts': 3 })).done).toBe(true);
  });
});

describe('the counters a period has to snapshot', () => {
  it('names one key per counter goal, boss keys included', () => {
    const goals: Goal[] = [
      { type: 'login' },
      { type: 'clear_stages', count: 5 },
      { type: 'boss_fights', boss: 'boss.gravemaw', count: 2 },
      { type: 'gear_reach_level', level: 12, count: 1 },
      {
        type: 'any',
        goals: [
          { type: 'craft', count: 1 },
          { type: 'dismantle', count: 1 },
        ],
      },
    ];
    expect(goalCounterKeys(goals)).toEqual([
      'boss.fights.boss.gravemaw',
      'campaign.cleared',
      'forge.crafts',
      'forge.dismantles',
    ]);
  });

  it('only ever names counters the game writes', () => {
    for (const key of Object.values(GOAL_COUNTERS)) {
      expect(isCounterKey(key), key).toBe(true);
      expect(COUNTER_KEYS).toContain(key);
    }
  });
});
