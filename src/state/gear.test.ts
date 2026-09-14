import { describe, expect, it } from 'vitest';
import { INVENTORY_CAPACITY, INVENTORY_OVERFLOW } from '@content/balance/gear';
import { content } from '@content/registry';
import { totalPower, totalStats } from '@engine/gear/champion-stats';
import { wornBy } from '@engine/gear/equip';
import { FixedClock } from '@engine/time/clock';
import { createGameStore } from './store';
import { inventoryRoom, levelCost, levelCostTotal } from './gear';

const T0 = new Date(2026, 8, 12, 12, 0).getTime();

function chronicle() {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Tester');
  actions.chooseStarter('champ.ser_corvin');
  actions.grantCurrency([{ currency: 'gold', amount: 500_000 }], 'test');
  return { clock, store, events, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof chronicle>['store']) => store.getState().save!;
const hero = (store: ReturnType<typeof chronicle>['store']): string =>
  Object.values(save(store).roster).find((i) => i.defId === 'champ.ser_corvin')!.instanceId;

describe('the armoury', () => {
  it('mints a piece from a settlement and files it away', () => {
    const { store, actions } = chronicle();
    const piece = actions.debugGrantGear(3);
    expect(piece).not.toBeNull();
    if (!piece) return;
    expect(save(store).inventory[piece.instanceId]).toBeDefined();
    expect(save(store).counters.gear).toBe(1);
    expect(piece.equippedTo).toBeNull();
    expect(piece.level).toBe(0);
    expect(save(store).stats['gear.drops']).toBe(1);
  });

  it('prices levels from the table and rolls a substat at +4', () => {
    const { store, actions } = chronicle();
    const piece = actions.debugGrantGear(6);
    if (!piece) throw new Error('no drop');
    const goldBefore = save(store).wallet.gold;
    const expected = levelCostTotal(piece, 4);
    expect(expected).toBe(
      levelCost(piece.stars, 0) +
        levelCost(piece.stars, 1) +
        levelCost(piece.stars, 2) +
        levelCost(piece.stars, 3),
    );

    const result = actions.levelGear(piece.instanceId, 4);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.to).toBe(4);
    expect(result.value.rolls.map((r) => r.level)).toEqual([4]);
    expect(save(store).wallet.gold).toBe(goldBefore - expected);
    expect(save(store).inventory[piece.instanceId]?.level).toBe(4);
  });

  it('refuses a level it cannot pay for, and spends nothing when it does', () => {
    const { store, actions } = chronicle();
    const piece = actions.debugGrantGear(6);
    if (!piece) throw new Error('no drop');
    store.setState((state) => {
      if (state.save) state.save.wallet.gold = 1;
      return state;
    });
    const refused = actions.levelGear(piece.instanceId, 4);
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe('insufficient_currency');
    expect(save(store).inventory[piece.instanceId]?.level).toBe(0);
    expect(save(store).wallet.gold).toBe(1);
  });

  it('equips, swaps and unequips, keeping one wearer per piece', () => {
    const { store, actions } = chronicle();
    const champion = hero(store);
    const other = Object.keys(save(store).roster).find((id) => id !== champion) as string;
    const first = actions.debugGrantGear(4);
    if (!first) throw new Error('no drop');
    // A second piece of the same slot, so the swap has something to replace.
    let second = actions.debugGrantGear(4);
    for (let i = 0; i < 20 && second && second.slot !== first.slot; i += 1)
      second = actions.debugGrantGear(4);
    if (!second || second.slot !== first.slot) throw new Error('no twin slot');

    expect(actions.equipGear(champion, first.instanceId).ok).toBe(true);
    expect(save(store).roster[champion]?.gear[first.slot]).toBe(first.instanceId);
    expect(save(store).inventory[first.instanceId]?.equippedTo).toBe(champion);

    // Equipping the twin replaces it; the old piece goes back to the armoury, unworn.
    const swap = actions.equipGear(champion, second.instanceId);
    if (!swap.ok) throw new Error(swap.error.message);
    expect(swap.value.replaced?.instanceId).toBe(first.instanceId);
    expect(save(store).inventory[first.instanceId]?.equippedTo).toBeNull();
    expect(save(store).roster[champion]?.gear[second.slot]).toBe(second.instanceId);

    // Taking it for another champion strips it from the first.
    const stolen = actions.equipGear(other, second.instanceId);
    if (!stolen.ok) throw new Error(stolen.error.message);
    expect(stolen.value.takenFrom).toBe(champion);
    expect(save(store).roster[champion]?.gear[second.slot]).toBeNull();
    expect(save(store).roster[other]?.gear[second.slot]).toBe(second.instanceId);

    const off = actions.unequipGear(other, second.slot);
    expect(off.ok).toBe(true);
    expect(save(store).roster[other]?.gear[second.slot]).toBeNull();
    expect(save(store).inventory[second.instanceId]?.equippedTo).toBeNull();
    expect(actions.unequipGear(other, second.slot).ok).toBe(false);
  });

  it('raises the champion’s stats and power once the piece is on', () => {
    const { store, actions } = chronicle();
    const champion = hero(store);
    const def = content.championById(save(store).roster[champion]!.defId)!;
    const before = totalPower(def, save(store).roster[champion]!, [], (id) => content.gearSetById(id));
    const piece = actions.debugGrantGear(8);
    if (!piece) throw new Error('no drop');
    actions.equipGear(champion, piece.instanceId);
    const worn = wornBy(save(store).roster[champion]!, save(store).inventory);
    expect(worn).toHaveLength(1);
    const after = totalPower(def, save(store).roster[champion]!, worn, (id) => content.gearSetById(id));
    expect(after).toBeGreaterThan(before);
    const stats = totalStats(def, save(store).roster[champion]!, worn, (id) => content.gearSetById(id));
    expect(Object.values(stats).every((v) => Number.isFinite(v))).toBe(true);
  });

  it('locks a piece and keeps the lock in the save', () => {
    const { store, actions } = chronicle();
    const piece = actions.debugGrantGear(2);
    if (!piece) throw new Error('no drop');
    expect(actions.setGearLocked(piece.instanceId, true).ok).toBe(true);
    expect(save(store).inventory[piece.instanceId]?.locked).toBe(true);
    expect(actions.setGearLocked('gear-999', true).ok).toBe(false);
  });

  it('stops minting when the armoury is full past its overflow (GEAR.md §7)', () => {
    const { store, actions } = chronicle();
    store.setState((state) => {
      if (!state.save) return state;
      // Fill it to the cap with copies of one piece, cheaply.
      const piece = {
        instanceId: 'gear-seed',
        slot: 'weapon' as const,
        setId: 'gear_set.warcry',
        rarity: 'common' as const,
        stars: 1,
        level: 0,
        mainStat: 'atk' as const,
        subs: [],
        equippedTo: null,
        locked: false,
        acquiredAt: T0,
        source: 'campaign_drop' as const,
      };
      for (let i = 0; i < INVENTORY_CAPACITY + INVENTORY_OVERFLOW; i += 1)
        state.save.inventory[`gear-fill-${i}`] = { ...piece, instanceId: `gear-fill-${i}` };
      return state;
    });
    expect(inventoryRoom(save(store))).toBe(0);
    expect(actions.debugGrantGear(5)).toBeNull();
  });
});

describe('a campaign run', () => {
  it('drops real pieces into the armoury', () => {
    const { store, actions } = chronicle();
    const party = Object.keys(save(store).roster).slice(0, 3);
    const pointer = { settlement: 1, stage: 1, difficulty: 'intro' } as const;
    let drops = 0;
    for (let i = 0; i < 40 && drops === 0; i += 1) {
      const started = actions.startCampaignRun(pointer);
      if (!started.ok) break;
      const finished = actions.finishCampaignRun({
        pointer,
        cost: started.value.cost,
        runIndex: started.value.runIndex,
        outcome: {
          kind: 'victory',
          turns: 20,
          allyTurns: 9,
          wavesCleared: 2,
          waveCount: 2,
          units: [],
          enemyHpLeft: 0,
          seed: `s${i}`,
          decisions: [],
        },
        party,
        now: T0,
      });
      if (!finished.ok) break;
      drops += finished.value.gear.length;
      for (const piece of finished.value.gear) {
        expect(save(store).inventory[piece.instanceId]).toBeDefined();
        // Thornwood's own sets, or the wider catalogue when the roll went wide.
        expect(content.gearSetById(piece.setId)).toBeDefined();
        expect(piece.source).toBe('campaign_drop');
      }
    }
    expect(drops).toBeGreaterThan(0);
    expect(save(store).stats['gear.drops']).toBe(drops);
  });
});
