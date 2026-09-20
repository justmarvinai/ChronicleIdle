import { describe, expect, it } from 'vitest';
import { autoDecide } from './ai';
import { setFocus } from './step';
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

  it('sends an ability with `prefer` at the target it names (BATTLE.md §7)', () => {
    const picky = (prefer: 'lowest_hp' | 'lowest_hp_percent' | 'highest_atk' | 'lowest_def') =>
      ability('a1', [hit()], { ai: { priority: 1, prefer } });
    const cases = [
      // Two enemies: the second has the fewest HP left, the highest ATK and the lowest DEF, while
      // the first is on the smallest share of its own (much larger) pool.
      ['lowest_hp', 'w0e1'],
      ['lowest_hp_percent', 'w0e0'],
      ['highest_atk', 'w0e1'],
      ['lowest_def', 'w0e1'],
    ] as const;
    for (const [prefer, expected] of cases) {
      const a1 = picky(prefer);
      const state = battle({
        party: [champion({ abilities: [a1] })],
        waves: [
          [
            enemy({ stats: { spd: 1, hp: 20_000, atk: 100, def: 900 } }),
            enemy({ stats: { spd: 1, hp: 4_000, atk: 900, def: 100 } }),
          ],
        ],
      });
      untilTurnOf(state, 'a0');
      state.units['w0e0']!.hp = 1_000;
      state.units['w0e1']!.hp = 900;
      expect(autoDecide(state, state.units['a0']!).targetId, prefer).toBe(expected);
    }
  });

  it('lets an enemy kit pick off the champion closest to death instead of rolling for one', () => {
    const shot = ability('a1', [hit()], { ai: { priority: 1, prefer: 'lowest_hp_percent' } });
    const roller = ability('a1', [hit()]);
    const picky = battle({
      party: [champion(), champion()],
      waves: [[enemy({ abilities: [shot], stats: { spd: 1 } })]],
    });
    picky.units['a1']!.hp = Math.round(picky.units['a1']!.maxHp * 0.1);
    // The preference is not a roll: every call goes for the same champion.
    for (let i = 0; i < 10; i += 1) expect(autoDecide(picky, picky.units['w0e0']!).targetId).toBe('a1');
    // Without it the archetype default is threat-weighted random, which can take either.
    const plain = battle({
      party: [champion(), champion()],
      waves: [[enemy({ abilities: [roller], stats: { spd: 1 } })]],
      seed: 'roller',
    });
    plain.units['a1']!.hp = Math.round(plain.units['a1']!.maxHp * 0.1);
    const picked = new Set<string | null>();
    for (let i = 0; i < 30; i += 1) picked.add(autoDecide(plain, plain.units['w0e0']!).targetId);
    expect(picked.size).toBe(2);
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

describe('the enemy the player marks', () => {
  const hero = () => champion({ abilities: [ability('a1', [hit()])] });
  /** Two enemies the policy would separate: the one with the higher ATK is its own pick. */
  const marked = () =>
    battle({
      party: [hero()],
      waves: [
        [enemy({ stats: { spd: 1, atk: 50, hp: 5_000 } }), enemy({ stats: { spd: 1, atk: 400, hp: 5_000 } })],
      ],
    });

  it("is what every ally attacks, over the policy's own reading", () => {
    const state = marked();
    untilTurnOf(state, 'a0');
    // Left to itself the policy takes the biggest threat — the second enemy.
    expect(autoDecide(state, state.units['a0']!).targetId).toBe('w0e1');
    setFocus(state, 'w0e0');
    expect(autoDecide(state, state.units['a0']!).targetId).toBe('w0e0');
    // A request already open keeps the preselection it was built with; the mark steers the next one.
    expect(state.pending?.abilities[0]?.autoTarget).toBe('w0e1');
  });

  it('is the preselection a manual request is built with', () => {
    const state = marked();
    setFocus(state, 'w0e0');
    untilTurnOf(state, 'a0');
    expect(state.pending?.abilities[0]?.autoTarget).toBe('w0e0');
  });

  it('hands the choice back when the marked enemy falls', () => {
    const state = marked();
    setFocus(state, 'w0e0');
    untilTurnOf(state, 'a0');
    // A fallen enemy is not in the target pool, so the policy reads the field again rather than
    // aiming at a corpse. (The kill itself clears the mark — `combat.ts` — since unit ids are per
    // wave and a mark on a corpse can never match anything again.)
    state.units['w0e0']!.alive = false;
    expect(autoDecide(state, state.units['a0']!).targetId).toBe('w0e1');
  });

  it('never marks an ally, and clears on null', () => {
    const state = marked();
    setFocus(state, 'a0');
    expect(state.focusId).toBe(null);
    setFocus(state, 'w0e1');
    expect(state.focusId).toBe('w0e1');
    setFocus(state, null);
    expect(state.focusId).toBe(null);
  });
});
