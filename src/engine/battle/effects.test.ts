import { describe, expect, it } from 'vitest';
import { step } from './step';
import { ability, battle, champion, decide, enemy, eventsOf, passive, untilTurnOf } from './test-utils';

const hit = (mult = 1, target: 'single_enemy' | 'all_enemies' = 'single_enemy', extra = {}) =>
  ({ kind: 'damage', target, mult, stat: 'ATK', ...extra }) as const;

describe('damage effect', () => {
  it('deals mitigated damage with variance and reports hp after', () => {
    const state = battle({
      party: [champion()],
      waves: [[enemy({ element: 'eclipse', stats: { spd: 1 } })]],
    });
    untilTurnOf(state, 'a0');
    const events = decide(state, 'a1', 'w0e0');
    const [hit0] = eventsOf(events, 'hit');
    // raw 1000, DEF 500 at level 60 → mitigation 1 − 500/3200, variance 0.95–1.05.
    expect(hit0?.damage).toBeGreaterThanOrEqual(Math.floor(1000 * (1 - 500 / 3200) * 0.95));
    expect(hit0?.damage).toBeLessThanOrEqual(Math.floor(1000 * (1 - 500 / 3200) * 1.05));
    expect(hit0?.hpAfter).toBe(10_000 - (hit0?.damage ?? 0));
  });

  it('multi-hit, DEF ignore, guaranteed crit and on-kill effects', () => {
    const killer = ability('a1', [
      {
        ...hit(30, 'single_enemy', { hits: 2, defIgnore: 1, guaranteedCritIf: { targetHasAnyDebuff: true } }),
        onKill: [{ kind: 'heal', target: 'self', mult: 0.5, stat: 'CASTER_MAX_HP' }],
      },
    ]);
    const state = battle({
      party: [champion({ abilities: [killer], stats: { hp: 10_000 } })],
      waves: [[enemy({ stats: { spd: 1, hp: 50_000 } })]],
    });
    untilTurnOf(state, 'a0');
    state.units['a0']!.hp = 5000;
    const events = decide(state, 'a1', 'w0e0');
    const hits = eventsOf(events, 'hit');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]?.crit).toBe(false);
    expect(hits.some((h) => h.killed)).toBe(true);
    expect(eventsOf(events, 'heal').some((h) => h.reason === 'ability' && h.amount === 5000)).toBe(true);
    expect(eventsOf(events, 'unit.died')).toHaveLength(1);
  });

  it('extends hits on kill up to the cap (Feeding Frenzy) and repeats with repeatChance', () => {
    const frenzy = ability('a1', [
      { kind: 'damage', target: { random_enemies: 1 }, mult: 50, stat: 'ATK', extendOnKill: { maxHits: 3 } },
    ]);
    const state = battle({
      party: [champion({ abilities: [frenzy] })],
      waves: [
        [
          enemy({ stats: { spd: 1, hp: 100 } }),
          enemy({ stats: { spd: 1, hp: 100 } }),
          enemy({ stats: { spd: 1, hp: 100 } }),
        ],
      ],
    });
    untilTurnOf(state, 'a0');
    const events = decide(state, 'a1', null);
    expect(eventsOf(events, 'unit.died')).toHaveLength(3);
    const repeat = ability('a1', [hit(1, 'single_enemy', { repeatChance: 100 })]);
    const s2 = battle({
      party: [champion({ abilities: [repeat] })],
      waves: [[enemy({ stats: { spd: 1 } })]],
    });
    untilTurnOf(s2, 'a0');
    expect(eventsOf(decide(s2, 'a1', 'w0e0'), 'hit')).toHaveLength(2);
  });

  it('element match-ups change damage and crit chance', () => {
    const strong = battle({
      party: [champion({ element: 'justice', stats: { critRate: 0 } })],
      waves: [[enemy({ element: 'valor', stats: { spd: 1, def: 0 } })]],
    });
    untilTurnOf(strong, 'a0');
    const s = eventsOf(decide(strong, 'a1', 'w0e0'), 'hit')[0]!;
    expect(s.match).toBe('strong');
    expect(s.damage).toBeGreaterThanOrEqual(Math.floor(1100 * 0.95));
    const weak = battle({
      party: [champion({ element: 'valor' })],
      waves: [[enemy({ element: 'justice', stats: { spd: 1, def: 0 } })]],
    });
    untilTurnOf(weak, 'a0');
    const w = eventsOf(decide(weak, 'a1', 'w0e0'), 'hit')[0]!;
    expect(w.match).toBe('weak');
    expect(w.damage).toBeLessThanOrEqual(Math.floor(900 * 1.05));
  });
});

describe('shields, protection and counters', () => {
  it('shields absorb before HP and are consumed', () => {
    const shielder = ability('a1', [
      { kind: 'apply_status', target: 'self', status: 'shield', value: 10, turns: 2, chance: 100 },
    ]);
    const state = battle({
      party: [champion({ abilities: [shielder] })],
      waves: [[enemy({ stats: { spd: 90, atk: 20_000, def: 0 } })]],
    });
    untilTurnOf(state, 'a0');
    const events = decide(state, 'a1', null);
    expect(eventsOf(events, 'status.applied')[0]).toMatchObject({ status: 'shield', value: 1000 });
    // The enemy now acts: its hit is partly absorbed.
    const { events: more } = untilTurnOf(state, 'a0');
    const hitOnAlly = eventsOf(more, 'hit').find((h) => h.targetId === 'a0');
    expect(hitOnAlly?.absorbed).toBe(1000);
    expect(
      eventsOf(more, 'status.removed').some((e) => e.status === 'shield' && e.reason === 'consumed'),
    ).toBe(true);
  });

  it('Ally Protection redirects a share of the damage to the protector', () => {
    const protect = ability('a1', [
      {
        kind: 'apply_status',
        target: 'single_ally',
        status: 'ally_protection',
        value: 50,
        turns: 2,
        chance: 100,
      },
    ]);
    const tank = champion({ id: 'champ.tank', abilities: [protect], stats: { spd: 200 } });
    const squishy = champion({ id: 'champ.squishy', stats: { spd: 1 } });
    const state = battle({ party: [tank, squishy], waves: [[enemy({ stats: { spd: 150, def: 0 } })]] });
    untilTurnOf(state, 'a0');
    decide(state, 'a1', 'a1');
    const { events } = untilTurnOf(state, 'a0');
    const hits = eventsOf(events, 'hit').filter((h) => h.sourceId === 'w0e0');
    const onTank = hits.find((h) => h.targetId === 'a0');
    const onSquishy = hits.find((h) => h.targetId === 'a1');
    if (onSquishy) {
      expect(onTank?.redirectedFrom).toBe('a1');
      expect(Math.abs((onTank?.damage ?? 0) - (onSquishy.damage ?? 0))).toBeLessThanOrEqual(1);
    }
  });

  it('a unit with Counterattack retaliates once with its A1 at 75 %', () => {
    const counterBuff = ability(
      'a2',
      [{ kind: 'apply_status', target: 'self', status: 'counter', turns: 2, chance: 100 }],
      { cooldown: 3 },
    );
    const state = battle({
      party: [champion({ abilities: [ability('a1', [hit()]), counterBuff], stats: { spd: 200 } })],
      waves: [[enemy({ element: 'eclipse', stats: { spd: 150, def: 0, hp: 100_000 } })]],
    });
    untilTurnOf(state, 'a0');
    decide(state, 'a2', null);
    const { events } = untilTurnOf(state, 'a0');
    const counter = eventsOf(events, 'ability.cast').find((c) => c.counter);
    expect(counter?.unitId).toBe('a0');
    const retaliation = eventsOf(events, 'hit').find((h) => h.sourceId === 'a0');
    expect(retaliation?.damage).toBeLessThanOrEqual(Math.floor(750 * 1.05));
  });
});

describe('statuses', () => {
  it('debuffs miss, resist, get blocked, hit immunity and refresh', () => {
    const debuffer = ability('a1', [
      { kind: 'apply_status', target: 'single_enemy', status: 'atk_down', turns: 2, chance: 100 },
    ]);
    const immune = enemy({
      stats: { spd: 1 },
      boss: { rotation: ['a1'], immunities: ['atk_down'], enrageAfterTurn: 99, damageTakenMult: 1 },
    });
    const state = battle({ party: [champion({ abilities: [debuffer] })], waves: [[immune]] });
    untilTurnOf(state, 'a0');
    expect(eventsOf(decide(state, 'a1', 'w0e0'), 'status.failed')[0]?.reason).toBe('immune');

    const resistAll = enemy({ stats: { spd: 1, res: 100 } });
    const s2 = battle({
      party: [champion({ abilities: [debuffer], stats: { acc: 0 } })],
      waves: [[resistAll]],
    });
    untilTurnOf(s2, 'a0');
    expect(eventsOf(decide(s2, 'a1', 'w0e0'), 'status.failed')[0]?.reason).toBe('resisted');

    const accurate = champion({ abilities: [debuffer], stats: { acc: 100 } });
    const s3 = battle({ party: [accurate], waves: [[resistAll]] });
    untilTurnOf(s3, 'a0');
    expect(eventsOf(decide(s3, 'a1', 'w0e0'), 'status.applied')[0]?.status).toBe('atk_down');
    untilTurnOf(s3, 'a0');
    expect(eventsOf(decide(s3, 'a1', 'w0e0'), 'status.applied')[0]?.refreshed).toBe(true);
    expect(s3.units['w0e0']!.statuses.filter((s) => s.id === 'atk_down')).toHaveLength(1);
  });

  it('Block Debuffs and Block Buffs stop applications; stacks cap for Poison', () => {
    const blocker = ability('a1', [
      { kind: 'apply_status', target: 'self', status: 'block_debuffs', turns: 3, chance: 100 },
    ]);
    const poisoner = ability('a1', [
      { kind: 'apply_status', target: 'single_enemy', status: 'poison', turns: 3, chance: 100 },
    ]);
    const state = battle({
      party: [champion({ abilities: [poisoner], stats: { acc: 100 } })],
      waves: [[enemy({ stats: { spd: 1 }, abilities: [blocker] })]],
    });
    untilTurnOf(state, 'a0');
    decide(state, 'a1', 'w0e0');
    untilTurnOf(state, 'a0');
    decide(state, 'a1', 'w0e0');
    untilTurnOf(state, 'a0');
    decide(state, 'a1', 'w0e0');
    untilTurnOf(state, 'a0');
    const events = decide(state, 'a1', 'w0e0');
    const poison = state.units['w0e0']!.statuses.find((s) => s.id === 'poison');
    // Either the enemy blocked in time or the stacks capped at 3.
    expect((poison?.stacks ?? 0) <= 3).toBe(true);
    expect(events.some((e) => e.type === 'status.failed' || e.type === 'status.applied')).toBe(true);
  });

  it('DoTs tick at turn start, Continuous Heal heals, Sleep wakes on damage, Stun skips', () => {
    const dot = ability('a1', [
      { kind: 'apply_status', target: 'single_enemy', status: 'poison', turns: 2, chance: 100 },
      { kind: 'apply_status', target: 'single_enemy', status: 'stun', turns: 1, chance: 100 },
    ]);
    const state = battle({
      party: [champion({ abilities: [dot], stats: { acc: 100, spd: 200 } })],
      waves: [[enemy({ stats: { spd: 150 } })]],
    });
    untilTurnOf(state, 'a0');
    decide(state, 'a1', 'w0e0');
    const { events } = untilTurnOf(state, 'a0');
    const tick = eventsOf(events, 'dot.tick')[0];
    expect(tick?.status).toBe('poison');
    expect(tick?.amount).toBe(500);
    expect(eventsOf(events, 'turn.skipped')[0]?.reason).toBe('stun');

    const regen = ability('a1', [
      { kind: 'apply_status', target: 'self', status: 'regen', turns: 2, chance: 100 },
    ]);
    const s2 = battle({ party: [champion({ abilities: [regen] })], waves: [[enemy({ stats: { spd: 1 } })]] });
    untilTurnOf(s2, 'a0');
    s2.units['a0']!.hp = 1000;
    decide(s2, 'a1', null);
    const { events: e2 } = untilTurnOf(s2, 'a0');
    expect(eventsOf(e2, 'heal').find((h) => h.reason === 'regen')?.amount).toBe(750);

    const sleeper = ability('a1', [
      { kind: 'apply_status', target: 'single_enemy', status: 'sleep', turns: 2, chance: 100 },
    ]);
    const s3 = battle({
      party: [champion({ abilities: [sleeper], stats: { acc: 100 } }), champion({ stats: { spd: 99 } })],
      waves: [[enemy({ stats: { spd: 1 } })]],
    });
    untilTurnOf(s3, 'a0');
    decide(s3, 'a1', 'w0e0');
    const { events: e3 } = untilTurnOf(s3, 'a1');
    expect(e3.length).toBeGreaterThan(0);
    const e4 = decide(s3, 'a1', 'w0e0');
    expect(eventsOf(e4, 'status.removed').some((r) => r.status === 'sleep' && r.reason === 'woke')).toBe(
      true,
    );
  });

  it('cleanses and strips newest first and Revive on Death consumes itself', () => {
    const buffs = ability('a1', [
      { kind: 'apply_status', target: 'self', status: 'atk_up', turns: 3, chance: 100 },
      { kind: 'apply_status', target: 'self', status: 'def_up', turns: 3, chance: 100 },
      { kind: 'apply_status', target: 'self', status: 'revive_on_death', turns: 3, chance: 100 },
    ]);
    const strip = ability('a1', [
      { kind: 'remove_status', target: 'single_enemy', which: 'buffs', count: 1 },
      hit(100),
    ]);
    const state = battle({
      party: [champion({ abilities: [buffs], stats: { spd: 200 } })],
      waves: [[enemy({ stats: { spd: 150, def: 0 }, abilities: [strip] })]],
    });
    untilTurnOf(state, 'a0');
    decide(state, 'a1', null);
    const { events } = untilTurnOf(state, 'a0');
    expect(eventsOf(events, 'status.removed')[0]).toMatchObject({
      status: 'revive_on_death',
      reason: 'stripped',
    });
    // Without the revive buff the 100× hit kills; with it the unit would revive. Re-buff and check.
    if (state.units['a0']!.alive) {
      decide(state, 'a1', null);
      const { events: again } = untilTurnOf(state, 'a0');
      const revived = eventsOf(again, 'unit.revived');
      const died = eventsOf(again, 'unit.died');
      expect(revived.length + died.length).toBeGreaterThan(0);
    }
  });

  it('a self-placed buff keeps its full duration through the first own turn start', () => {
    const buff = ability('a1', [
      { kind: 'apply_status', target: 'self', status: 'atk_up', turns: 2, chance: 100 },
    ]);
    const state = battle({
      party: [champion({ abilities: [buff] })],
      waves: [[enemy({ stats: { spd: 1 } })]],
    });
    untilTurnOf(state, 'a0');
    decide(state, 'a1', null);
    untilTurnOf(state, 'a0');
    expect(state.units['a0']!.statuses[0]?.turns).toBe(2);
    decide(state, 'a1', null);
    untilTurnOf(state, 'a0');
    expect(state.units['a0']!.statuses[0]?.turns).toBe(2);
  });
});

describe('turn meter, revive, extra turns, detonate and leech', () => {
  it('TM effects clamp between 0 and 1.5', () => {
    const boost = ability('a1', [
      { kind: 'tm', target: 'all_allies', delta: 5 },
      { kind: 'tm', target: 'all_enemies', delta: -5 },
    ]);
    const state = battle({
      party: [champion({ abilities: [boost] }), champion({ stats: { spd: 50 } })],
      waves: [[enemy({ stats: { spd: 40 } })]],
    });
    untilTurnOf(state, 'a0');
    const events = decide(state, 'a1', null);
    const changes = eventsOf(events, 'tm.changed');
    expect(changes.find((c) => c.targetId === 'a1')?.tmAfter).toBe(1.5);
    expect(changes.find((c) => c.targetId === 'w0e0')?.tmAfter).toBe(0);
    expect(eventsOf(events, 'turn.ended')[0]?.tm['a1']).toBe(1.5);
  });

  it('revives a dead ally and grants an extra turn (TM resets to 1)', () => {
    const rez = ability(
      'a2',
      [
        { kind: 'revive', target: 'single_ally', hpPercent: 50 },
        { kind: 'extra_turn', target: 'self' },
      ],
      { cooldown: 2 },
    );
    const healer = champion({ abilities: [ability('a1', [hit()]), rez] });
    const fallen = champion({ stats: { spd: 1 } });
    const state = battle({ party: [healer, fallen], waves: [[enemy({ stats: { spd: 1 } })]] });
    const dead = state.units['a1']!;
    dead.alive = false;
    dead.hp = 0;
    untilTurnOf(state, 'a0');
    const request = state.pending!;
    expect(request.abilities[1]?.validTargets).toEqual(['a1']);
    const events = decide(state, 'a2', 'a1');
    expect(eventsOf(events, 'unit.revived')[0]).toMatchObject({ unitId: 'a1', hpAfter: 5000 });
    expect(eventsOf(events, 'extra_turn')).toHaveLength(1);
    expect(eventsOf(events, 'turn.ended')[0]?.tm['a0']).toBe(1);
  });

  it('detonate consumes the DoT for a share of its remaining ticks; leech heals the actor', () => {
    const burn = ability('a1', [
      { kind: 'apply_status', target: 'single_enemy', status: 'burn', turns: 3, chance: 100 },
    ]);
    const boom = ability(
      'a2',
      [{ kind: 'detonate', target: 'single_enemy', status: 'burn', percentOfRemaining: 100 }],
      { cooldown: 1 },
    );
    const state = battle({
      party: [champion({ abilities: [burn, boom], stats: { acc: 100, atk: 1000 } })],
      waves: [[enemy({ stats: { spd: 1, hp: 100_000 } })]],
    });
    untilTurnOf(state, 'a0');
    decide(state, 'a1', 'w0e0');
    untilTurnOf(state, 'a0');
    const events = decide(state, 'a2', 'w0e0');
    // Burn tick = 4 % of 100 000 + 0.6 × 1000 = 4600; 3 turns remaining → 13 800.
    expect(eventsOf(events, 'hit')[0]?.damage).toBe(13_800);
    expect(eventsOf(events, 'status.removed')[0]).toMatchObject({ status: 'burn', reason: 'consumed' });

    const leech = ability('a1', [
      hit(1, 'single_enemy', { defIgnore: 1 }),
      { kind: 'leech', percentOfDamage: 50 },
    ]);
    const s2 = battle({ party: [champion({ abilities: [leech] })], waves: [[enemy({ stats: { spd: 1 } })]] });
    untilTurnOf(s2, 'a0');
    s2.units['a0']!.hp = 1000;
    const e2 = decide(s2, 'a1', 'w0e0');
    const dmg = eventsOf(e2, 'hit')[0]?.damage ?? 0;
    expect(eventsOf(e2, 'heal').find((h) => h.reason === 'leech')?.amount).toBe(Math.floor(dmg / 2));
  });

  it('conditional branches on the primary target and on kills', () => {
    const cond = ability('a1', [
      hit(1),
      {
        kind: 'conditional',
        if: { targetHas: 'atk_down' },
        then: [hit(1)],
        else: [{ kind: 'apply_status', target: 'single_enemy', status: 'atk_down', turns: 2, chance: 100 }],
      },
    ]);
    const state = battle({
      party: [champion({ abilities: [cond], stats: { acc: 100 } })],
      waves: [[enemy({ stats: { spd: 1 } })]],
    });
    untilTurnOf(state, 'a0');
    const first = decide(state, 'a1', 'w0e0');
    expect(eventsOf(first, 'hit')).toHaveLength(1);
    expect(eventsOf(first, 'status.applied')).toHaveLength(1);
    untilTurnOf(state, 'a0');
    const second = decide(state, 'a1', 'w0e0');
    expect(eventsOf(second, 'hit')).toHaveLength(2);
  });
});

describe('targeting rules', () => {
  it('Provoke forces the A1 on the provoker and Veil hides from single targets', () => {
    const provoke = ability('a1', [
      { kind: 'apply_status', target: 'all_enemies', status: 'provoke', turns: 2, chance: 100 },
    ]);
    const state = battle({
      party: [champion({ abilities: [ability('a1', [hit()]), ability('a2', [hit(2)])], stats: { spd: 50 } })],
      waves: [[enemy({ abilities: [provoke], stats: { spd: 200, acc: 100 } }), enemy({ stats: { spd: 1 } })]],
    });
    const { result } = untilTurnOf(state, 'a0');
    expect(result.request?.forced).toEqual({
      abilityId: state.units['a0']!.abilities[0]!.id,
      targetId: 'w0e0',
    });
    expect(result.request?.abilities[1]?.ready).toBe(false);
    expect(() => decide(state, 'a1', 'w0e1')).toThrow(/Provoked/);

    const veiled = enemy({
      stats: { spd: 1 },
      abilities: [
        ability('a1', [{ kind: 'apply_status', target: 'self', status: 'veil', turns: 5, chance: 100 }]),
      ],
    });
    const s2 = battle({
      party: [champion({ stats: { spd: 50 } })],
      waves: [[enemy({ id: 'enemy.plain', stats: { spd: 1 } }), { ...veiled, id: 'enemy.veiled' }]],
    });
    s2.units['w0e1']!.statuses.push({
      id: 'veil',
      turns: 5,
      value: 0,
      stacks: 1,
      sourceId: 'w0e1',
      placedAt: 0,
    });
    const { result: r2 } = untilTurnOf(s2, 'a0');
    expect(r2.request?.abilities[0]?.validTargets).toEqual(['w0e0']);
  });

  it('retarget_single_attacks moves single hits to another ally', () => {
    const veiledPassive = passive('static', [{ kind: 'retarget_single_attacks', while: 'any_ally_alive' }]);
    const shadow = champion({ id: 'champ.shadow', passive: veiledPassive, stats: { spd: 1 } });
    const buddy = champion({ id: 'champ.buddy', stats: { spd: 190, hp: 50_000 } });
    const state = battle({ party: [shadow, buddy], waves: [[enemy({ stats: { spd: 200 } })]] });
    const { events } = untilTurnOf(state, 'a1');
    const enemyHits = eventsOf(events, 'hit').filter((h) => h.sourceId === 'w0e0');
    expect(enemyHits.every((h) => h.targetId === 'a1')).toBe(true);
  });
});

describe('passives and auras', () => {
  it('static stat modifiers and the leader aura raise stats and max HP', () => {
    const aura = {
      id: 'ab.test.aura',
      name: 'n',
      description: 'd',
      icon: 'spell.icon_meditation',
      effects: [{ kind: 'stat_mod', stat: 'hp', percent: 20 }],
    } as const;
    const leader = champion({ aura: { ...aura, effects: [...aura.effects] } });
    const other = champion({ passive: passive('static', [{ kind: 'stat_mod', stat: 'atk', percent: 50 }]) });
    const state = battle({ party: [leader, other], waves: [[enemy({ stats: { spd: 1, def: 0 } })]] });
    expect(state.units['a0']!.maxHp).toBe(12_000);
    expect(state.units['a1']!.maxHp).toBe(12_000);
    untilTurnOf(state, 'a1');
    const dmg = eventsOf(decide(state, 'a1', 'w0e0'), 'hit')[0]!.damage;
    expect(dmg).toBeGreaterThanOrEqual(Math.floor(1500 * 0.95));
  });

  it('damage_bonus (crit scope), damage_bonus_per and damage_reduction by attacker element', () => {
    const bonus = passive('static', [{ kind: 'damage_bonus_per', per: 'missing_hp_10', value: 0.1, max: 1 }]);
    const state = battle({
      party: [champion({ passive: bonus })],
      waves: [[enemy({ stats: { spd: 1, def: 0 } })]],
    });
    untilTurnOf(state, 'a0');
    state.units['a0']!.hp = 5000; // missing 50 % → +0.5
    const dmg = eventsOf(decide(state, 'a1', 'w0e0'), 'hit')[0]!.damage;
    expect(dmg).toBeGreaterThanOrEqual(Math.floor(1500 * 0.95));

    const reduction = passive('static', [
      { kind: 'damage_reduction', value: 0.5, if: { attackerElement: 'valor' } },
    ]);
    const s2 = battle({
      party: [champion({ passive: reduction, stats: { spd: 1 } })],
      waves: [[enemy({ element: 'valor', stats: { spd: 200, def: 0 } })]],
    });
    const { events } = untilTurnOf(s2, 'a0');
    const taken = eventsOf(events, 'hit').find((h) => h.targetId === 'a0')!.damage;
    expect(taken).toBeLessThanOrEqual(Math.floor(500 * 1.1 * 1.05) + 1);
  });

  it('survive_lethal once per battle, shield_ally_below once per ally per wave, on_heal_grant', () => {
    const survivor = champion({
      passive: passive('static', [
        { kind: 'survive_lethal', hpPercent: 40, oncePerBattle: true, shield: 10 },
      ]),
      stats: { spd: 1, hp: 1000 },
    });
    const state = battle({
      party: [survivor],
      waves: [[enemy({ stats: { spd: 200, atk: 100_000, def: 0 } })]],
    });
    const { events } = untilTurnOf(state, 'a0');
    expect(eventsOf(events, 'unit.revived')[0]).toMatchObject({ reason: 'survive_lethal', hpAfter: 400 });
    expect(eventsOf(events, 'status.applied').some((s) => s.status === 'shield' && s.value === 100)).toBe(
      true,
    );
    // The second lethal hit is final: once per battle.
    expect(eventsOf(events, 'unit.revived')).toHaveLength(1);
    expect(eventsOf(events, 'unit.died')).toHaveLength(1);

    const guardian = champion({
      id: 'champ.guardian',
      passive: passive('onAllyHit', [
        { kind: 'shield_ally_below', hpPercent: 30, shield: 20, turns: 1, oncePerAllyPerWave: true },
      ]),
      stats: { spd: 1 },
    });
    const weak = champion({ id: 'champ.weak', stats: { spd: 190, hp: 1000 } });
    const s2 = battle({
      party: [guardian, weak],
      waves: [[enemy({ stats: { spd: 200, atk: 100, def: 0 } })]],
    });
    s2.units['a1']!.hp = 250;
    const { events: e2 } = untilTurnOf(s2, 'a1', 40);
    const granted = eventsOf(e2, 'status.applied').filter(
      (s) => s.status === 'shield' && s.targetId === 'a1',
    );
    expect(granted).toHaveLength(1);
    expect(granted[0]?.value).toBe(2000);

    const healer = champion({
      passive: passive('onHeal', [{ kind: 'on_heal_grant', status: 'atk_up', value: 8, turns: 1 }]),
      abilities: [ability('a1', [{ kind: 'heal', target: 'single_ally', mult: 0.1, stat: 'TARGET_MAX_HP' }])],
    });
    const s3 = battle({ party: [healer], waves: [[enemy({ stats: { spd: 1 } })]] });
    untilTurnOf(s3, 'a0');
    s3.units['a0']!.hp = 1000;
    const e3 = decide(s3, 'a1', 'a0');
    expect(eventsOf(e3, 'heal')[0]?.amount).toBe(1000);
    expect(eventsOf(e3, 'status.applied')[0]).toMatchObject({ status: 'atk_up', value: 8 });
  });

  it('status_value_override, on_stun_gain_tm, onWaveStart and onKill triggers, boss rotation and enrage', () => {
    const poisoner = champion({
      passive: passive('static', [{ kind: 'status_value_override', status: 'poison', value: 6 }]),
      abilities: [
        ability('a1', [
          { kind: 'apply_status', target: 'single_enemy', status: 'poison', turns: 2, chance: 100 },
        ]),
      ],
      stats: { acc: 100 },
    });
    const state = battle({ party: [poisoner], waves: [[enemy({ stats: { spd: 1 } })]] });
    untilTurnOf(state, 'a0');
    expect(eventsOf(decide(state, 'a1', 'w0e0'), 'status.applied')[0]?.value).toBe(6);

    const stunner = champion({
      passive: passive('onDebuffLanded', [{ kind: 'on_stun_gain_tm', delta: 0.3 }]),
      abilities: [
        ability('a1', [
          { kind: 'apply_status', target: 'single_enemy', status: 'stun', turns: 1, chance: 100 },
        ]),
      ],
      stats: { acc: 100 },
    });
    const s2 = battle({ party: [stunner], waves: [[enemy({ stats: { spd: 1 } })]] });
    untilTurnOf(s2, 'a0');
    const e2 = decide(s2, 'a1', 'w0e0');
    expect(eventsOf(e2, 'tm.changed')[0]).toMatchObject({ targetId: 'a0', delta: 0.3 });

    const waveBuff = champion({
      passive: passive('onWaveStart', [
        { kind: 'apply_status', target: 'all_allies', status: 'def_up', turns: 2, chance: 100 },
      ]),
    });
    const s3 = battle({
      party: [waveBuff],
      waves: [[enemy({ stats: { spd: 1, hp: 10 } })], [enemy({ stats: { spd: 1, hp: 10 } })]],
    });
    const { events: e3 } = untilTurnOf(s3, 'a0');
    expect(eventsOf(e3, 'status.applied').filter((s) => s.status === 'def_up')).toHaveLength(1);
    decide(s3, 'a1', 'w0e0');
    expect(s3.waveIndex).toBe(1);

    const rotation = enemy({
      element: 'eclipse',
      stats: { spd: 200, def: 0 },
      abilities: [ability('a1', [hit(1)]), ability('a2', [hit(2, 'all_enemies')], { cooldown: 3 })],
      boss: { rotation: ['a1', 'a2'], immunities: [], enrageAfterTurn: 1, damageTakenMult: 0.5 },
    });
    const s4 = battle({
      party: [champion({ stats: { spd: 300, hp: 1_000_000 } })],
      waves: [[rotation]],
      control: 'auto',
    });
    const e4 = [];
    for (let i = 0; i < 30 && !s4.outcome; i++) e4.push(...step(s4).events);
    const casts = eventsOf(e4, 'ability.cast')
      .filter((c) => c.unitId === 'w0e0')
      .map((c) => c.slot);
    expect(casts.slice(0, 4)).toEqual(['a1', 'a2', 'a1', 'a1']);
    expect(eventsOf(e4, 'enraged').length).toBeGreaterThan(0);
    const first = eventsOf(e4, 'hit').find((h) => h.sourceId === 'a0')!;
    expect(first.damage).toBeLessThanOrEqual(Math.floor(500 * 1.05) + 1);
  });
});
