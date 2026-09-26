/** Zod schema for quest content (docs/design/QUESTS_MISSIONS.md §1–3). */
import { z } from 'zod';
import { DIFFICULTIES } from '@content/balance/battle';
import { CRAFT_TIERS } from '@content/balance/forge';
import { SHARD_IDS } from '@content/balance/summon';
import { CURRENCY_IDS } from '@content/currencies/types';
import { RARITIES } from '@content/champions/types';
import { SET_SIZES } from '@content/sets/types';
import { FEATURE_IDS } from '@content/balance/unlocks';
import { MINE_MAX_LEVEL } from '@content/balance/mine';
import { QUEST_PERIODS, type Goal } from '@content/quests/types';
import type { Loosen } from './loosen';

const currencies = z
  .array(z.object({ currency: z.enum(CURRENCY_IDS), amount: z.number().int().positive() }))
  .min(1);

const count = z.number().int().positive();
const bossId = z.string().regex(/^boss\.[a-z0-9_]+$/);
const gearLevel = z.number().int().min(1).max(16);
const settlement = z.number().int().min(1).max(12);
const difficulty = z.enum(DIFFICULTIES);

export const goalSchema: z.ZodType<Loosen<Goal>> = z.lazy(() =>
  z.discriminatedUnion('type', [
    z.object({ type: z.literal('login') }),
    z.object({ type: z.literal('any'), goals: z.array(goalSchema).min(2) }),
    // What the play adds, counted from the period or the mission's activation.
    z.object({ type: z.literal('clear_stages'), count }),
    z.object({ type: z.literal('win_battles'), count }),
    z.object({ type: z.literal('win_manual'), count }),
    z.object({ type: z.literal('spend_energy'), amount: count }),
    z.object({ type: z.literal('level_champion_times'), count }),
    z.object({ type: z.literal('rank_up_times'), count }),
    z.object({ type: z.literal('skill_upgrades'), count }),
    z.object({ type: z.literal('gear_levels'), count }),
    z.object({ type: z.literal('craft'), count, tier: z.enum(CRAFT_TIERS).optional() }),
    z.object({ type: z.literal('dismantle'), count }),
    z.object({ type: z.literal('gear_refine_times'), count }),
    z.object({ type: z.literal('summon'), count, shard: z.enum(SHARD_IDS).optional() }),
    z.object({ type: z.literal('claim_idle'), count }),
    z.object({ type: z.literal('boss_fights'), boss: bossId, count, tier: z.string().min(1).optional() }),
    z.object({
      type: z.literal('complete_daily_quests_days'),
      count,
      quests: z.literal(5).optional(),
    }),
    z.object({ type: z.literal('counter'), key: z.string().min(1), count }),
    // What the chronicle is, read live off the save.
    z.object({
      type: z.literal('clear_stage'),
      settlement,
      stage: z.number().int().min(1).max(10),
      difficulty,
    }),
    z.object({ type: z.literal('settlement_stars'), settlement, difficulty, stars: count }),
    z.object({ type: z.literal('difficulty_stars'), difficulty, stars: count }),
    z.object({
      type: z.literal('own_champions'),
      count,
      rarity: z.enum(RARITIES).optional(),
      distinct: z.boolean().optional(),
    }),
    z.object({
      type: z.literal('champion_reach_level'),
      level: z.number().int().min(1).max(60),
      count,
      stars: z.number().int().min(1).max(6).optional(),
    }),
    z.object({ type: z.literal('champion_reach_stars'), stars: z.number().int().min(1).max(6), count }),
    z.object({ type: z.literal('all_skills_maxed'), rarity: z.enum(RARITIES).optional() }),
    z.object({ type: z.literal('player_level'), level: z.number().int().min(1).max(100) }),
    z.object({ type: z.literal('team_power'), power: count }),
    z.object({
      type: z.literal('equip_pieces'),
      count: z.number().int().min(1).max(6),
      minStars: z.number().int().min(1).max(6).optional(),
    }),
    z.object({ type: z.literal('equip_full_set'), pieces: z.literal(SET_SIZES) }),
    z.object({
      type: z.literal('gear_reach_level'),
      level: gearLevel,
      count,
      onOneChampion: z.boolean().optional(),
    }),
    z.object({ type: z.literal('boss_damage'), boss: bossId, tier: z.string().min(1), amount: count }),
    z.object({
      type: z.literal('boss_percent'),
      boss: bossId,
      tier: z.string().min(1),
      pct: z.number().int().min(1).max(100),
    }),
    z.object({ type: z.literal('mine_level'), level: z.number().int().min(1).max(MINE_MAX_LEVEL) }),
    z.object({ type: z.literal('palace_nodes'), count }),
    z.object({ type: z.literal('path_walked'), missions: count }),
    z.object({ type: z.literal('all_previous') }),
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
