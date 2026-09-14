import { describe, expect, it } from 'vitest';
import {
  GEAR_MAX_LEVEL,
  GEAR_STATS,
  MAIN_STAT_TABLE,
  SUBSTATS_AT_ZERO,
  SUB_ROLL_MULT,
  SUB_STAT_TABLE,
  starBand,
  type GearStat,
} from '@content/balance/gear';
import { GEAR_SET_BY_ID, GEAR_SETS } from '@content/sets/index';
import type { GearSlot, Rarity } from '@content/champions/types';
import { createRng } from '@engine/rng/rng';
import { generateGear, levelGear, rollMainStat } from './generate';
import { setGroups, setPassives } from './sets';
import { contributionOf, mainStatValue, mainOf, targetStat } from './stats';
import type { GearInstance } from './instance';

const SLOTS: readonly GearSlot[] = ['weapon', 'helmet', 'shield', 'gauntlets', 'chestplate', 'boots'];
const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];

const piece = (over: Partial<GearInstance> = {}): GearInstance =>
  generateGear(
    {
      serial: 1,
      slot: over.slot ?? 'weapon',
      setId: over.setId ?? 'gear_set.warcry',
      rarity: over.rarity ?? 'epic',
      stars: over.stars ?? 5,
      source: 'campaign_drop',
      now: 0,
    },
    createRng('piece'),
  );

describe('main stats', () => {
  it('grow linearly from the +0 value to the +16 value on the star row (GEAR.md §3)', () => {
    // 5★ ATK flat: 42 → 210.
    expect(mainStatValue('atk', 5, 0)).toBe(42);
    expect(mainStatValue('atk', 5, 16)).toBe(210);
    expect(mainStatValue('atk', 5, 8)).toBe(126);
    // 6★ HP flat and 1★ SPD, the two ends of the table.
    expect(mainStatValue('hp', 6, 16)).toBe(4_100);
    expect(mainStatValue('spd', 1, 0)).toBe(3);
  });

  it('are fixed for weapon, helmet and shield and rolled for the rest (GEAR.md §1)', () => {
    const rng = createRng('mains');
    expect(rollMainStat('weapon', rng)).toBe('atk');
    expect(rollMainStat('helmet', rng)).toBe('hp');
    expect(rollMainStat('shield', rng)).toBe('def');
    const bootStats = new Set<GearStat>();
    for (let i = 0; i < 200; i += 1) bootStats.add(rollMainStat('boots', createRng(`boots-${i}`)));
    expect([...bootStats].sort()).toEqual(['atkPct', 'defPct', 'hpPct', 'spd']);
  });

  it('feed the champion stat they belong to, flat or as a percentage', () => {
    expect(targetStat('hpPct')).toEqual({ stat: 'hp', percent: true });
    expect(targetStat('hp')).toEqual({ stat: 'hp', percent: false });
    // Crit, resistance and accuracy are already percentage-shaped: gear adds points.
    expect(targetStat('critRate')).toEqual({ stat: 'critRate', percent: false });
  });
});

describe('generateGear', () => {
  it('gives each rarity its substats, never duplicating one or the main stat', () => {
    for (const rarity of RARITIES) {
      for (const slot of SLOTS) {
        const p = piece({ rarity, slot, stars: 4 });
        expect(p.subs).toHaveLength(SUBSTATS_AT_ZERO[rarity]);
        const stats = p.subs.map((s) => s.stat);
        expect(new Set(stats).size).toBe(stats.length);
        expect(stats).not.toContain(p.mainStat);
      }
    }
  });

  it('replays exactly from its seed', () => {
    const input = {
      serial: 7,
      slot: 'gauntlets' as GearSlot,
      setId: 'gear_set.keen_eye',
      rarity: 'legendary' as Rarity,
      stars: 6,
      source: 'campaign_drop' as const,
      now: 5,
    };
    const a = generateGear(input, createRng('same'));
    const b = generateGear(input, createRng('same'));
    const c = generateGear(input, createRng('other'));
    expect(a).toEqual(b);
    expect(JSON.stringify(a) === JSON.stringify(c)).toBe(false);
  });

  it('respects the tables over ten thousand pieces', () => {
    let count = 0;
    for (let i = 0; i < 10_000; i += 1) {
      const rng = createRng(`bulk-${i}`);
      const slot = SLOTS[i % SLOTS.length] as GearSlot;
      const rarity = RARITIES[i % RARITIES.length] as Rarity;
      const stars = (i % 6) + 1;
      const p = generateGear(
        { serial: i, slot, setId: 'gear_set.warcry', rarity, stars, source: 'campaign_drop', now: 0 },
        rng,
      );
      count += 1;
      // The main stat is one the slot may carry, at the star's +0 value.
      expect(GEAR_STATS).toContain(p.mainStat);
      expect(mainOf(p).value).toBe(mainStatValue(p.mainStat, stars, 0));
      // Every substat roll sits inside its band's range, rarity multiplier included.
      for (const sub of p.subs) {
        const [min, max] = SUB_STAT_TABLE[
          sub.stat === 'hp' ? 'hpFlat' : sub.stat === 'atk' || sub.stat === 'def' ? 'atkDefFlat' : 'pct'
        ][starBand(stars)] ?? [0, 0];
        if (['hp', 'atk', 'def'].includes(sub.stat)) {
          expect(sub.value).toBeGreaterThanOrEqual(Math.round(min * SUB_ROLL_MULT[rarity]) - 1);
          expect(sub.value).toBeLessThanOrEqual(Math.round(max * SUB_ROLL_MULT[rarity]) + 1);
        }
        expect(sub.rolls).toBe(1);
      }
    }
    expect(count).toBe(10_000);
  });
});

describe('levelGear', () => {
  it('rolls a substat at +4, +8, +12 and +16 and nowhere else (GEAR.md §2)', () => {
    const rare = piece({ rarity: 'rare', stars: 5 });
    expect(rare.subs).toHaveLength(2);
    const result = levelGear(rare, GEAR_MAX_LEVEL, createRng('levels'));
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.piece.level).toBe(16);
    expect(result.value.rolls.map((r) => r.level)).toEqual([4, 8, 12, 16]);
    // Two substats at +0, two added by the first two rolls, then two upgrades.
    expect(result.value.piece.subs).toHaveLength(4);
    expect(result.value.rolls.filter((r) => r.added)).toHaveLength(2);
    expect(result.value.rolls.filter((r) => !r.added)).toHaveLength(2);
    const upgraded = result.value.piece.subs.filter((s) => s.rolls > 1);
    expect(upgraded.length).toBeGreaterThan(0);
  });

  it('never passes +16, and refuses a level it cannot give', () => {
    const maxed = levelGear(piece(), 99, createRng('max'));
    if (!maxed.ok) throw new Error('max');
    expect(maxed.value.piece.level).toBe(16);
    expect(levelGear(maxed.value.piece, 1, createRng('again')).ok).toBe(false);
  });

  it('leaves the piece it was given untouched', () => {
    const original = piece({ rarity: 'mythic' });
    const before = JSON.stringify(original);
    levelGear(original, 8, createRng('copy'));
    expect(JSON.stringify(original)).toBe(before);
  });
});

describe('set groups', () => {
  const wornOf = (setIds: string[]): GearInstance[] =>
    setIds.map((setId, i) => ({
      ...piece({ setId, slot: SLOTS[i] as GearSlot }),
      instanceId: `gear-${i}`,
      setId,
      slot: SLOTS[i] as GearSlot,
    }));
  const setById = (id: string) => GEAR_SET_BY_ID[id];

  it('stacks two-piece groups and needs four pieces for a four-piece set', () => {
    const worn = wornOf([
      'gear_set.warcry',
      'gear_set.warcry',
      'gear_set.ember_guard',
      'gear_set.ember_guard',
      'gear_set.keen_eye',
      'gear_set.keen_eye',
    ]);
    const groups = setGroups(worn, setById);
    expect(groups.map((g) => [g.set.id, g.groups])).toEqual([
      ['gear_set.ember_guard', 1],
      ['gear_set.keen_eye', 1],
      ['gear_set.warcry', 1],
    ]);
    expect(setPassives(worn, setById)).toHaveLength(3);

    const partial = wornOf(['gear_set.lifedrinker', 'gear_set.lifedrinker', 'gear_set.lifedrinker']);
    expect(setGroups(partial, setById)[0]?.groups).toBe(0);
    expect(setPassives(partial, setById)).toHaveLength(0);
  });

  it('gives a doubled two-piece set two copies of its bonus, each with its own id', () => {
    const worn = wornOf(['gear_set.warcry', 'gear_set.warcry', 'gear_set.warcry', 'gear_set.warcry']);
    const passives = setPassives(worn, setById);
    expect(passives).toHaveLength(2);
    expect(new Set(passives.map((p) => p.id)).size).toBe(2);
  });

  it('ignores a set nobody ships', () => {
    const worn = wornOf(['gear_set.nonsense', 'gear_set.nonsense']);
    expect(setGroups(worn, setById)).toEqual([]);
  });

  it('carries every shipped set’s bonus when its group is complete', () => {
    for (const set of GEAR_SETS) {
      const worn = wornOf(Array.from({ length: set.pieces }, () => set.id));
      const granted = setPassives(worn, setById).map((p) => p.id);
      for (const passive of set.passives) expect(granted).toContain(passive.id);
    }
  });
});

describe('contributions', () => {
  it('add the main stat and every substat into flat and percentage buckets', () => {
    const p = piece({ slot: 'weapon', rarity: 'common', stars: 3 });
    expect(p.subs).toHaveLength(0);
    const contribution = contributionOf(p);
    expect(contribution.flat.atk).toBe(mainStatValue('atk', 3, 0));
    expect(contribution.percent).toEqual({});
  });

  it('reads the table rows the doc states', () => {
    // A guard against a silent table edit: the 1★ and 6★ ends of every family.
    expect(MAIN_STAT_TABLE.pct[0]).toEqual([7, 13]);
    expect(MAIN_STAT_TABLE.pct[5]).toEqual([32, 60]);
    expect(MAIN_STAT_TABLE.resAcc[5]).toEqual([32, 96]);
  });
});
