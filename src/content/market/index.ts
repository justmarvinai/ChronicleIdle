/**
 * The Gem Market's shelf (docs/design/MARKET.md §2): nine single items that never run out, and
 * four bundles that can each be taken once.
 *
 * **Prices are weeks.** `ECONOMY.md` §7 measures an active chronicle at ~1,674 gems a week in and
 * ~594 net after its shards, refills and this shelf, so the prices read as: a boost is most of a
 * day's gems, a voucher a day and a half, the Chicken two and a half weeks of what is left over,
 * and the Cheatmeal the best part of seven. That is what "very expensive" and "extremely
 * expensive" were asked to mean.
 *
 * **No entry may be a gem printer.** The two vouchers hand back a board whose own chests pay gems,
 * so each is priced well above the most that board can return: the daily board pays at most 60
 * gems against a 175 price, the weekly 110 against 450. A player buying one is buying time, never
 * arbitrage — `pnpm sim:economy` audits every entry against that rule and `--strict` fails on any
 * that reaches its own price.
 *
 * The bundles are the genre's one-time packs: each is priced at roughly 70 % of its parts bought
 * singly, which is only sound *because* it can be taken once (the owner's answer).
 */
import type { GemShelfEntry } from './types';

/** A single consumable, sold forever. */
function single(order: number, slug: string, price: number): GemShelfEntry {
  return {
    id: `shelf.${slug}`,
    name: `item.${slug}.name`,
    description: `item.${slug}.description`,
    price,
    contents: [{ kind: 'consumable', item: `item.${slug}`, count: 1 }],
    order,
    version: 1,
  };
}

export const GEM_SHELF: readonly GemShelfEntry[] = [
  single(1, 'brewery_token', 120),
  single(2, 'brewery_boost', 180),
  single(3, 'champion_xp_boost', 200),
  single(4, 'player_xp_boost', 200),
  single(5, 'daily_voucher', 175),
  single(6, 'weekly_voucher', 450),
  single(7, 'mission_skip', 1_200),
  single(8, 'champions_chicken', 1_500),
  single(9, 'champions_cheatmeal', 4_000),

  {
    id: 'shelf.chroniclers_satchel',
    name: 'shelf.chroniclers_satchel.name',
    description: 'shelf.chroniclers_satchel.description',
    // Singly: 180 + 200 + 200 + 120 = 700.
    price: 500,
    once: true,
    contents: [
      { kind: 'consumable', item: 'item.brewery_boost', count: 1 },
      { kind: 'consumable', item: 'item.champion_xp_boost', count: 1 },
      { kind: 'consumable', item: 'item.player_xp_boost', count: 1 },
      { kind: 'consumable', item: 'item.brewery_token', count: 1 },
    ],
    order: 10,
    version: 1,
  },
  {
    id: 'shelf.quartermasters_crate',
    name: 'shelf.quartermasters_crate.name',
    description: 'shelf.quartermasters_crate.description',
    /*
     * The one bundle that pays no consumables: a chronicle's first real leg-up in gold, energy and
     * the tomes a roster stalls on. Deliberately not shards — the Portal owns those (SUMMONING.md
     * §5's exchange), and a second door to the same thing would only confuse the price of one.
     */
    price: 600,
    once: true,
    contents: [
      { kind: 'currency', currency: 'gold', amount: 400_000 },
      { kind: 'currency', currency: 'energy', amount: 1_000 },
      { kind: 'currency', currency: 'tome_epic', amount: 4 },
      { kind: 'currency', currency: 'mat_refining_core', amount: 2 },
    ],
    order: 11,
    version: 1,
  },
  {
    id: 'shelf.stewards_ledger',
    name: 'shelf.stewards_ledger.name',
    description: 'shelf.stewards_ledger.description',
    // Singly: 350 + 450 + 240 = 1,040.
    price: 750,
    once: true,
    contents: [
      { kind: 'consumable', item: 'item.daily_voucher', count: 2 },
      { kind: 'consumable', item: 'item.weekly_voucher', count: 1 },
      { kind: 'consumable', item: 'item.brewery_token', count: 2 },
    ],
    order: 12,
    version: 1,
  },
  {
    id: 'shelf.ascendants_table',
    name: 'shelf.ascendants_table.name',
    description: 'shelf.ascendants_table.description',
    // Singly: 1,500 + 4,000 + 400 = 5,900. The shelf's one genuinely long save.
    price: 4_200,
    once: true,
    contents: [
      { kind: 'consumable', item: 'item.champions_cheatmeal', count: 1 },
      { kind: 'consumable', item: 'item.champions_chicken', count: 1 },
      { kind: 'consumable', item: 'item.champion_xp_boost', count: 2 },
    ],
    order: 13,
    version: 1,
  },
];

export const GEM_SHELF_BY_ID: Readonly<Record<string, GemShelfEntry>> = Object.fromEntries(
  GEM_SHELF.map((entry) => [entry.id, entry]),
);
