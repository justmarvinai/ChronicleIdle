import { describe, expect, it } from 'vitest';
import { CRAFT_TIER, type CraftTier } from '@content/balance/forge';
import { DISMANTLE_GOLD_REFUND, GEAR_MAX_STARS, REFINE_GOLD, refineCores } from '@content/balance/gear';
import { content } from '@content/registry';
import { createRng } from '@engine/rng/rng';
import { generateGear } from '@engine/gear/generate';
import type { GearInstance } from '@engine/gear/instance';
import { mainStatValue } from '@engine/gear/stats';
import { craftCost, craftGear } from './craft';
import { dismantleRefusal, pieceYield, planDismantle } from './dismantle';
import { canSacrifice, planRefine, refineCost } from './refine';

const T0 = Date.UTC(2026, 8, 14);
const TWO_PIECE = content.gearSets.filter((s) => s.pieces === 2).map((s) => s.id);
const EVERY_SET = content.gearSets.map((s) => s.id);

function poolFor(tier: CraftTier): string[] {
  return CRAFT_TIER[tier].setPool === 'two' ? TWO_PIECE : EVERY_SET;
}

function craft(tier: CraftTier, serial: number, seed = `craft-${serial}`): GearInstance {
  const result = craftGear(
    { tier, slot: 'weapon', pool: poolFor(tier), serial, now: T0 + serial },
    createRng(seed),
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function piece(patch: Partial<GearInstance> = {}, serial = 1): GearInstance {
  const rolled = generateGear(
    {
      serial,
      slot: 'helmet',
      setId: 'gear_set.ember_guard',
      rarity: 'rare',
      stars: 3,
      source: 'campaign_drop',
      now: T0,
    },
    createRng(`piece-${serial}`),
  );
  return { ...rolled, ...patch };
}

describe('crafting', () => {
  it('asks for exactly the materials and gold the doc lists', () => {
    expect(craftCost('scrap', false)).toEqual([
      { currency: 'mat_scrap_iron', amount: 20 },
      { currency: 'mat_arcane_dust', amount: 5 },
      { currency: 'gold', amount: 2_000 },
    ]);
    expect(craftCost('ember', false)).toEqual([
      { currency: 'mat_ember_alloy', amount: 15 },
      { currency: 'mat_arcane_dust', amount: 10 },
      { currency: 'gold', amount: 12_000 },
    ]);
    expect(craftCost('star', false)).toEqual([
      { currency: 'mat_starsteel', amount: 10 },
      { currency: 'mat_arcane_dust', amount: 20 },
      { currency: 'gold', amount: 60_000 },
    ]);
    // Naming the set costs one Glyph Sigil on top, whatever the tier.
    expect(craftCost('scrap', true)).toContainEqual({ currency: 'mat_glyph_sigil', amount: 1 });
    expect(craftCost('star', true)).toContainEqual({ currency: 'mat_glyph_sigil', amount: 1 });
  });

  it('rolls a piece of the slot it was asked for, from the tier’s pool', () => {
    const one = craft('scrap', 1);
    expect(one.slot).toBe('weapon');
    expect(one.level).toBe(0);
    expect(one.equippedTo).toBeNull();
    expect(one.source).toBe('craft');
    expect(TWO_PIECE).toContain(one.setId);
  });

  it('honours a Sigil’s choice, and refuses a set the tier does not carry', () => {
    const chosen = craftGear(
      {
        tier: 'scrap',
        slot: 'boots',
        setId: 'gear_set.swiftfoot',
        pool: TWO_PIECE,
        serial: 2,
        now: T0,
      },
      createRng('sigil'),
    );
    if (!chosen.ok) throw new Error(chosen.error.message);
    expect(chosen.value.setId).toBe('gear_set.swiftfoot');

    // Lifedrinker is a four-piece set: Tier I's pool is the two-piece sets only.
    const refused = craftGear(
      {
        tier: 'scrap',
        slot: 'boots',
        setId: 'gear_set.lifedrinker',
        pool: TWO_PIECE,
        serial: 3,
        now: T0,
      },
      createRng('sigil'),
    );
    expect(refused.ok).toBe(false);
  });

  it('replays exactly from its seed', () => {
    const a = craft('ember', 4, 'same');
    const b = craft('ember', 4, 'same');
    expect(a).toEqual(b);
  });

  it('keeps every tier inside its rarity and star bands over ten thousand crafts', () => {
    for (const tier of ['scrap', 'ember', 'star'] as const) {
      const def = CRAFT_TIER[tier];
      const rarities = new Map<string, number>();
      const stars = new Map<number, number>();
      const rng = createRng(`bulk-${tier}`);
      const pool = poolFor(tier);
      for (let i = 0; i < 10_000; i += 1) {
        const result = craftGear({ tier, slot: 'shield', pool, serial: i + 1, now: T0 }, rng);
        if (!result.ok) throw new Error(result.error.message);
        const made = result.value;
        rarities.set(made.rarity, (rarities.get(made.rarity) ?? 0) + 1);
        stars.set(made.stars, (stars.get(made.stars) ?? 0) + 1);
        expect(pool).toContain(made.setId);
      }
      // Nothing outside the table, and every listed row actually appears.
      expect([...rarities.keys()].sort()).toEqual(Object.keys(def.rarity).sort());
      expect([...stars.keys()].sort((a, b) => a - b)).toEqual(
        Object.keys(def.stars)
          .map(Number)
          .sort((a, b) => a - b),
      );
      // And the weights hold: each share is within 3 points of the table's percentage.
      const rarityTotal = [...Object.values(def.rarity)].reduce((sum, w) => sum + (w ?? 0), 0);
      for (const [rarity, weight] of Object.entries(def.rarity)) {
        const share = ((rarities.get(rarity) ?? 0) / 10_000) * 100;
        expect(Math.abs(share - ((weight ?? 0) / rarityTotal) * 100)).toBeLessThan(3);
      }
      const starTotal = Object.values(def.stars).reduce((sum, w) => sum + w, 0);
      for (const [star, weight] of Object.entries(def.stars)) {
        const share = ((stars.get(Number(star)) ?? 0) / 10_000) * 100;
        expect(Math.abs(share - (weight / starTotal) * 100)).toBeLessThan(3);
      }
    }
  });
});

describe('dismantling', () => {
  it('returns the materials the rarity table lists', () => {
    expect(pieceYield(piece({ rarity: 'common' }), 0).materials).toEqual([
      { currency: 'mat_scrap_iron', amount: 2 },
    ]);
    expect(pieceYield(piece({ rarity: 'mythic' }), 0).materials).toEqual([
      { currency: 'mat_starsteel', amount: 6 },
      { currency: 'mat_arcane_dust', amount: 10 },
      { currency: 'mat_refining_core', amount: 2 },
    ]);
  });

  it('gives back a fifth of the gold the levels cost', () => {
    const { goldRefund } = pieceYield(piece({ level: 8 }), 10_000);
    expect(goldRefund).toBe(Math.floor(10_000 * DISMANTLE_GOLD_REFUND));
  });

  it('merges a selection’s yield and adds the refund as gold', () => {
    const plan = planDismantle([piece({ rarity: 'rare' }, 1), piece({ rarity: 'rare' }, 2)], () => 1_000);
    if (!plan.ok) throw new Error(plan.error.message);
    expect(plan.value.yield).toEqual([
      { currency: 'gold', amount: 400 },
      { currency: 'mat_arcane_dust', amount: 4 },
      { currency: 'mat_scrap_iron', amount: 12 },
    ]);
    expect(plan.value.goldRefund).toBe(400);
  });

  it('never breaks a worn or locked piece, and refuses the whole selection if one is', () => {
    expect(dismantleRefusal(piece({ locked: true }))).toBe('locked');
    expect(dismantleRefusal(piece({ equippedTo: 'champion-1' }))).toBe('worn');
    expect(dismantleRefusal(piece())).toBeNull();
    const plan = planDismantle([piece({}, 1), piece({ locked: true }, 2)], () => 0);
    expect(plan.ok).toBe(false);
    if (!plan.ok) expect(plan.error.code).toBe('locked');
    expect(planDismantle([], () => 0).ok).toBe(false);
  });
});

describe('refining', () => {
  it('asks for n + 1 cores and the star’s gold', () => {
    for (const stars of [1, 2, 3, 4, 5]) {
      const cost = refineCost(stars);
      expect(cost.cores).toBe(refineCores(stars));
      expect(cost.gold).toBe(REFINE_GOLD[stars]);
      expect(cost.amounts).toEqual([
        { currency: 'mat_refining_core', amount: stars + 1 },
        { currency: 'gold', amount: REFINE_GOLD[stars] },
      ]);
    }
  });

  it('keeps rarity, level and substats, and re-bases the main stat', () => {
    const target = piece({ level: 12 }, 10);
    const twin = piece({}, 11);
    const plan = planRefine(target, twin);
    if (!plan.ok) throw new Error(plan.error.message);
    const { result } = plan.value;
    expect(result.stars).toBe(target.stars + 1);
    expect(result.rarity).toBe(target.rarity);
    expect(result.level).toBe(target.level);
    expect(result.subs).toEqual(target.subs);
    expect(result.instanceId).toBe(target.instanceId);
    // The main stat follows the new star's row, so it climbs.
    expect(plan.value.mainAfter).toBe(mainStatValue(result.mainStat, result.stars, result.level));
    expect(plan.value.mainAfter).toBeGreaterThan(plan.value.mainBefore);
    // A refined piece is weaker than a native drop of that star, which is the point (GEAR.md §4).
    const native = generateGear(
      {
        serial: 99,
        slot: target.slot,
        setId: target.setId,
        rarity: target.rarity,
        stars: result.stars,
        source: 'campaign_drop',
        now: T0,
        level: target.level,
      },
      createRng('native'),
    );
    expect(plan.value.mainAfter).toBe(mainStatValue(native.mainStat, native.stars, native.level));
  });

  it('refuses a sacrifice of the wrong slot, star, or standing', () => {
    const target = piece({}, 20);
    expect(planRefine(target, piece({ slot: 'boots' }, 21)).ok).toBe(false);
    expect(planRefine(target, piece({ stars: 4 }, 22)).ok).toBe(false);
    expect(planRefine(target, piece({ locked: true }, 23)).ok).toBe(false);
    expect(planRefine(target, piece({ equippedTo: 'champion-1' }, 24)).ok).toBe(false);
    expect(planRefine(target, target).ok).toBe(false);
    expect(planRefine(piece({ stars: GEAR_MAX_STARS }, 25), piece({ stars: GEAR_MAX_STARS }, 26)).ok).toBe(
      false,
    );
    expect(planRefine(piece({ locked: true }, 27), piece({}, 28)).ok).toBe(false);
  });

  it('agrees with `canSacrifice` about who may be spent', () => {
    const target = piece({}, 30);
    expect(canSacrifice(target, piece({}, 31))).toBe(true);
    expect(canSacrifice(target, target)).toBe(false);
    expect(canSacrifice(target, piece({ stars: 5 }, 32))).toBe(false);
    expect(canSacrifice(target, piece({ locked: true }, 33))).toBe(false);
  });

  it('lets a worn piece climb, since taking it off would be busywork', () => {
    const worn = piece({ equippedTo: 'champion-1' }, 40);
    expect(planRefine(worn, piece({}, 41)).ok).toBe(true);
  });
});
