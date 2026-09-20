import { describe, expect, it } from 'vitest';
import { content } from '@content/registry';
import { createInstance } from '@engine/champions/instance';
import { bossEncounterId } from '@engine/bosses/encounter';
import { createBattle, runAuto, snapshot } from '@engine/battle/index';
import { applyEventToView } from './view';

function setup() {
  const encounter = content.encounterById('encounter.stage.01.01.intro');
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

  it("keeps the boss HUD's facts in step with the fight", () => {
    const encounter = content.encounterById(bossEncounterId('boss.gravemaw', 'easy'));
    if (!encounter) throw new Error('missing boss encounter');
    const state = createBattle({ ...setup(), encounter }, 'view-boss');
    let view = snapshot(state);
    const bossId = view.units.find((u) => u.isBoss)?.id;
    expect(bossId).toBeDefined();
    const bossOf = (): NonNullable<(typeof view.units)[number]['boss']> => {
      const boss = view.units.find((u) => u.id === bossId)?.boss;
      if (!boss) throw new Error('the boss lost its HUD facts');
      return boss;
    };
    expect(bossOf().turnsTaken).toBe(0);

    const { events } = runAuto(state);
    let ownTurns = 0;
    for (const event of events) {
      view = applyEventToView(view, event);
      if (event.type === 'turn.started' && event.unitId === bossId) {
        ownTurns += 1;
        // The chip's countdown is the boss's own turn count, counted as each turn lands.
        expect(bossOf().turnsTaken).toBe(ownTurns);
      }
      if (event.type === 'enraged') expect(bossOf().enrageSteps).toBe(event.steps);
      if (event.type === 'passive.broken') expect(bossOf().brokenPassives).toContain(event.passiveId);
    }
    expect(ownTurns).toBeGreaterThan(0);
    const simulated = snapshot(state).units.find((u) => u.id === bossId)?.boss;
    expect(bossOf()).toEqual(simulated);
    // Unshakeable is content, not simulation: it reads the same at the end as at the start.
    expect(bossOf().immunities).toEqual(['stun', 'freeze', 'sleep', 'provoke', 'fear']);
  });

  it('returns the same view object when an event changes nothing visible', () => {
    const state = createBattle(setup(), 'view-2');
    const view = snapshot(state);
    expect(applyEventToView(view, { type: 'passive.triggered', unitId: 'x', passiveId: 'y' })).toBe(view);
  });
});

describe('the cooldowns the bar draws', () => {
  it('come with the turn that is about to be played, not with the snapshot it started from', () => {
    // A boss stands long enough for an ability with a cooldown to be spent and to come back.
    const encounter = content.encounterById(bossEncounterId('boss.gravemaw', 'easy'));
    if (!encounter) throw new Error('missing boss encounter');
    const state = createBattle({ ...setup(), encounter }, 'view-cooldowns');
    let view = snapshot(state);
    const { events } = runAuto(state);
    let sawCooling = false;
    for (const event of events) {
      view = applyEventToView(view, event);
      if (event.type !== 'turn.started') continue;
      const unit = view.units.find((u) => u.id === event.unitId);
      // Whatever the simulation announced is what the view holds for the unit taking the turn.
      for (const ability of unit?.abilities ?? []) {
        expect(ability.cooldown).toBe(event.cooldowns[ability.id] ?? 0);
        expect(ability.ready).toBe(ability.cooldown === 0);
        if (ability.cooldown > 0) sawCooling = true;
      }
    }
    // A fight this long spends something with a cooldown, so the numbers are not all zeroes.
    expect(sawCooling).toBe(true);
  });
});
