import { describe, expect, it } from 'vitest';
import { CRAFT_TIER } from '@content/balance/forge';
import { INVENTORY_CAPACITY, INVENTORY_OVERFLOW, refineCores, REFINE_GOLD } from '@content/balance/gear';
import { content } from '@content/registry';
import type { GearInstance } from '@engine/gear/instance';
import { FixedClock } from '@engine/time/clock';
import { createGameStore } from './store';
import { levelGoldSpent } from './gear';

const T0 = new Date(2026, 8, 14, 12, 0).getTime();

/** A chronicle with a full material chest, so a recipe is never the thing being tested. */
function chronicle() {
  const clock = new FixedClock(T0);
  const { store, events } = createGameStore({ clock });
  const { actions } = store.getState();
  actions.newGame('Smith');
  actions.chooseStarter('champ.ser_corvin');
  actions.grantCurrency(
    [
      { currency: 'gold', amount: 1_000_000 },
      { currency: 'mat_scrap_iron', amount: 400 },
      { currency: 'mat_ember_alloy', amount: 300 },
      { currency: 'mat_starsteel', amount: 200 },
      { currency: 'mat_arcane_dust', amount: 400 },
      { currency: 'mat_refining_core', amount: 60 },
      { currency: 'mat_glyph_sigil', amount: 5 },
    ],
    'test',
  );
  return { clock, store, events, actions: store.getState().actions };
}

const save = (store: ReturnType<typeof chronicle>['store']) => store.getState().save!;
const held = (store: ReturnType<typeof chronicle>['store'], id: string): number =>
  save(store).wallet[id as 'gold'] ?? 0;

describe('the Forge — Craft', () => {
  it('pays the recipe and racks the piece it struck', () => {
    const { store, actions } = chronicle();
    const goldBefore = held(store, 'gold');
    const ironBefore = held(store, 'mat_scrap_iron');

    const result = actions.craftGear('scrap', 'weapon');
    if (!result.ok) throw new Error(result.error.message);
    const piece = result.value.piece;

    expect(save(store).inventory[piece.instanceId]).toBeDefined();
    expect(piece.slot).toBe('weapon');
    expect(piece.source).toBe('craft');
    expect(piece.level).toBe(0);
    expect(held(store, 'gold')).toBe(goldBefore - CRAFT_TIER.scrap.gold);
    expect(held(store, 'mat_scrap_iron')).toBe(ironBefore - 20);
    expect(save(store).counters.gear).toBe(1);
    expect(save(store).stats['forge.crafts']).toBe(1);
    // Tier I forges only the two-piece sets.
    expect(content.gearSetById(piece.setId)?.pieces).toBe(2);
  });

  it('spends a Glyph Sigil to name the set, and nothing when it rolls', () => {
    const { store, actions } = chronicle();
    const named = actions.craftGear('ember', 'boots', 'gear_set.lifedrinker');
    if (!named.ok) throw new Error(named.error.message);
    expect(named.value.piece.setId).toBe('gear_set.lifedrinker');
    expect(named.value.named).toBe(true);
    expect(held(store, 'mat_glyph_sigil')).toBe(4);

    const rolled = actions.craftGear('ember', 'boots');
    expect(rolled.ok).toBe(true);
    expect(held(store, 'mat_glyph_sigil')).toBe(4);
  });

  it('refuses a recipe it cannot pay for, and spends nothing when it does', () => {
    const { store, actions } = chronicle();
    store.setState((state) => {
      if (state.save) state.save.wallet.mat_starsteel = 1;
      return state;
    });
    const refused = actions.craftGear('star', 'shield');
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error.code).toBe('insufficient_currency');
    expect(Object.keys(save(store).inventory)).toHaveLength(0);
    expect(held(store, 'mat_starsteel')).toBe(1);
  });

  it('refuses to strike into a full armoury', () => {
    const { store, actions } = chronicle();
    const first = actions.craftGear('scrap', 'weapon');
    if (!first.ok) throw new Error(first.error.message);
    store.setState((state) => {
      if (!state.save) return state;
      const template = first.value.piece;
      for (let i = 0; i < INVENTORY_CAPACITY + INVENTORY_OVERFLOW; i += 1)
        state.save.inventory[`gear-fill-${i}`] = { ...template, instanceId: `gear-fill-${i}` };
      return state;
    });
    const goldBefore = held(store, 'gold');
    const refused = actions.craftGear('scrap', 'weapon');
    expect(refused.ok).toBe(false);
    expect(held(store, 'gold')).toBe(goldBefore);
  });
});

describe('the Forge — Dismantle', () => {
  it('breaks a selection, pays the materials and clears the racks', () => {
    const { store, actions } = chronicle();
    const ids: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const made = actions.craftGear('scrap', 'helmet');
      if (!made.ok) throw new Error(made.error.message);
      ids.push(made.value.piece.instanceId);
    }
    const dustBefore = held(store, 'mat_arcane_dust');
    const ironBefore = held(store, 'mat_scrap_iron');

    const result = actions.dismantleGear(ids);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.pieces).toHaveLength(3);
    for (const id of ids) expect(save(store).inventory[id]).toBeUndefined();
    expect(save(store).stats['forge.dismantles']).toBe(3);
    // Every rarity Tier I rolls returns scrap; dust only from Rare and up.
    expect(held(store, 'mat_scrap_iron')).toBeGreaterThanOrEqual(ironBefore);
    expect(held(store, 'mat_arcane_dust')).toBeGreaterThanOrEqual(dustBefore);
  });

  it('refunds a fifth of the gold the levels cost', () => {
    const { store, actions } = chronicle();
    const made = actions.craftGear('ember', 'chestplate');
    if (!made.ok) throw new Error(made.error.message);
    const id = made.value.piece.instanceId;
    const levelled = actions.levelGear(id, 4);
    if (!levelled.ok) throw new Error(levelled.error.message);

    const spent = levelGoldSpent(save(store).inventory[id] as GearInstance);
    const goldBefore = held(store, 'gold');
    const result = actions.dismantleGear([id]);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.goldRefund).toBe(Math.floor(spent * 0.2));
    expect(held(store, 'gold')).toBe(goldBefore + result.value.goldRefund);
  });

  it('never breaks a worn or locked piece', () => {
    const { store, actions } = chronicle();
    const champion = Object.keys(save(store).roster)[0] as string;
    const worn = actions.craftGear('scrap', 'weapon');
    const locked = actions.craftGear('scrap', 'weapon');
    if (!worn.ok || !locked.ok) throw new Error('craft failed');
    actions.equipGear(champion, worn.value.piece.instanceId);
    actions.setGearLocked(locked.value.piece.instanceId, true);

    expect(actions.dismantleGear([worn.value.piece.instanceId]).ok).toBe(false);
    expect(actions.dismantleGear([locked.value.piece.instanceId]).ok).toBe(false);
    // And one bad piece refuses the whole selection.
    const spare = actions.craftGear('scrap', 'weapon');
    if (!spare.ok) throw new Error('craft failed');
    expect(actions.dismantleGear([spare.value.piece.instanceId, locked.value.piece.instanceId]).ok).toBe(
      false,
    );
    expect(save(store).inventory[spare.value.piece.instanceId]).toBeDefined();
  });

  it('lets the bench go when the piece on it is broken', () => {
    const { store, actions } = chronicle();
    const made = actions.craftGear('scrap', 'boots');
    if (!made.ok) throw new Error(made.error.message);
    actions.selectGearPiece(made.value.piece.instanceId);
    actions.dismantleGear([made.value.piece.instanceId]);
    expect(store.getState().ui.armoury.selected).toBeNull();
  });
});

describe('the Forge — Refine', () => {
  /** Two pieces of the same slot and star, which is what a refine asks for. */
  function twins(actions: ReturnType<typeof chronicle>['actions']): [GearInstance, GearInstance] {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const a = actions.craftGear('ember', 'weapon');
      const b = actions.craftGear('ember', 'weapon');
      if (!a.ok || !b.ok) throw new Error('craft failed');
      if (a.value.piece.stars === b.value.piece.stars) return [a.value.piece, b.value.piece];
    }
    throw new Error('no twins');
  }

  it('climbs one star, eats the twin and re-bases the main stat', () => {
    const { store, actions } = chronicle();
    const [target, sacrifice] = twins(actions);
    const cores = refineCores(target.stars);
    const gold = REFINE_GOLD[target.stars] ?? 0;
    const coresBefore = held(store, 'mat_refining_core');
    const goldBefore = held(store, 'gold');

    const result = actions.refineGear(target.instanceId, sacrifice.instanceId);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.to).toBe(target.stars + 1);
    expect(result.value.mainAfter).toBeGreaterThan(result.value.mainBefore);
    expect(save(store).inventory[target.instanceId]?.stars).toBe(target.stars + 1);
    expect(save(store).inventory[sacrifice.instanceId]).toBeUndefined();
    expect(held(store, 'mat_refining_core')).toBe(coresBefore - cores);
    expect(held(store, 'gold')).toBe(goldBefore - gold);
    expect(save(store).stats['forge.refines']).toBe(1);
    // Substats survive the climb untouched — that is what a refine is for.
    expect(save(store).inventory[target.instanceId]?.subs).toEqual(target.subs);
  });

  it('refuses a mismatched or protected sacrifice, and spends nothing', () => {
    const { store, actions } = chronicle();
    const [target, sacrifice] = twins(actions);
    actions.setGearLocked(sacrifice.instanceId, true);
    const coresBefore = held(store, 'mat_refining_core');
    const refused = actions.refineGear(target.instanceId, sacrifice.instanceId);
    expect(refused.ok).toBe(false);
    expect(held(store, 'mat_refining_core')).toBe(coresBefore);
    expect(save(store).inventory[sacrifice.instanceId]).toBeDefined();
    expect(save(store).inventory[target.instanceId]?.stars).toBe(target.stars);

    actions.setGearLocked(sacrifice.instanceId, false);
    const wrongSlot = actions.craftGear('ember', 'boots');
    if (!wrongSlot.ok) throw new Error('craft failed');
    expect(actions.refineGear(target.instanceId, wrongSlot.value.piece.instanceId).ok).toBe(false);
    expect(actions.refineGear(target.instanceId, 'gear-999').ok).toBe(false);
  });

  it('moves the bench onto the survivor', () => {
    const { store, actions } = chronicle();
    const [target, sacrifice] = twins(actions);
    actions.selectGearPiece(sacrifice.instanceId);
    const result = actions.refineGear(target.instanceId, sacrifice.instanceId);
    expect(result.ok).toBe(true);
    expect(store.getState().ui.armoury.selected).toBe(target.instanceId);
  });
});
