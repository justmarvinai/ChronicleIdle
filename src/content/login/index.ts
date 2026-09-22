/**
 * The thirty days of the Login Calendar (docs/design/LOGIN.md §2).
 *
 * **The tiers are shuffled, not climbing.** Day 4 is a `rare` and day 5 a `common`; day 7 beats
 * day 10. That is the owner's brief exactly — the board should read as a scatter a player cannot
 * predict, so no day is ever the boring one before a good one. The single exception is the
 * finale: days 28, 29 and 30 are the three `legendary` tiles, every cycle.
 *
 * **Sized against a repeating board.** Because the thirty days loop forever (the owner's answer),
 * this is permanent income and not a one-off arc. Across a full cycle it pays **1,030 gems**, which
 * is ~34 a day against the ~204 a day `ECONOMY.md` §7 measures — a sixth on top, which is the size
 * a bonus line should be. `sim:economy` holds that ratio as a band; raising any gem row here moves
 * it. The gold, energy and material rows are noise beside the campaign's own and are there to make
 * the common days feel like something rather than to matter.
 *
 * Two days hand over a **consumable** rather than a currency (12 and 22), and the finale's last day
 * a third. That is deliberate: a player meets the Bag through the calendar, for free, before they
 * ever spend a gem in the Market.
 */
import type { CurrencyId } from '@content/currencies/types';
import type { Grant } from '@content/grants';
import type { LoginTier } from '@content/balance/login';

export interface LoginDay {
  /** 1–30. */
  day: number;
  tier: LoginTier;
  rewards: readonly Grant[];
}

/** `{ currency, amount }` without the ceremony. */
function c(currency: CurrencyId, amount: number): Grant {
  return { kind: 'currency', currency, amount };
}

/** One of a consumable. */
function item(id: string): Grant {
  return { kind: 'consumable', item: id, count: 1 };
}

export const LOGIN_BOARD: readonly LoginDay[] = [
  { day: 1, tier: 'common', rewards: [c('gold', 25_000)] },
  { day: 2, tier: 'uncommon', rewards: [c('brew_universal', 3)] },
  { day: 3, tier: 'common', rewards: [c('energy', 100)] },
  { day: 4, tier: 'rare', rewards: [c('gems', 60)] },
  { day: 5, tier: 'common', rewards: [c('mat_scrap_iron', 25)] },
  { day: 6, tier: 'uncommon', rewards: [c('tome_rare', 2)] },
  { day: 7, tier: 'epic', rewards: [c('gems', 150)] },
  { day: 8, tier: 'common', rewards: [c('gold', 30_000)] },
  { day: 9, tier: 'rare', rewards: [c('shard_faded', 1), c('mat_arcane_dust', 20)] },
  { day: 10, tier: 'uncommon', rewards: [c('energy', 120)] },
  { day: 11, tier: 'common', rewards: [c('mat_arcane_dust', 20)] },
  // The Bag, met for free, six weeks before most chronicles could afford one.
  { day: 12, tier: 'rare', rewards: [item('item.brewery_token')] },
  { day: 13, tier: 'uncommon', rewards: [c('mat_ember_alloy', 8)] },
  { day: 14, tier: 'epic', rewards: [c('shard_ancient', 1)] },
  { day: 15, tier: 'common', rewards: [c('gold', 35_000)] },
  { day: 16, tier: 'rare', rewards: [c('gems', 60)] },
  { day: 17, tier: 'uncommon', rewards: [c('brew_universal', 4)] },
  { day: 18, tier: 'common', rewards: [c('energy', 120)] },
  { day: 19, tier: 'epic', rewards: [c('gems', 150)] },
  { day: 20, tier: 'rare', rewards: [c('tome_epic', 1)] },
  { day: 21, tier: 'uncommon', rewards: [c('mat_starsteel', 3)] },
  { day: 22, tier: 'rare', rewards: [item('item.champion_xp_boost')] },
  { day: 23, tier: 'common', rewards: [c('gold', 40_000)] },
  { day: 24, tier: 'uncommon', rewards: [c('shard_faded', 2)] },
  { day: 25, tier: 'epic', rewards: [c('mat_refining_core', 1), c('mat_glyph_sigil', 1)] },
  { day: 26, tier: 'common', rewards: [c('energy', 150)] },
  { day: 27, tier: 'rare', rewards: [c('gems', 60)] },

  // The finale: the three best tiles on the board, every cycle (the owner's brief).
  { day: 28, tier: 'legendary', rewards: [c('gems', 250), c('shard_ancient', 1)] },
  { day: 29, tier: 'legendary', rewards: [c('shard_sacred', 1)] },
  {
    day: 30,
    tier: 'legendary',
    rewards: [c('gems', 300), c('tome_legendary', 1), item('item.champions_chicken')],
  },
];

export const LOGIN_DAY_BY_NUMBER: Readonly<Record<number, LoginDay>> = Object.fromEntries(
  LOGIN_BOARD.map((entry) => [entry.day, entry]),
);
