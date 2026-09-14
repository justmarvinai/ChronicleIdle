/** Zod schema for gear sets (docs/design/GEAR.md §5). */
import { z } from 'zod';
import { SETTLEMENT_COUNT } from '@content/balance/campaign';
import { passiveSchema } from './champion';

export const gearSetSchema = z.object({
  id: z.string().regex(/^gear_set\.[a-z0-9_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  /** Two-piece sets stack; four-piece sets carry the behaviour bonuses. */
  pieces: z.union([z.literal(2), z.literal(4)]),
  passive: passiveSchema,
  /** Settlements whose drops favour the set; every set has at least one home. */
  homes: z.array(z.number().int().min(1).max(SETTLEMENT_COUNT)).min(1),
  version: z.number().int().positive(),
});
