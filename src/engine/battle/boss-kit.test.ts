/**
 * The four mechanics Gravemaw's kit needed from the battle engine (docs/design/BOSSES.md §2):
 * a status that may only catch so many of its targets, a heal that counts the curses on its
 * target, a damage reduction that only answers crits, and the distinct-debuff counter that breaks
 * it. Each is driven from the champion's side so the rolls are the test's to control.
 */
import { describe, expect, it } from 'vitest';
import type { AbilityDef, Effect } from '@content/champions/types';
import { unitView } from './snapshot';
import { runAuto } from './step';
import { ability, battle, champion, decide, enemy, eventsOf, passive, untilTurnOf } from './test-utils';

const BOSS = {
  rotation: ['a1'] as AbilityDef['slot'][],
  immunities: [],
  enrageAfterTurn: 99,
  damageTakenMult: 1,
};

/** A champion whose only ability is the effect list under test; fast, so it always acts first. */
function caster(effects: Effect[]) {
  return champion({ stats: { spd: 300 }, abilities: [ability('a1', effects, { cooldown: 0 })] });
}

describe('a status with a target cap', () => {
  it('lands on at most `maxTargets`, however many it was aimed at', () => {
    const state = battle({
      party: [
        caster([
          {
            kind: 'apply_status',
            target: 'all_enemies',
            status: 'stun',
            turns: 1,
            chance: 100,
            maxTargets: 1,
          },
        ]),
      ],
      waves: [[enemy({ id: 'enemy.one' }), enemy({ id: 'enemy.two' }), enemy({ id: 'enemy.three' })]],
    });
    untilTurnOf(state, 'a0');
    const applied = eventsOf(decide(state, 'a1', 'w0e0'), 'status.applied');
    expect(applied.filter((e) => e.status === 'stun')).toHaveLength(1);
  });

  it('without a cap it catches everything it is aimed at', () => {
    const state = battle({
      party: [
        caster([{ kind: 'apply_status', target: 'all_enemies', status: 'stun', turns: 1, chance: 100 }]),
      ],
      waves: [[enemy({ id: 'enemy.one' }), enemy({ id: 'enemy.two' }), enemy({ id: 'enemy.three' })]],
    });
    untilTurnOf(state, 'a0');
    const applied = eventsOf(decide(state, 'a1', 'w0e0'), 'status.applied');
    expect(applied.filter((e) => e.status === 'stun')).toHaveLength(3);
  });
});

describe('a heal that counts the curses on its target', () => {
  const devour: Effect[] = [
    { kind: 'damage', target: 'single_enemy', mult: 0.1, stat: 'ATK' },
    { kind: 'heal', target: 'self', mult: 0.1, stat: 'CASTER_MAX_HP', per: 'target_debuff' },
  ];

  it('pays nothing when the target carries no debuffs', () => {
    const state = battle({ party: [caster(devour)], waves: [[enemy({ id: 'enemy.clean' })]] });
    const self = state.units['a0'];
    if (!self) throw new Error('no champion');
    self.hp = Math.floor(self.maxHp / 2);
    untilTurnOf(state, 'a0');
    expect(eventsOf(decide(state, 'a1', 'w0e0'), 'heal')).toHaveLength(0);
  });

  it('pays once per debuff on the target', () => {
    const state = battle({ party: [caster(devour)], waves: [[enemy({ id: 'enemy.cursed' })]] });
    const self = state.units['a0'];
    const target = state.units['w0e0'];
    if (!self || !target) throw new Error('no units');
    self.hp = Math.floor(self.maxHp / 2);
    for (const id of ['poison', 'weaken', 'def_down'] as const)
      target.statuses.push({ id, turns: 3, value: 20, stacks: 1, sourceId: 'w0e0', placedAt: 0 });

    untilTurnOf(state, 'a0');
    const healed = eventsOf(decide(state, 'a1', 'w0e0'), 'heal');
    expect(healed).toHaveLength(1);
    // Three debuffs × 10 % of the caster's own max HP.
    expect(healed[0]?.amount).toBe(Math.round(self.maxHp * 0.3));
  });
});

describe("a tyrant's hide", () => {
  const hide = () =>
    passive('static', [
      { kind: 'damage_reduction', value: 0.2, scope: 'crit', if: { selfDistinctDebuffsBelow: 5 } },
    ]);
  const critter = () =>
    champion({
      stats: { critRate: 100, critDmg: 100, spd: 300 },
      abilities: [
        ability('a1', [{ kind: 'damage', target: 'single_enemy', mult: 1, stat: 'ATK' }], { cooldown: 0 }),
      ],
    });

  it('softens a crit and holds until the fifth distinct debuff', () => {
    const state = battle({
      party: [critter()],
      waves: [
        [enemy({ id: 'enemy.hide', stats: { hp: 1_000_000, def: 0 }, passives: [hide()], boss: BOSS })],
      ],
    });
    const boss = state.units['w0e0'];
    if (!boss) throw new Error('no boss');

    untilTurnOf(state, 'a0');
    const softened = eventsOf(decide(state, 'a1', 'w0e0'), 'hit')[0];
    expect(softened?.crit).toBe(true);

    // Four kinds: the hide still holds, so the same crit lands for the same damage.
    for (const id of ['poison', 'weaken', 'def_down', 'atk_down'] as const)
      boss.flags.debuffKindsTaken.push(id);
    untilTurnOf(state, 'a0');
    const stillHeld = eventsOf(decide(state, 'a1', 'w0e0'), 'hit')[0]?.damage ?? 0;
    // Damage carries its own small variance (BATTLE.md §4.1), so compare in bands the hide's
    // fifth cannot hide inside.
    expect(stillHeld / (softened?.damage ?? 1)).toBeCloseTo(1, 1);

    // The fifth breaks it: the crit goes through in full, a fifth harder.
    boss.flags.debuffKindsTaken.push('bleed');
    untilTurnOf(state, 'a0');
    const full = eventsOf(decide(state, 'a1', 'w0e0'), 'hit')[0]?.damage ?? 0;
    expect((softened?.damage ?? 0) / full).toBeCloseTo(0.8, 1);
  });

  it('never softens an ordinary hit', () => {
    const plain = champion({
      stats: { critRate: 0, spd: 300 },
      abilities: [
        ability('a1', [{ kind: 'damage', target: 'single_enemy', mult: 1, stat: 'ATK' }], { cooldown: 0 }),
      ],
    });
    const withHide = battle({
      party: [plain],
      waves: [
        [
          enemy({
            id: 'enemy.hide',
            element: 'justice',
            stats: { hp: 1_000_000, def: 0 },
            passives: [hide()],
            boss: BOSS,
          }),
        ],
      ],
      seed: 'hide',
    });
    const without = battle({
      party: [plain],
      waves: [
        [enemy({ id: 'enemy.hide', element: 'justice', stats: { hp: 1_000_000, def: 0 }, boss: BOSS })],
      ],
      seed: 'hide',
    });
    untilTurnOf(withHide, 'a0');
    untilTurnOf(without, 'a0');
    const a = eventsOf(decide(withHide, 'a1', 'w0e0'), 'hit')[0];
    const b = eventsOf(decide(without, 'a1', 'w0e0'), 'hit')[0];
    expect(a?.crit).toBe(false);
    // Same seed, same roll: an ordinary hit is untouched by a hide that only answers crits.
    expect(a?.damage).toBe(b?.damage);
  });

  it('says so out loud when the fifth debuff lands', () => {
    const debuffer = caster([
      { kind: 'apply_status', target: 'single_enemy', status: 'bleed', turns: 3, chance: 100, value: 100 },
    ]);
    const state = battle({
      party: [debuffer],
      waves: [[enemy({ id: 'enemy.hide', stats: { hp: 1_000_000 }, passives: [hide()], boss: BOSS })]],
    });
    const boss = state.units['w0e0'];
    if (!boss) throw new Error('no boss');
    for (const id of ['poison', 'weaken', 'def_down', 'atk_down'] as const)
      boss.flags.debuffKindsTaken.push(id);

    untilTurnOf(state, 'a0');
    const broken = eventsOf(decide(state, 'a1', 'w0e0'), 'passive.broken');
    expect(broken).toHaveLength(1);
    expect(broken[0]?.unitId).toBe('w0e0');
    // And only once: the same debuff again is not news.
    untilTurnOf(state, 'a0');
    expect(eventsOf(decide(state, 'a1', 'w0e0'), 'passive.broken')).toHaveLength(0);
  });
});

describe('the enrage a damage race needs', () => {
  /** A wall the boss cannot kill, so the race runs long enough to count the steps. */
  const wall = () =>
    champion({
      stats: { hp: 4_000_000, def: 0, spd: 100 },
      abilities: [
        ability('a1', [{ kind: 'damage', target: 'single_enemy', mult: 0.01, stat: 'ATK' }], {
          cooldown: 0,
        }),
      ],
    });

  const rager = (every: number) =>
    enemy({
      id: 'enemy.rager',
      stats: { hp: 4_000_000, atk: 10, def: 0, spd: 300 },
      boss: { ...BOSS, enrageAfterTurn: 2, enrageEvery: every },
    });

  const steps = (every: number): { enraged: number; bossTurns: number; atkGrowth: number } => {
    const state = battle({
      party: [wall()],
      waves: [[rager(every)]],
      encounter: { turnLimit: 12, turnLimitMode: 'ally' },
      control: 'auto',
    });
    const before = state.units['w0e0']?.base.atk ?? 0;
    const { events } = runAuto(state);
    const after = state.units['w0e0']?.base.atk ?? 0;
    return {
      enraged: eventsOf(events, 'enraged').length,
      bossTurns: eventsOf(events, 'turn.started').filter((e) => e.unitId === 'w0e0').length,
      atkGrowth: after / before,
    };
  };

  it('steps on the boss own cadence, not the campaign default', () => {
    const every2 = steps(2);
    // Turns 3.. are enrage territory; a step every other one of them (BOSSES.md §1).
    expect(every2.enraged).toBe(Math.floor((every2.bossTurns - 2) / 2));
    expect(every2.enraged).toBeGreaterThan(2);

    const every1 = steps(1);
    expect(every1.enraged).toBe(every1.bossTurns - 2);
    // Same race, twice the steps: the cadence is what makes a long race lethal.
    expect(every1.enraged).toBeGreaterThan(every2.enraged);
  });

  it('compounds ATK by ten per cent a step', () => {
    const { enraged, atkGrowth } = steps(2);
    expect(atkGrowth).toBeCloseTo(1.1 ** enraged, 1);
  });
});

describe('what the boss HUD reads off the view', () => {
  const tyrantsHide = () =>
    passive('static', [
      { kind: 'damage_reduction', value: 0.2, scope: 'crit', if: { selfDistinctDebuffsBelow: 5 } },
    ]);

  it('carries the immunities, the enrage countdown and the broken hide', () => {
    const state = battle({
      party: [
        caster([
          {
            kind: 'apply_status',
            target: 'single_enemy',
            status: 'bleed',
            turns: 3,
            chance: 100,
            value: 100,
          },
        ]),
      ],
      waves: [
        [
          enemy({
            id: 'enemy.hide',
            stats: { hp: 1_000_000 },
            passives: [tyrantsHide()],
            boss: { ...BOSS, immunities: ['stun', 'fear'], enrageAfterTurn: 4, enrageEvery: 2 },
          }),
        ],
      ],
    });
    const boss = state.units['w0e0'];
    if (!boss) throw new Error('no boss');

    const before = unitView(boss).boss;
    expect(before).toEqual({
      immunities: ['stun', 'fear'],
      enrageAfterTurn: 4,
      enrageEvery: 2,
      enrageSteps: 0,
      turnsTaken: 0,
      brokenPassives: [],
      // A daily boss is one long phase and fights alone (BOSSES.md §2).
      phase: 1,
      phaseCount: 1,
      adds: null,
    });

    for (const id of ['poison', 'weaken', 'def_down', 'atk_down'] as const)
      boss.flags.debuffKindsTaken.push(id);
    untilTurnOf(state, 'a0');
    decide(state, 'a1', 'w0e0');
    const after = unitView(boss).boss;
    // The fifth kind landed: the view says the hide is gone, and by which passive's id.
    expect(after?.brokenPassives).toEqual([boss.passives[0]?.id]);

    // And the countdown the chip prints counts the boss's own turns, not the battle's.
    const allyTurnsBefore = state.allyTurns;
    while (boss.flags.turnsTaken === 0) {
      untilTurnOf(state, 'a0');
      decide(state, 'a1', 'w0e0');
    }
    expect(unitView(boss).boss?.turnsTaken).toBe(1);
    expect(state.allyTurns).toBeGreaterThan(allyTurnsBefore);
  });

  it('is null for everyone who is not a boss', () => {
    const state = battle({ party: [caster([])], waves: [[enemy({ id: 'enemy.mook' })]] });
    const ally = state.units['a0'];
    const mook = state.units['w0e0'];
    if (!ally || !mook) throw new Error('no units');
    expect(unitView(ally).boss).toBeNull();
    expect(unitView(mook).boss).toBeNull();
  });
});
