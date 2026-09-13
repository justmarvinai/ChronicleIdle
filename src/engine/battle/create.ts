/**
 * Builds the initial battle state from a party of roster instances and an encounter
 * (docs/tech/ARCHITECTURE.md §3.2). Enemy stats scale per BATTLE.md §4.5; every wave's units
 * are created up front so ids are stable for the presenter.
 */
import { effectiveAbility } from '@engine/champions/describe';
import type { ChampionInstance } from '@engine/champions/instance';
import { baseStats } from '@engine/champions/stats';
import { createRng } from '@engine/rng/rng';
import {
  BOSS_ATK_DEF_MULT,
  BOSS_HP_MULT,
  BOSS_SPD_ADD,
  DIFFICULTY_MULT,
  stageScale,
  type AbilityDef,
  type ChampionDef,
  type ChampionStats,
  type EncounterDef,
  type EnemyDef,
} from './imports';
import { entryMaxHp } from './stats';
import type { BattleState, BattleUnit, UnitFlags, WaveSpec } from './types';

export interface PartyMember {
  instance: ChampionInstance;
  def: ChampionDef;
}

export interface BattleSetup {
  encounter: EncounterDef;
  /** Slot order; slot 0 is the leader whose aura applies. */
  party: PartyMember[];
  enemyById: (id: string) => EnemyDef | undefined;
  control: 'manual' | 'auto';
}

function freshFlags(): UnitFlags {
  return {
    survivedLethal: false,
    onDeathFired: false,
    shieldedThisWave: [],
    turnsTaken: 0,
    healNextTurn: 0,
    enrageSteps: 0,
    lastActionSeq: 0,
    actionDamage: 0,
    firedOnce: [],
    extraTurn: false,
    pendingTm: 0,
  };
}

function abilitiesOf(defs: readonly AbilityDef[], upgrades: Record<string, number>): BattleUnit['abilities'] {
  return defs.map((def) => {
    const effective = effectiveAbility(def, upgrades[def.id] ?? 0);
    return {
      id: def.id,
      slot: def.slot,
      def: effective,
      cooldown: def.startsOnCooldown ? effective.cooldown : 0,
    };
  });
}

export function allyUnit(member: PartyMember, slot: number, leader: boolean): BattleUnit {
  const { instance, def } = member;
  const stats = baseStats(def.stats, instance.stars, instance.level);
  return {
    id: `a${slot}`,
    side: 'ally',
    name: def.name,
    defId: def.id,
    instanceId: instance.instanceId,
    slot,
    level: instance.level,
    stars: instance.stars,
    rarity: def.rarity,
    element: def.element,
    role: def.role,
    base: stats,
    maxHp: stats.hp,
    hp: stats.hp,
    tm: 0,
    alive: true,
    statuses: [],
    abilities: abilitiesOf(def.abilities, instance.skillUpgrades),
    passives: def.passive ? [def.passive] : [],
    aura: leader && def.aura ? def.aura : null,
    isBoss: false,
    damageTakenMult: 1,
    immunities: [],
    rotation: null,
    rotationIndex: 0,
    enrageAfterTurn: null,
    flags: freshFlags(),
    art: { model: def.art.model, tint: def.art.tint, facing: def.art.facing, scale: 1 },
  };
}

/** `archetypeBase × DIFFICULTY_MULT × stageScale(stageIndex)` (+ boss multipliers). */
export function scaledEnemyStats(def: EnemyDef, encounter: EncounterDef, statMult = 1): ChampionStats {
  const scale = DIFFICULTY_MULT[encounter.difficulty] * stageScale(encounter.stageIndex) * statMult;
  const boss = def.boss
    ? { hp: BOSS_HP_MULT, atkDef: BOSS_ATK_DEF_MULT, spd: BOSS_SPD_ADD }
    : { hp: 1, atkDef: 1, spd: 0 };
  return {
    hp: Math.round(def.stats.hp * scale * boss.hp),
    atk: Math.round(def.stats.atk * scale * boss.atkDef),
    def: Math.round(def.stats.def * scale * boss.atkDef),
    spd: def.stats.spd + boss.spd,
    critRate: def.stats.critRate,
    critDmg: def.stats.critDmg,
    res: def.stats.res,
    acc: def.stats.acc,
  };
}

export function enemyUnit(
  def: EnemyDef,
  encounter: EncounterDef,
  wave: number,
  slot: number,
  statMult = 1,
): BattleUnit {
  const stats = scaledEnemyStats(def, encounter, statMult);
  return {
    id: `w${wave}e${slot}`,
    side: 'enemy',
    name: def.name,
    defId: def.id,
    instanceId: null,
    slot,
    level: encounter.enemyLevel,
    stars: null,
    rarity: null,
    element: def.element,
    role: def.role,
    base: stats,
    maxHp: stats.hp,
    hp: stats.hp,
    tm: 0,
    alive: true,
    statuses: [],
    abilities: abilitiesOf(def.abilities, {}),
    passives: def.passives,
    aura: null,
    isBoss: !!def.boss,
    damageTakenMult: def.boss?.damageTakenMult ?? 1,
    immunities: def.boss?.immunities ?? [],
    rotation: def.boss?.rotation ?? null,
    rotationIndex: 0,
    enrageAfterTurn: def.boss?.enrageAfterTurn ?? null,
    flags: freshFlags(),
    art: { model: def.art.model, tint: def.art.tint, facing: def.art.facing, scale: def.art.scale },
  };
}

export function createBattle(setup: BattleSetup, seed: string): BattleState {
  const { encounter } = setup;
  if (setup.party.length === 0) throw new Error('A battle needs at least one champion');
  if (setup.party.length > encounter.partySize)
    throw new Error(`Party of ${setup.party.length} exceeds the encounter's ${encounter.partySize} slots`);
  const allies = setup.party.map((member, slot) => allyUnit(member, slot, slot === 0));
  const waves: WaveSpec[] = encounter.waves.map((wave, waveIndex) => ({
    enemies: wave.enemies.map((spawn, slot) => {
      const def = setup.enemyById(spawn.enemyId);
      if (!def) throw new Error(`Unknown enemy ${spawn.enemyId}`);
      return { unit: enemyUnit(def, encounter, waveIndex, slot, spawn.statMult ?? 1) };
    }),
  }));
  if (!waves.length) throw new Error('An encounter needs at least one wave');
  const state: BattleState = {
    seed,
    rng: createRng(`battle:${seed}`),
    encounterId: encounter.id,
    kind: encounter.kind,
    partySize: encounter.partySize,
    units: {},
    order: [],
    pendingWaves: waves.slice(1),
    waveIndex: 0,
    waveCount: waves.length,
    turn: 0,
    allyTurns: 0,
    turnLimit: encounter.turnLimit,
    turnLimitMode: encounter.turnLimitMode,
    timeUpIsDefeat: encounter.timeUpIsDefeat,
    actionSeq: 0,
    lastHitDamage: 0,
    waveFresh: true,
    phase: 'running',
    control: setup.control,
    pending: null,
    decisions: [],
    reports: {},
    outcome: null,
  };
  for (const unit of allies) {
    state.units[unit.id] = unit;
    state.order.push(unit.id);
  }
  // Static HP modifiers (auras, passives) settle max HP once everyone is on the field.
  for (const unit of allies) {
    unit.maxHp = entryMaxHp(state, unit);
    unit.hp = unit.maxHp;
  }
  spawnWave(state, waves[0] as WaveSpec);
  return state;
}

/** Puts a wave's enemies on the field (the first wave at creation, later waves in `step`). */
export function spawnWave(state: BattleState, wave: WaveSpec): void {
  for (const { unit } of wave.enemies) {
    state.units[unit.id] = unit;
    state.order.push(unit.id);
  }
  for (const { unit } of wave.enemies) {
    unit.maxHp = entryMaxHp(state, unit);
    unit.hp = unit.maxHp;
  }
}
