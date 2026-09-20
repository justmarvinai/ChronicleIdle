/**
 * Battle simulation types (docs/tech/ARCHITECTURE.md §3.2, docs/design/BATTLE.md). The state
 * is a plain mutable object owned by one `step` loop: `step(state, decision)` advances it in
 * place and returns the events of that turn. A whole battle is a pure function of
 * `(setup, seed, decisions)`; `replay` proves it.
 */
import type { Rng } from '@engine/rng/rng';
import type { UnitView } from './snapshot';
import type {
  AbilityDef,
  AbilitySlot,
  AuraDef,
  ChampionStats,
  Element,
  EncounterKind,
  EnemyAddsConfig,
  PassiveDef,
  Rarity,
  Role,
  StatusId,
} from './imports';

export type Side = 'ally' | 'enemy';

export interface StatusInstance {
  id: StatusId;
  /** Remaining turns of the affected unit; decremented at that unit's turn start. */
  turns: number;
  /** Percent / flat value per BATTLE.md §5 (shields: remaining HP absorbed; bleed: damage per tick). */
  value: number;
  stacks: number;
  /** Unit that placed it (Provoke target, Ally Protection protector, Burn ATK). */
  sourceId: string;
  /** `state.actionSeq` when placed: a status placed during the unit's own action is not decremented that same turn. */
  placedAt: number;
}

export interface UnitAbility {
  id: string;
  slot: AbilitySlot;
  /** Effective definition with the instance's skill-tome upgrades folded in. */
  def: AbilityDef;
  /** Turns until usable again (0 = ready). */
  cooldown: number;
}

export interface UnitFlags {
  survivedLethal: boolean;
  onDeathFired: boolean;
  /** Ally ids already shielded this wave by `shield_ally_below`. */
  shieldedThisWave: string[];
  /** Own turns taken (boss enrage, "first action of a wave" checks). */
  turnsTaken: number;
  /** Heal owed at the next turn start (`survive_lethal.healNextTurn`, % of max HP). */
  healNextTurn: number;
  /** Enrage steps applied to a boss. */
  enrageSteps: number;
  /** The boss's own turn at which its adds were last revived (BOSSES.md §3). */
  addsRevivedTurn: number;
  /** `state.actionSeq` of the unit's latest own action (self-placed statuses skip their first tick). */
  lastActionSeq: number;
  /** Damage dealt by this unit's current action (Leech), reset per action. */
  actionDamage: number;
  /** Ids of `oncePerBattle` passives that already fired. */
  firedOnce: string[];
  /** Granted an extra turn by an effect during this action (TM resets to 1 instead of 0). */
  extraTurn: boolean;
  /** TM the acting unit gained during its own action; applied after the end-of-turn reset. */
  pendingTm: number;
  /** Distinct debuff kinds that have landed on this unit (Gravemaw's hide counts them). */
  debuffKindsTaken: StatusId[];
}

export interface BattleUnit {
  id: string;
  side: Side;
  /** i18n key. */
  name: string;
  /** Champion or enemy definition id. */
  defId: string;
  /** Roster instance id for allies (result application). */
  instanceId: string | null;
  slot: number;
  level: number;
  stars: number | null;
  rarity: Rarity | null;
  element: Element;
  role: Role;
  /** Battle-entry stats: instance stats (allies) or scaled archetype stats (enemies). */
  base: ChampionStats;
  maxHp: number;
  hp: number;
  tm: number;
  alive: boolean;
  statuses: StatusInstance[];
  abilities: UnitAbility[];
  passives: PassiveDef[];
  /** Applies to the whole party (leader's aura); stored on the leader only. */
  aura: AuraDef | null;
  isBoss: boolean;
  damageTakenMult: number;
  immunities: StatusId[];
  rotation: AbilitySlot[] | null;
  rotationIndex: number;
  enrageAfterTurn: number | null;
  /** Own turns between enrage steps (the boss block's cadence, BOSSES.md §1). */
  enrageEvery: number;
  /** Descending HP fractions that start each phase; empty for a fight of one gear. */
  phaseThresholds: number[];
  /** The phase the fight is in, from 1. Read at the unit's own turn. */
  phase: number;
  /**
   * An add that shields its master: this share of a hit on `unitId` lands here instead, for as
   * long as this unit lives (BOSSES.md §3).
   */
  guards: { unitId: string; percent: number } | null;
  /** The adds this boss fields, once the wave has placed them. */
  adds: { ids: string[]; every: number; hpPercent: number } | null;
  /** What the adds block was authored as, before the wave resolved its ids. */
  addsSpec: EnemyAddsConfig | null;
  flags: UnitFlags;
  /** Presentation hints carried so the renderer never looks content up mid-battle. */
  art: {
    model: string;
    tint: string | null;
    facing: 'left' | 'right';
    scale: number;
    /** Wash the model's own colours out before the tint (docs/tech/ASSETS.md §3). */
    desaturate: boolean;
  };
}

export interface WaveSpec {
  enemies: { unit: BattleUnit }[];
}

export interface Decision {
  unitId: string;
  abilityId: string;
  targetId: string | null;
}

export type Targeting = 'single_enemy' | 'single_ally' | 'none';

export interface AbilityChoice {
  abilityId: string;
  slot: AbilitySlot;
  ready: boolean;
  cooldown: number;
  targeting: Targeting;
  validTargets: string[];
  /** The target the AI policy would pick; the UI preselects it. */
  autoTarget: string | null;
}

export interface DecisionRequest {
  unitId: string;
  abilities: AbilityChoice[];
  /** Provoke: the only legal decision. */
  forced: { abilityId: string; targetId: string } | null;
}

export type BattleOutcomeKind = 'victory' | 'defeat' | 'timeout' | 'retreat';

export interface UnitReport {
  unitId: string;
  defId: string;
  instanceId: string | null;
  side: Side;
  alive: boolean;
  /** Went down at any point, revived or not — the campaign's second star asks for this (CAMPAIGN.md §3). */
  died: boolean;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  kills: number;
}

export interface BattleOutcome {
  kind: BattleOutcomeKind;
  /** Total actions and ally actions taken. */
  turns: number;
  allyTurns: number;
  wavesCleared: number;
  waveCount: number;
  units: UnitReport[];
  /** Remaining enemy HP as a fraction of the last wave's total (defeat hints). */
  enemyHpLeft: number;
  seed: string;
  decisions: Decision[];
}

export type ElementMatch = 'strong' | 'weak' | 'neutral';

export type BattleEvent =
  | { type: 'battle.started'; seed: string; waveCount: number }
  | { type: 'wave.started'; wave: number; waveCount: number; enemyIds: string[]; units: UnitView[] }
  | { type: 'turn.started'; unitId: string; turn: number; allyTurns: number; tm: Record<string, number> }
  | { type: 'turn.skipped'; unitId: string; reason: 'stun' | 'freeze' | 'sleep' | 'fear' }
  | { type: 'dot.tick'; unitId: string; status: StatusId; amount: number; hpAfter: number }
  | {
      type: 'ability.cast';
      unitId: string;
      abilityId: string;
      slot: AbilitySlot;
      targetId: string | null;
      counter: boolean;
    }
  | {
      type: 'hit';
      sourceId: string;
      targetId: string;
      abilityId: string;
      damage: number;
      absorbed: number;
      crit: boolean;
      match: ElementMatch;
      hpAfter: number;
      shieldAfter: number;
      killed: boolean;
      /** Set when Ally Protection moved part of a hit onto the protector. */
      redirectedFrom: string | null;
    }
  | {
      type: 'heal';
      sourceId: string;
      targetId: string;
      amount: number;
      hpAfter: number;
      reason: 'ability' | 'regen' | 'leech' | 'survive';
    }
  | {
      type: 'status.applied';
      targetId: string;
      sourceId: string;
      status: StatusId;
      turns: number;
      value: number;
      stacks: number;
      refreshed: boolean;
    }
  | {
      type: 'status.failed';
      targetId: string;
      sourceId: string;
      status: StatusId;
      reason: 'missed' | 'resisted' | 'blocked' | 'immune' | 'full';
    }
  | {
      type: 'status.removed';
      targetId: string;
      status: StatusId;
      reason: 'expired' | 'cleansed' | 'stripped' | 'consumed' | 'woke';
    }
  | { type: 'tm.changed'; targetId: string; sourceId: string; delta: number; tmAfter: number }
  /**
   * A passive's condition can no longer be met for the rest of the fight — Gravemaw's hide once
   * five distinct debuffs have landed. The HUD calls it out; nothing in the simulation reads it.
   */
  | { type: 'passive.broken'; unitId: string; passiveId: string }
  | { type: 'unit.died'; unitId: string; killerId: string | null }
  | {
      type: 'unit.revived';
      unitId: string;
      hpAfter: number;
      reason: 'ability' | 'revive_on_death' | 'survive_lethal';
    }
  | { type: 'extra_turn'; unitId: string }
  | { type: 'passive.triggered'; unitId: string; passiveId: string }
  | { type: 'enraged'; unitId: string; steps: number }
  /** A boss crossed an HP threshold: what it turns on is in the content (BOSSES.md §3). */
  | { type: 'phase.changed'; unitId: string; phase: number }
  | { type: 'turn.ended'; unitId: string; tm: Record<string, number> }
  | { type: 'wave.cleared'; wave: number; waveCount: number }
  | { type: 'battle.ended'; outcome: BattleOutcome };

export type BattlePhase = 'running' | 'awaiting_decision' | 'ended';

export interface BattleState {
  seed: string;
  rng: Rng;
  encounterId: string;
  kind: EncounterKind;
  partySize: number;
  units: Record<string, BattleUnit>;
  /** Stable iteration order: allies by slot, then the current wave's enemies by slot. */
  order: string[];
  /** Waves not yet started (the first wave is spawned by `createBattle`). */
  pendingWaves: WaveSpec[];
  waveIndex: number;
  waveCount: number;
  /** Total actions taken and ally actions taken. */
  turn: number;
  allyTurns: number;
  turnLimit: number;
  turnLimitMode: 'ally' | 'all';
  timeUpIsDefeat: boolean;
  /** Incremented per action; statuses remember the action they were placed in. */
  actionSeq: number;
  /** Damage of the most recent hit this action (Bleed ticks are a share of it). */
  lastHitDamage: number;
  /** True until the first ally action of the current wave (AI "prefer buffs at wave start"). */
  waveFresh: boolean;
  phase: BattlePhase;
  control: 'manual' | 'auto';
  /**
   * The enemy the player has marked, if any (BATTLE.md §7.1). An input like `control`, not a
   * recorded decision: while it stands and an ability can reach it, it is the target every ally
   * picks — in manual mode as the preselection, in auto as the policy's answer.
   */
  focusId: string | null;
  pending: DecisionRequest | null;
  decisions: Decision[];
  reports: Record<string, UnitReport>;
  outcome: BattleOutcome | null;
}

export interface StepResult {
  events: BattleEvent[];
  request: DecisionRequest | null;
  outcome: BattleOutcome | null;
}
