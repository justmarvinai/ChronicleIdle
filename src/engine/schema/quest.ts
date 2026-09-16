/** Zod schema for quest content (docs/design/QUESTS_MISSIONS.md §1–3). */
import { z } from 'zod';
import { CURRENCY_IDS } from '@content/currencies/types';
import { FEATURE_IDS } from '@content/balance/unlocks';
import { QUEST_PERIODS, type Goal } from '@content/quests/types';
import type { Loosen } from './loosen';

const currencies = z
  .array(z.object({ currency: z.enum(CURRENCY_IDS), amount: z.number().int().positive() }))
  .min(1);

const count = z.number().int().positive();

export const goalSchema: z.ZodType<Loosen<Goal>> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('login') }),
    z.object({ type: z.literal('any'), goals: z.array(goalSchema).min(2) }),
    z.object({ type: z.literal('clear_stages'), count }),
    z.object({ type: z.literal('win_battles'), count }),
    z.object({ type: z.literal('win_manual'), count }),
    z.object({ type: z.literal('spend_energy'), amount: count }),
    z.object({ type: z.literal('level_champion_times'), count }),
    z.object({ type: z.literal('rank_up_times'), count }),
    z.object({ type: z.literal('skill_upgrades'), count }),
    z.object({ type: z.literal('gear_levels'), count }),
    z.object({ type: z.literal('gear_reach_level'), level: z.number().int().min(1).max(16), count }),
    z.object({ type: z.literal('craft'), count }),
    z.object({ type: z.literal('dismantle'), count }),
    z.object({ type: z.literal('summon'), count }),
    z.object({ type: z.literal('claim_idle'), count }),
    z.object({ type: z.literal('boss_fights'), boss: z.string().regex(/^boss\.[a-z0-9_]+$/), count }),
    z.object({ type: z.literal('complete_daily_quests_days'), count }),
  ]),
);

export const questSchema = z.object({
  id: z.string().regex(/^quest\.(daily|weekly)\.[a-z0-9_]+$/),
  period: z.enum(QUEST_PERIODS),
  name: z.string().min(1),
  icon: z.string().min(1),
  goal: goalSchema,
  points: z.number().int().min(1).max(50),
  rewards: currencies,
  feature: z.enum(FEATURE_IDS).nullable(),
  version: z.number().int().positive(),
});

export const questChestSchema = z.object({
  points: z.number().int().min(1).max(100),
  currencies,
  cycle: z.object({ every: z.number().int().min(2).max(10), instead: currencies }).optional(),
});

export const questBoardSchema = z.object({
  period: z.enum(QUEST_PERIODS),
  feature: z.enum(FEATURE_IDS),
  quests: z.array(questSchema).min(4).max(12),
  replacement: questSchema,
  /** Thresholds climb and the last one is the full board. */
  chests: z
    .array(questChestSchema)
    .min(2)
    .refine((all) => all.every((chest, i) => i === 0 || chest.points > (all[i - 1]?.points ?? 0)), {
      message: 'chest thresholds must climb',
    })
    .refine((all) => all[all.length - 1]?.points === 100, {
      message: 'the last chest is the full board (100 points)',
    }),
  version: z.number().int().positive(),
});
