import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { createInstance } from '@engine/champions/instance';
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
      encounterId: 'encounter.training.1',
      instanceIds: Object.keys(roster),
      roster,
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

  it('pauses at manual decisions, accepts a decision, rejects bad ones and can switch to auto', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    controller.start({
      encounterId: 'encounter.training.1',
      instanceIds: Object.keys(roster),
      roster,
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

  it('retreats immediately and refuses invalid teams', async () => {
    const controller = createBattleController();
    const roster = rosterOf(STARTERS);
    expect(
      controller.start({
        encounterId: 'encounter.training.1',
        instanceIds: ['ghost-9'],
        roster,
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
        control: 'auto',
        speed: 1,
        seed: 's',
      }).ok,
    ).toBe(false);
    controller.start({
      encounterId: 'encounter.training.2',
      instanceIds: Object.keys(roster),
      roster,
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
      encounterId: 'encounter.training.1',
      instanceIds: Object.keys(roster),
      roster,
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
