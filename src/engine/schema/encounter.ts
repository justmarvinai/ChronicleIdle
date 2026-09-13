/** Zod schema for encounters: campaign stages derive them, the perf bench authors one. */
import { z } from 'zod';
import { DIFFICULTY_MULT } from '@content/balance/battle';
import { ENCOUNTER_KINDS } from '@content/encounters/types';

const difficulties = Object.keys(DIFFICULTY_MULT) as [string, ...string[]];

export const encounterSchema = z.object({
  id: z.string().regex(/^(encounter|stage|boss)\.[a-z0-9_.]+$/),
  stageId: z
    .string()
    .regex(/^stage\.\d{2}\.\d{2}$/)
    .optional(),
  name: z.string().min(1),
  description: z.string().min(1),
  kind: z.enum(ENCOUNTER_KINDS),
  partySize: z.union([z.literal(3), z.literal(4)]),
  difficulty: z.enum(difficulties),
  stageIndex: z.number().int().min(0).max(119),
  enemyLevel: z.number().int().min(1).max(150),
  waves: z
    .array(
      z.object({
        enemies: z
          .array(
            z.object({
              enemyId: z.string().regex(/^enemy\.[a-z0-9_]+$/),
              statMult: z.number().positive().max(5).optional(),
            }),
          )
          .min(1)
          .max(4),
      }),
    )
    .min(1)
    .max(3),
  turnLimit: z.number().int().min(5).max(500),
  turnLimitMode: z.enum(['ally', 'all']),
  timeUpIsDefeat: z.boolean(),
  backdrop: z.string().min(1),
  music: z.enum(['battle', 'boss']),
  surface: z.enum(['dirt', 'stone', 'water', 'wood']),
  version: z.number().int().positive(),
});
