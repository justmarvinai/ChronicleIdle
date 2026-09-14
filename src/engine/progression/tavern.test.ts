import { describe, expect, it } from 'vitest';
import type { AbilityDef, ChampionDef, ChampionId, Rarity } from '@content/champions/types';
import { RANK_UP_GOLD } from '@content/balance/xp';
import { allyUnit } from '@engine/battle/create';
import { emptyGear, type ChampionInstance, type Roster } from '@engine/champions/instance';
import { levelCap } from '@engine/champions/stats';
import { championXpToNext } from '@engine/champions/xp';
import {
  applyFeed,
  brewXp,
  foodXp,
  isEdible,
  levelUpGold,
  previewFeed,
  type TavernLookup,
} from './tavern-level';
import {
  applyRankUp,
  consume,
  eligibleRankFood,
  findRankFood,
  planRankUp,
  rankRequirement,
} from './tavern-rank';
import { applySkillUpgrade, maxSteps, planSkillUpgrade, skillStatuses, tomeFor } from './tavern-skills';

const STATS = { hp: 10_000, atk: 1_000, def: 900, spd: 100, critRate: 15, critDmg: 50, res: 20, acc: 0 };

const ability = (id: string, slot: 'a1' | 'a2', upgrades: number): AbilityDef => ({
  id,
  slot,
  name: `${id}.name`,
  description: `${id}.description`,
  icon: 'spell.rune_gilded_script',
  cooldown: slot === 'a1' ? 0 : 4,
  effects: [{ kind: 'damage', target: 'single_enemy', stat: 'ATK', mult: 3 }],
  upgrades: Array.from({ length: upgrades }, () => ({ type: 'damage' as const, value: 10 })),
  ai: { priority: 1 },
});

const def = (
  id: string,
  rarity: Rarity,
  element: ChampionDef['element'] = 'valor',
  abilities = [ability(`ab.${id}.strike`, 'a1', 2), ability(`ab.${id}.cleave`, 'a2', 3)],
): ChampionDef =>
  ({
    id: `champ.${id}` as ChampionId,
    name: `champ.${id}.name`,
    lore: `champ.${id}.lore`,
    rarity,
    element,
    role: 'attack',
    stats: STATS,
    art: {
      model: 'model.teritorial_lizard',
      avatar: 'avatar.teritorial_lizard',
      facing: 'left',
      tint: '#888888',
      placeholder: true,
    },
    obtain: ['summon'],
    abilities,
    version: 1,
  }) as ChampionDef;

const DEFS: Record<string, ChampionDef> = {
  'champ.hero': def('hero', 'rare', 'valor'),
  'champ.common': def('common', 'common'),
  'champ.uncommon': def('uncommon', 'uncommon'),
  'champ.epic': def('epic', 'epic'),
};

const instance = (over: Partial<ChampionInstance> & { instanceId: string }): ChampionInstance => ({
  defId: 'champ.common' as ChampionId,
  level: 1,
  xp: 0,
  stars: 1,
  skillUpgrades: {},
  gear: emptyGear(),
  locked: false,
  favourite: false,
  acquiredAt: 0,
  source: 'summon',
  ...over,
});

function lookupOf(instances: ChampionInstance[]): TavernLookup {
  const roster: Roster = Object.fromEntries(instances.map((i) => [i.instanceId, i]));
  return { roster, championById: (id) => DEFS[id] };
}

describe('brews and food', () => {
  it('pays 1.5× for the champion’s own element', () => {
    expect(brewXp('brew_valor', 'valor')).toBe(2_250);
    expect(brewXp('brew_justice', 'valor')).toBe(1_500);
    expect(brewXp('brew_universal', 'valor')).toBe(1_500);
    expect(brewXp('gold', 'valor')).toBe(0);
  });

  it('values food by rarity and level (ECONOMY.md §3.1)', () => {
    // 150 × 1 × (1 + 0.15 × 1) = 172.5 → 173
    expect(foodXp(DEFS['champ.common'] as ChampionDef, { level: 1 })).toBe(173);
    // 150 × 8 × (1 + 0.15 × 10) = 3,000
    expect(foodXp(DEFS['champ.epic'] as ChampionDef, { level: 10 })).toBe(3_000);
  });

  it('charges 50 gold per level reached', () => {
    expect(levelUpGold(1)).toBe(50);
    expect(levelUpGold(12)).toBe(600);
  });
});

describe('previewFeed', () => {
  const hero = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId, stars: 3 });

  it('turns an offering into levels and prices the action', () => {
    const food = instance({ instanceId: 'food-1', defId: 'champ.common' as ChampionId, level: 1 });
    const preview = previewFeed(hero, { brews: { brew_valor: 2 }, food: ['food-1'] }, lookupOf([hero, food]));
    if (!preview.ok) throw new Error(preview.error.message);
    expect(preview.value.xp).toBe(2 * 2_250 + 173);
    expect(preview.value.level).toBeGreaterThan(1);
    expect(preview.value.gold).toBe(levelUpGold(preview.value.level));
    expect(preview.value.food.map((f) => f.instanceId)).toEqual(['food-1']);
    expect(preview.value.wasted).toBe(0);
    expect(preview.value.atCap).toBe(false);
  });

  it('applies exactly what it previewed', () => {
    const preview = previewFeed(hero, { brews: { brew_universal: 1 }, food: [] }, lookupOf([hero]));
    if (!preview.ok) throw new Error('preview');
    const fed = applyFeed(hero, preview.value);
    expect(fed.level).toBe(preview.value.level);
    expect(fed.stars).toBe(hero.stars);
    // The XP left over is the remainder of the level it is standing on.
    expect(fed.xp).toBeLessThan(championXpToNext(fed.level));
  });

  it('reports the overflow at the star tier’s cap instead of swallowing it', () => {
    const capped = instance({
      instanceId: 'capped-1',
      defId: 'champ.hero' as ChampionId,
      stars: 1,
      level: levelCap(1),
    });
    const preview = previewFeed(capped, { brews: { brew_valor: 1 }, food: [] }, lookupOf([capped]));
    if (!preview.ok) throw new Error('preview');
    expect(preview.value.atCap).toBe(true);
    expect(preview.value.levelsGained).toBe(0);
    expect(preview.value.wasted).toBe(2_250);
    expect(applyFeed(capped, preview.value).level).toBe(levelCap(1));
  });

  it('never eats a locked or favourite champion, or the champion itself', () => {
    const hungry = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId });
    const locked = instance({ instanceId: 'locked-1', locked: true });
    const loved = instance({ instanceId: 'fav-1', favourite: true });
    const lookup = lookupOf([hungry, locked, loved]);
    expect(isEdible(locked, 'hero-1')).toBe(false);
    expect(isEdible(loved, 'hero-1')).toBe(false);
    expect(isEdible(hungry, 'hero-1')).toBe(false);
    for (const id of ['locked-1', 'fav-1', 'hero-1']) {
      const result = previewFeed(hungry, { brews: {}, food: [id] }, lookup);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe('locked');
    }
  });

  it('refuses an offering that cannot be made', () => {
    const hungry = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId });
    const food = instance({ instanceId: 'food-1' });
    const lookup = lookupOf([hungry, food]);
    expect(previewFeed(hungry, { brews: { gold: 1 }, food: [] }, lookup).ok).toBe(false);
    expect(previewFeed(hungry, { brews: {}, food: ['ghost-9'] }, lookup).ok).toBe(false);
    expect(previewFeed(hungry, { brews: {}, food: ['food-1', 'food-1'] }, lookup).ok).toBe(false);
  });
});

describe('rank-up', () => {
  it('asks for n champions of exactly n★ and the gold from the table', () => {
    expect(rankRequirement(1)).toEqual({ from: 1, to: 2, count: 1, foodStars: 1, gold: RANK_UP_GOLD[1] });
    expect(rankRequirement(5)).toEqual({ from: 5, to: 6, count: 5, foodStars: 5, gold: RANK_UP_GOLD[5] });
    expect(rankRequirement(6)).toBeNull();
  });

  it('offers only free copies at the right star tier', () => {
    const hero = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId, stars: 2 });
    const right = instance({ instanceId: 'a', stars: 2 });
    const wrong = instance({ instanceId: 'b', stars: 3 });
    const locked = instance({ instanceId: 'c', stars: 2, locked: true });
    const eligible = eligibleRankFood(hero, lookupOf([hero, right, wrong, locked]));
    expect(eligible.map((i) => i.instanceId)).toEqual(['a']);
  });

  it('suggests the cheapest food first: rarity, then level, then age', () => {
    const hero = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId, stars: 3 });
    const epic = instance({ instanceId: 'epic-1', defId: 'champ.epic' as ChampionId, stars: 3 });
    const levelled = instance({ instanceId: 'common-levelled', stars: 3, level: 9 });
    const old = instance({ instanceId: 'common-old', stars: 3, acquiredAt: 1 });
    const newer = instance({ instanceId: 'common-new', stars: 3, acquiredAt: 2 });
    const food = findRankFood(hero, lookupOf([hero, epic, levelled, old, newer]));
    expect(food.map((i) => i.instanceId)).toEqual(['common-old', 'common-new', 'common-levelled']);
  });

  it('refuses the wrong food, the wrong count and a champion at its ceiling', () => {
    const hero = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId, stars: 2 });
    const right = instance({ instanceId: 'a', stars: 2 });
    const other = instance({ instanceId: 'b', stars: 2 });
    const wrongStars = instance({ instanceId: 'c', stars: 1 });
    const lookup = lookupOf([hero, right, other, wrongStars]);
    // 2★ → 3★ asks for two champions that are exactly 2★.
    expect(planRankUp(hero, ['a', 'c'], lookup).ok).toBe(false);
    expect(planRankUp(hero, [], lookup).ok).toBe(false);
    expect(planRankUp(hero, ['a'], lookup).ok).toBe(false);
    expect(planRankUp(hero, ['a', 'a'], lookup).ok).toBe(false);
    expect(planRankUp(hero, ['a', 'b'], lookup).ok).toBe(true);

    const maxedCommon = instance({ instanceId: 'cap-1', defId: 'champ.common' as ChampionId, stars: 2 });
    const spare = instance({ instanceId: 'd', stars: 2 });
    const capped = planRankUp(maxedCommon, ['d'], lookupOf([maxedCommon, spare]));
    expect(capped.ok).toBe(false);
    if (!capped.ok) expect(capped.error.message).toContain('2★');
  });

  it('adds the star, keeps the level and eats the food', () => {
    const hero = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId, stars: 2, level: 17 });
    const food = instance({ instanceId: 'a', stars: 2 });
    const more = instance({ instanceId: 'b', stars: 2 });
    const lookup = lookupOf([hero, food, more]);
    const plan = planRankUp(hero, ['a', 'b'], lookup);
    if (!plan.ok) throw new Error(plan.error.message);
    const ranked = applyRankUp(hero, plan.value);
    expect(ranked.stars).toBe(3);
    expect(ranked.level).toBe(17);
    expect(levelCap(ranked.stars)).toBeGreaterThan(levelCap(hero.stars));
    expect(Object.keys(consume(lookup.roster, plan.value.food))).toEqual(['hero-1']);
  });
});

describe('skill upgrades', () => {
  const hero = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId });
  const heroDef = DEFS['champ.hero'] as ChampionDef;

  it('spends the tome of the champion’s rarity', () => {
    expect(tomeFor('rare')).toBe('tome_rare');
    expect(tomeFor('mythic')).toBe('tome_mythic');
    expect(tomeFor('common')).toBeNull();
  });

  it('walks each ability through its steps and then stops', () => {
    let champion = hero;
    const abilityId = heroDef.abilities[0]?.id as string;
    expect(maxSteps(heroDef.abilities[0] as never)).toBe(2);
    for (let step = 1; step <= 2; step += 1) {
      const plan = planSkillUpgrade(heroDef, champion, abilityId);
      if (!plan.ok) throw new Error(plan.error.message);
      expect(plan.value).toEqual({ abilityId, step, tome: 'tome_rare' });
      champion = applySkillUpgrade(champion, plan.value);
    }
    expect(champion.skillUpgrades[abilityId]).toBe(2);
    const spent = planSkillUpgrade(heroDef, champion, abilityId);
    expect(spent.ok).toBe(false);
    if (!spent.ok) expect(spent.error.message).toContain('fully upgraded');
  });

  it('reports the standing of every ability', () => {
    const champion = applySkillUpgrade(hero, {
      abilityId: heroDef.abilities[0]?.id as string,
      step: 1,
      tome: 'tome_rare',
    });
    const statuses = skillStatuses(heroDef, champion);
    expect(statuses).toHaveLength(2);
    expect(statuses[0]).toMatchObject({ steps: 1, max: 2, tome: 'tome_rare' });
    expect(statuses[0]?.next).toEqual({ type: 'damage', value: 10 });
    expect(statuses[1]).toMatchObject({ steps: 0, max: 3 });
  });

  it('refuses rarities with no upgrades and abilities that are not theirs', () => {
    const commonDef = DEFS['champ.common'] as ChampionDef;
    const common = instance({ instanceId: 'c-1', defId: 'champ.common' as ChampionId });
    const refused = planSkillUpgrade(commonDef, common, commonDef.abilities[0]?.id as string);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.message).toContain('no skill upgrades');
    expect(planSkillUpgrade(heroDef, hero, 'ab.nope').ok).toBe(false);
  });
});

describe('a sharpened ability reaches the battlefield', () => {
  it('fights with the step the Tavern bought, not the authored number', () => {
    const heroDef = DEFS['champ.hero'] as ChampionDef;
    const abilityId = heroDef.abilities[1]?.id as string;
    const base = instance({ instanceId: 'hero-1', defId: 'champ.hero' as ChampionId, stars: 3 });
    const sharpened = applySkillUpgrade(base, { abilityId, step: 2, tome: 'tome_rare' });

    const before = allyUnit({ instance: base, def: heroDef }, 0, true);
    const after = allyUnit({ instance: sharpened, def: heroDef }, 0, true);
    const multOf = (unit: ReturnType<typeof allyUnit>): number => {
      const ability = unit.abilities.find((a) => a.def.id === abilityId);
      const effect = ability?.def.effects[0];
      return effect && effect.kind === 'damage' ? effect.mult : 0;
    };
    // Two damage steps of +10 % each: 3 × 1.2 = 3.6.
    expect(multOf(before)).toBe(3);
    expect(multOf(after)).toBe(3.6);
  });
});
