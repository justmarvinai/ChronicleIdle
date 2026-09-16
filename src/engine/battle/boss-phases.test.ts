/**
 * What the weekly boss needed from the engine (docs/design/BOSSES.md §3): a fight that changes
 * gear at HP thresholds, abilities that only open in a later phase, a chorus of adds that takes a
 * share of every hit and comes back, a buff steal, and an aura that dims the party's healing.
 * Every mechanic is driven from data here — nothing in the engine knows Nyxara's name.
 */
import { describe, expect, it } from 'vitest';
import type { AbilityDef, Effect } from '@content/champions/types';
import type { EnemyBossConfig } from '@content/enemies/types';
import { unitView } from './snapshot';
import { runAuto } from './step';
import {
  ability,
  battle,
  champion,
  decide,
  enemy,
  eventsOf,
  passive,
  untilTurnOf,
  type BattleFixture,
} from './test-utils';
import type { BattleState, BattleUnit } from './types';

const BOSS: EnemyBossConfig = {
  rotation: ['a1'],
  immunities: [],
  enrageAfterTurn: 99,
  damageTakenMult: 1,
};

/** Three phases: the fight changes gear at 70 % and at 35 % of the pool. */
const PHASES = [0.7, 0.35];

const CHORISTERS = {
  enemyId: 'enemy.chorister',
  count: 2,
  guardPercent: 30,
  reviveEvery: 2,
  revivedHpPercent: 50,
};

/** A flick, so the boss's own turns never end the fixture's fight. */
const flick: Effect[] = [{ kind: 'damage', target: 'single_enemy', mult: 0.001, stat: 'ATK' }];

/** One champion, slow and unkillable, whose only ability is the effect list under test. */
function caster(effects: Effect[], extra: Partial<AbilityDef> = {}) {
  return champion({
    stats: { hp: 10_000_000, spd: 10 },
    abilities: [ability('a1', effects, { cooldown: 0, ...extra })],
  });
}

function boss(config: Partial<EnemyBossConfig> = {}, extra: Parameters<typeof enemy>[0] = {}) {
  return enemy({
    id: 'enemy.weekly',
    stats: { hp: 1_000_000, spd: 400, atk: 100 },
    abilities: [ability('a1', flick, { cooldown: 0 })],
    ...extra,
    boss: { ...BOSS, ...config },
  });
}

const chorister = (hp = 50_000) =>
  enemy({
    id: 'enemy.chorister',
    stats: { hp, spd: 90, atk: 100 },
    abilities: [ability('a1', flick, { cooldown: 0 })],
  });

function unitOf(state: BattleState, id: string): BattleUnit {
  const unit = state.units[id];
  if (!unit) throw new Error(`no unit ${id}`);
  return unit;
}

/** The fixture the phase and adds tests share: one slow champion against the boss's wave. */
function fight(fixture: Omit<BattleFixture, 'party'> & { party?: BattleFixture['party'] }) {
  return battle({ party: [caster(flick)], ...fixture });
}

/**
 * Releases the champion's pending turn and returns everything that happens up to its next one —
 * the boss is far faster here, so this is the window its own turns land in. Tests set the board
 * up while the champion holds the turn, then read what the boss does with it.
 */
function passTurn(state: BattleState) {
  const pending = state.pending;
  if (!pending) throw new Error('no pending decision');
  const choice = pending.abilities[0];
  if (!choice) throw new Error('no ability to pass with');
  const events = decide(state, choice.slot, choice.autoTarget);
  return [...events, ...untilTurnOf(state, 'a0').events];
}

describe('a boss that changes gear', () => {
  it('starts in phase 1 and counts the thresholds it has not crossed', () => {
    const state = fight({ waves: [[boss({ phases: PHASES })]] });
    const nyx = unitOf(state, 'w0e0');
    expect(nyx.phase).toBe(1);
    expect(unitView(nyx).boss).toMatchObject({ phase: 1, phaseCount: 3 });
  });

  it('enters the next phase on its own turn after the threshold is crossed', () => {
    const state = fight({ waves: [[boss({ phases: PHASES })]] });
    const nyx = unitOf(state, 'w0e0');
    nyx.hp = Math.floor(nyx.maxHp * 0.5);

    const { events } = untilTurnOf(state, 'a0');
    expect(eventsOf(events, 'phase.changed').map((e) => e.phase)).toEqual([2]);
    expect(nyx.phase).toBe(2);
  });

  it('skips straight to the last phase when a hit takes it past both thresholds', () => {
    const state = fight({ waves: [[boss({ phases: PHASES })]] });
    const nyx = unitOf(state, 'w0e0');
    nyx.hp = Math.floor(nyx.maxHp * 0.1);

    const { events } = untilTurnOf(state, 'a0');
    expect(eventsOf(events, 'phase.changed').map((e) => e.phase)).toEqual([3]);
    expect(nyx.phase).toBe(3);
  });

  it('never goes back, however much it is healed', () => {
    const state = fight({ waves: [[boss({ phases: PHASES })]] });
    const nyx = unitOf(state, 'w0e0');
    nyx.hp = Math.floor(nyx.maxHp * 0.2);
    untilTurnOf(state, 'a0');
    expect(nyx.phase).toBe(3);

    nyx.hp = nyx.maxHp;
    const { events } = untilTurnOf(state, 'a0');
    expect(eventsOf(events, 'phase.changed')).toHaveLength(0);
    expect(nyx.phase).toBe(3);
  });

  it('stays in phase 1 for its whole fight when it declares no thresholds', () => {
    const state = fight({ waves: [[boss()]] });
    const nyx = unitOf(state, 'w0e0');
    nyx.hp = 1;
    const { events } = untilTurnOf(state, 'a0');
    expect(eventsOf(events, 'phase.changed')).toHaveLength(0);
    expect(unitView(nyx).boss).toMatchObject({ phase: 1, phaseCount: 1 });
  });
});

describe('an ability the phase gates', () => {
  const hymn = () =>
    boss(
      { rotation: ['a2', 'a1'], phases: PHASES },
      {
        abilities: [
          ability('a1', flick, { cooldown: 0 }),
          ability('a2', flick, { cooldown: 0, minPhase: 2 }),
        ],
      },
    );

  it('is passed over while the fight is in an earlier phase', () => {
    const state = fight({ waves: [[hymn()]] });
    const nyx = unitOf(state, 'w0e0');
    const gated = nyx.abilities.find((a) => a.slot === 'a2');
    const { events } = untilTurnOf(state, 'a0');

    const cast = eventsOf(events, 'ability.cast').filter((e) => e.unitId === 'w0e0');
    expect(cast.length).toBeGreaterThan(0);
    expect(cast.some((e) => e.abilityId === gated?.id)).toBe(false);
  });

  it('opens on the turn the phase does', () => {
    const state = fight({ waves: [[hymn()]] });
    const nyx = unitOf(state, 'w0e0');
    const gated = nyx.abilities.find((a) => a.slot === 'a2');
    untilTurnOf(state, 'a0');
    nyx.hp = Math.floor(nyx.maxHp * 0.5);

    const events = passTurn(state);
    expect(eventsOf(events, 'phase.changed')).toHaveLength(1);
    expect(
      eventsOf(events, 'ability.cast').some((e) => e.unitId === 'w0e0' && e.abilityId === gated?.id),
    ).toBe(true);
  });
});

describe('the chorus that stands in front of the boss', () => {
  /** The boss's wave: the master and its two Choristers, linked at spawn. */
  const wave = (config: Partial<EnemyBossConfig> = {}) => [
    boss({ adds: CHORISTERS, ...config }),
    chorister(),
    chorister(),
  ];

  const strike: Effect[] = [{ kind: 'damage', target: 'single_enemy', mult: 100, stat: 'ATK' }];

  it('links every add to its master at spawn', () => {
    const state = fight({ waves: [wave()] });
    const nyx = unitOf(state, 'w0e0');
    expect(nyx.adds).toEqual({ ids: ['w0e1', 'w0e2'], every: 2, hpPercent: 50 });
    expect(unitOf(state, 'w0e1').guards).toEqual({ unitId: 'w0e0', percent: 30 });
    expect(unitOf(state, 'w0e2').guards).toEqual({ unitId: 'w0e0', percent: 30 });
    expect(unitView(nyx).boss).toMatchObject({ adds: { ids: ['w0e1', 'w0e2'], percent: 30 } });
  });

  it('takes its share of a hit meant for the boss', () => {
    const state = fight({ party: [caster(strike)], waves: [wave()] });
    untilTurnOf(state, 'a0');
    const events = eventsOf(decide(state, 'a1', 'w0e0'), 'hit');

    const onBoss = events.find((e) => e.targetId === 'w0e0');
    const onAdd = events.find((e) => e.targetId === 'w0e1');
    if (!onBoss || !onAdd) throw new Error('the hit did not split');
    expect(onAdd.redirectedFrom).toBe('w0e0');
    expect(onBoss.redirectedFrom).toBeNull();
    // One roll, split: 30 % of it landed on the chorister and the master took the rest.
    const roll = onAdd.damage + onBoss.damage;
    expect(onAdd.damage).toBe(Math.floor(roll * 0.3));
    expect(onBoss.damage).toBe(roll - Math.floor(roll * 0.3));
  });

  it('stops taking a share once the whole chorus is down', () => {
    const state = fight({ party: [caster(strike)], waves: [wave()] });
    untilTurnOf(state, 'a0');
    for (const id of ['w0e1', 'w0e2']) {
      const add = unitOf(state, id);
      add.alive = false;
      add.hp = 0;
    }
    const events = eventsOf(decide(state, 'a1', 'w0e0'), 'hit');
    expect(events.filter((e) => e.redirectedFrom !== null)).toHaveLength(0);
  });

  it('brings the fallen back on the boss’s own turn schedule', () => {
    const state = fight({ waves: [wave()] });
    const nyx = unitOf(state, 'w0e0');
    for (const id of ['w0e1', 'w0e2']) {
      const add = unitOf(state, id);
      add.alive = false;
      add.hp = 0;
    }
    const turnsBefore = nyx.flags.turnsTaken;

    const { events } = untilTurnOf(state, 'a0');
    const revived = eventsOf(events, 'unit.revived');
    expect(revived.map((e) => e.unitId)).toEqual(['w0e1', 'w0e2']);
    // Two of the boss's own turns after the last revival, not two of the battle's.
    expect(nyx.flags.addsRevivedTurn).toBeGreaterThanOrEqual(turnsBefore + CHORISTERS.reviveEvery);
    for (const e of revived) expect(e.hpAfter).toBe(Math.floor(unitOf(state, e.unitId).maxHp * 0.5));
  });

  it('brings them back with the phase, ahead of the schedule', () => {
    const state = fight({ waves: [wave({ phases: PHASES })] });
    const nyx = unitOf(state, 'w0e0');
    // The schedule has just been paid, so only the new phase can call them back this turn.
    nyx.flags.addsRevivedTurn = nyx.flags.turnsTaken;
    for (const id of ['w0e1', 'w0e2']) {
      const add = unitOf(state, id);
      add.alive = false;
      add.hp = 0;
    }
    nyx.hp = Math.floor(nyx.maxHp * 0.5);

    const events: ReturnType<typeof untilTurnOf>['events'] = [];
    events.push(...untilTurnOf(state, 'a0').events);
    const phaseAt = events.findIndex((e) => e.type === 'phase.changed');
    const reviveAt = events.findIndex((e) => e.type === 'unit.revived');
    expect(phaseAt).toBeGreaterThanOrEqual(0);
    expect(reviveAt).toBe(phaseAt + 1);
  });

  it('leaves a boss without a chorus alone', () => {
    const state = fight({ waves: [[boss(), chorister()]] });
    expect(unitOf(state, 'w0e0').adds).toBeNull();
    expect(unitOf(state, 'w0e1').guards).toBeNull();
    expect(unitView(unitOf(state, 'w0e0')).boss).toMatchObject({ adds: null });
  });

  it('gives a champion’s Ally Protection the last word over the chorus', () => {
    const state = fight({ party: [caster(strike)], waves: [wave()] });
    const nyx = unitOf(state, 'w0e0');
    untilTurnOf(state, 'a0');
    // The boss wears its own ally's protection: the buff's caster takes the share, not the add.
    nyx.statuses.push({
      id: 'ally_protection',
      turns: 3,
      value: 50,
      stacks: 1,
      sourceId: 'w0e2',
      placedAt: 0,
    });
    const events = eventsOf(decide(state, 'a1', 'w0e0'), 'hit');
    const redirected = events.filter((e) => e.redirectedFrom === 'w0e0');
    expect(redirected).toHaveLength(1);
    expect(redirected[0]?.targetId).toBe('w0e2');
  });
});

describe('a steal that leaves the thief wearing what it took', () => {
  const steal: Effect[] = [{ kind: 'steal_buff', target: 'single_enemy', count: 2 }];

  it('takes the newest buffs, and wears them with their own turns and value', () => {
    const state = fight({ party: [caster(steal)], waves: [[enemy({ id: 'enemy.blessed' })]] });
    const thief = unitOf(state, 'a0');
    const target = unitOf(state, 'w0e0');
    untilTurnOf(state, 'a0');
    target.statuses.push(
      { id: 'def_up', turns: 2, value: 30, stacks: 1, sourceId: 'w0e0', placedAt: 0 },
      { id: 'atk_up', turns: 3, value: 50, stacks: 1, sourceId: 'w0e0', placedAt: 1 },
      { id: 'crit_rate_up', turns: 4, value: 25, stacks: 1, sourceId: 'w0e0', placedAt: 2 },
    );
    decide(state, 'a1', 'w0e0');

    expect(target.statuses.map((s) => s.id)).toEqual(['def_up']);
    expect(thief.statuses.map((s) => s.id).sort()).toEqual(['atk_up', 'crit_rate_up']);
    const atk = thief.statuses.find((s) => s.id === 'atk_up');
    expect(atk).toMatchObject({ turns: 3, value: 50 });
  });

  it('leaves debuffs and shields where they are', () => {
    const state = fight({ party: [caster(steal)], waves: [[enemy({ id: 'enemy.shielded' })]] });
    const thief = unitOf(state, 'a0');
    const target = unitOf(state, 'w0e0');
    untilTurnOf(state, 'a0');
    target.statuses.push(
      { id: 'poison', turns: 3, value: 5, stacks: 1, sourceId: 'a0', placedAt: 0 },
      { id: 'shield', turns: 3, value: 5_000, stacks: 1, sourceId: 'w0e0', placedAt: 1 },
      { id: 'atk_up', turns: 3, value: 50, stacks: 1, sourceId: 'w0e0', placedAt: 2 },
    );
    decide(state, 'a1', 'w0e0');

    expect(target.statuses.map((s) => s.id).sort()).toEqual(['poison', 'shield']);
    expect(thief.statuses.map((s) => s.id)).toEqual(['atk_up']);
  });

  it('is worth nothing against a target with no buffs at all', () => {
    const state = fight({ party: [caster(steal)], waves: [[enemy({ id: 'enemy.bare' })]] });
    const thief = unitOf(state, 'a0');
    untilTurnOf(state, 'a0');
    const events = decide(state, 'a1', 'w0e0');
    expect(eventsOf(events, 'status.removed')).toHaveLength(0);
    expect(thief.statuses).toHaveLength(0);
  });
});

describe('an aura that dims the party’s healing', () => {
  const mend: Effect[] = [{ kind: 'heal', target: 'self', mult: 0.1, stat: 'CASTER_MAX_HP' }];
  const unlight = () =>
    passive('static', [{ kind: 'enemy_heal_reduction', value: 50, if: { selfPhaseAtLeast: 3 } }]);

  function healed(state: BattleState): number {
    const self = unitOf(state, 'a0');
    self.hp = Math.floor(self.maxHp / 2);
    untilTurnOf(state, 'a0');
    const events = eventsOf(decide(state, 'a1', null), 'heal');
    return events[0]?.amount ?? 0;
  }

  it('pays the heal in full while the boss is in an earlier phase', () => {
    const state = fight({
      party: [caster(mend)],
      waves: [[boss({ phases: PHASES }, { passives: [unlight()] })]],
    });
    expect(healed(state)).toBe(Math.round(unitOf(state, 'a0').maxHp * 0.1));
  });

  it('halves it once the boss reaches the phase the aura names', () => {
    const state = fight({
      party: [caster(mend)],
      waves: [[boss({ phases: PHASES }, { passives: [unlight()] })]],
    });
    const nyx = unitOf(state, 'w0e0');
    nyx.hp = Math.floor(nyx.maxHp * 0.1);
    untilTurnOf(state, 'a0');
    expect(nyx.phase).toBe(3);
    expect(healed(state)).toBe(Math.round(unitOf(state, 'a0').maxHp * 0.1 * 0.5));
  });

  it('stops the moment the boss falls', () => {
    const state = fight({
      party: [caster(mend)],
      waves: [[boss({ phases: PHASES }, { passives: [unlight()] })]],
    });
    const nyx = unitOf(state, 'w0e0');
    nyx.hp = Math.floor(nyx.maxHp * 0.1);
    untilTurnOf(state, 'a0');
    nyx.alive = false;
    nyx.hp = 0;
    expect(healed(state)).toBe(Math.round(unitOf(state, 'a0').maxHp * 0.1));
  });
});

describe('the whole fight is still a function of its seed', () => {
  // Built once: the fixture numbers its ability ids, so two constructions would differ on the ids
  // alone. The same definitions under the same seed must give the same fight, event for event.
  const party = [
    champion({
      id: 'champ.test_seeded',
      stats: { hp: 200_000, atk: 5_000, spd: 120 },
      abilities: [
        ability('a1', [{ kind: 'damage', target: 'all_enemies', mult: 2, stat: 'ATK' }], {
          cooldown: 0,
        }),
        ability('a2', [{ kind: 'steal_buff', target: 'single_enemy', count: 1 }], { cooldown: 2 }),
      ],
    }),
  ];

  const waves = [
    [
      boss(
        { adds: CHORISTERS, phases: PHASES, rotation: ['a2', 'a1'], fixedStats: true },
        {
          stats: { hp: 50_000, spd: 130, atk: 1_200 },
          abilities: [
            ability('a1', [{ kind: 'damage', target: 'single_enemy', mult: 1, stat: 'ATK' }], {
              cooldown: 0,
            }),
            ability('a2', [{ kind: 'damage', target: 'all_enemies', mult: 1.4, stat: 'ATK' }], {
              cooldown: 0,
              minPhase: 2,
            }),
          ],
        },
      ),
      chorister(20_000),
      chorister(20_000),
    ],
  ];

  const run = () => runAuto(battle({ party, waves, seed: 'nyxara', control: 'auto' }));

  it('replays event for event from the same seed', () => {
    const first = run();
    const second = run();
    expect(first.outcome).toEqual(second.outcome);
    expect(JSON.stringify(first.events)).toEqual(JSON.stringify(second.events));
    // And the fight exercised what it claims to: both phases, revivals and split hits.
    expect(first.outcome.kind).toBe('victory');
    expect(eventsOf(first.events, 'phase.changed').map((e) => e.phase)).toEqual([2, 3]);
    expect(eventsOf(first.events, 'unit.revived').length).toBeGreaterThan(0);
    expect(eventsOf(first.events, 'hit').some((e) => e.redirectedFrom !== null)).toBe(true);
  });

  it('runs differently under a different seed', () => {
    const other = runAuto(battle({ party, waves, seed: 'other', control: 'auto' }));
    expect(JSON.stringify(other.events)).not.toEqual(JSON.stringify(run().events));
  });
});
