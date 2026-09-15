/** Zod schema for bosses (docs/design/BOSSES.md). */
import { z } from 'zod';
import { BOSS_PERIODS } from '@content/bosses/types';
import { CURRENCY_IDS } from '@content/currencies/types';
import { ELEMENTS, RARITIES, ROLES, STATUS_IDS } from '@content/champions/types';
import { championStatsSchema } from './champion';
import { enemySchema } from './enemy';

const chestSchema = z.object({
  pct: z.number().min(1).max(100),
  currencies: z
    .array(z.object({ currency: z.enum(CURRENCY_IDS), amount: z.number().int().positive() }))
    .min(1),
  gear: z.object({ rarity: z.enum(RARITIES), stars: z.number().int().min(1).max(6) }).optional(),
});

export const bossTierSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  name: z.string().min(1),
  stats: championStatsSchema,
  turnLimit: z.number().int().min(10).max(200),
  enrageTurn: z.number().int().min(1).max(100),
  enemyLevel: z.number().int().min(1).max(100),
  playerXp: z.number().int().positive(),
  /** Thresholds climb and the last one is the kill (BOSSES.md §1). */
  chests: z
    .array(chestSchema)
    .min(2)
    .refine((chests) => chests.every((chest, i) => i === 0 || chest.pct > (chests[i - 1]?.pct ?? 0)), {
      message: 'chest thresholds must climb',
    })
    .refine((chests) => chests[chests.length - 1]?.pct === 100, {
      message: 'the last chest is the kill (100 %)',
    }),
  enemy: enemySchema,
});

export const bossSchema = z.object({
  id: z.string().regex(/^boss\.[a-z0-9_]+$/),
  name: z.string().min(1),
  title: z.string().min(1),
  lore: z.string().min(1),
  period: z.enum(BOSS_PERIODS),
  keysPerPeriod: z.number().int().min(1).max(10),
  unlockLevel: z.number().int().min(1).max(100),
  feature: z.enum(['daily_boss', 'weekly_boss']),
  keyCurrency: z.enum(['key_daily', 'key_weekly']),
  element: z.enum(ELEMENTS),
  role: z.enum(ROLES),
  art: z.object({
    model: z.string().min(1),
    tint: z.string().regex(/^#[0-9a-f]{6}$/i),
    scale: z.number().positive().max(3),
  }),
  backdrop: z.string().min(1),
  surface: z.enum(['dirt', 'stone', 'water', 'wood']),
  immunities: z.array(z.enum(STATUS_IDS)),
  tiers: z.array(bossTierSchema).min(1).max(6),
  version: z.number().int().positive(),
});
