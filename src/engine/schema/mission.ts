/** Zod schema for the Chronicler's Path (docs/design/QUESTS_MISSIONS.md §4). */
import { z } from 'zod';
import { CHAMPION_IDS } from '@content/champions/types';
import { CURRENCY_IDS } from '@content/currencies/types';
import { goalSchema } from './quest';

const currencies = z.array(z.object({ currency: z.enum(CURRENCY_IDS), amount: z.number().int().positive() }));

export const missionSchema = z.object({
  id: z.string().regex(/^mission\.\d{2}\.\d{2}$/),
  chapter: z.number().int().min(1).max(10),
  index: z.number().int().min(1).max(12),
  name: z.string().min(1),
  icon: z.string().min(1),
  goal: goalSchema,
  rewards: currencies.min(1),
  version: z.number().int().positive(),
});

export const chapterChestSchema = z.object({
  /** Empty only for the last chapter, whose chest is Eldric himself. */
  currencies,
  champion: z.enum(CHAMPION_IDS).optional(),
  gearChoice: z.object({ rarity: z.literal('legendary'), stars: z.literal(6) }).optional(),
});

export const missionChapterSchema = z.object({
  id: z.string().regex(/^chapter\.\d{2}$/),
  index: z.number().int().min(1).max(10),
  name: z.string().min(1),
  eldric: z.string().min(1),
  missions: z.array(missionSchema).length(12),
  chest: chapterChestSchema,
  version: z.number().int().positive(),
});
