import { describe, expect, it } from 'vitest';
import { GEAR_SET_BY_ID } from '@content/sets/index';
import type { GearSetDef } from '@content/sets/types';
import type { GearSlot } from '@content/champions/types';
import { battle, champion, enemy } from '@engine/battle/test-utils';
import { step } from '@engine/battle/step';
import { createRng } from '@engine/rng/rng';
import { generateGear } from './generate';
import type { GearInstance } from './instance';

const SLOTS: readonly GearSlot[] = ['weapon', 'helmet', 'shield', 'gauntlets', 'chestplate', 'boots'];
const setById = (id: string): GearSetDef | undefined => GEAR_SET_BY_ID[id];

/** `pieces` copies of one set, on distinct slots, rolled Common so only the set matters. */
function wearing(setId: string, pieces: number): GearInstance[] {
  return Array.from({ length: pieces }, (_, i) =>
    generateGear(
      {
        serial: i,
        slot: SLOTS[i] as GearSlot,
        setId,
        rarity: 'common',
        stars: 1,
        source: 'campaign_drop',
        now: 0,
      },
      createRng(`${setId}-${i}`),
    ),
  );
}

describe('a complete set fights', () => {
  it('raises the stat a two-piece set promises (Ember Guard: +15 % HP)', () => {
    const bare = champion({ id: 'champ.bare' });
    const geared = champion({ id: 'champ.geared' });
    const foe = enemy({ stats: { atk: 1 } });

    const plain = battle({ party: [bare], waves: [[foe]], setById });
    // Common 1★ pieces carry a main stat too, so compare against the same gear without the set.
    const mixed = battle({
      party: [{ ...geared, worn: wearing('gear_set.ember_guard', 1) }],
      waves: [[foe]],
      setById,
    });
    const complete = battle({
      party: [{ ...geared, worn: wearing('gear_set.ember_guard', 2) }],
      waves: [[foe]],
      setById,
    });
    const hpOf = (state: ReturnType<typeof battle>): number => state.units['a0']?.maxHp ?? 0;
    expect(hpOf(plain)).toBe(10_000);
    // One piece is only its own main stat; the second completes the group and adds the 15 %.
    expect(hpOf(complete)).toBeGreaterThan(Math.round(hpOf(mixed) * 1.14));
  });

  it('Retaliation counters about three hits in ten (GEAR.md §5)', () => {
    let hits = 0;
    let counters = 0;
    for (let run = 0; run < 60; run += 1) {
      const defender = champion({ id: 'champ.defender', stats: { spd: 1, hp: 500_000 } });
      const foe = enemy({ id: 'enemy.puncher', stats: { spd: 100, atk: 200 } });
      const state = battle({
        party: [{ ...defender, worn: wearing('gear_set.retaliation', 4) }],
        waves: [[foe]],
        control: 'auto',
        seed: `counter-${run}`,
        setById,
      });
      // The enemy is far faster, so the first turns are all its own attacks.
      for (let i = 0; i < 12; i += 1) {
        const result = step(state);
        for (const event of result.events) {
          if (event.type === 'hit' && event.sourceId === 'w0e0') hits += 1;
          if (event.type === 'ability.cast' && event.unitId === 'a0' && event.counter) counters += 1;
        }
        if (result.outcome) break;
      }
    }
    expect(hits).toBeGreaterThan(100);
    const rate = counters / hits;
    expect(rate).toBeGreaterThan(0.18);
    expect(rate).toBeLessThan(0.45);
  });

  it('Lifedrinker heals a share of every hit it lands', () => {
    const drinker = champion({ id: 'champ.drinker', stats: { spd: 200, atk: 2_000 } });
    const foe = enemy({ stats: { spd: 1, hp: 500_000, def: 0 } });
    const state = battle({
      party: [{ ...drinker, worn: wearing('gear_set.lifedrinker', 4) }],
      waves: [[foe]],
      control: 'auto',
      seed: 'drink',
      setById,
    });
    const unit = state.units['a0'];
    if (!unit) throw new Error('no unit');
    unit.hp = Math.round(unit.maxHp / 2);
    const before = unit.hp;
    for (let i = 0; i < 6; i += 1) {
      const result = step(state);
      if (result.outcome) break;
    }
    expect(state.units['a0']?.hp ?? 0).toBeGreaterThan(before);
  });

  it('Bulwark shields the wearer when a wave opens', () => {
    const guard = champion({ id: 'champ.guard' });
    const foe = enemy({ stats: { spd: 1 } });
    const state = battle({
      party: [{ ...guard, worn: wearing('gear_set.bulwark', 4) }],
      waves: [[foe]],
      control: 'auto',
      seed: 'bulwark',
      setById,
    });
    // The wave's own start applies it, so one step is enough — and it lasts three turns.
    step(state);
    expect(state.units['a0']?.statuses.some((s) => s.id === 'shield')).toBe(true);
  });

  it('leaves a champion with three pieces of a four-piece set with nothing but the stats', () => {
    const almost = champion({ id: 'champ.almost' });
    const foe = enemy({ stats: { spd: 1 } });
    const state = battle({
      party: [{ ...almost, worn: wearing('gear_set.bulwark', 3) }],
      waves: [[foe]],
      control: 'auto',
      seed: 'almost',
      setById,
    });
    step(state);
    expect(state.units['a0']?.statuses.some((s) => s.id === 'shield')).toBe(false);
  });
});
