/**
 * Zod schema for champion content (docs/design/CHAMPIONS.md §1–3, BATTLE.md §6). Mirrors the
 * TypeScript types in `@content/champions/types`; validated for every definition at the door.
 */
import { z } from 'zod';
import {
  ABILITY_SLOTS,
  CHAMPION_IDS,
  ELEMENTS,
  OBTAIN_SOURCES,
  PASSIVE_TRIGGERS,
  RARITIES,
  ROLES,
  STAT_IDS,
  STATUS_IDS,
  TARGET_PREFERENCES,
  UPGRADE_TYPES,
  type Condition,
  type Effect,
  type PassiveEffect,
  type Target,
} from '@content/champions/types';
import type { Loosen } from './loosen';

const percent = z.number().min(0).max(100);
const positive = z.number().positive();

export const targetSchema: z.ZodType<Loosen<Target>> = z.union([
  z.literal('self'),
  z.literal('single_enemy'),
  z.literal('all_enemies'),
  z.object({ random_enemies: z.number().int().min(1).max(6) }),
  z.literal('single_ally'),
  z.literal('all_allies'),
  z.literal('lowest_hp_ally'),
  z.literal('lowest_hp_allies_2'),
  z.literal('all_dead_allies'),
  z.object({ adjacent_to_target: z.number().int().min(1).max(2) }),
  z.literal('highest_atk_enemies_2'),
  z.literal('provoker'),
]);

export const conditionSchema: z.ZodType<Loosen<Condition>> = z.union([
  z.object({ targetHas: z.enum(STATUS_IDS) }),
  z.object({ targetHasAnyDebuff: z.literal(true) }),
  z.object({ selfDistinctDebuffsBelow: z.number().int().min(1).max(14) }),
  z.object({ targetHpBelow: percent }),
  z.object({ killedThisAction: z.literal(true) }),
  z.object({ selfHpBelow: percent }),
  z.object({ alliesBelowHp: z.object({ percent, count: z.number().int().min(1) }) }),
  z.object({ alliesBelowTm: z.object({ percent, count: z.number().int().min(1) }) }),
  z.object({
    enemiesAlive: z.object({
      gte: z.number().int().min(0).optional(),
      lte: z.number().int().min(0).optional(),
    }),
  }),
  z.object({ waveStart: z.literal(true) }),
  z.object({ attackerElement: z.enum(ELEMENTS) }),
]);

export const effectSchema: z.ZodType<Loosen<Effect>> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('damage'),
      target: targetSchema,
      mult: positive,
      stat: z.enum(['ATK', 'DEF', 'HP', 'TARGET_MAX_HP']),
      hits: z.number().int().min(1).max(10).optional(),
      repeatChance: percent.optional(),
      defIgnore: z.number().min(0).max(1).optional(),
      critBonus: z.number().min(0).max(100).optional(),
      guaranteedCritIf: conditionSchema.optional(),
      onKill: z.array(effectSchema).optional(),
      extendOnKill: z.object({ maxHits: z.number().int().min(1).max(10) }).optional(),
    }),
    z.object({
      kind: z.literal('heal'),
      target: targetSchema,
      mult: positive,
      stat: z.enum(['ATK', 'HP', 'CASTER_MAX_HP', 'TARGET_MAX_HP']),
      per: z.literal('target_debuff').optional(),
    }),
    z.object({
      kind: z.literal('apply_status'),
      target: targetSchema,
      status: z.enum(STATUS_IDS),
      value: z.number().optional(),
      turns: z.number().int().min(1).max(10),
      chance: percent,
      maxTargets: z.number().int().min(1).max(6).optional(),
    }),
    z.object({
      kind: z.literal('remove_status'),
      target: targetSchema,
      which: z.enum(['debuffs', 'buffs']),
      count: z.union([z.number().int().min(1), z.literal('all')]),
    }),
    z.object({
      kind: z.literal('tm'),
      target: targetSchema,
      delta: z.number().min(-1).max(1),
      chance: percent.optional(),
    }),
    z.object({ kind: z.literal('revive'), target: targetSchema, hpPercent: z.number().min(1).max(100) }),
    z.object({ kind: z.literal('extra_turn'), target: z.literal('self'), if: conditionSchema.optional() }),
    z.object({
      kind: z.literal('detonate'),
      target: targetSchema,
      status: z.enum(['poison', 'burn', 'bleed']),
      percentOfRemaining: percent,
    }),
    z.object({ kind: z.literal('leech'), percentOfDamage: percent }),
    z.object({
      kind: z.literal('conditional'),
      if: conditionSchema,
      then: z.array(effectSchema),
      else: z.array(effectSchema).optional(),
    }),
  ]),
);

export const passiveEffectSchema: z.ZodType<Loosen<PassiveEffect>> = z.lazy(() =>
  z.union([
    z.object({
      kind: z.literal('stat_mod'),
      stat: z.enum(STAT_IDS),
      percent: z.number().optional(),
      flat: z.number().optional(),
      if: conditionSchema.optional(),
    }),
    z.object({
      kind: z.literal('damage_bonus'),
      value: z.number(),
      scope: z.enum(['all', 'crit', 'dot']).optional(),
      if: conditionSchema.optional(),
    }),
    z.object({
      kind: z.literal('damage_bonus_per'),
      per: z.enum(['target_debuff', 'missing_hp_10', 'enemy_with_def_down']),
      value: z.number(),
      max: z.number(),
    }),
    z.object({
      kind: z.literal('crit_rate_per'),
      per: z.literal('enemy_with_def_down'),
      value: z.number(),
      max: z.number(),
    }),
    z.object({
      kind: z.literal('damage_reduction'),
      value: z.number().min(0).max(1),
      scope: z.enum(['all', 'crit']).optional(),
      if: conditionSchema.optional(),
    }),
    z.object({ kind: z.literal('counterattack'), chance: percent.optional() }),
    z.object({
      kind: z.literal('survive_lethal'),
      hpPercent: z.number().min(1).max(100),
      oncePerBattle: z.literal(true),
      shield: z.number().optional(),
      healNextTurn: z.number().optional(),
    }),
    z.object({ kind: z.literal('status_value_override'), status: z.enum(STATUS_IDS), value: z.number() }),
    z.object({ kind: z.literal('retarget_single_attacks'), while: z.literal('any_ally_alive') }),
    z.object({ kind: z.literal('extra_turn_chance'), chance: percent }),
    z.object({ kind: z.literal('lifesteal'), percent }),
    z.object({
      kind: z.literal('shield_ally_below'),
      hpPercent: percent,
      shield: z.number().positive(),
      turns: z.number().int().min(1),
      oncePerAllyPerWave: z.literal(true),
    }),
    z.object({
      kind: z.literal('on_heal_grant'),
      status: z.enum(STATUS_IDS),
      value: z.number().optional(),
      turns: z.number().int().min(1),
    }),
    z.object({ kind: z.literal('on_stun_gain_tm'), delta: z.number().min(0).max(1) }),
    effectSchema,
  ]),
);

const i18nKey = z.string().min(1);
const assetKey = z.string().min(1);

/**
 * `ab.<owner>.<key>`, where the owner is a champion (`ab.anuria.emberlash`) or a shared enemy
 * archetype kit (`ab.arch.raider.cleave`, one key for every faction that fields it).
 */
const ABILITY_ID = /^ab\.[a-z0-9_]+(\.[a-z0-9_]+){1,2}$/;

/**
 * Passives are also worn, not only known: a gear set's bonus is a passive whose id belongs to the
 * set (`gear_set.ember_guard.bonus`), so the passive namespace is wider than the ability one.
 */
const PASSIVE_ID = /^(ab|gear_set)\.[a-z0-9_]+(\.[a-z0-9_]+){1,2}$/;

export const abilitySchema = z.object({
  slot: z.enum(ABILITY_SLOTS),
  id: z.string().regex(ABILITY_ID),
  name: i18nKey,
  description: i18nKey,
  icon: assetKey,
  cooldown: z.number().int().min(0).max(8),
  startsOnCooldown: z.boolean().optional(),
  effects: z.array(effectSchema).min(1),
  upgrades: z.array(z.object({ type: z.enum(UPGRADE_TYPES), value: z.number().positive() })).max(4),
  ai: z.object({
    priority: z.number().int().min(0).max(10),
    when: conditionSchema.optional(),
    avoid: conditionSchema.optional(),
    prefer: z.enum(TARGET_PREFERENCES).optional(),
  }),
});

export const passiveSchema = z.object({
  id: z.string().regex(PASSIVE_ID),
  name: i18nKey,
  description: i18nKey,
  icon: assetKey,
  trigger: z.enum(PASSIVE_TRIGGERS),
  effects: z.array(passiveEffectSchema).min(1),
  oncePerBattle: z.boolean().optional(),
});

export const auraSchema = z.object({
  id: z.string().regex(ABILITY_ID),
  name: i18nKey,
  description: i18nKey,
  icon: assetKey,
  effects: z.array(passiveEffectSchema).min(1),
  scope: z.enum(['all', 'campaign', 'boss']).optional(),
});

export const championStatsSchema = z.object({
  hp: z.number().int().positive(),
  atk: z.number().int().positive(),
  def: z.number().int().positive(),
  spd: z.number().int().positive(),
  critRate: percent,
  critDmg: z.number().min(0),
  res: z.number().min(0),
  acc: z.number().min(0),
});

export const championSchema = z.object({
  id: z.enum(CHAMPION_IDS),
  name: i18nKey,
  lore: i18nKey,
  rarity: z.enum(RARITIES),
  element: z.enum(ELEMENTS),
  role: z.enum(ROLES),
  stats: championStatsSchema,
  art: z.object({
    model: assetKey,
    avatar: assetKey,
    facing: z.enum(['left', 'right']),
    tint: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .nullable(),
    placeholder: z.boolean(),
  }),
  obtain: z.array(z.enum(OBTAIN_SOURCES)).min(1),
  abilities: z.array(abilitySchema).min(1).max(4),
  passive: passiveSchema.optional(),
  aura: auraSchema.optional(),
  version: z.number().int().positive(),
});
