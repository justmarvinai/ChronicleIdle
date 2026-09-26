/** Zod schema for the tutorial script (docs/design/TUTORIAL.md). */
import { z } from 'zod';
import { ABILITY_SLOTS, GEAR_SLOTS } from '@content/champions/types';
import { CURRENCY_IDS } from '@content/currencies/types';
import { SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import { FEATURE_IDS } from '@content/balance/unlocks';
import {
  TUTORIAL_DIALOGS,
  TUTORIAL_SCREENS,
  TUTORIAL_TARGETS,
  type TutorialCondition,
} from '@content/tutorial/types';
import type { Loosen } from './loosen';

export const tutorialConditionSchema: z.ZodType<Loosen<TutorialCondition>> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('all'), of: z.array(tutorialConditionSchema).min(2) }),
    z.object({ type: z.literal('any'), of: z.array(tutorialConditionSchema).min(2) }),
    z.object({ type: z.literal('screen'), screen: z.enum(TUTORIAL_SCREENS) }),
    z.object({ type: z.literal('dialog'), dialog: z.enum(TUTORIAL_DIALOGS) }),
    z.object({ type: z.literal('feature'), feature: z.enum(FEATURE_IDS) }),
    z.object({ type: z.literal('starter_bound') }),
    z.object({
      type: z.literal('stage_cleared'),
      settlement: z.number().int().min(1).max(SETTLEMENT_COUNT),
      stage: z.number().int().min(1).max(STAGES_PER_SETTLEMENT),
    }),
    z.object({ type: z.literal('counter'), key: z.string().min(1), count: z.number().int().positive() }),
    z.object({ type: z.literal('gear_worn'), slot: z.enum(GEAR_SLOTS) }),
    z.object({
      type: z.literal('battle_turn'),
      wave: z.number().int().positive().optional(),
      slot: z.enum(ABILITY_SLOTS).optional(),
    }),
    z.object({ type: z.literal('ability_used'), slot: z.enum(ABILITY_SLOTS) }),
    z.object({ type: z.literal('auto_battle') }),
    z.object({ type: z.literal('stand_mastered') }),
    z.object({ type: z.literal('acknowledged') }),
    z.object({ type: z.literal('clicked') }),
  ]),
);

const grantSchema = z.object({
  id: z.string().min(1),
  currencies: z
    .array(z.object({ currency: z.enum(CURRENCY_IDS), amount: z.number().int().positive() }))
    .min(1),
});

export const tutorialStepSchema = z.object({
  id: z.string().regex(/^tut\.\d\.\d{1,2}$/),
  chapter: z.number().int().min(1).max(9),
  index: z.number().int().min(1).max(20),
  dialogue: z.string().min(1),
  when: tutorialConditionSchema.optional(),
  spotlight: z.array(z.enum(TUTORIAL_TARGETS)).min(1),
  allow: z.union([z.literal('all'), z.array(z.enum(TUTORIAL_TARGETS)).min(1)]),
  complete: tutorialConditionSchema,
  grant: grantSchema.optional(),
  script: z.enum(['battle', 'summon']).optional(),
  version: z.number().int().positive(),
});

export const tutorialChapterSchema = z.object({
  id: z.string().regex(/^tut\.[a-z0-9_]+$/),
  index: z.number().int().min(1).max(9),
  name: z.string().min(1),
  trigger: z.discriminatedUnion('type', [
    z.object({ type: z.literal('new_game') }),
    z.object({ type: z.literal('feature'), feature: z.enum(FEATURE_IDS) }),
  ]),
  steps: z.array(tutorialStepSchema).min(1),
  sequential: z.boolean(),
  skippable: z.boolean(),
  version: z.number().int().positive(),
});
