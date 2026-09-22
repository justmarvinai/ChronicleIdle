/** Zod schema for the Dungeons (docs/design/DUNGEONS.md). */
import { z } from 'zod';

export const dungeonSchema = z.object({
  id: z.string().regex(/^dungeon\.[a-z_]+$/),
  slug: z.string().regex(/^[a-z_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  lore: z.string().min(1),
  order: z.number().int().min(1),
  /** Empty only on a shut keep, which `validateDungeons` checks against the lock. */
  sets: z.array(z.string().regex(/^gear_set\./)),
  /** Empty only on a shut keep; a keep with fights needs something to fight. */
  keeperId: z.union([z.literal(''), z.string().regex(/^enemy\./)]),
  factionId: z.union([z.literal(''), z.string().regex(/^faction\./)]),
  backdrop: z.string().regex(/^bg\./),
  glyph: z.string().regex(/^glyph\./),
  surface: z.enum(['dirt', 'stone', 'water', 'wood']),
  lock: z.literal('accessories').optional(),
  version: z.number().int().positive(),
});
