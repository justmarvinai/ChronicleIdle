import { describe, expect, it } from 'vitest';
import {
  MULTI_PULL,
  PRIMORDIAL_EVERY,
  ROTATION_EPOCH,
  ROTATION_MS,
  SHARD_IDS,
  SHARD_PITY,
  SHARD_RATES,
  type ShardId,
} from '@content/balance/summon';
import { BANNER_BY_ID } from '@content/banners/index';
import type { Rarity } from '@content/champions/types';
import { content } from '@content/registry';
import { TUTORIAL_SUMMON_RARITY } from '@content/balance/tutorial';
import { createRng } from '@engine/rng/rng';
import { afterPull, emptyPity, forcedRarity, mercyView, softBonusPp } from './pity';
import { isPrimordialRotation, msUntilRotation, pityRules, rotationAt, rotationIndex } from './rotation';
import { bestPull, championWeights, rarityRank, rarityWeights, summonMany, summonOne } from './summon';

const POOL = content.summonPool;
const FEATURED = BANNER_BY_ID['banner.featured'];

function pull(shard: ShardId, seed: string, counters = emptyPity(), featured: string[] = []) {
  const result = summonOne(
    {
      shard,
      rules: SHARD_PITY[shard],
      counters,
      pool: POOL,
      featured: featured as never[],
    },
    createRng(seed),
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

describe('the summon pool', () => {
  it('is everyone whose own definition allows it, and never Eldric', () => {
    expect(POOL.length).toBeGreaterThan(0);
    expect(POOL.every((def) => def.obtain.includes('summon'))).toBe(true);
    expect(POOL.map((def) => def.id)).not.toContain('champ.eldric_chronicler');
  });

  it('has somebody for every rarity every shard can roll', () => {
    for (const shard of SHARD_IDS)
      for (const rarity of Object.keys(SHARD_RATES[shard]) as Rarity[])
        expect(championWeights(POOL, rarity).length).toBeGreaterThan(0);
  });

  it('weights a featured champion twice inside its own rarity', () => {
    const epics = championWeights(POOL, 'epic', ['champ.khazgor']);
    expect(epics.find((entry) => entry.item === 'champ.khazgor')?.weight).toBe(2);
    expect(epics.find((entry) => entry.item === 'champ.maruan')?.weight).toBe(1);
    // And never outside it: a featured Legendary does not appear among the Epics.
    expect(championWeights(POOL, 'epic', ['champ.aurelia_dawnwarden'])).toEqual(
      championWeights(POOL, 'epic'),
    );
  });
});

describe('shard rates', () => {
  it('sum to 100 on every shard', () => {
    for (const shard of SHARD_IDS) {
      const total = Object.values(SHARD_RATES[shard]).reduce((sum, pp) => sum + (pp ?? 0), 0);
      expect(total).toBe(100);
    }
  });

  it('hold over a hundred thousand Ancient pulls, mercy and all', () => {
    const rng = createRng('rates:ancient');
    const counts = new Map<Rarity, number>();
    let counters = emptyPity();
    const runs = 100_000;
    for (let i = 0; i < runs; i += 1) {
      const result = summonOne({ shard: 'ancient', rules: SHARD_PITY.ancient, counters, pool: POOL }, rng);
      if (!result.ok) throw new Error(result.error.message);
      counts.set(result.value.pull.rarity, (counts.get(result.value.pull.rarity) ?? 0) + 1);
      counters = result.value.counters;
    }
    // Mercy only ever makes a shard kinder, so each rarity's share is at least its table rate,
    // and the table's own rates are the floor — never below tolerance, never wildly above.
    const share = (rarity: Rarity): number => ((counts.get(rarity) ?? 0) / runs) * 100;
    expect(share('rare')).toBeLessThan(91 + 1);
    expect(share('epic')).toBeGreaterThan(8 - 1);
    expect(share('legendary')).toBeGreaterThan(1 - 0.5);
    expect(share('legendary')).toBeLessThan(1 + 1);
    // Nothing outside the table ever comes out of it.
    expect([...counts.keys()].sort()).toEqual(['epic', 'legendary', 'rare']);
  });

  it('hold over a hundred thousand Faded pulls, which have no mercy at all', () => {
    const rng = createRng('rates:faded');
    const counts = new Map<Rarity, number>();
    const runs = 100_000;
    for (let i = 0; i < runs; i += 1) {
      const result = summonOne(
        { shard: 'faded', rules: SHARD_PITY.faded, counters: emptyPity(), pool: POOL },
        rng,
      );
      if (!result.ok) throw new Error(result.error.message);
      counts.set(result.value.pull.rarity, (counts.get(result.value.pull.rarity) ?? 0) + 1);
    }
    const share = (rarity: Rarity): number => ((counts.get(rarity) ?? 0) / runs) * 100;
    // No pity on Faded, so the shares are the table itself, within half a point.
    expect(Math.abs(share('common') - 60)).toBeLessThan(0.5);
    expect(Math.abs(share('uncommon') - 30)).toBeLessThan(0.5);
    expect(Math.abs(share('rare') - 10)).toBeLessThan(0.5);
  });

  it('spends the soft climb out of the commonest rarity, so a row still sums to 100', () => {
    const counters = { legendary: 150 };
    const weights = rarityWeights('ancient', SHARD_PITY.ancient, counters);
    const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
    expect(total).toBeCloseTo(100, 6);
    const legendary = weights.find((entry) => entry.item === 'legendary')?.weight ?? 0;
    // 50 pulls past the 100-pull mark at +1 pp each.
    expect(legendary).toBeCloseTo(1 + 50, 6);
    expect(weights.find((entry) => entry.item === 'rare')?.weight).toBeCloseTo(91 - 50, 6);
  });
});

describe('mercy', () => {
  it('guarantees an Epic within twenty Ancient pulls', () => {
    const rules = SHARD_PITY.ancient;
    expect(forcedRarity({ epic: 18 }, rules)).toBeNull();
    expect(forcedRarity({ epic: 19 }, rules)).toBe('epic');
    // And the guarantee actually lands on the pull.
    const result = pull('ancient', 'mercy:epic', { epic: 19 });
    expect(result.pull.rarity).toBe('epic');
    expect(result.pull.mercy).toBe(true);
    expect(result.counters.epic).toBe(0);
  });

  it('guarantees a Legendary within fifteen Sacred pulls', () => {
    const result = pull('sacred', 'mercy:legendary', { legendary: 14 });
    expect(result.pull.rarity).toBe('legendary');
    expect(result.counters.legendary).toBe(0);
  });

  it('guarantees a Mythic within fifty Primordial pulls, and climbs after twenty', () => {
    const rule = SHARD_PITY.primordial[0];
    if (!rule) throw new Error('no primordial rule');
    expect(softBonusPp({ mythic: 20 }, rule)).toBe(0);
    expect(softBonusPp({ mythic: 30 }, rule)).toBeCloseTo(5, 6);
    const result = pull('primordial', 'mercy:mythic', { mythic: 49 });
    expect(result.pull.rarity).toBe('mythic');
  });

  it('never goes a hundred Ancient pulls without an Epic, over ten thousand of them', () => {
    const rng = createRng('mercy:streaks');
    let counters = emptyPity();
    let worstEpicGap = 0;
    for (let i = 0; i < 10_000; i += 1) {
      const result = summonOne({ shard: 'ancient', rules: SHARD_PITY.ancient, counters, pool: POOL }, rng);
      if (!result.ok) throw new Error(result.error.message);
      counters = result.value.counters;
      worstEpicGap = Math.max(worstEpicGap, counters.epic ?? 0);
    }
    // The hard guarantee is 20, so the counter can never reach it.
    expect(worstEpicGap).toBeLessThan(20);
  });

  it('lets a rarer pull satisfy a commoner mercy', () => {
    const next = afterPull({ epic: 11, legendary: 40 }, SHARD_PITY.ancient, 'legendary', rarityRank);
    expect(next.legendary).toBe(0);
    expect(next.epic).toBe(0);
    // But not the other way round: an Epic does not reset the Legendary count.
    const other = afterPull({ epic: 11, legendary: 40 }, SHARD_PITY.ancient, 'epic', rarityRank);
    expect(other.epic).toBe(0);
    expect(other.legendary).toBe(41);
  });

  it('quotes the player the same numbers it rolls with', () => {
    const view = mercyView({ epic: 7, legendary: 120 }, SHARD_PITY.ancient);
    expect(view.find((row) => row.rarity === 'epic')?.within).toBe(13);
    expect(view.find((row) => row.rarity === 'legendary')?.bonusPp).toBeCloseTo(20, 6);
    expect(mercyView(emptyPity(), SHARD_PITY.faded)).toEqual([]);
  });
});

describe('a ten-pull', () => {
  it('carries its counters through, so it can trip its own mercy', () => {
    const rng = createRng('ten');
    const result = summonMany(
      { shard: 'ancient', rules: SHARD_PITY.ancient, counters: { epic: 15 }, pool: POOL },
      MULTI_PULL,
      rng,
    );
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.pulls).toHaveLength(10);
    // The Epic mercy was owed within five, so one of the ten is an Epic or better.
    expect(result.value.pulls.some((one) => rarityRank(one.rarity) >= rarityRank('epic'))).toBe(true);
  });

  it('replays exactly from its seed', () => {
    const once = summonMany(
      { shard: 'sacred', rules: SHARD_PITY.sacred, counters: emptyPity(), pool: POOL },
      MULTI_PULL,
      createRng('same'),
    );
    const twice = summonMany(
      { shard: 'sacred', rules: SHARD_PITY.sacred, counters: emptyPity(), pool: POOL },
      MULTI_PULL,
      createRng('same'),
    );
    expect(once).toEqual(twice);
  });

  it('names its best pull', () => {
    const pulls = [
      { championId: 'champ.gil_scrapper', rarity: 'common', mercy: false, featured: false },
      { championId: 'champ.khazgor', rarity: 'epic', mercy: false, featured: false },
      { championId: 'champ.tobbe_pikeman', rarity: 'uncommon', mercy: false, featured: false },
    ] as const;
    expect(bestPull(pulls)?.championId).toBe('champ.khazgor');
    expect(bestPull([])).toBeNull();
  });
});

describe('a rarity floor', () => {
  it('lifts a pull that fell short and leaves a better one alone (TUTORIAL.md 3.2)', () => {
    // A hundred Faded shards: the floor is the only reason any of them is an Epic.
    for (let seed = 0; seed < 100; seed += 1) {
      const floored = summonOne(
        {
          shard: 'faded',
          rules: SHARD_PITY.faded,
          counters: emptyPity(),
          pool: POOL,
          floor: TUTORIAL_SUMMON_RARITY,
        },
        createRng(`floor-${seed}`),
      );
      if (!floored.ok) throw new Error(floored.error.message);
      expect(rarityRank(floored.value.pull.rarity)).toBeGreaterThanOrEqual(
        rarityRank(TUTORIAL_SUMMON_RARITY),
      );
      // The champion is one of that rarity, and the floor is not dressed up as mercy.
      const def = POOL.find((one) => one.id === floored.value.pull.championId);
      expect(def?.rarity).toBe(floored.value.pull.rarity);
      if (floored.value.pull.rarity === TUTORIAL_SUMMON_RARITY) expect(floored.value.pull.mercy).toBe(false);
    }
  });

  it('takes the same roll either way, so the stream is unchanged', () => {
    // The floor replaces the rarity *after* the roll, so what the next pull sees is identical.
    const withFloor = summonMany(
      {
        shard: 'ancient',
        rules: SHARD_PITY.ancient,
        counters: emptyPity(),
        pool: POOL,
        floor: TUTORIAL_SUMMON_RARITY,
      },
      2,
      createRng('stream'),
    );
    const without = summonMany(
      { shard: 'ancient', rules: SHARD_PITY.ancient, counters: emptyPity(), pool: POOL },
      2,
      createRng('stream'),
    );
    if (!withFloor.ok || !without.ok) throw new Error('rolls failed');
    // Pull 2 is rolled from the same point in the stream in both runs…
    const floorRanks = withFloor.value.pulls.map((one) => rarityRank(one.rarity));
    const plainRanks = without.value.pulls.map((one) => rarityRank(one.rarity));
    expect(floorRanks.every((rank, index) => rank >= (plainRanks[index] ?? 0))).toBe(true);
    expect(withFloor.value.pulls).toHaveLength(without.value.pulls.length);
  });
});

describe('the featured rotation', () => {
  it('turns every fourteen days from the epoch, and never before it', () => {
    expect(rotationIndex(ROTATION_EPOCH)).toBe(0);
    expect(rotationIndex(ROTATION_EPOCH - 10 * ROTATION_MS)).toBe(0);
    expect(rotationIndex(ROTATION_EPOCH + ROTATION_MS - 1)).toBe(0);
    expect(rotationIndex(ROTATION_EPOCH + ROTATION_MS)).toBe(1);
    expect(rotationIndex(ROTATION_EPOCH + 9 * ROTATION_MS + 5)).toBe(9);
  });

  it('is the same rotation for the same instant in any time zone', () => {
    // The index is computed from a UTC epoch and an absolute instant, so the only way it could
    // differ is if something local crept in. Same millisecond, same answer, whatever TZ says.
    const instant = Date.UTC(2026, 5, 17, 23, 30);
    const zones = ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Kiritimati'];
    const seen = new Set<number>();
    const original = process.env.TZ;
    try {
      for (const tz of zones) {
        process.env.TZ = tz;
        seen.add(rotationIndex(instant));
      }
    } finally {
      process.env.TZ = original;
    }
    expect(seen.size).toBe(1);
  });

  it('features a Legendary and two Epics, and a Mythic every fourth turn', () => {
    if (!FEATURED) throw new Error('no featured banner');
    for (let index = 0; index < 12; index += 1) {
      const view = rotationAt(FEATURED, ROTATION_EPOCH + index * ROTATION_MS);
      if (!view) throw new Error('no rotation');
      expect(view.index).toBe(index);
      expect(view.number).toBe(index + 1);
      expect(view.rotation.epics).toHaveLength(2);
      expect(content.championById(view.rotation.legendary)?.rarity).toBe('legendary');
      expect(view.primordial).toBe(isPrimordialRotation(index));
      if (view.primordial && view.rotation.mythic) expect(view.featured).toContain(view.rotation.mythic);
      expect(view.featured).toContain(view.rotation.legendary);
    }
    expect(isPrimordialRotation(PRIMORDIAL_EVERY - 1)).toBe(true);
    expect(isPrimordialRotation(0)).toBe(false);
  });

  it('cycles when it runs out of authored rotations', () => {
    if (!FEATURED) throw new Error('no featured banner');
    const rotations = FEATURED.rotations ?? [];
    const first = rotationAt(FEATURED, ROTATION_EPOCH);
    const wrapped = rotationAt(FEATURED, ROTATION_EPOCH + rotations.length * ROTATION_MS);
    expect(wrapped?.rotation).toEqual(first?.rotation);
  });

  it('counts down to the turn', () => {
    const now = ROTATION_EPOCH + ROTATION_MS + 1_000;
    expect(msUntilRotation(now)).toBe(ROTATION_MS - 1_000);
  });

  it('hurries the Mythic mercy on a Primordial Rotation, and only there', () => {
    const hurried = pityRules('primordial', true).find((rule) => rule.rarity === 'mythic');
    const normal = pityRules('primordial', false).find((rule) => rule.rarity === 'mythic');
    expect(hurried?.after).toBe(10);
    expect(hurried?.stepPp).toBe(1);
    expect(normal?.after).toBe(20);
    // Other shards are untouched by the rotation.
    expect(pityRules('ancient', true)).toEqual(SHARD_PITY.ancient);
  });
});
