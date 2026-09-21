import { describe, expect, it } from 'vitest';
import { RANK_UP_GOLD } from '@content/balance/xp';
import { content } from '@content/registry';
import { levelCap } from '@engine/champions/stats';
import { FixedClock } from '@engine/time/clock';
import { previewFeed } from '@engine/progression/tavern-level';
import { createGameStore } from './store';
import { tavernLookupOf } from './tavern';

const T0 = new Date(2026, 8, 12, 12, 0).getTime();

function chronicle() {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Tester');
  actions.chooseStarter('champ.ser_corvin');
  // A purse the Tavern cannot empty by accident, and brews to pour.
  actions.grantCurrency(
    [
      { currency: 'gold', amount: 500_000 },
      { currency: 'brew_valor', amount: 10 },
      { currency: 'brew_universal', amount: 10 },
      { currency: 'tome_rare', amount: 5 },
    ],
    'test',
  );
  return { clock, store, events, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof chronicle>['store']) => store.getState().save!;
const starterOf = (store: ReturnType<typeof chronicle>['store']): string =>
  Object.values(save(store).roster).find((i) => i.defId === 'champ.ser_corvin')!.instanceId;

describe('the Tavern levels a champion', () => {
  it('pours brews, eats food and charges the gold the preview promised', () => {
    const { store, actions } = chronicle();
    const hero = starterOf(store);
    const food = Object.keys(save(store).roster).filter((id) => id !== hero)[0] as string;
    const goldBefore = save(store).wallet.gold;

    const preview = previewFeed(
      save(store).roster[hero]!,
      { brews: { brew_valor: 2 }, food: [food] },
      tavernLookupOf(save(store)),
    );
    if (!preview.ok) throw new Error(preview.error.message);

    const result = actions.feedChampion(hero, { brews: { brew_valor: 2 }, food: [food] });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.level).toBe(preview.value.level);
    expect(result.value.level).toBeGreaterThan(1);
    expect(save(store).roster[hero]?.level).toBe(result.value.level);
    expect(save(store).wallet.gold).toBe(goldBefore - preview.value.gold);
    expect(save(store).wallet.brew_valor).toBe(8);
    // The food is gone from the roster and from the teams it stood on.
    expect(save(store).roster[food]).toBeUndefined();
    expect(result.value.eaten).toEqual([food]);
    expect(save(store).stats['tavern.foodEaten']).toBe(1);
  });

  it('refuses an empty table and a purse that cannot pay', () => {
    const { store, actions } = chronicle();
    const hero = starterOf(store);
    expect(actions.feedChampion(hero, { brews: {}, food: [] }).ok).toBe(false);

    store.setState((state) => {
      if (state.save) state.save.wallet.gold = 0;
      return state;
    });
    const broke = actions.feedChampion(hero, { brews: { brew_valor: 1 }, food: [] });
    expect(broke.ok).toBe(false);
    if (!broke.ok) expect(broke.error.code).toBe('insufficient_currency');
    // A refusal spends nothing at all.
    expect(save(store).wallet.brew_valor).toBe(10);
    expect(save(store).roster[hero]?.level).toBe(1);
  });

  it('never eats a locked or favourite champion', () => {
    const { store, actions } = chronicle();
    const hero = starterOf(store);
    const [locked, loved] = Object.keys(save(store).roster).filter((id) => id !== hero);
    actions.setChampionLocked(locked as string, true);
    actions.setChampionFavourite(loved as string, true);
    for (const id of [locked, loved]) {
      const refused = actions.feedChampion(hero, { brews: {}, food: [id as string] });
      expect(refused.ok).toBe(false);
      if (!refused.ok) expect(refused.error.code).toBe('locked');
    }
    expect(Object.keys(save(store).roster)).toContain(locked);
    expect(Object.keys(save(store).roster)).toContain(loved);
  });

  it('stops at the star tier’s cap and says what was wasted', () => {
    const { store, actions } = chronicle();
    const hero = starterOf(store);
    store.setState((state) => {
      const champion = state.save?.roster[hero];
      if (champion) champion.level = levelCap(champion.stars);
      return state;
    });
    const result = actions.feedChampion(hero, { brews: { brew_universal: 1 }, food: [] });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.levelsGained).toBe(0);
    expect(result.value.wasted).toBe(1_700);
    expect(save(store).roster[hero]?.level).toBe(levelCap(save(store).roster[hero]!.stars));
  });
});

describe('the Tavern ranks a champion up', () => {
  it('eats the exact food, pays the table’s gold and lights the star', () => {
    const { store, actions } = chronicle();
    const hero = starterOf(store);
    // Three more 3★ copies to feed the 3★ starter.
    const food: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const granted = actions.grantChampion('champ.reva_ashblade', 'summon', 'test');
      if (!granted.ok) throw new Error('grant');
      food.push(granted.value);
    }
    const goldBefore = save(store).wallet.gold;
    const before = save(store).roster[hero]!;
    expect(before.stars).toBe(3);

    const tooFew = actions.rankUpChampion(hero, food.slice(0, 2));
    expect(tooFew.ok).toBe(false);

    const result = actions.rankUpChampion(hero, food);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.stars).toBe(4);
    expect(save(store).roster[hero]?.stars).toBe(4);
    expect(save(store).roster[hero]?.level).toBe(before.level);
    expect(save(store).wallet.gold).toBe(goldBefore - RANK_UP_GOLD[3]);
    for (const id of food) expect(save(store).roster[id]).toBeUndefined();
    expect(save(store).stats['tavern.rankUps']).toBe(1);
  });

  it('takes the eaten champions off the teams that were using them', () => {
    const { store, actions } = chronicle();
    const hero = starterOf(store);
    const food: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const granted = actions.grantChampion('champ.reva_ashblade', 'summon', 'test');
      if (!granted.ok) throw new Error('grant');
      food.push(granted.value);
    }
    actions.saveTeamPreset('campaign', 0, [hero, food[0] as string, food[1] as string], 3);
    actions.setLastUsedTeam('campaign', [hero, food[0] as string]);

    const result = actions.rankUpChampion(hero, food);
    expect(result.ok).toBe(true);
    expect(save(store).teams.campaign.presets[0]).toEqual([hero]);
    expect(save(store).teams.campaign.lastUsed).toEqual([hero]);
  });
});

describe('the Tavern upgrades a skill', () => {
  it('spends one tome of the champion’s rarity per step and stops at the last one', () => {
    const { store, actions, events } = chronicle();
    const seen: string[] = [];
    events.on((e) => seen.push(e.type));
    const hero = starterOf(store);
    const def = content.championById('champ.ser_corvin')!;
    const ability = def.abilities[0]!;
    const steps = ability.upgrades.length;
    expect(steps).toBeGreaterThan(0);

    for (let step = 1; step <= steps; step += 1) {
      const result = actions.upgradeChampionSkill(hero, ability.id);
      if (!result.ok) throw new Error(result.error.message);
      expect(result.value.step).toBe(step);
      expect(save(store).roster[hero]?.skillUpgrades[ability.id]).toBe(step);
    }
    expect(save(store).wallet.tome_rare).toBe(5 - steps);
    expect(seen).toContain('champion.skillUpgraded');

    const spent = actions.upgradeChampionSkill(hero, ability.id);
    expect(spent.ok).toBe(false);
    expect(save(store).wallet.tome_rare).toBe(5 - steps);
  });

  it('refuses a rarity with no upgrades and an ability that is not the champion’s', () => {
    const { store, actions } = chronicle();
    const hero = starterOf(store);
    const common = Object.values(save(store).roster).find((i) => {
      const def = content.championById(i.defId);
      return def?.rarity === 'common';
    });
    expect(common).toBeDefined();
    const commonDef = content.championById(common!.defId)!;
    const refused = actions.upgradeChampionSkill(common!.instanceId, commonDef.abilities[0]!.id);
    expect(refused.ok).toBe(false);
    expect(actions.upgradeChampionSkill(hero, 'ab.nope').ok).toBe(false);
  });
});
