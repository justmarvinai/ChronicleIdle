import { describe, expect, it } from 'vitest';
import type { AbilityDef } from '@content/champions/types';
import { abilityNumbers, effectiveAbility, passiveNumbers, upgradeTotals } from './describe';

const VOLLEY: AbilityDef = {
  slot: 'a2',
  id: 'ab.test.volley',
  name: 'ab.test.volley.name',
  description: 'ab.test.volley.description',
  icon: 'spell.hunt_arrow_storm',
  cooldown: 4,
  effects: [
    { kind: 'damage', target: 'all_enemies', mult: 2.6, stat: 'ATK', defIgnore: 0.2 },
    { kind: 'apply_status', target: 'all_enemies', status: 'def_down', value: 30, turns: 2, chance: 30 },
  ],
  upgrades: [
    { type: 'damage', value: 5 },
    { type: 'chance', value: 10 },
    { type: 'cooldown', value: 1 },
  ],
  ai: { priority: 3 },
};

describe('ability descriptions', () => {
  it('reports the authored numbers with no upgrades', () => {
    const n = abilityNumbers(VOLLEY);
    expect(n.dmg).toBe('260');
    expect(n.chance).toBe(30);
    expect(n.turns).toBe(2);
    expect(n.cooldown).toBe(4);
    expect(n.defIgnore).toBe(20);
    expect(n.value).toBe(30);
  });

  it('folds tome steps in order and never mutates the definition', () => {
    expect(upgradeTotals(VOLLEY.upgrades, 2)).toMatchObject({ damage: 5, chance: 10, cooldown: 0 });
    const upgraded = effectiveAbility(VOLLEY, 3);
    expect(upgraded.cooldown).toBe(3);
    expect(upgraded.effects[0]).toMatchObject({ mult: 2.73 });
    expect(upgraded.effects[1]).toMatchObject({ chance: 40 });
    expect(VOLLEY.cooldown).toBe(4);
    expect(VOLLEY.effects[0]).toMatchObject({ mult: 2.6 });
    expect(abilityNumbers(VOLLEY, 99).cooldown).toBe(3);
  });

  it('keeps A1 at zero cooldown and caps chance at 100', () => {
    const a1: AbilityDef = {
      ...VOLLEY,
      slot: 'a1',
      cooldown: 0,
      upgrades: [
        { type: 'chance', value: 80 },
        { type: 'cooldown', value: 1 },
      ],
    };
    const n = abilityNumbers(a1, 2);
    expect(n.cooldown).toBe(0);
    expect(n.chance).toBe(100);
  });
});

describe('passiveNumbers', () => {
  it('reads plain effects like an ability and falls back to passive-only tunables', () => {
    const regen = passiveNumbers([
      { kind: 'apply_status', status: 'regen', chance: 100, turns: 2, target: 'lowest_hp_ally' },
    ]);
    expect(regen.turns).toBe(2);
    expect(regen.chance).toBe(100);
    expect(regen.cooldown).toBe(0);
    const guard = passiveNumbers([
      { kind: 'damage_reduction', value: 10 },
      { kind: 'shield_ally_below', hpPercent: 30, shield: 20, turns: 2, oncePerAllyPerWave: true },
      { kind: 'on_stun_gain_tm', delta: 0.25 },
      { kind: 'extra_turn_chance', chance: 15 },
    ]);
    expect(guard.value).toBe(10);
    expect(guard.shield).toBe(20);
    expect(guard.turns).toBe(2);
    expect(guard.tm).toBe(25);
    expect(guard.chance).toBe(15);
  });
});
