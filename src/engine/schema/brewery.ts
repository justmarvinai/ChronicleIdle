/** Zod schema for the Brewery's halls (docs/design/BREWERY.md). */
import { z } from 'zod';
import { ELEMENTS } from '@content/champions/types';

export const breweryStageSchema = z.object({
  number: z.number().int().min(1),
  brews: z.number().int().min(1),
  scale: z.number().positive(),
  guards: z.number().int().min(1).max(6),
  boss: z.boolean(),
  enemyLevel: z.number().int().min(1),
  turnLimit: z.number().int().min(10),
  settlement: z.number().int().min(1),
});

export const brewerySchema = z.object({
  id: z.string().regex(/^brewery\.(justice|valor|faith|eclipse)$/),
  name: z.string().min(1),
  description: z.string().min(1),
  element: z.enum(ELEMENTS),
  brew: z.string().regex(/^brew_/),
  /** 0 = Sunday … 6 = Saturday, at least one day or the hall could never be entered. */
  openDays: z.array(z.number().int().min(0).max(6)).min(1),
  stages: z.array(breweryStageSchema).min(1),
  version: z.number().int().positive(),
});
