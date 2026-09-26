import { describe, expect, it } from 'vitest';
import { evaluateCondition } from './conditions';
import { step } from './step';
import { battle, champion, enemy, passive } from './test-utils';
import type { BattleState } from './types';

/** Plays a fight to its end on auto. */
function playOut(state: BattleState): NonNullable<BattleState['outcome']> {
  for (let i = 0; i < 2000 && !state.outcome; i += 1) step(state);
  if (!state.outcome) throw new Error('the fight never ended');
  return state.outcome;
}

describe('a shaped fight (the Unwritten, UNWRITTEN.md §4.2, §7)', () => {
  it('lets an ally carry passives beyond their kit, counted before they enter', () => {
    const hero = champion({ id: 'champ.carrier' });
    const vigour = passive('static', [{ kind: 'stat_mod', stat: 'hp', percent: 20 }]);
    const plain = battle({ party: [hero], waves: [[enemy()]] });
    const shaped = battle({
      party: [hero],
      waves: [[enemy()]],
      shaping: { allyPassives: { [hero.instance.instanceId]: [vigour] } },
    });
    const before = plain.units['a0'];
    const after = shaped.units['a0'];
    expect(after?.passives.map((p) => p.id)).toContain(vigour.id);
    // +20 % HP is on the max HP the champion enters with, and they enter at full.
    expect(after?.maxHp).toBe(Math.round((before?.maxHp ?? 0) * 1.2));
    expect(after?.hp).toBe(after?.maxHp);
  });

  it('enters a wounded ally at their share of the max HP they have now', () => {
    const hero = champion({ id: 'champ.wounded' });
    const vigour = passive('static', [{ kind: 'stat_mod', stat: 'hp', percent: 50 }]);
    const state = battle({
      party: [hero],
      waves: [[enemy()]],
      shaping: {
        allyPassives: { [hero.instance.instanceId]: [vigour] },
        allyHp: { [hero.instance.instanceId]: 0.4 },
      },
    });
    const unit = state.units['a0'];
    expect(unit?.hp).toBe(Math.round((unit?.maxHp ?? 0) * 0.4));
    // A share so small it rounds to nothing still enters alive: a fielded champion is standing.
    const faint = battle({
      party: [hero],
      waves: [[enemy()]],
      shaping: { allyHp: { [hero.instance.instanceId]: 1e-9 } },
    });
    expect(faint.units['a0']?.hp).toBe(1);
    expect(faint.units['a0']?.alive).toBe(true);
  });

  it("keeps a contested wave's wounds: the first wave's foes enter at their shares, by slot", () => {
    const hero = champion();
    const state = battle({
      party: [hero],
      waves: [[enemy(), enemy()], [enemy()]],
      shaping: { firstWaveHp: [0.25] },
    });
    const [first, second] = [state.units['w0e0'], state.units['w0e1']];
    expect(first?.hp).toBe(Math.round((first?.maxHp ?? 0) * 0.25));
    expect(second?.hp).toBe(second?.maxHp);
  });

  it('reports the HP every unit ended on, and nothing for the fallen', () => {
    const hero = champion({ stats: { atk: 50_000 } });
    const foe = enemy({ stats: { hp: 1_000, spd: 1 } });
    const state = battle({ party: [hero], waves: [[foe]], control: 'auto' });
    const outcome = playOut(state);
    expect(outcome.kind).toBe('victory');
    const ally = outcome.units.find((u) => u.side === 'ally');
    const dead = outcome.units.find((u) => u.side === 'enemy');
    expect(ally?.hp).toBe(state.units['a0']?.hp);
    expect(ally?.maxHp).toBe(state.units['a0']?.maxHp);
    expect(dead?.hp).toBe(0);
    expect(dead?.maxHp).toBeGreaterThan(0);
  });

  it('aims an `attacker` effect at the foe whose hit set the passive off', () => {
    // Verdict: when hit, Weaken the attacker — guaranteed here so the test reads one hit.
    const verdict = passive('onHitTaken', [
      { kind: 'apply_status', target: 'attacker', status: 'weaken', turns: 2, chance: 100 },
    ]);
    const hero = champion({ stats: { spd: 1, hp: 1_000_000 } });
    const brute = enemy({ id: 'enemy.brute', stats: { spd: 300 } });
    const bystander = enemy({ id: 'enemy.bystander', stats: { spd: 1 } });
    const state = battle({
      party: [hero],
      waves: [[bystander, brute]],
      control: 'auto',
      shaping: { allyPassives: { [hero.instance.instanceId]: [verdict] } },
    });
    // The brute is far faster: its first hit lands before anyone else moves.
    for (let i = 0; i < 20 && !state.units['w0e1']?.statuses.length; i += 1) step(state);
    expect(state.units['w0e1']?.statuses.some((s) => s.id === 'weaken')).toBe(true);
    // Only the one who struck: the bystander never hit anyone.
    expect(state.units['w0e0']?.statuses.some((s) => s.id === 'weaken')).toBe(false);
  });

  it('reads `selfHas` off the unit itself', () => {
    const hero = champion();
    const state = battle({ party: [hero], waves: [[enemy()]] });
    const unit = state.units['a0'];
    if (!unit) throw new Error('no unit');
    expect(evaluateCondition(state, { selfHas: 'shield' }, { self: unit })).toBe(false);
    unit.statuses.push({ id: 'shield', turns: 2, value: 100, stacks: 1, sourceId: unit.id, placedAt: 0 });
    expect(evaluateCondition(state, { selfHas: 'shield' }, { self: unit })).toBe(true);
  });

  it('is part of the setup: the same shaping and seed fight the same fight', () => {
    const hero = champion({ id: 'champ.replayed' });
    const venom = passive('onHit', [
      { kind: 'apply_status', target: 'single_enemy', status: 'poison', turns: 2, chance: 40 },
    ]);
    const foes = [enemy({ id: 'enemy.r1' }), enemy({ id: 'enemy.r2' })];
    const shaping = {
      allyPassives: { [hero.instance.instanceId]: [venom] },
      allyHp: { [hero.instance.instanceId]: 0.7 },
      firstWaveHp: [0.5, 0.9],
    };
    const fight = (withShaping: boolean) =>
      playOut(
        battle({
          party: [hero],
          waves: [foes],
          control: 'auto',
          seed: 'shaped',
          ...(withShaping ? { shaping } : {}),
        }),
      );
    const first = fight(true);
    const second = fight(true);
    expect(second.kind).toBe(first.kind);
    expect(second.turns).toBe(first.turns);
    expect(second.units.map((u) => u.hp)).toEqual(first.units.map((u) => u.hp));
    // And the shaping is not decoration: without it the same seed plays out differently.
    const plain = fight(false);
    expect(plain.units.map((u) => u.hp)).not.toEqual(first.units.map((u) => u.hp));
  });
});
