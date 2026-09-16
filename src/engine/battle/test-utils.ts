/**
 * Fixtures for battle tests: minimal champion/enemy/encounter definitions with predictable
 * numbers, and helpers to run manual turns. Not a test file (no `.test.` suffix).
 */
import type {
  AbilityDef,
  ChampionDef,
  ChampionStats,
  Effect,
  PassiveDef,
  AuraDef,
} from '@content/champions/types';
import type { EncounterDef } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import { createInstance, type ChampionInstance } from '@engine/champions/instance';
import type { GearSetDef } from '@content/sets/types';
import { createBattle, type PartyMember } from './create';
import { step } from './step';
import type { BattleEvent, BattleState, Decision, StepResult } from './types';

export const FLAT_STATS: ChampionStats = {
  hp: 10_000,
  atk: 1_000,
  def: 500,
  spd: 100,
  critRate: 0,
  critDmg: 50,
  res: 0,
  acc: 0,
};

let counter = 0;

export function ability(
  slot: AbilityDef['slot'],
  effects: Effect[],
  extra: Partial<Pick<AbilityDef, 'cooldown' | 'startsOnCooldown' | 'minPhase' | 'ai' | 'upgrades'>> = {},
): AbilityDef {
  const id = `ab.test.${slot}.${++counter}`;
  return {
    slot,
    id,
    name: `${id}.name`,
    description: `${id}.description`,
    icon: 'spell.fire_flame_burst',
    cooldown: extra.cooldown ?? (slot === 'a1' ? 0 : 3),
    ...(extra.startsOnCooldown ? { startsOnCooldown: true } : {}),
    ...(extra.minPhase === undefined ? {} : { minPhase: extra.minPhase }),
    effects,
    upgrades: extra.upgrades ?? [],
    ai: extra.ai ?? { priority: slot === 'a1' ? 1 : 2 },
  };
}

export interface ChampionFixture {
  id?: string;
  stats?: Partial<ChampionStats>;
  element?: ChampionDef['element'];
  abilities?: AbilityDef[];
  passive?: PassiveDef;
  aura?: AuraDef;
  level?: number;
  stars?: number;
}

export function champion(fixture: ChampionFixture = {}): { def: ChampionDef; instance: ChampionInstance } {
  const id = (fixture.id ?? `champ.test_${++counter}`) as ChampionDef['id'];
  const def: ChampionDef = {
    id,
    name: `${id}.name`,
    lore: `${id}.lore`,
    rarity: 'rare',
    element: fixture.element ?? 'justice',
    role: 'attack',
    stats: { ...FLAT_STATS, ...fixture.stats },
    art: {
      model: 'model.teritorial_lizard',
      avatar: 'avatar.teritorial_lizard',
      facing: 'left',
      tint: '#ffffff',
      placeholder: true,
    },
    obtain: ['summon'],
    abilities: fixture.abilities ?? [
      ability('a1', [{ kind: 'damage', target: 'single_enemy', mult: 1, stat: 'ATK' }]),
    ],
    ...(fixture.passive ? { passive: fixture.passive } : {}),
    ...(fixture.aura ? { aura: fixture.aura } : {}),
    version: 1,
  };
  const instance = createInstance(def, { instanceId: `${id}-1`, now: 0, source: 'summon' });
  // Tests reason about flat numbers: 6★ level 60 returns the authored stats unchanged.
  instance.stars = fixture.stars ?? 6;
  instance.level = fixture.level ?? 60;
  return { def, instance };
}

export function passive(
  trigger: PassiveDef['trigger'],
  effects: PassiveDef['effects'],
  extra: { oncePerBattle?: boolean } = {},
): PassiveDef {
  const id = `ab.test.passive.${++counter}`;
  return {
    id,
    name: `${id}.name`,
    description: `${id}.description`,
    icon: 'spell.icon_meditation',
    trigger,
    effects,
    ...(extra.oncePerBattle ? { oncePerBattle: true } : {}),
  };
}

export interface EnemyFixture {
  id?: string;
  stats?: Partial<ChampionStats>;
  element?: EnemyDef['element'];
  abilities?: AbilityDef[];
  passives?: PassiveDef[];
  boss?: EnemyDef['boss'];
}

export function enemy(fixture: EnemyFixture = {}): EnemyDef {
  const id = fixture.id ?? `enemy.test_${++counter}`;
  return {
    id,
    name: `${id}.name`,
    archetype: fixture.boss ? 'boss' : 'raider',
    element: fixture.element ?? 'valor',
    role: 'attack',
    stats: { ...FLAT_STATS, ...fixture.stats },
    art: { model: 'model.teritorial_lizard', tint: '#ff0000', facing: 'left', scale: 1 },
    abilities: fixture.abilities ?? [
      ability('a1', [{ kind: 'damage', target: 'single_enemy', mult: 1, stat: 'ATK' }]),
    ],
    passives: fixture.passives ?? [],
    ...(fixture.boss ? { boss: fixture.boss } : {}),
    version: 1,
  };
}

export function encounter(waves: EnemyDef[][], extra: Partial<EncounterDef> = {}): EncounterDef {
  return {
    id: 'encounter.test',
    name: 'encounter.test.name',
    description: 'encounter.test.description',
    kind: 'training',
    partySize: 3,
    difficulty: 'intro',
    stageIndex: 0,
    enemyLevel: 60,
    waves: waves.map((wave) => ({ enemies: wave.map((e) => ({ enemyId: e.id })) })),
    turnLimit: 40,
    turnLimitMode: 'ally',
    timeUpIsDefeat: true,
    backdrop: 'bg.bg7',
    music: 'battle',
    surface: 'dirt',
    version: 1,
    ...extra,
  };
}

export interface BattleFixture {
  party: PartyMember[];
  waves: EnemyDef[][];
  seed?: string;
  control?: 'manual' | 'auto';
  encounter?: Partial<EncounterDef>;
  /** Resolves worn pieces' sets, so a geared fixture gets its set bonuses (`GEAR.md` §5). */
  setById?: (id: string) => GearSetDef | undefined;
}

export function battle(fixture: BattleFixture): BattleState {
  const enemies = new Map<string, EnemyDef>();
  for (const wave of fixture.waves) for (const e of wave) enemies.set(e.id, e);
  return createBattle(
    {
      encounter: encounter(fixture.waves, fixture.encounter),
      party: fixture.party,
      enemyById: (id) => enemies.get(id),
      ...(fixture.setById ? { setById: fixture.setById } : {}),
      control: fixture.control ?? 'manual',
    },
    fixture.seed ?? 'test',
  );
}

/** Steps until a decision request for `unitId` appears (enemy turns resolve automatically). */
export function untilTurnOf(
  state: BattleState,
  unitId: string,
  max = 50,
): { events: BattleEvent[]; result: StepResult } {
  const events: BattleEvent[] = [];
  for (let i = 0; i < max; i++) {
    const result = step(state);
    events.push(...result.events);
    if (result.outcome) return { events, result };
    if (result.request && result.request.unitId === unitId) return { events, result };
    if (result.request) {
      // Another ally's turn: use its A1 on the auto target so the sequence keeps moving.
      const a1 = result.request.abilities[0];
      if (!a1) throw new Error('no abilities');
      const decision = { unitId: result.request.unitId, abilityId: a1.abilityId, targetId: a1.autoTarget };
      events.push(...step(state, decision).events);
    }
  }
  throw new Error(`Turn of ${unitId} never came`);
}

/** Resolves the pending request with the given ability (by slot) and target. */
export function decide(state: BattleState, slot: AbilityDef['slot'], targetId: string | null): BattleEvent[] {
  const pending = state.pending;
  if (!pending) throw new Error('no pending decision');
  const choice = pending.abilities.find((a) => a.slot === slot);
  if (!choice) throw new Error(`no ability in slot ${slot}`);
  const decision: Decision = { unitId: pending.unitId, abilityId: choice.abilityId, targetId };
  return step(state, decision).events;
}

export function eventsOf<T extends BattleEvent['type']>(
  events: readonly BattleEvent[],
  type: T,
): Extract<BattleEvent, { type: T }>[] {
  return events.filter((e): e is Extract<BattleEvent, { type: T }> => e.type === type);
}
