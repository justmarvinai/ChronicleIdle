import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { createInstance } from '@engine/champions/instance';
import { createBattle, runAuto, snapshot } from '@engine/battle/index';
import { applyEventToView } from './view';

function setup() {
  const encounter = content.encounterById('encounter.training.1');
  if (!encounter) throw new Error('missing encounter');
  const party = ['champ.ser_corvin', 'champ.wenna_novice', 'champ.gil_scrapper'].map((id, i) => {
    const def = content.championById(id as never);
    if (!def) throw new Error(id);
    return { def, instance: createInstance(def, { instanceId: `u${i}`, now: 0, source: 'starter' }) };
  });
  return { encounter, party, enemyById: (id: string) => content.enemyById(id), control: 'auto' as const };
}

describe('presented battle view', () => {
  it('follows the played events: a new wave adds its enemies and retires the fallen ones', () => {
    const state = createBattle(setup(), 'view-1');
    let view = snapshot(state);
    const firstWave = view.units.filter((u) => u.side === 'enemy').map((u) => u.id);
    expect(firstWave).toHaveLength(2);
    const { events, outcome } = runAuto(state);
    expect(outcome.kind).toBe('victory');
    let sawSecondWave = false;
    for (const event of events) {
      view = applyEventToView(view, event);
      if (event.type === 'wave.started' && event.wave === 2) {
        sawSecondWave = true;
        // The cleared wave's corpses are gone, the new wave's units are on the field.
        const enemies = view.units.filter((u) => u.side === 'enemy');
        expect(enemies.map((u) => u.id)).toEqual(event.enemyIds);
        expect(enemies.every((u) => u.alive)).toBe(true);
        expect(view.units.filter((u) => u.side === 'ally')).toHaveLength(3);
        expect(view.wave).toBe(2);
      }
    }
    expect(sawSecondWave).toBe(true);
    expect(view.outcome?.kind).toBe('victory');
    expect(view.phase).toBe('ended');
    // Every unit's HP in the folded view matches the simulation's final state.
    const final = snapshot(state);
    for (const unit of view.units) {
      const sim = final.units.find((u) => u.id === unit.id);
      expect(sim, unit.id).toBeDefined();
      expect(unit.hp, unit.id).toBe(sim?.hp);
      expect(unit.alive, unit.id).toBe(sim?.alive);
    }
  });

  it('returns the same view object when an event changes nothing visible', () => {
    const state = createBattle(setup(), 'view-2');
    const view = snapshot(state);
    expect(applyEventToView(view, { type: 'passive.triggered', unitId: 'x', passiveId: 'y' })).toBe(view);
  });
});
