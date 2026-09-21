/** Zod schema for the Glorious Palace's nodes (docs/design/GLORIOUS_PALACE.md). */
import { z } from 'zod';
import { ELEMENTS, STAT_IDS } from '@content/champions/types';

/**
 * A node grants some stats, not all of them — `z.record` with an enum key would demand all eight,
 * and `partialRecord` is the one that means "any of these keys".
 */
export const palaceGrantsSchema = z.partialRecord(z.enum(STAT_IDS), z.number().int().positive());

export const palaceNodeSchema = z.object({
  id: z.string().regex(/^palace\.(core|(justice|valor|faith|eclipse)\.r\d+\.\d+)$/),
  name: z.string().min(1),
  element: z.enum(ELEMENTS).nullable(),
  ring: z.number().int().min(0),
  slot: z.number().int().min(0),
  requires: z.array(z.string().min(1)),
  cost: z.number().int().min(1).max(9),
  grants: palaceGrantsSchema,
  /** Only the core carries one; a branch node that scaled with HP would scale with itself. */
  hpPct: z.number().min(0).max(5),
  version: z.number().int().positive(),
});
