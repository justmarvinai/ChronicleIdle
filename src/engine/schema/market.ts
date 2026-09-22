/**
 * Zod schemas for the Market, the Bag's consumables and the Login Calendar
 * (docs/design/MARKET.md, docs/design/LOGIN.md).
 */
import { z } from 'zod';
import { BOOST_IDS } from '@content/balance/boosts';
import { LOGIN_DAYS, LOGIN_TIERS } from '@content/balance/login';

/** What a consumable does when it is used. Mirrors `ConsumableEffect` exactly. */
export const consumableEffectSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('boost'), boost: z.enum(BOOST_IDS) }),
  z.object({ kind: z.literal('brewery_runs') }),
  z.object({ kind: z.literal('quest_reset'), period: z.enum(['daily', 'weekly']) }),
  z.object({ kind: z.literal('mission_skip') }),
  z.object({ kind: z.literal('champion_level') }),
  z.object({ kind: z.literal('champion_stars') }),
]);

export const consumableSchema = z.object({
  id: z.string().regex(/^item\.[a-z_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  icon: z.string().min(1),
  rarity: z.enum(['rare', 'epic', 'legendary', 'mythic']),
  effect: consumableEffectSchema,
  version: z.number().int().positive(),
});

/** One thing a shelf entry or a calendar day hands over. */
export const grantSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('consumable'),
    item: z.string().regex(/^item\./),
    count: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal('currency'),
    currency: z.string().min(1),
    amount: z.number().int().positive(),
  }),
]);

export const gemShelfEntrySchema = z.object({
  id: z.string().regex(/^shelf\.[a-z_]+$/),
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().int().positive(),
  once: z.literal(true).optional(),
  contents: z.array(grantSchema).min(1),
  order: z.number().int().min(1),
  version: z.number().int().positive(),
});

export const loginDaySchema = z.object({
  day: z.number().int().min(1).max(LOGIN_DAYS),
  tier: z.enum(LOGIN_TIERS),
  rewards: z.array(grantSchema).min(1),
});
