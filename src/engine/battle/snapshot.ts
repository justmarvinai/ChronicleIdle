/** Plain, serialisable view of a battle for the HUD and the result screen (no Rng, no defs). */
import type { AbilitySlot, StatusId } from './imports';
import { shieldTotal } from './stats';
import type { BattleOutcome, BattleState, DecisionRequest } from './types';

export interface UnitView {
  id: string;
  side: 'ally' | 'enemy';
  name: string;
  defId: string;
  instanceId: string | null;
  slot: number;
  level: number;
  hp: number;
  maxHp: number;
  shield: number;
  tm: number;
  alive: boolean;
  isBoss: boolean;
  statuses: { id: StatusId; turns: number; stacks: number; value: number }[];
  abilities: { id: string; slot: AbilitySlot; cooldown: number; ready: boolean }[];
  art: { model: string; tint: string | null; facing: 'left' | 'right'; scale: number };
}

export interface BattleView {
  encounterId: string;
  units: UnitView[];
  wave: number;
  waveCount: number;
  turn: number;
  allyTurns: number;
  turnLimit: number;
  phase: BattleState['phase'];
  control: BattleState['control'];
  pending: DecisionRequest | null;
  outcome: BattleOutcome | null;
}

export function snapshot(state: BattleState): BattleView {
  return {
    encounterId: state.encounterId,
    units: state.order
      .map((id) => state.units[id])
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map((u) => ({
        id: u.id,
        side: u.side,
        name: u.name,
        defId: u.defId,
        instanceId: u.instanceId,
        slot: u.slot,
        level: u.level,
        hp: u.hp,
        maxHp: u.maxHp,
        shield: shieldTotal(u),
        tm: u.tm,
        alive: u.alive,
        isBoss: u.isBoss,
        statuses: u.statuses.map((s) => ({ id: s.id, turns: s.turns, stacks: s.stacks, value: s.value })),
        abilities: u.abilities.map((a) => ({
          id: a.id,
          slot: a.slot,
          cooldown: a.cooldown,
          ready: a.cooldown === 0,
        })),
        art: { ...u.art },
      })),
    wave: state.waveIndex + 1,
    waveCount: state.waveCount,
    turn: state.turn,
    allyTurns: state.allyTurns,
    turnLimit: state.turnLimit,
    phase: state.phase,
    control: state.control,
    pending: state.pending,
    outcome: state.outcome,
  };
}
