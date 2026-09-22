/**
 * The nine consumables the Gem Market sells (docs/design/MARKET.md §3).
 *
 * Every one of them buys the same thing in the end — **time**. A Brewery Token is a second evening
 * in the cellars; a boost is a day worth two; a voucher is a board earned twice; the Chicken and
 * the Cheatmeal are weeks of the Tavern handed over at once. None of them is power a chronicle
 * could not reach on its own, which is what keeps the shelf a shortcut rather than a second game.
 *
 * `rarity` is only the frame they are drawn in — it says how dear a thing is, not what it does.
 */
import type { ConsumableDef } from './types';

export const CONSUMABLES: readonly ConsumableDef[] = [
  {
    id: 'item.brewery_token',
    name: 'item.brewery_token.name',
    description: 'item.brewery_token.description',
    icon: 'spell.rune_jade_coin',
    rarity: 'rare',
    effect: { kind: 'brewery_runs' },
    version: 1,
  },
  {
    id: 'item.brewery_boost',
    name: 'item.brewery_boost.name',
    description: 'item.brewery_boost.description',
    icon: 'spell.tech_alchemy_pour',
    rarity: 'rare',
    effect: { kind: 'boost', boost: 'brewery' },
    version: 1,
  },
  {
    id: 'item.champion_xp_boost',
    name: 'item.champion_xp_boost.name',
    description: 'item.champion_xp_boost.description',
    icon: 'spell.tech_serum_injector',
    rarity: 'rare',
    effect: { kind: 'boost', boost: 'champion_xp' },
    version: 1,
  },
  {
    id: 'item.player_xp_boost',
    name: 'item.player_xp_boost.name',
    description: 'item.player_xp_boost.description',
    icon: 'spell.rune_starfall',
    rarity: 'rare',
    effect: { kind: 'boost', boost: 'player_xp' },
    version: 1,
  },
  {
    id: 'item.daily_voucher',
    name: 'item.daily_voucher.name',
    description: 'item.daily_voucher.description',
    icon: 'spell.rune_bronze_disc',
    rarity: 'epic',
    effect: { kind: 'quest_reset', period: 'daily' },
    version: 1,
  },
  {
    id: 'item.weekly_voucher',
    name: 'item.weekly_voucher.name',
    description: 'item.weekly_voucher.description',
    icon: 'spell.rune_silver_knot',
    rarity: 'epic',
    effect: { kind: 'quest_reset', period: 'weekly' },
    version: 1,
  },
  {
    id: 'item.mission_skip',
    name: 'item.mission_skip.name',
    description: 'item.mission_skip.description',
    icon: 'spell.tech_chrono_watch',
    rarity: 'legendary',
    effect: { kind: 'mission_skip' },
    version: 1,
  },
  {
    id: 'item.champions_chicken',
    name: 'item.champions_chicken.name',
    description: 'item.champions_chicken.description',
    icon: 'spell.earth_golden_seed',
    rarity: 'legendary',
    effect: { kind: 'champion_level' },
    version: 1,
  },
  {
    id: 'item.champions_cheatmeal',
    name: 'item.champions_cheatmeal.name',
    description: 'item.champions_cheatmeal.description',
    icon: 'spell.earth_golden_shell',
    rarity: 'mythic',
    effect: { kind: 'champion_stars' },
    version: 1,
  },
];

export const CONSUMABLE_BY_ID: Readonly<Record<string, ConsumableDef>> = Object.fromEntries(
  CONSUMABLES.map((def) => [def.id, def]),
);

/** Every consumable id, for the schemas that have to name one. */
export const CONSUMABLE_IDS: readonly string[] = CONSUMABLES.map((def) => def.id);
