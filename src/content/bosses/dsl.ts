/**
 * `defineBoss`: one kit, one tier table, and the enemy each tier fields.
 *
 * The kit is authored once — a boss does not fight differently on Brutal, it hits harder — so the
 * abilities, passives, rotation and immunities are built once under `ab.<slug>.*` and every tier's
 * enemy is that definition with its own printed stats. `fixedStats` keeps the campaign's
 * difficulty multiplier and stage curve off them (BOSSES.md §1).
 */
import type { ModelKey, SpellKey } from '@assets/manifest.generated';
import type {
  AbilityDef,
  AbilitySlot,
  ChampionStats,
  Effect,
  PassiveEffect,
  PassiveTrigger,
} from '@content/champions/types';
import { defineEnemy } from '@content/enemies/dsl';
import type { EnemyDef } from '@content/enemies/types';
import type { BossChestDef, BossDef, BossTierDef } from './types';

interface BossAbilityInput {
  slot: AbilitySlot;
  key: string;
  icon: SpellKey;
  cooldown?: number;
  startsOnCooldown?: boolean;
  /** Overrides the target the boss singles out (BATTLE.md §7). */
  prefer?: NonNullable<AbilityDef['ai']>['prefer'];
  effects: Effect[];
}

interface BossPassiveInput {
  key: string;
  icon: SpellKey;
  trigger: PassiveTrigger;
  effects: PassiveEffect[];
}

interface BossTierInput {
  id: string;
  /** HP / ATK / DEF / SPD / C.RATE / C.DMG / RES / ACC, exactly as BOSSES.md prints them. */
  stats: [number, number, number, number, number, number, number, number];
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
  art: { tint: string; scale: number; model?: ModelKey };
  backdrop: BossDef['backdrop'];
  surface: BossDef['surface'];
  immunities: BossDef['immunities'];
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

export function defineBoss(input: BossInput): BossDef {
  const id = `boss.${input.slug}`;
  const version = input.version ?? 1;
  /** Shared by every tier; only the enrage turn is read from the tier itself. */
  const bossBlock = {
    rotation: input.rotation,
    immunities: input.immunities,
    damageTakenMult: 1,
    fixedStats: true,
  };

  /** The canonical definition: the kit, the art and the boss block, with no tier's numbers yet. */
  const kit: EnemyDef = defineEnemy({
    id: `enemy.${input.slug}`,
    archetype: 'boss',
    element: input.element,
    role: input.role,
    stats: input.tiers[0]?.stats ?? [1, 1, 1, 1, 0, 0, 0, 0],
    art: {
      tint: input.art.tint,
      scale: input.art.scale,
      ...(input.art.model ? { model: input.art.model } : {}),
    },
    abilities: input.abilities.map((a) => ({
      slot: a.slot,
      key: a.key,
      icon: a.icon,
      ...(a.cooldown === undefined ? {} : { cooldown: a.cooldown }),
      ...(a.startsOnCooldown ? { startsOnCooldown: true } : {}),
      effects: a.effects,
      ai: {
        priority: a.slot === 'a1' ? 1 : a.slot === 'a2' ? 2 : 3,
        ...(a.prefer ? { prefer: a.prefer } : {}),
      },
    })),
    passives: (input.passives ?? []).map((p) => ({
      key: p.key,
      icon: p.icon,
      trigger: p.trigger,
      effects: p.effects,
    })),
    boss: { ...bossBlock, enrageAfterTurn: input.tiers[0]?.enrageTurn ?? 20 },
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
      boss: { ...bossBlock, enrageAfterTurn: tier.enrageTurn },
    },
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
    art: {
      model: input.art.model ?? 'model.teritorial_lizard',
      tint: input.art.tint,
      scale: input.art.scale,
    },
    backdrop: input.backdrop,
    surface: input.surface,
    immunities: input.immunities,
    tiers,
    version,
  };
}
