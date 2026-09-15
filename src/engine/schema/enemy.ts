/** Zod schema for enemy content (docs/design/CAMPAIGN.md §5, BOSSES.md §5). */
import { z } from 'zod';
import { ABILITY_SLOTS, ELEMENTS, ROLES, STATUS_IDS } from '@content/champions/types';
import { ENEMY_ARCHETYPES } from '@content/enemies/types';
import { abilitySchema, championStatsSchema, passiveSchema } from './champion';

export const enemyBossSchema = z.object({
  rotation: z.array(z.enum(ABILITY_SLOTS)).min(1).max(12),
  immunities: z.array(z.enum(STATUS_IDS)),
  enrageAfterTurn: z.number().int().min(0),
  damageTakenMult: z.number().positive().max(1),
  fixedStats: z.boolean().optional(),
});

export const enemySchema = z.object({
  id: z.string().regex(/^enemy\.[a-z0-9_]+$/),
  name: z.string().min(1),
  archetype: z.enum(ENEMY_ARCHETYPES),
  element: z.enum(ELEMENTS),
  role: z.enum(ROLES),
  stats: championStatsSchema,
  art: z.object({
    model: z.string().min(1),
    tint: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .nullable(),
    facing: z.enum(['left', 'right']),
    scale: z.number().positive().max(3),
  }),
  abilities: z.array(abilitySchema).min(1).max(4),
  passives: z.array(passiveSchema).max(3),
  boss: enemyBossSchema.optional(),
  version: z.number().int().positive(),
});
