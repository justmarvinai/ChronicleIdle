import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { STARTER_IDS } from '@content/champions/types';
import { createInstance } from '@engine/champions/instance';
import { createRng } from '@engine/rng/rng';
import { createBattle, type BattleSetup } from './create';
import { replay, runAuto, step } from './step';
import { snapshot } from './snapshot';
import type { BattleEvent, BattleState, Decision } from './types';

function party(ids: string[], level = 1) {
  return ids.map((id) => {
    const def = content.championById(id as never);
    if (!def) throw new Error(id);
    const instance = createInstance(def, { instanceId: `${id}-1`, now: 0, source: 'summon' });
    instance.level = level;
    return { def, instance };
  });
}

function setup(
  encounterId: string,
  ids: string[],
  control: 'manual' | 'auto' = 'auto',
  level = 1,
): BattleSetup {
  const encounter = content.encounterById(encounterId);
  if (!encounter) throw new Error(encounterId);
  return { encounter, party: party(ids, level), enemyById: (id) => content.enemyById(id), control };
}

const STARTERS = ['champ.ser_corvin', 'champ.bran_militia', 'champ.wenna_novice'];

function checkInvariants(state: BattleState, events: readonly BattleEvent[]): void {
  for (const unit of Object.values(state.units)) {
    expect(unit.hp).toBeGreaterThanOrEqual(0);
    expect(unit.hp).toBeLessThanOrEqual(unit.maxHp);
    expect(unit.tm).toBeGreaterThanOrEqual(0);
    expect(unit.tm).toBeLessThanOrEqual(1.5);
    expect(unit.statuses.length).toBeLessThanOrEqual(10);
    if (!unit.alive) expect(unit.statuses).toEqual([]);
  }
  const dead = new Set<string>();
  for (const event of events) {
    if (event.type === 'unit.died') dead.add(event.unitId);
    if (event.type === 'unit.revived') dead.delete(event.unitId);
    if (event.type === 'turn.started')
      expect(dead.has(event.unitId), `dead ${event.unitId} acted`).toBe(false);
  }
}

describe('battle lifecycle', () => {
  it('runs Training Grounds 1 to a victory for the starter team on auto', () => {
    const state = createBattle(setup('encounter.training.1', STARTERS), 'seed-1');
    const { events, outcome } = runAuto(state);
    expect(outcome.kind).toBe('victory');
    expect(outcome.wavesCleared).toBe(2);
    expect(events[0]?.type).toBe('battle.started');
    expect(events.filter((e) => e.type === 'wave.started')).toHaveLength(2);
    expect(events.at(-1)?.type).toBe('battle.ended');
    checkInvariants(state, events);
    expect(snapshot(state).outcome?.kind).toBe('victory');
  });

  it('lets every level-1 starting roster beat Training Grounds 1 and 2 on auto (ROADMAP Phase 2)', () => {
    // The setup screen suggests the three strongest by power: the starter, Wenna and Gil.
    for (const starter of STARTER_IDS) {
      const trio = [starter, 'champ.wenna_novice', 'champ.gil_scrapper'];
      for (const encounterId of ['encounter.training.1', 'encounter.training.2']) {
        let wins = 0;
        for (let i = 0; i < 20; i++) {
          const { outcome } = runAuto(createBattle(setup(encounterId, trio), `starter-${i}`));
          if (outcome.kind === 'victory') wins++;
        }
        expect(wins, `${starter} ${encounterId}`).toBeGreaterThanOrEqual(18);
      }
    }
  });

  it('is deterministic: the same seed and setup produce identical events', () => {
    const a = runAuto(createBattle(setup('encounter.training.2', STARTERS, 'auto', 10), 'det')).events;
    const b = runAuto(createBattle(setup('encounter.training.2', STARTERS, 'auto', 10), 'det')).events;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    const c = runAuto(createBattle(setup('encounter.training.2', STARTERS, 'auto', 10), 'other')).events;
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });

  it('replays a manual battle from its decision log with the same events', () => {
    const s = setup('encounter.training.1', STARTERS, 'manual', 5);
    const state = createBattle(s, 'replay');
    const events: BattleEvent[] = [];
    const rng = createRng('choices');
    for (let i = 0; i < 500 && !state.outcome; i++) {
      const result = step(state);
      events.push(...result.events);
      if (result.request) {
        const ready = result.request.abilities.filter((a) => a.ready);
        const choice = rng.pick(ready);
        const target = choice.targeting === 'none' ? null : rng.pick(choice.validTargets);
        const decision: Decision = {
          unitId: result.request.unitId,
          abilityId: choice.abilityId,
          targetId: target,
        };
        events.push(...step(state, decision).events);
      }
    }
    expect(state.outcome).not.toBeNull();
    const again = replay(s, 'replay', state.outcome?.decisions ?? []);
    expect(JSON.stringify(again.events)).toBe(JSON.stringify(events));
    expect(again.outcome?.kind).toBe(state.outcome?.kind);
  });

  it('rejects illegal decisions', () => {
    const state = createBattle(setup('encounter.training.1', STARTERS, 'manual'), 'illegal');
    let result = step(state);
    while (!result.request) result = step(state);
    const request = result.request;
    expect(() => step(state, { unitId: 'nope', abilityId: 'x', targetId: null })).toThrow(/turn/);
    const a1 = request.abilities[0]!;
    expect(() => step(state, { unitId: request.unitId, abilityId: a1.abilityId, targetId: 'a0' })).toThrow(
      /Invalid target/,
    );
  });

  it('runs 1,000 random auto battles headless in under 10 s without errors', () => {
    const ids = content.champions.map((c) => c.id);
    const rng = createRng('thousand');
    const started = process.hrtime.bigint();
    const outcomes = new Map<string, number>();
    for (let i = 0; i < 1000; i++) {
      const encounter = rng.pick(content.encounters);
      const size = encounter.partySize;
      const chosen = rng.shuffle(ids).slice(0, size);
      const level = rng.int(1, 40);
      const state = createBattle(setup(encounter.id, chosen, 'auto', level), `random-${i}`);
      const { events, outcome } = runAuto(state);
      outcomes.set(outcome.kind, (outcomes.get(outcome.kind) ?? 0) + 1);
      if (i % 50 === 0) checkInvariants(state, events);
    }
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
    expect(elapsed).toBeLessThan(10_000);
    expect(outcomes.get('victory') ?? 0).toBeGreaterThan(0);
    expect(
      (outcomes.get('victory') ?? 0) + (outcomes.get('defeat') ?? 0) + (outcomes.get('timeout') ?? 0),
    ).toBe(1000);
  });
});
