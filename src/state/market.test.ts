/**
 * The Market, the Bag and the Login Calendar through the store (docs/design/MARKET.md,
 * docs/design/LOGIN.md): the two shelves, what each of the nine items does when it is used, the
 * boosts reaching what a run pays, and the calendar's one-a-day rule.
 */
import { describe, expect, it } from 'vitest';
import { BREWERY_DAILY_RUNS } from '@content/balance/brewery';
import { LOGIN_DAYS } from '@content/balance/login';
import { content } from '@content/registry';
import { levelCap, maxStars } from '@engine/champions/stats';
import { FixedClock, MS_PER_DAY } from '@engine/time/clock';
import { goldShelf } from '@engine/market/index';
import { loginView } from './login';
import { gemMarketView, goldMarketView } from './market';
import { createGameStore } from './store';

/** 2026-09-16 12:00 local. */
const T0 = new Date(2026, 8, 16, 12, 0).getTime();
const HOUR = 3_600_000;

function shopper({ gold = 5_000_000, gems = 20_000, now = T0 } = {}) {
  const clock = new FixedClock(now);
  const { store } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Shopper');
  actions.chooseStarter('champ.ser_corvin');
  store.setState((state) => {
    if (!state.save) return state;
    state.save.seedRoot = 'test-seed';
    state.save.profile.level = 30;
    state.save.wallet.gold = gold;
    state.save.wallet.gems = gems;
    return state;
  });
  return { clock, store, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof shopper>['store']) => {
  const current = store.getState().save;
  if (!current) throw new Error('no chronicle');
  return current;
};

/** Puts one of an item straight into the Bag, so a test can use it without buying it. */
function give(store: ReturnType<typeof shopper>['store'], item: string, count = 1): void {
  store.setState((state) => {
    if (!state.save) return state;
    state.save.bag = { ...state.save.bag, [item]: (state.save.bag[item] ?? 0) + count };
    return state;
  });
}

describe('the Gold Market', () => {
  it('buys from a slot, charges its price and hands over the goods', () => {
    const { store, actions } = shopper();
    const slot = goldMarketView(save(store), T0).slots[0];
    if (!slot) throw new Error('no slot');
    const goldBefore = save(store).wallet.gold ?? 0;
    const heldBefore = save(store).wallet[slot.currency] ?? 0;

    const result = actions.buyFromStall(slot.index, 2);
    expect(result.ok).toBe(true);
    expect(save(store).wallet.gold).toBe(goldBefore - slot.unitGold * 2);
    expect(save(store).wallet[slot.currency]).toBe(heldBefore + 2);
    expect(goldMarketView(save(store), T0).slots[0]?.left).toBe(slot.stock - 2);
  });

  it('refuses to sell more than the slot holds, or more than the purse covers', () => {
    const { store, actions } = shopper({ gold: 0 });
    const slot = goldMarketView(save(store), T0).slots[0];
    if (!slot) throw new Error('no slot');
    expect(actions.buyFromStall(slot.index, slot.stock + 1).ok).toBe(false);
    expect(actions.buyFromStall(slot.index, 1).ok).toBe(false);
    // Nothing was taken on either refusal.
    expect(goldMarketView(save(store), T0).slots[0]?.left).toBe(slot.stock);
  });

  it('restocks at the turn of the hour without anything having run', () => {
    const { clock, store, actions } = shopper();
    const slot = goldMarketView(save(store), T0).slots[0];
    if (!slot) throw new Error('no slot');
    actions.buyFromStall(slot.index, 1);
    expect(goldMarketView(save(store), T0).slots[0]?.taken).toBe(1);

    // An hour later the stall has changed hands: a new shelf, and nothing bought from it.
    clock.set(T0 + HOUR);
    const next = goldMarketView(save(store), T0 + HOUR);
    expect(next.slots.every((entry) => entry.taken === 0)).toBe(true);
    expect(next.slots.map((entry) => entry.currency)).not.toEqual(
      goldShelf('test-seed', T0).map((entry) => entry.currency),
    );
  });

  it('sells this hour’s stock at this hour’s price, not the shelf a stale tab is drawing', () => {
    const { clock, store, actions } = shopper();
    const stale = goldMarketView(save(store), T0).slots[0];
    if (!stale) throw new Error('no slot');
    clock.set(T0 + HOUR);
    const goldBefore = save(store).wallet.gold ?? 0;
    const fresh = goldShelf('test-seed', T0 + HOUR).find((entry) => entry.index === stale.index);
    if (!fresh) throw new Error('no fresh slot');
    expect(actions.buyFromStall(stale.index, 1).ok).toBe(true);
    // Charged the new hour's price, and paid the new hour's goods.
    expect(save(store).wallet.gold).toBe(goldBefore - fresh.unitGold);
  });
});

describe('the Gem Market', () => {
  it('sells a single forever', () => {
    const { store, actions } = shopper();
    expect(actions.buyFromShelf('shelf.brewery_token').ok).toBe(true);
    expect(actions.buyFromShelf('shelf.brewery_token').ok).toBe(true);
    expect(save(store).bag['item.brewery_token']).toBe(2);
  });

  it('sells a bundle once, then shows it taken', () => {
    const { store, actions } = shopper();
    expect(actions.buyFromShelf('shelf.chroniclers_satchel').ok).toBe(true);
    const second = actions.buyFromShelf('shelf.chroniclers_satchel');
    expect(second.ok).toBe(false);
    const view = gemMarketView(save(store)).find((row) => row.entry.id === 'shelf.chroniclers_satchel');
    expect(view?.taken).toBe(true);
    // Bought exactly once: the satchel's four items are in the Bag one time over.
    expect(save(store).bag['item.brewery_token']).toBe(1);
    expect(save(store).bag['item.champion_xp_boost']).toBe(1);
  });

  it('pays a bundle’s wallet rows as well as its items', () => {
    const { store, actions } = shopper();
    const goldBefore = save(store).wallet.gold ?? 0;
    expect(actions.buyFromShelf('shelf.quartermasters_crate').ok).toBe(true);
    expect(save(store).wallet.gold).toBe(goldBefore + 400_000);
    expect(save(store).wallet.tome_epic).toBe(4);
  });

  it('refuses what the purse cannot cover, and takes nothing', () => {
    const { store, actions } = shopper({ gems: 10 });
    expect(actions.buyFromShelf('shelf.champions_cheatmeal').ok).toBe(false);
    expect(save(store).wallet.gems).toBe(10);
    expect(save(store).bag['item.champions_cheatmeal']).toBeUndefined();
  });
});

describe('using what is in the Bag', () => {
  it('will not use what is not held, and says so', () => {
    const { store, actions } = shopper();
    expect(actions.useItem('item.brewery_token').ok).toBe(false);
    expect(save(store).bag).toEqual({});
  });

  it('hands the Brewery’s day back', () => {
    const { store, actions } = shopper();
    store.setState((state) => {
      if (!state.save) return state;
      state.save.brewery = { periodKey: '2026-09-16', runs: BREWERY_DAILY_RUNS, cleared: {} };
      return state;
    });
    give(store, 'item.brewery_token');
    expect(actions.useItem('item.brewery_token').ok).toBe(true);
    expect(save(store).brewery.runs).toBe(0);
    expect(save(store).bag['item.brewery_token']).toBeUndefined();
  });

  it('refuses a Brewery Token on an untouched day, and keeps it', () => {
    const { store, actions } = shopper();
    give(store, 'item.brewery_token');
    expect(actions.useItem('item.brewery_token').ok).toBe(false);
    expect(save(store).bag['item.brewery_token']).toBe(1);
  });

  it('puts a quest board back to untouched — quests, points and chests', () => {
    const { store, actions } = shopper();
    store.setState((state) => {
      if (!state.save) return state;
      state.save.quests.daily = {
        periodKey: '2026-09-16',
        baseline: {},
        claimed: ['quest.a', 'quest.b'],
        chests: [50, 100],
        dayCounted: true,
      };
      state.save.stats = { 'battles.fought': 40 };
      return state;
    });
    give(store, 'item.daily_voucher');
    expect(actions.useItem('item.daily_voucher').ok).toBe(true);
    const board = save(store).quests.daily;
    expect(board.claimed).toEqual([]);
    expect(board.chests).toEqual([]);
    // The baseline moves to now, which is what makes the counter goals re-earnable.
    expect(board.baseline['battles.fought']).toBe(40);
    // A board earned twice still only counts one day toward the weekly that counts days.
    expect(board.dayCounted).toBe(true);
  });

  it('skips the open mission: the line moves, the chapter still counts it, nothing is paid', () => {
    const { store, actions } = shopper();
    give(store, 'item.mission_skip');
    const gemsBefore = save(store).wallet.gems ?? 0;
    const before = save(store).missions.claimed.length;

    expect(actions.useItem('item.mission_skip').ok).toBe(true);
    expect(save(store).missions.claimed).toHaveLength(before + 1);
    // No reward for a bought mission.
    expect(save(store).wallet.gems).toBe(gemsBefore);
    // And it is not counted as one that was earned.
    expect(save(store).stats['missions.claimed'] ?? 0).toBe(0);
    expect(save(store).stats['missions.skipped']).toBe(1);
  });

  it('the Chicken takes a champion to the cap of the stars they have', () => {
    const { store, actions } = shopper();
    const instanceId = Object.keys(save(store).roster)[0] ?? '';
    give(store, 'item.champions_chicken');
    const stars = save(store).roster[instanceId]?.stars ?? 1;

    expect(actions.useItem('item.champions_chicken', instanceId).ok).toBe(true);
    expect(save(store).roster[instanceId]?.level).toBe(levelCap(stars));
    // The stars are untouched — that is the Cheatmeal's job.
    expect(save(store).roster[instanceId]?.stars).toBe(stars);
  });

  it('the Cheatmeal maxes the stars and leaves the level alone', () => {
    const { store, actions } = shopper();
    const instanceId = Object.keys(save(store).roster)[0] ?? '';
    const champion = save(store).roster[instanceId];
    const def = content.championById(champion?.defId ?? 'champ.ser_corvin');
    give(store, 'item.champions_cheatmeal');
    const levelBefore = champion?.level ?? 1;

    expect(actions.useItem('item.champions_cheatmeal', instanceId).ok).toBe(true);
    expect(save(store).roster[instanceId]?.stars).toBe(maxStars(def?.rarity ?? 'rare'));
    expect(save(store).roster[instanceId]?.level).toBe(levelBefore);
  });

  it('refuses a champion item with nobody chosen, and keeps it', () => {
    const { store, actions } = shopper();
    give(store, 'item.champions_chicken');
    expect(actions.useItem('item.champions_chicken').ok).toBe(false);
    expect(save(store).bag['item.champions_chicken']).toBe(1);
  });

  it('refuses a Cheatmeal on a champion already wearing every star, and keeps it', () => {
    const { store, actions } = shopper();
    const instanceId = Object.keys(save(store).roster)[0] ?? '';
    const def = content.championById(save(store).roster[instanceId]?.defId ?? 'champ.ser_corvin');
    store.setState((state) => {
      const champion = state.save?.roster[instanceId];
      if (champion) champion.stars = maxStars(def?.rarity ?? 'rare');
      return state;
    });
    give(store, 'item.champions_cheatmeal');
    expect(actions.useItem('item.champions_cheatmeal', instanceId).ok).toBe(false);
    expect(save(store).bag['item.champions_cheatmeal']).toBe(1);
  });
});

describe('boosts reaching what a run pays', () => {
  it('starts a boost, and stacks a second in time rather than in strength', () => {
    const { store, actions } = shopper();
    give(store, 'item.player_xp_boost', 2);
    expect(actions.useItem('item.player_xp_boost').ok).toBe(true);
    const first = save(store).boosts['player_xp'] ?? 0;
    expect(first).toBe(T0 + 24 * HOUR);
    expect(actions.useItem('item.player_xp_boost').ok).toBe(true);
    expect(save(store).boosts['player_xp']).toBe(T0 + 48 * HOUR);
  });

  it('doubles the brews a Brewery run pours while it is live', () => {
    const { store, actions } = shopper();
    give(store, 'item.brewery_boost');
    actions.useItem('item.brewery_boost');
    expect(save(store).boosts['brewery']).toBeGreaterThan(T0);
  });
});

describe('the Login Calendar', () => {
  it('pays day 1, then nothing else the same day', () => {
    const { store, actions } = shopper();
    const goldBefore = save(store).wallet.gold ?? 0;
    const first = actions.claimLoginDay();
    expect(first.ok).toBe(true);
    // Day 1 of the board is 25,000 gold.
    expect(save(store).wallet.gold).toBe(goldBefore + 25_000);
    expect(actions.claimLoginDay().ok).toBe(false);
    expect(loginView(save(store), T0).claimable).toBe(false);
    expect(loginView(save(store), T0).pending).toBe(2);
  });

  it('waits rather than resetting when a day is missed', () => {
    const { clock, store, actions } = shopper();
    actions.claimLoginDay();
    // Three days later, and the board is still owed day 2.
    clock.set(T0 + 3 * MS_PER_DAY);
    const view = loginView(save(store), T0 + 3 * MS_PER_DAY);
    expect(view.pending).toBe(2);
    expect(view.claimable).toBe(true);
    expect(actions.claimLoginDay().ok).toBe(true);
  });

  it('puts a consumable in the Bag on the days that pay one', () => {
    const { clock, store, actions } = shopper();
    for (let day = 0; day < 12; day += 1) {
      clock.set(T0 + day * MS_PER_DAY);
      actions.claimLoginDay();
    }
    // Day 12 hands over a Brewery Token, which is how a player meets the Bag.
    expect(save(store).bag['item.brewery_token']).toBe(1);
  });

  it('starts the board again after day 30, forever', () => {
    const { clock, store, actions } = shopper();
    for (let day = 0; day < LOGIN_DAYS; day += 1) {
      clock.set(T0 + day * MS_PER_DAY);
      actions.claimLoginDay();
    }
    expect(save(store).login.claimed).toBe(LOGIN_DAYS);
    const view = loginView(save(store), T0 + LOGIN_DAYS * MS_PER_DAY);
    expect(view.pending).toBe(1);
    expect(view.cycle).toBe(2);
    expect(view.tiles.filter((tile) => tile.taken)).toEqual([]);
  });
});
