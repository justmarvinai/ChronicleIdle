/** Zod schema for banners (docs/design/SUMMONING.md §3, §6). */
import { z } from 'zod';
import { BANNER_KINDS } from '@content/banners/types';
import { CHAMPION_IDS } from '@content/champions/types';
import { SHARD_IDS } from '@content/balance/summon';

const rotationSchema = z.object({
  legendary: z.enum(CHAMPION_IDS),
  /** Two Epics per rotation (SUMMONING.md §3). */
  epics: z.array(z.enum(CHAMPION_IDS)).length(2),
  mythic: z.enum(CHAMPION_IDS).optional(),
});

export const bannerSchema = z.object({
  id: z.string().regex(/^banner\.[a-z0-9_]+$/),
  kind: z.enum(BANNER_KINDS),
  name: z.string().min(1),
  description: z.string().min(1),
  shards: z.array(z.enum(SHARD_IDS)).min(1),
  rotations: z.array(rotationSchema).min(1).optional(),
  version: z.number().int().positive(),
});
