/** Zod schema for titles (docs/design/ECONOMY.md §4). */
import { z } from 'zod';
import { DIFFICULTY_MULT } from '@content/balance/battle';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { SETTLEMENT_COUNT } from '@content/balance/campaign';
import { CHAMPION_IDS } from '@content/champions/types';

const difficulty = z.enum(Object.keys(DIFFICULTY_MULT) as [string, ...string[]]);

export const titleConditionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('level'), level: z.number().int().min(1).max(PLAYER_MAX_LEVEL) }),
  z.object({ kind: z.literal('difficulty_cleared'), difficulty }),
  z.object({ kind: z.literal('difficulty_mastered'), difficulty }),
  z.object({
    kind: z.literal('settlement_boss'),
    settlement: z.number().int().min(1).max(SETTLEMENT_COUNT),
    difficulty,
  }),
  z.object({
    kind: z.literal('champions_owned'),
    count: z.number().int().min(1).max(CHAMPION_IDS.length),
  }),
]);

export const titleSchema = z.object({
  id: z.string().regex(/^title\.[a-z0-9_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  condition: titleConditionSchema,
  version: z.number().int().positive(),
});
