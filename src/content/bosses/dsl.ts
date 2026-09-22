/**
 * `defineBoss`: one kit, one tier table, and the enemy each tier fields.
 *
 * The kit is authored once — a boss does not fight differently on Brutal, it hits harder — so the
 * abilities, passives, rotation and immunities are built once under `ab.<slug>.*` and every tier's
 * enemy is that definition with its own printed stats. `fixedStats` keeps the campaign's
 * difficulty multiplier and stage curve off them (BOSSES.md §1).
 */
import type { SpellKey } from '@assets/manifest.generated';
import type {
  AbilityDef,
  AbilitySlot,
  ChampionStats,
  Effect,
  PassiveEffect,
  PassiveTrigger,
} from '@content/champions/types';
import { defineEnemy, resolveArt, type EnemyInput, type UnitArt } from '@content/enemies/dsl';
import type { EnemyDef, FactionArchetype } from '@content/enemies/types';
import type { BossChestDef, BossDef, BossTierDef } from './types';

interface BossAbilityInput {
  slot: AbilitySlot;
  key: string;
  icon: SpellKey;
  cooldown?: number;
  startsOnCooldown?: boolean;
  /** Overrides the target the boss singles out (BATTLE.md §7). */
  prefer?: NonNullable<AbilityDef['ai']>['prefer'];
  /** The phase this ability opens in (BOSSES.md §3); until then the rotation passes it over. */
  minPhase?: number;
  effects: Effect[];
}

interface BossPassiveInput {
  key: string;
  icon: SpellKey;
  trigger: PassiveTrigger;
  effects: PassiveEffect[];
}

/**
 * The escort a phased boss brings (BOSSES.md §3). It is a kit like the boss's own — authored once,
 * fielded at every tier's numbers — plus the three numbers that say how it stands in the way.
 */
interface BossAddsInput {
  /** `<snake_case>`; the ids become `enemy.<slug>` and its kit's strings `ab.<slug>.*`. */
  slug: string;
  /** A faction archetype: the escort is rank and file, however grand its master is. */
  archetype: FactionArchetype;
  element: BossDef['element'];
  role: BossDef['role'];
  art: UnitArt;
  /** How many stand with the boss. */
  count: number;
  /** Percentage of a hit on the boss a living add takes instead. */
  guardPercent: number;
  /** Own turns of the boss between revivals; a phase change brings them back as well. */
  reviveEvery: number;
  revivedHpPercent: number;
  abilities: BossAbilityInput[];
  passives?: BossPassiveInput[];
}

interface BossTierInput {
  id: string;
  /** HP / ATK / DEF / SPD / C.RATE / C.DMG / RES / ACC, exactly as BOSSES.md prints them. */
  stats: [number, number, number, number, number, number, number, number];
  /** The escort's own row, in the same order; required when the boss declares adds. */
  addStats?: [number, number, number, number, number, number, number, number];
  turnLimit: number;
  enrageTurn: number;
  enemyLevel: number;
  playerXp: number;
  chests: BossChestDef[];
}

export interface BossInput {
  /** `<snake_case>`; the id becomes `boss.<slug>` and the kit's strings `ab.<slug>.*`. */
  slug: string;
  period: BossDef['period'];
  keysPerPeriod: number;
  unlockLevel: number;
  feature: BossDef['feature'];
  keyCurrency: BossDef['keyCurrency'];
  element: BossDef['element'];
  role: BossDef['role'];
  /** Its own sheet, or the placeholder wearing a tint — see `UnitArt`. */
  art: UnitArt;
  backdrop: BossDef['backdrop'];
  surface: BossDef['surface'];
  immunities: BossDef['immunities'];
  /** Own turns between enrage steps; a race is long, so a boss sets its own cadence. */
  enrageEvery: number;
  /** Descending HP fractions where the fight changes gear (BOSSES.md §3). */
  phases?: number[];
  adds?: BossAddsInput;
  rotation: AbilitySlot[];
  abilities: BossAbilityInput[];
  passives?: BossPassiveInput[];
  tiers: BossTierInput[];
  version?: number;
}

const STAT_KEYS = ['hp', 'atk', 'def', 'spd', 'critRate', 'critDmg', 'res', 'acc'] as const;

function statsOf(row: BossTierInput['stats']): ChampionStats {
  const out = {} as Record<(typeof STAT_KEYS)[number], number>;
  STAT_KEYS.forEach((key, index) => {
    out[key] = row[index] ?? 0;
  });
  return out;
}

const abilitiesOf = (abilities: BossAbilityInput[]): EnemyInput['abilities'] =>
  abilities.map((a) => ({
    slot: a.slot,
    key: a.key,
    icon: a.icon,
    ...(a.cooldown === undefined ? {} : { cooldown: a.cooldown }),
    ...(a.startsOnCooldown ? { startsOnCooldown: true } : {}),
    ...(a.minPhase === undefined ? {} : { minPhase: a.minPhase }),
    effects: a.effects,
    ai: {
      priority: a.slot === 'a1' ? 1 : a.slot === 'a2' ? 2 : 3,
      ...(a.prefer ? { prefer: a.prefer } : {}),
    },
  }));

const passivesOf = (passives: BossPassiveInput[] = []): NonNullable<EnemyInput['passives']> =>
  passives.map((p) => ({ key: p.key, icon: p.icon, trigger: p.trigger, effects: p.effects }));

export function defineBoss(input: BossInput): BossDef {
  const id = `boss.${input.slug}`;
  const version = input.version ?? 1;
  /** Shared by every tier; only the enrage turn is read from the tier itself. */
  const bossBlock = {
    rotation: input.rotation,
    immunities: input.immunities,
    enrageEvery: input.enrageEvery,
    damageTakenMult: 1,
    fixedStats: true,
    ...(input.phases?.length ? { phases: input.phases } : {}),
  };

  /**
   * The escort's kit, authored once like the boss's own. Each tier fields it at that tier's
   * numbers under `enemy.<slug>_<tier>`, and the boss's `adds` block names that id — so the wave
   * the encounter builds links master and escort at spawn without either knowing the other.
   */
  const addsKit: EnemyDef | null = input.adds
    ? defineEnemy({
        id: `enemy.${input.adds.slug}`,
        // Not a boss itself: it carries no boss block, no phases and no escort of its own.
        archetype: input.adds.archetype,
        element: input.adds.element,
        role: input.adds.role,
        stats: input.tiers[0]?.addStats ?? [1, 1, 1, 1, 0, 0, 0, 0],
        art: input.adds.art,
        abilities: abilitiesOf(input.adds.abilities),
        passives: passivesOf(input.adds.passives),
        version,
      })
    : null;

  const addsBlock = input.adds
    ? {
        count: input.adds.count,
        guardPercent: input.adds.guardPercent,
        reviveEvery: input.adds.reviveEvery,
        revivedHpPercent: input.adds.revivedHpPercent,
      }
    : null;

  /** The escort id a tier's boss block points at. */
  const addsIdOf = (tierId: string): string => `enemy.${input.adds?.slug ?? ''}_${tierId}`;

  /** The canonical definition: the kit, the art and the boss block, with no tier's numbers yet. */
  const kit: EnemyDef = defineEnemy({
    id: `enemy.${input.slug}`,
    archetype: 'boss',
    element: input.element,
    role: input.role,
    stats: input.tiers[0]?.stats ?? [1, 1, 1, 1, 0, 0, 0, 0],
    art: input.art,
    abilities: abilitiesOf(input.abilities),
    passives: passivesOf(input.passives),
    boss: {
      ...bossBlock,
      enrageAfterTurn: input.tiers[0]?.enrageTurn ?? 20,
      ...(addsBlock ? { adds: { enemyId: addsIdOf(input.tiers[0]?.id ?? ''), ...addsBlock } } : {}),
    },
    version,
  });

  const tiers: BossTierDef[] = input.tiers.map((tier) => ({
    id: tier.id,
    name: `${id}.tier.${tier.id}`,
    stats: statsOf(tier.stats),
    turnLimit: tier.turnLimit,
    enrageTurn: tier.enrageTurn,
    enemyLevel: tier.enemyLevel,
    playerXp: tier.playerXp,
    chests: tier.chests,
    enemy: {
      ...kit,
      id: `enemy.${input.slug}_${tier.id}`,
      stats: statsOf(tier.stats),
      boss: {
        ...bossBlock,
        enrageAfterTurn: tier.enrageTurn,
        ...(addsBlock ? { adds: { enemyId: addsIdOf(tier.id), ...addsBlock } } : {}),
      },
    },
    adds:
      addsKit && tier.addStats ? { ...addsKit, id: addsIdOf(tier.id), stats: statsOf(tier.addStats) } : null,
  }));

  return {
    id,
    name: `${id}.name`,
    title: `${id}.title`,
    lore: `${id}.lore`,
    period: input.period,
    keysPerPeriod: input.keysPerPeriod,
    unlockLevel: input.unlockLevel,
    feature: input.feature,
    keyCurrency: input.keyCurrency,
    element: input.element,
    role: input.role,
    art: resolveArt(input.art),
    backdrop: input.backdrop,
    surface: input.surface,
    immunities: input.immunities,
    enrageEvery: input.enrageEvery,
    phases: input.phases ?? [],
    adds:
      input.adds && addsKit
        ? {
            name: addsKit.name,
            count: input.adds.count,
            guardPercent: input.adds.guardPercent,
            reviveEvery: input.adds.reviveEvery,
            revivedHpPercent: input.adds.revivedHpPercent,
            art: resolveArt(input.adds.art),
          }
        : null,
    tiers,
    version,
  };
}
