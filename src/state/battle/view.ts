/**
 * The presented battle view: the HUD shows what the presenter has *played*, not what the
 * simulation already knows. Each event is folded into the previous view as it lands on stage.
 */
import type { BattleEvent, BattleView, UnitView } from '@engine/battle/index';

function updateUnit(view: BattleView, id: string, patch: (unit: UnitView) => UnitView): BattleView {
  const units = view.units.map((u) => (u.id === id ? patch(u) : u));
  return { ...view, units };
}

/** Applies one played event to the view; returns the same object when nothing visible changed. */
export function applyEventToView(view: BattleView, event: BattleEvent): BattleView {
  switch (event.type) {
    case 'hit':
      return updateUnit(view, event.targetId, (u) => ({
        ...u,
        hp: event.hpAfter,
        shield: event.shieldAfter,
        alive: u.alive && !event.killed,
      }));
    case 'dot.tick':
      return updateUnit(view, event.unitId, (u) => ({ ...u, hp: event.hpAfter }));
    case 'heal':
      return updateUnit(view, event.targetId, (u) => ({ ...u, hp: event.hpAfter }));
    case 'unit.died':
      return updateUnit(view, event.unitId, (u) => ({
        ...u,
        alive: false,
        hp: 0,
        shield: 0,
        statuses: [],
        tm: 0,
      }));
    case 'unit.revived':
      return updateUnit(view, event.unitId, (u) => ({ ...u, alive: true, hp: event.hpAfter, statuses: [] }));
    case 'status.applied':
      return updateUnit(view, event.targetId, (u) => {
        const rest = u.statuses.filter((s) => s.id !== event.status);
        return {
          ...u,
          statuses: [
            ...rest,
            { id: event.status, turns: event.turns, stacks: event.stacks, value: event.value },
          ],
          shield: event.status === 'shield' ? event.value : u.shield,
        };
      });
    case 'status.removed':
      return updateUnit(view, event.targetId, (u) => ({
        ...u,
        statuses: u.statuses.filter((s) => s.id !== event.status),
        shield: event.status === 'shield' ? 0 : u.shield,
      }));
    case 'tm.changed':
      return updateUnit(view, event.targetId, (u) => ({ ...u, tm: event.tmAfter }));
    case 'turn.started':
      return {
        ...view,
        turn: event.turn,
        allyTurns: event.allyTurns,
        units: view.units.map((u) =>
          event.tm[u.id] === undefined ? u : { ...u, tm: event.tm[u.id] as number },
        ),
      };
    case 'turn.ended':
      return {
        ...view,
        units: view.units.map((u) =>
          event.tm[u.id] === undefined ? u : { ...u, tm: event.tm[u.id] as number },
        ),
      };
    case 'wave.started':
      return { ...view, wave: event.wave, waveCount: event.waveCount };
    case 'battle.ended':
      return { ...view, outcome: event.outcome, phase: 'ended' };
    default:
      return view;
  }
}
