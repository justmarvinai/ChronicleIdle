import { describe, expect, it } from 'vitest';
import { NO_PALACE, palaceBonus, type PalaceBonus } from '@engine/palace/index';
import { PALACE } from '@content/palace/index';
import { content } from '@content/registry';
import { createInstance } from '@engine/champions/instance';
import { generateGear } from '@engine/gear/generate';
import type { Inventory } from '@engine/gear/instance';
import { createRng } from '@engine/rng/rng';
import type { GearSlot } from '@content/champions/types';
import type { Roster } from '@engine/champions/instance';
import { createBattleController } from './controller';
import type { BattlePresenter } from './presenter';

function rosterOf(ids: string[], level = 1): Roster {
  const roster: Roster = {};
  ids.forEach((id, i) => {
    const def = content.championById(id as never);
    if (!def) throw new Error(id);
    const instance = createInstance(def, {
      instanceId: `${id.replace('champ.', '')}-${i + 1}`,
      now: 0,
      source: 'summon',
    });
    instance.level = level;
    roster[instance.instanceId] = instance;
  });
  return roster;
}

const STARTERS = ['champ.ser_corvin', 'champ.bran_militia', 'champ.wenna_novice'];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const settle = async (predicate: () => boolean, tries = 200): Promise<void> => {
  for (let i = 0; i < tries && !predicate(); i++) await wait(5);
};

describe('battle controller', () => {
  it('runs an auto battle to its end with the instant presenter and reports the outcome', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    const ended: string[] = [];
    controller.onEnded((o) => ended.push(o.kind));
    const result = controller.start({
      encounterId: 'encounter.stage.01.01.intro',
      instanceIds: Object.keys(roster),
      roster,
      palace: NO_PALACE,
      inventory: {},
      control: 'auto',
      speed: 2,
      seed: 'ctrl',
    });
    expect(result.ok).toBe(true);
    await settle(() => controller.store.getState().status === 'ended');
    const state = controller.store.getState();
    expect(state.outcome?.kind).toBe('victory');
    expect(state.view?.units.filter((u) => u.side === 'ally')).toHaveLength(3);
    expect(state.log.some((e) => e.type === 'battle.ended')).toBe(true);
    expect(ended).toEqual(['victory']);
    controller.end();
    expect(controller.store.getState().status).toBe('idle');
  });

  it("sends champions in wearing their gear: the pieces' stats and their set's bonus", () => {
    const roster = rosterOf(STARTERS);
    const corvin = Object.values(roster).find((c) => c.defId === 'champ.ser_corvin');
    if (!corvin) throw new Error('no Corvin');
    // Four pieces of Bulwark on Corvin: four main stats and a complete four-piece set.
    const slots: GearSlot[] = ['weapon', 'helmet', 'shield', 'gauntlets'];
    const inventory: Inventory = {};
    slots.forEach((slot, i) => {
      const piece = generateGear(
        {
          serial: i + 1,
          slot,
          setId: 'gear_set.bulwark',
          rarity: 'epic',
          stars: 5,
          source: 'campaign_drop',
          now: 0,
        },
        createRng(`worn-${slot}`),
      );
      inventory[piece.instanceId] = { ...piece, equippedTo: corvin.instanceId };
      corvin.gear[slot] = piece.instanceId;
    });
    const fielded = (armoury: Inventory) => {
      const controller = createBattleController();
      const result = controller.start({
        encounterId: 'encounter.stage.01.01.intro',
        instanceIds: Object.keys(roster),
        roster,
        palace: NO_PALACE,
        inventory: armoury,
        control: 'manual',
        speed: 1,
        seed: 'worn',
      });
      if (!result.ok) throw new Error(result.error.message);
      const unit = Object.values(controller.simulation()?.units ?? {}).find(
        (u) => u.defId === 'champ.ser_corvin',
      );
      controller.end();
      if (!unit) throw new Error('Corvin did not take the field');
      return unit;
    };
    const bare = fielded({});
    const dressed = fielded(inventory);
    // The weapon's ATK and the helmet's HP are in the stats he fights with (they never were before 0.12.0).
    expect(dressed.base.atk).toBeGreaterThan(bare.base.atk);
    expect(dressed.base.hp).toBeGreaterThan(bare.base.hp);
    // And the set's bonus rides in as a passive, the way GEAR.md §5 says set bonuses fight.
    expect(bare.passives.some((p) => p.id.startsWith('gear_set.bulwark'))).toBe(false);
    expect(dressed.passives.some((p) => p.id.startsWith('gear_set.bulwark'))).toBe(true);
  });

  it('sends champions in with the Glorious Palace behind them', () => {
    const roster = rosterOf(STARTERS);
    const start = (palace: PalaceBonus) => {
      const controller = createBattleController();
      const result = controller.start({
        encounterId: 'encounter.stage.01.01.intro',
        instanceIds: Object.keys(roster),
        roster,
        palace,
        inventory: {},
        control: 'manual',
        speed: 1,
        seed: 'palace',
      });
      if (!result.ok) throw new Error(result.error.message);
      const allies = Object.values(controller.simulation()?.units ?? {}).filter((u) => u.side === 'ally');
      controller.end();
      return allies;
    };

    // Corvin is Justice; a Justice branch reaches him and a Valor one does not.
    const bare = start(NO_PALACE);
    const lifted = start(palaceBonus(['palace.core', 'palace.justice.r1.0'], (id) => PALACE.byId[id]));
    const corvin = (units: typeof bare) => units.find((u) => u.defId === 'champ.ser_corvin');
    const before = corvin(bare);
    const after = corvin(lifted);
    expect(before && after).toBeTruthy();
    if (!before || !after) return;
    // +50 flat from the node, plus 1 % of his base HP from the Heart — and he enters at full.
    expect(after.base.hp).toBeGreaterThan(before.base.hp + 50);
    expect(after.maxHp).toBe(after.base.hp);
    expect(after.hp).toBe(after.maxHp);
    // Wenna is Faith: the Justice branch adds nothing to her beyond the Heart's percentage.
    const wenna = (units: typeof bare) => units.find((u) => u.defId === 'champ.wenna_novice');
    const before2 = wenna(bare)?.base.hp ?? 0;
    expect(wenna(lifted)?.base.hp).toBe(before2 + Math.round(before2 / 100));
  });

  it('holds an auto battle until a presenter attaches when asked to (the screen mounts its stage first)', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    controller.start({
      encounterId: 'encounter.stage.01.01.intro',
      instanceIds: Object.keys(roster),
      roster,
      palace: NO_PALACE,
      inventory: {},
      control: 'auto',
      speed: 1,
      seed: 'hold',
      awaitPresenter: true,
    });
    await wait(30);
    const held = controller.store.getState();
    expect(held.status).toBe('running');
    expect(held.log).toHaveLength(0);
    expect(controller.simulation()?.turn).toBe(0);
    let mounted = 0;
    controller.attachPresenter({
      mount: () => {
        mounted++;
      },
      play: (events, _speed, onEvent) => {
        for (const e of events) onEvent(e);
        return Promise.resolve();
      },
    });
    await settle(() => controller.store.getState().status === 'ended');
    expect(mounted).toBe(1);
    expect(controller.store.getState().outcome?.kind).toBe('victory');
    controller.end();
  });

  it('pauses at manual decisions, accepts a decision, rejects bad ones and can switch to auto', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    controller.start({
      encounterId: 'encounter.stage.01.01.intro',
      instanceIds: Object.keys(roster),
      roster,
      palace: NO_PALACE,
      inventory: {},
      control: 'manual',
      speed: 1,
      seed: 'manual',
    });
    await settle(() => controller.store.getState().request !== null);
    const request = controller.store.getState().request;
    expect(request).not.toBeNull();
    expect(controller.decide({ unitId: 'nope', abilityId: 'x', targetId: null }).ok).toBe(false);
    const a1 = request!.abilities[0]!;
    expect(
      controller.decide({ unitId: request!.unitId, abilityId: a1.abilityId, targetId: a1.autoTarget }).ok,
    ).toBe(true);
    await settle(
      () => controller.store.getState().request !== null || controller.store.getState().status === 'ended',
    );
    expect(controller.store.getState().view?.turn).toBeGreaterThan(0);
    controller.setControl('auto');
    await settle(() => controller.store.getState().status === 'ended');
    expect(controller.store.getState().outcome?.kind).toBe('victory');
  });

  it('marks an enemy for the policy, moves the mark and lifts it', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    controller.start({
      encounterId: 'encounter.stage.01.01.intro',
      instanceIds: Object.keys(roster),
      roster,
      palace: NO_PALACE,
      inventory: {},
      control: 'manual',
      speed: 1,
      seed: 'mark',
    });
    await settle(() => controller.store.getState().request !== null);

    // The mark has to reach the HUD the moment it is set, not with the next event (BATTLE.md §7.1).
    controller.setFocus('w0e1');
    expect(controller.simulation()?.focusId).toBe('w0e1');
    expect(controller.store.getState().view?.focusId).toBe('w0e1');

    // Every request built from here opens on the marked enemy, whoever is casting. This turn is
    // aimed at the other one on purpose: the mark has to steer the turn after it, not this one.
    const request = controller.store.getState().request;
    const a1 = request!.abilities[0]!;
    expect(controller.decide({ unitId: request!.unitId, abilityId: a1.abilityId, targetId: 'w0e0' }).ok).toBe(
      true,
    );
    await settle(() => controller.store.getState().request !== null);
    expect(controller.store.getState().request?.abilities[0]?.autoTarget).toBe('w0e1');

    // Marking another moves the mark; clearing it hands targeting back to the policy.
    controller.setFocus('w0e0');
    expect(controller.store.getState().view?.focusId).toBe('w0e0');
    controller.setFocus(null);
    expect(controller.simulation()?.focusId).toBe(null);
    expect(controller.store.getState().view?.focusId).toBe(null);
  });

  it('retreats immediately and refuses invalid teams', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    expect(
      controller.start({
        encounterId: 'encounter.stage.01.01.intro',
        instanceIds: ['ghost-9'],
        roster,
        palace: NO_PALACE,
        inventory: {},
        control: 'auto',
        speed: 1,
        seed: 's',
      }).ok,
    ).toBe(false);
    expect(
      controller.start({
        encounterId: 'encounter.nope',
        instanceIds: Object.keys(roster),
        roster,
        palace: NO_PALACE,
        inventory: {},
        control: 'auto',
        speed: 1,
        seed: 's',
      }).ok,
    ).toBe(false);
    controller.start({
      encounterId: 'encounter.stage.01.02.intro',
      instanceIds: Object.keys(roster),
      roster,
      palace: NO_PALACE,
      inventory: {},
      control: 'manual',
      speed: 1,
      seed: 'retreat',
    });
    await settle(() => controller.store.getState().request !== null);
    controller.retreat();
    expect(controller.store.getState().outcome?.kind).toBe('retreat');
    expect(controller.store.getState().status).toBe('ended');
  });

  it('waits for the presenter before stepping again (back-pressure)', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    let batches = 0;
    let concurrent = 0;
    let maxConcurrent = 0;
    const presenter: BattlePresenter = {
      async play(events, _speed, onEvent) {
        batches++;
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await wait(2);
        for (const e of events) onEvent(e);
        concurrent--;
      },
    };
    controller.attachPresenter(presenter);
    controller.start({
      encounterId: 'encounter.stage.01.01.intro',
      instanceIds: Object.keys(roster),
      roster,
      palace: NO_PALACE,
      inventory: {},
      control: 'auto',
      speed: 4,
      seed: 'bp',
    });
    await settle(() => controller.store.getState().status === 'ended', 2000);
    expect(controller.store.getState().status).toBe('ended');
    expect(batches).toBeGreaterThan(5);
    expect(maxConcurrent).toBe(1);
  });
});
