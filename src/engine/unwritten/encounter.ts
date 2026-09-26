/**
 * A passage's fight (docs/design/UNWRITTEN.md §6).
 *
 * Built from the expedition, never authored: the folio's faction and a window of its units for a
 * Skirmish, the faction's named boss and an escort for an Elite, the folio's Warden (and its choir)
 * for the Warden. Pitched at Intro and stage 0 like the tower, so `unwrittenScale` is the one curve
 * acting on a foe; the Omen's and the blots' cruelties arrive through the foes' own definitions,
 * which this module hands the battle in place of the registry's. A contested passage (§4.2) is
 * rebuilt from the wave it stands at, its surviving foes entering at the wounds they kept.
 */
import {
  DEPTH_PER_FOLIO,
  ELITE_SCALE,
  TURN_LIMIT,
  UNWRITTEN_PARTY,
  WAVE_MAX,
  unwrittenEnemyLevel,
  unwrittenScale,
} from '@content/balance/unwritten';
import type { EncounterDef, EncounterEnemy, EncounterWave } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import type { FightKind, FolioDef } from '@content/unwritten/types';
import { createRng } from '@engine/rng/rng';
import type { Expedition, Passage, Pending } from '@engine/schema/unwritten-save';
import { passivesOf } from './passives';
import type { Rules } from './rules';
import type { UnwrittenWorld } from './world';

export type FightPending = Extract<Pending, { kind: 'fight' }>;

/** How deep a passage stands in the expedition: `(folio − 1) × 9 + row`. */
export function depthOf(folio: number, row: number): number {
  return (folio - 1) * DEPTH_PER_FOLIO + row;
}

/**
 * `encounter.unwritten.<kind>` — the id the battle and the lifetime counters know the fight by. One
 * per kind rather than per passage: the maps are drawn anew every folio, and `battles.fought.<id>`
 * would otherwise gather a key for every place a company has ever stood.
 */
export function unwrittenEncounterId(kind: FightKind | 'duel'): string {
  return `encounter.unwritten.${kind}`;
}

export interface FightInput {
  run: Expedition;
  passage: Passage;
  pending: FightPending;
  folio: FolioDef;
  rules: Rules;
  world: UnwrittenWorld;
}

export interface BuiltFight {
  encounter: EncounterDef;
  /** The fight's own foes: the registry's, bent by the Omen, the blots and the affixes. */
  enemyById: (id: string) => EnemyDef | undefined;
  /** The first wave's foes' entry shares by slot, when the passage is contested. */
  firstWaveHp: number[] | undefined;
}

/** The faction a fight draws on: its passage's, or — for a mystery's duel or ambush — one drawn for it. */
function factionOf(input: FightInput): string {
  const { run, passage, folio } = input;
  if (passage.faction) return passage.faction;
  return createRng(`${run.seed}:faction:${folio.index}:${passage.id}`).pick(folio.factions);
}

/** Every wave of the passage, from the first, as drawn. */
function allWaves(input: FightInput, kind: FightKind, statMult: number): EncounterWave[] {
  const { run, passage, folio, rules, world } = input;
  if (kind === 'warden') {
    const warden = world.enemyById(folio.warden);
    const adds = warden?.boss?.adds;
    const escort: EncounterEnemy[] = adds
      ? Array.from({ length: adds.count }, () => ({ enemyId: adds.enemyId, statMult }))
      : [];
    return [{ enemies: [{ enemyId: folio.warden, statMult }, ...escort] }];
  }
  const faction = world.factionById(factionOf(input));
  if (!faction) return [];
  const units = faction.units;
  const offset = createRng(`${run.seed}:foes:${folio.index}:${passage.id}`).int(0, units.length - 1);
  const unit = (i: number): EncounterEnemy => ({
    enemyId: units[(offset + i) % units.length]?.id ?? '',
    statMult,
  });
  if (kind === 'elite') {
    return [
      {
        enemies: [
          { enemyId: faction.boss.id, statMult },
          ...Array.from({ length: folio.escort }, (_, i) => unit(i)),
        ],
      },
    ];
  }
  const sizes = folio.waves.map((size) => Math.min(WAVE_MAX, size + rules.skirmish_extra_foe));
  let taken = 0;
  return sizes.map((size) => {
    const enemies = Array.from({ length: size }, (_, i) => unit(taken + i));
    taken += size;
    return { enemies };
  });
}

/** The foes of a fight, bent by the rules and marked with the passage's affixes. */
function foesOf(
  input: FightInput,
  kind: FightKind,
  marked: string | null,
): (id: string) => EnemyDef | undefined {
  const { run, rules, world } = input;
  const { content } = world;
  // A blot's cruelty rides on every foe; an affix only on the foe it marks.
  const cruelty = run.blots.flatMap((id) => {
    const blot = content.blots.find((b) => b.id === id);
    return blot ? passivesOf({ ...blot, id: `${blot.id}.foe` }, blot.grant.foes) : [];
  });
  const affixes = input.passage.affixes.flatMap((id) => {
    const affix = content.affixes.find((a) => a.id === id);
    return affix ? passivesOf(affix, affix.passives) : [];
  });
  const unwriter = content.folios[content.folios.length - 1]?.warden;
  const cache = new Map<string, EnemyDef>();
  return (id) => {
    const cached = cache.get(id);
    if (cached) return cached;
    const def = world.enemyById(id);
    if (!def) return undefined;
    const isMarked = id === marked;
    const hp =
      1 +
      rules.enemy_hp +
      (kind === 'elite' && isMarked ? rules.elite_hp : 0) +
      (kind === 'warden' && isMarked
        ? rules.warden_hp + run.flags.wardenHp + (id === unwriter ? rules.unwriter_hp : 0)
        : 0);
    const phases =
      id === unwriter &&
      def.boss?.phases &&
      rules.unwriter_last_phase > (def.boss.phases[def.boss.phases.length - 1] ?? 0)
        ? [...def.boss.phases.slice(0, -1), rules.unwriter_last_phase]
        : def.boss?.phases;
    const bent: EnemyDef = {
      ...def,
      stats: {
        ...def.stats,
        hp: Math.max(1, Math.round(def.stats.hp * Math.max(0.1, hp))),
        atk: Math.round(def.stats.atk * (1 + rules.enemy_atk)),
        spd: def.stats.spd + rules.enemy_spd,
      },
      passives: [...def.passives, ...cruelty, ...(isMarked ? affixes : [])],
      ...(def.boss ? { boss: { ...def.boss, ...(phases ? { phases } : {}) } } : {}),
    };
    cache.set(id, bent);
    return bent;
  };
}

/** The fight standing at a passage, from the wave it has reached. */
export function passageFight(input: FightInput): BuiltFight {
  const { run, passage, pending, folio } = input;
  const kind = pending.fight;
  const depth = depthOf(folio.index, passage.row);
  const scale =
    unwrittenScale(run.omen, depth) *
    (kind === 'elite' ? ELITE_SCALE : kind === 'warden' ? folio.wardenScale : 1);
  const waves = allWaves(input, kind, scale);
  const marked = kind === 'skirmish' ? null : (waves[0]?.enemies[0]?.enemyId ?? null);
  const remaining = waves.slice(Math.min(pending.wave, Math.max(0, waves.length - 1)));
  const wounds = pending.wounds;
  if (wounds && remaining.length)
    remaining[0] = { enemies: wounds.map((w) => ({ enemyId: w.enemyId, statMult: scale })) };
  const encounter: EncounterDef = {
    id: unwrittenEncounterId(pending.duel ? 'duel' : kind),
    name: `unwritten.encounter.${pending.duel ? 'duel' : kind}.name`,
    description: `unwritten.encounter.${pending.duel ? 'duel' : kind}.description`,
    kind: 'unwritten',
    partySize: UNWRITTEN_PARTY,
    // Intro × stage 0 = 1: `unwrittenScale` is the only curve on a foe of the Unwritten.
    difficulty: 'intro',
    stageIndex: 0,
    enemyLevel: unwrittenEnemyLevel(run.omen, depth),
    waves: remaining,
    turnLimit: TURN_LIMIT[kind],
    turnLimitMode: 'ally',
    // Time running out keeps both sides' wounds, like a retreat (§4.2), rather than felling anyone.
    timeUpIsDefeat: false,
    backdrop: folio.backdrop,
    music: kind === 'warden' ? 'boss' : 'battle',
    surface: folio.surface,
    version: 1,
  };
  return {
    encounter,
    enemyById: foesOf(input, kind, marked),
    firstWaveHp: wounds ? wounds.map((w) => w.hp) : undefined,
  };
}
