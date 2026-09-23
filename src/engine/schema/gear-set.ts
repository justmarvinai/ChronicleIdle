/** Zod schema for gear sets (docs/design/GEAR.md §5). */
import { z } from 'zod';
import { SETTLEMENT_COUNT } from '@content/balance/campaign';
import { GEAR_SLOTS } from '@content/champions/types';
import { passiveSchema } from './champion';

export const gearSetSchema = z.object({
  id: z.string().regex(/^gear_set\.[a-z0-9_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  /** The set's identifier (GEAR.md §5.1). */
  emblem: z.string().regex(/^emblem\.[a-z0-9_]+$/),
  /** A painting for every slot: a record over an enum is exhaustive, so a missing slot fails. */
  art: z.record(z.enum(GEAR_SLOTS), z.string().regex(/^gear\.[a-z0-9_]+\.[a-z]+$/)),
  /** Two-piece sets stack; four-piece sets carry the behaviour bonuses. */
  pieces: z.union([z.literal(2), z.literal(4)]),
  passives: z.array(passiveSchema).min(1),
  /** Settlements whose drops favour the set; every set has at least one home. */
  homes: z.array(z.number().int().min(1).max(SETTLEMENT_COUNT)).min(1),
  version: z.number().int().positive(),
});
