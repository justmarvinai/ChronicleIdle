import { describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, MULTI_PULL, SHARD_EXCHANGE, SHARD_IDS, SHARD_PITY } from '@content/balance/summon';
import { SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT, CHAMPION_CHOICES } from '@content/balance/campaign';
import { content } from '@content/registry';
import { progressKey, stageIdOf } from '@engine/campaign/progress';
import { FixedClock } from '@engine/time/clock';
import { createGameStore } from './store';
import { choiceCandidates, copiesOf, mercyOf, openChampionChoices } from './summon';

/** 2026-09-14 12:00 local — rotation 19 of the featured wheel, not a Primordial one. */
const T0 = new Date(2026, 8, 14, 12, 0).getTime();

/** A chronicle with a purse of shards, so affordability is never the thing being tested. */
function chronicle(shards = 400) {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Caller');
  actions.chooseStarter('champ.ser_corvin');
  actions.grantCurrency(
    [
      { currency: 'gold', amount: 1_000_000 },
      { currency: 'gems', amount: 100_000 },
      ...SHARD_IDS.map((shard) => ({ currency: `shard_${shard}` as const, amount: shards })),
    ],
    'test',
  );
  return { clock, store, events, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof chronicle>['store']) => store.getState().save!;
const held = (store: ReturnType<typeof chronicle>['store'], id: string): number =>
  save(store).wallet[id as 'gold'] ?? 0;
const standard = () => content.bannerById('banner.standard')!;

describe('the Portal — one press', () => {
  it('pays a shard, delivers a copy and remembers the pull', () => {
    const { store, actions } = chronicle();
    const before = held(store, 'shard_faded');
    const rosterBefore = Object.keys(save(store).roster).length;

    const result = actions.summonChampions('banner.standard', 'faded', 1);
    if (!result.ok) throw new Error(result.error.message);
    const pull = result.value.pulls[0]!;

    expect(result.value.pulls).toHaveLength(1);
    expect(held(store, 'shard_faded')).toBe(before - 1);
    expect(Object.keys(save(store).roster)).toHaveLength(rosterBefore + 1);
    expect(save(store).roster[pull.instance.instanceId]?.defId).toBe(pull.record.championId);
    expect(save(store).roster[pull.instance.instanceId]?.source).toBe('summon');
    expect(save(store).summon.history).toEqual([pull.record]);
    expect(save(store).summon.unseen).toContain(pull.instance.instanceId);
    expect(save(store).stats['summon.pulls']).toBe(1);
    expect(save(store).stats['summon.pulls.faded']).toBe(1);
    // A Faded Shard only ever answers with its three rarities (SUMMONING.md §1).
    expect(['common', 'uncommon', 'rare']).toContain(pull.record.rarity);
    expect(pull.record.bannerId).toBe('banner.standard');
  });

  it('emits the reveal and the copies it added', () => {
    const { store, events, actions } = chronicle();
    const seen: string[] = [];
    events.on((event) => seen.push(event.type));
    const result = actions.summonChampions('banner.standard', 'ancient', MULTI_PULL);
    if (!result.ok) throw new Error(result.error.message);
    expect(seen.filter((type) => type === 'champion.added')).toHaveLength(MULTI_PULL);
    expect(seen).toContain('summon.revealed');
    expect(seen).toContain('currency.changed');
    void store;
  });

  it('refuses a press it cannot pay for, and writes nothing', () => {
    const { store, actions } = chronicle(0);
    const rosterBefore = Object.keys(save(store).roster).length;
    const result = actions.summonChampions('banner.standard', 'sacred', 1);
    expect(result.ok).toBe(false);
    expect(save(store).summon.history).toEqual([]);
    expect(save(store).summon.unseen).toEqual([]);
    expect(Object.keys(save(store).roster)).toHaveLength(rosterBefore);
  });

  it('refuses a press of the wrong size or an unknown banner', () => {
    const { actions } = chronicle();
    expect(actions.summonChampions('banner.standard', 'faded', 0).ok).toBe(false);
    expect(actions.summonChampions('banner.standard', 'faded', MULTI_PULL + 1).ok).toBe(false);
    expect(actions.summonChampions('banner.standard', 'faded', 1.5).ok).toBe(false);
    expect(actions.summonChampions('banner.nope', 'faded', 1).ok).toBe(false);
  });

  it('charges ten shards for a ×10 and reveals the rarest last', () => {
    const { store, actions } = chronicle();
    const before = held(store, 'shard_ancient');
    const result = actions.summonChampions('banner.standard', 'ancient', MULTI_PULL);
    if (!result.ok) throw new Error(result.error.message);

    expect(result.value.pulls).toHaveLength(MULTI_PULL);
    expect(held(store, 'shard_ancient')).toBe(before - MULTI_PULL);
    const rarest = result.value.best.record.rarity;
    const ranks = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
    for (const pull of result.value.pulls)
      expect(ranks[pull.record.rarity]).toBeLessThanOrEqual(ranks[rarest]);
    // The history keeps the press newest first.
    expect(save(store).summon.history).toHaveLength(MULTI_PULL);
    expect(save(store).summon.history[0]).toEqual(result.value.pulls[MULTI_PULL - 1]?.record);
  });

  it('keeps duplicates as ordinary copies and never converts them', () => {
    const { store, actions } = chronicle();
    // The Faded pool is nine champions, so ten pulls must repeat someone.
    const result = actions.summonChampions('banner.standard', 'faded', MULTI_PULL);
    if (!result.ok) throw new Error(result.error.message);
    const duplicates = result.value.pulls.filter((pull) => pull.record.duplicate);
    expect(duplicates.length).toBeGreaterThan(0);
    for (const duplicate of duplicates) {
      expect(save(store).roster[duplicate.instance.instanceId]).toBeDefined();
      expect(copiesOf(save(store), duplicate.record.championId)).toBeGreaterThan(1);
    }
    // Nothing was paid out for them: the only wallet movement is the ten shards.
    expect(result.value.changes).toHaveLength(1);
    expect(result.value.changes[0]?.currency).toBe('shard_faded');
  });
});

describe('the Portal — mercy', () => {
  it('moves the counters with every pull and resets on the rarity it owed', () => {
    const { store, actions } = chronicle();
    actions.summonChampions('banner.standard', 'ancient', 1);
    const counters = save(store).summon.pity.ancient;
    const pull = save(store).summon.history[0]!;
    expect(counters.epic).toBe(pull.rarity === 'rare' ? 1 : 0);
    // A Faded press is merciless and keeps no counters at all.
    actions.summonChampions('banner.standard', 'faded', 1);
    expect(save(store).summon.pity.faded).toEqual({});
  });

  it('guarantees the Epic an Ancient Shard owes within twenty pulls', () => {
    const { store, actions } = chronicle();
    const hard = SHARD_PITY.ancient.find((rule) => rule.rarity === 'epic')?.hard ?? 20;
    for (let i = 0; i < hard / MULTI_PULL; i += 1)
      expect(actions.summonChampions('banner.standard', 'ancient', MULTI_PULL).ok).toBe(true);

    const history = save(store).summon.history.slice(0, hard);
    expect(history.some((record) => record.rarity === 'epic' || record.rarity === 'legendary')).toBe(true);
    expect(save(store).summon.pity.ancient.epic).toBeLessThan(hard);
  });

  it('quotes the same counters it rolls with', () => {
    const { store, actions } = chronicle();
    const pressed = actions.summonChampions('banner.standard', 'sacred', 3);
    if (!pressed.ok) throw new Error(pressed.error.message);
    const quoted = mercyOf(save(store), standard(), 'sacred', T0);
    expect(quoted).toEqual(pressed.value.mercy);
    const legendary = quoted.find((line) => line.rarity === 'legendary');
    expect(legendary?.within).toBe(15 - (save(store).summon.pity.sacred.legendary ?? 0));
  });

  it('keeps the history at its limit, newest first', () => {
    const { store, actions } = chronicle(HISTORY_LIMIT + 3 * MULTI_PULL);
    const presses = (HISTORY_LIMIT + 2 * MULTI_PULL) / MULTI_PULL;
    for (let i = 0; i < presses; i += 1) actions.summonChampions('banner.standard', 'faded', MULTI_PULL);
    const history = save(store).summon.history;
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(save(store).stats['summon.pulls']).toBe(presses * MULTI_PULL);
    for (let i = 1; i < history.length; i += 1)
      expect(history[i - 1]!.at).toBeGreaterThanOrEqual(history[i]!.at);
    // The oldest pulls fell off the end: the newest record is one of the last press's.
    expect(save(store).roster[history[0]!.instanceId]).toBeDefined();
  });

  it('replays a press exactly from the same chronicle and seed', () => {
    const first = chronicle();
    const second = chronicle();
    const a = first.actions.summonChampions('banner.standard', 'ancient', MULTI_PULL);
    const b = second.actions.summonChampions('banner.standard', 'ancient', MULTI_PULL);
    if (!a.ok || !b.ok) throw new Error('press failed');
    expect(a.value.pulls.map((p) => p.record.championId)).toEqual(
      b.value.pulls.map((p) => p.record.championId),
    );
  });
});

describe('the Portal — the featured banner', () => {
  it('marks a featured pull and names the banner', () => {
    const { store, actions } = chronicle();
    // Sacred pulls Epics 92 % of the time, and the rotation features two of them.
    for (let i = 0; i < 6; i += 1) actions.summonChampions('banner.featured', 'sacred', MULTI_PULL);
    const history = save(store).summon.history;
    expect(history.every((record) => record.bannerId === 'banner.featured')).toBe(true);
    expect(history.some((record) => record.featured)).toBe(true);
  });

  it('leaves the standard portal unfeatured', () => {
    const { store, actions } = chronicle();
    for (let i = 0; i < 4; i += 1) actions.summonChampions('banner.standard', 'sacred', MULTI_PULL);
    expect(save(store).summon.history.some((record) => record.featured)).toBe(false);
  });
});

describe('the Portal — the Exchange', () => {
  it('buys shards for the price the doc names', () => {
    const { store, actions } = chronicle(0);
    const gold = held(store, 'gold');
    const offer = SHARD_EXCHANGE.faded!;

    const result = actions.exchangeShards('faded', 2);
    if (!result.ok) throw new Error(result.error.message);
    expect(held(store, 'shard_faded')).toBe(2);
    expect(held(store, 'gold')).toBe(gold - offer.amount * 2);
    expect(save(store).stats['summon.exchanged']).toBe(2);
  });

  it('refuses a shard that is never sold, and a purse that is too light', () => {
    const { store, actions } = chronicle(0);
    expect(actions.exchangeShards('primordial', 1).ok).toBe(false);
    actions.spendCurrency([{ currency: 'gems', amount: held(store, 'gems') }]);
    expect(actions.exchangeShards('sacred', 1).ok).toBe(false);
    expect(held(store, 'shard_sacred')).toBe(0);
  });
});

describe('the Portal — champion choices', () => {
  /** Three stars on every Intro stand: the milestone that owes an Epic (CAMPAIGN.md §7). */
  function masterIntro(store: ReturnType<typeof chronicle>['store']): void {
    store.setState((state) => {
      if (!state.save) return state;
      for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
        for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1)
          state.save.campaign.stars[progressKey(stageIdOf(settlement, stage), 'intro')] = 3;
      return state;
    });
  }

  it('owes nothing until the difficulty is mastered', () => {
    const { store } = chronicle();
    expect(openChampionChoices(save(store))).toEqual([]);
  });

  it('owes the Intro Epic to a chronicle that mastered Intro before the Portal existed', () => {
    const { store, actions } = chronicle();
    masterIntro(store);
    const open = openChampionChoices(save(store));
    expect(open.map((choice) => choice.id)).toEqual([CHAMPION_CHOICES[0]!.id]);

    const candidates = choiceCandidates(open[0]!);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((def) => def.rarity === 'epic')).toBe(true);

    const picked = candidates[0]!;
    const result = actions.takeChampionChoice(open[0]!.id, picked.id);
    if (!result.ok) throw new Error(result.error.message);
    expect(save(store).roster[result.value.instance.instanceId]?.defId).toBe(picked.id);
    expect(save(store).summon.choices[open[0]!.id]?.championId).toBe(picked.id);
    expect(save(store).summon.unseen).toContain(result.value.instance.instanceId);
    // Taken once, and never again.
    expect(openChampionChoices(save(store))).toEqual([]);
    expect(actions.takeChampionChoice(open[0]!.id, picked.id).ok).toBe(false);
  });

  it('refuses a champion the choice does not offer', () => {
    const { store, actions } = chronicle();
    masterIntro(store);
    const choiceId = CHAMPION_CHOICES[0]!.id;
    expect(actions.takeChampionChoice(choiceId, 'champ.varkos_sundered_king').ok).toBe(false);
    expect(actions.takeChampionChoice(choiceId, 'champ.eldric_chronicler').ok).toBe(false);
    expect(openChampionChoices(save(store))).toHaveLength(1);
  });
});

describe('the Portal — the new-champion badge', () => {
  it('clears the copies the player has looked at and keeps the rest', () => {
    const { store, actions } = chronicle();
    const result = actions.summonChampions('banner.standard', 'faded', 3);
    if (!result.ok) throw new Error(result.error.message);
    const ids = result.value.pulls.map((pull) => pull.instance.instanceId);

    actions.markSeen([ids[0]!]);
    expect(save(store).summon.unseen).not.toContain(ids[0]);
    expect(save(store).summon.unseen).toContain(ids[1]);

    actions.markSeen(ids);
    expect(save(store).summon.unseen).toEqual([]);
  });
});
