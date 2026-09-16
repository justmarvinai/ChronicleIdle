/** Plain, serialisable view of a battle for the HUD and the result screen (no Rng, no defs). */
import type { AbilitySlot, Element, Role, StatusId } from './imports';
import { shieldTotal } from './stats';
import type { BattleOutcome, BattleState, BattleUnit, DecisionRequest } from './types';

/**
 * Boss-only facts the HUD prints (docs/design/BOSSES.md §1 and §4): what the boss shrugs off,
 * how close the enrage is, and which counting passive has already broken.
 */
export interface BossUnitView {
  /** Statuses that never land on it — the HUD's "Unshakeable". */
  immunities: StatusId[];
  /** Own turn after which ATK starts growing, and the cadence of the steps. */
  enrageAfterTurn: number | null;
  enrageEvery: number;
  /** Steps already applied, and the boss's own turns so far (the countdown). */
  enrageSteps: number;
  turnsTaken: number;
  /** Ids of counting passives that have broken this fight (Gravemaw's hide). */
  brokenPassives: string[];
  /** The phase the fight is in and how many there are (BOSSES.md §3); 1 of 1 for most bosses. */
  phase: number;
  phaseCount: number;
  /**
   * The escort that takes a share of hits meant for this boss (BOSSES.md §3), and that share.
   * Which of them still stands is read from their own `alive` in the same view.
   */
  adds: { ids: readonly string[]; percent: number } | null;
}

export interface UnitView {
  id: string;
  side: 'ally' | 'enemy';
  name: string;
  defId: string;
  instanceId: string | null;
  slot: number;
  level: number;
  element: Element;
  role: Role;
  hp: number;
  maxHp: number;
  shield: number;
  tm: number;
  alive: boolean;
  isBoss: boolean;
  /**
   * The boss this unit shields, if it is part of an escort (BOSSES.md §3). The stage gives such a
   * unit its own mark, since its master's sprite is drawn over the ordinary ones.
   */
  guarding: string | null;
  statuses: { id: StatusId; turns: number; stacks: number; value: number }[];
  abilities: { id: string; slot: AbilitySlot; cooldown: number; ready: boolean }[];
  art: { model: string; tint: string | null; facing: 'left' | 'right'; scale: number; desaturate: boolean };
  /** Boss HUD facts; `null` for every other unit. */
  boss: BossUnitView | null;
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

/**
 * Counting passives that can no longer hold: a `damage_reduction` whose `selfDistinctDebuffsBelow`
 * threshold the unit has already passed (BOSSES.md §2, Tyrant's Hide).
 */
function brokenPassives(u: BattleUnit): string[] {
  const taken = u.flags.debuffKindsTaken.length;
  return u.passives
    .filter(
      (passive) =>
        passive.trigger === 'static' &&
        passive.effects.some(
          (effect) =>
            effect.kind === 'damage_reduction' &&
            effect.if !== undefined &&
            'selfDistinctDebuffsBelow' in effect.if &&
            taken >= effect.if.selfDistinctDebuffsBelow,
        ),
    )
    .map((passive) => passive.id);
}

/** The serialisable view of one unit (plates, result screen, spawn events). */
export function unitView(u: BattleUnit): UnitView {
  return {
    id: u.id,
    side: u.side,
    name: u.name,
    defId: u.defId,
    instanceId: u.instanceId,
    slot: u.slot,
    level: u.level,
    element: u.element,
    role: u.role,
    hp: u.hp,
    maxHp: u.maxHp,
    shield: shieldTotal(u),
    tm: u.tm,
    alive: u.alive,
    isBoss: u.isBoss,
    guarding: u.guards?.unitId ?? null,
    statuses: u.statuses.map((s) => ({ id: s.id, turns: s.turns, stacks: s.stacks, value: s.value })),
    abilities: u.abilities.map((a) => ({
      id: a.id,
      slot: a.slot,
      cooldown: a.cooldown,
      ready: a.cooldown === 0,
    })),
    art: { ...u.art },
    boss: u.isBoss
      ? {
          immunities: [...u.immunities],
          enrageAfterTurn: u.enrageAfterTurn,
          enrageEvery: u.enrageEvery,
          enrageSteps: u.flags.enrageSteps,
          turnsTaken: u.flags.turnsTaken,
          brokenPassives: brokenPassives(u),
          phase: u.phase,
          phaseCount: u.phaseThresholds.length + 1,
          adds: u.adds ? { ids: [...u.adds.ids], percent: u.addsSpec?.guardPercent ?? 0 } : null,
        }
      : null,
  };
}

export function snapshot(state: BattleState): BattleView {
  return {
    encounterId: state.encounterId,
    units: state.order
      .map((id) => state.units[id])
      .filter((u): u is NonNullable<typeof u> => !!u)
      .map(unitView),
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
