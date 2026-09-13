import { describe, expect, it } from 'vitest';
import { autoDecide } from './ai';
import { ability, battle, champion, enemy, untilTurnOf } from './test-utils';

const hit = (mult = 1) => ({ kind: 'damage', target: 'single_enemy', mult, stat: 'ATK' }) as const;

describe('auto-battle policy', () => {
  it('prefers the highest priority ready ability and respects when/avoid', () => {
    const a1 = ability('a1', [hit()]);
    const a2 = ability('a2', [hit(2)], { ai: { priority: 3, when: { enemiesAlive: { gte: 2 } } } });
    const a3 = ability('a3', [hit(3)], { ai: { priority: 2, avoid: { targetHpBelow: 50 } } });
    const hero = champion({ abilities: [a1, a2, a3] });
    const one = battle({ party: [hero], waves: [[enemy({ stats: { spd: 1 } })]] });
    untilTurnOf(one, 'a0');
    expect(autoDecide(one, one.units['a0']!).abilityId).toBe(a3.id);
    one.units['w0e0']!.hp = 100;
    expect(autoDecide(one, one.units['a0']!).abilityId).toBe(a1.id);
    const two = battle({
      party: [champion({ abilities: [a1, a2, a3] })],
      waves: [[enemy({ stats: { spd: 1 } }), enemy({ stats: { spd: 1 } })]],
    });
    untilTurnOf(two, 'a0');
    expect(autoDecide(two, two.units['a0']!).abilityId).toBe(a2.id);
  });

  it('never wastes heals above 90 % team HP and saves revives for the dead', () => {
    const heal = ability('a2', [{ kind: 'heal', target: 'all_allies', mult: 0.2, stat: 'TARGET_MAX_HP' }], {
      ai: { priority: 5 },
    });
    const rez = ability('a3', [{ kind: 'revive', target: 'single_ally', hpPercent: 50 }], {
      ai: { priority: 9 },
    });
    const medic = champion({ abilities: [ability('a1', [hit()]), heal, rez] });
    const state = battle({
      party: [medic, champion({ stats: { spd: 1 } })],
      waves: [[enemy({ stats: { spd: 1 } })]],
    });
    untilTurnOf(state, 'a0');
    expect(autoDecide(state, state.units['a0']!).abilityId).toBe(state.units['a0']!.abilities[0]!.id);
    state.units['a1']!.hp = 1000;
    expect(autoDecide(state, state.units['a0']!).abilityId).toBe(heal.id);
    state.units['a1']!.alive = false;
    state.units['a1']!.hp = 0;
    const decision = autoDecide(state, state.units['a0']!);
    expect(decision.abilityId).toBe(rez.id);
    expect(decision.targetId).toBe('a1');
  });

  it('targets the killable enemy first, else the highest ATK; debuffs go to the strongest undebuffed', () => {
    const hero = champion({
      abilities: [
        ability('a1', [hit(1)]),
        ability(
          'a2',
          [{ kind: 'apply_status', target: 'single_enemy', status: 'def_down', turns: 2, chance: 100 }],
          { ai: { priority: 3 } },
        ),
      ],
    });
    const state = battle({
      party: [hero],
      waves: [
        [
          enemy({ id: 'enemy.big', stats: { spd: 1, atk: 5000, hp: 100_000 } }),
          enemy({ id: 'enemy.small', stats: { spd: 1, atk: 100, hp: 100 } }),
        ],
      ],
    });
    untilTurnOf(state, 'a0');
    const a1 = state.units['a0']!.abilities[0]!;
    const a2 = state.units['a0']!.abilities[1]!;
    const d = autoDecide(state, state.units['a0']!);
    expect(d.abilityId).toBe(a2.id);
    expect(d.targetId).toBe('w0e0');
    state.units['w0e0']!.statuses.push({
      id: 'def_down',
      turns: 2,
      value: 30,
      stacks: 1,
      sourceId: 'a0',
      placedAt: 0,
    });
    expect(autoDecide(state, state.units['a0']!).targetId).toBe('w0e1');
    a2.cooldown = 3;
    const basic = autoDecide(state, state.units['a0']!);
    expect(basic.abilityId).toBe(a1.id);
    expect(basic.targetId).toBe('w0e1');
    state.units['w0e1']!.hp = 100_000;
    expect(autoDecide(state, state.units['a0']!).targetId).toBe('w0e0');
  });

  it('boosts buffs on the first action of a wave', () => {
    const buff = ability(
      'a2',
      [{ kind: 'apply_status', target: 'all_allies', status: 'atk_up', turns: 2, chance: 100 }],
      { ai: { priority: 1 } },
    );
    const nuke = ability('a3', [hit(3)], { ai: { priority: 1.5 } });
    const state = battle({
      party: [champion({ abilities: [ability('a1', [hit()]), buff, nuke] })],
      waves: [[enemy({ stats: { spd: 1 } })]],
    });
    untilTurnOf(state, 'a0');
    expect(autoDecide(state, state.units['a0']!).abilityId).toBe(buff.id);
    state.waveFresh = false;
    expect(autoDecide(state, state.units['a0']!).abilityId).toBe(nuke.id);
  });
});
