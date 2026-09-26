/**
 * The players `pnpm sim:economy` plays, and the figures `docs/design/ECONOMY.md` §7–§8 says their
 * ledgers should come to. Data only — the arithmetic is in `economy.ts`, the way `teams.ts` holds
 * the bands `balance.ts` checks.
 *
 * A script is a day of play written down: how often the player sits down, what they farm, what
 * they claim and what they spend it on. Everything a line is *worth* comes from the content and
 * the balance tables, never from here — so when a table moves, the report moves with it and the
 * design's figure is what stands still.
 */
import type { Difficulty } from '@content/balance/battle';
import type { CraftTier } from '@content/balance/forge';
import type { CurrencyId } from '@content/currencies/types';

/** One simulated player. */
export interface EconomyScript {
  id: string;
  label: string;
  playerLevel: number;
  /** The stand they farm, and on which difficulty. */
  difficulty: Difficulty;
  settlement: number;
  /**
   * Sittings per day. Energy regenerates at one a minute into a bar the player's level sizes, so a
   * sitting is worth at most a full bar: this is what decides the day's energy, not the clock.
   */
  logins: number;
  /** Idle-chest claims per day (the chest holds a band of hours, so more claims is not more gold). */
  idleClaims: number;
  /**
   * Visits to the Mine a day, spread over the day's sittings. Its store is capped too (MINE.md §3),
   * so a single visit loses the hours past a full store — which is the casual player's week.
   */
  mineVisits: number;
  /** Keys spent on the daily boss, and on the weekly one on its day. */
  dailyBossKeys: number;
  weeklyBossKeys: number;
  /**
   * Brewery runs a day, of the twenty the mode allows across all four halls, and the stage they
   * are spent on. The runs are spread over whichever halls are open that weekday, so the Eclipse
   * hall's calendar shows up in the ledger the way it does in a player's week (BREWERY.md §4).
   */
  breweryRunsPerDay: number;
  breweryStage: number;
  /**
   * Wardens felled in the Unwritten a week, and the Omen the expeditions are read under. The
   * first six a week pay the Warden's Tithe (UNWRITTEN.md §14.2); an expedition won is three, one of
   * each folio, so they are booked in that order.
   */
  unwrittenWardensPerWeek: number;
  unwrittenOmen: number;
  /** The tier they fight, and the share of its pool they take down — which chests that earns. */
  bossTier: string;
  bossDamagePct: number;
  /** Missions claimed per week: the Path is finite, so an active player draws from it steadily. */
  missionsPerWeek: number;
  /**
   * New stands cleared per day. A mid-game player is still pushing forward, and ECONOMY.md §7
   * hangs 250 gems a week on "first clears while progressing" — this is that rate.
   */
  firstClearsPerDay: number;
  /** Gem sinks. */
  refillsPerWeek: number;
  ancientShardsPerWeek: number;
  /** Gold sinks. */
  fadedShardsPerDay: number;
  /** Gear levels bought per day, on pieces of this star tier around this level. */
  gearLevelsPerDay: number;
  gearStars: number;
  gearLevelAround: number;
  /** Champion levels fed per day, at this target level (the Tavern's gold line). */
  championLevelsPerDay: number;
  championLevelAround: number;
  craftsPerWeek: number;
  craftTier: CraftTier;
  /**
   * Gold left at the hourly stall each day (MARKET.md §1). The stall is where surplus gold goes,
   * so this is a share of the day's income rather than a shopping list: the sim spends it on
   * whatever the hours the player sits down in happen to be carrying.
   */
  stallGoldPerDay: number;
  /**
   * Entries of the Gem Market's fixed shelf bought each week (MARKET.md §2), by id. Prices and
   * contents come from the content, so a repricing moves the ledger on its own. Bundles belong in
   * no script: they are once per chronicle, which makes them a one-off rather than a weekly rate.
   */
  shelfPerWeek: readonly string[];
}

/**
 * The mid-game active player of ECONOMY.md §7–§8: a month in, level 30, farming Normal in the
 * back half of the map, claiming both boards, both bosses and the chest, and spending it on the
 * four sinks the design names.
 */
export const MID_GAME: EconomyScript = {
  id: 'mid_active',
  label: 'mid-game, active: level 30, farming Normal at settlement 9',
  playerLevel: 30,
  difficulty: 'normal',
  settlement: 9,
  // Morning and evening, a bar each: the player ECONOMY.md §7–§8 calls "active". Spending every
  // drop of the day's regen is the ceiling, and `DEDICATED` below is what that ceiling pays.
  logins: 2,
  idleClaims: 2,
  mineVisits: 2,
  dailyBossKeys: 3,
  weeklyBossKeys: 3,
  // Every run, on the mid-game stage: brews are the reason to open the mode at all.
  breweryRunsPerDay: 20,
  breweryStage: 3,
  // Two expeditions won a week, at the Omen a mid roster reads: the whole Tithe.
  unwrittenWardensPerWeek: 6,
  unwrittenOmen: 2,
  bossTier: 'normal',
  bossDamagePct: 60,
  missionsPerWeek: 8,
  firstClearsPerDay: 3,
  refillsPerWeek: 2,
  ancientShardsPerWeek: 2,
  fadedShardsPerDay: 8,
  gearLevelsPerDay: 24,
  gearStars: 5,
  gearLevelAround: 9,
  championLevelsPerDay: 40,
  championLevelAround: 34,
  craftsPerWeek: 7,
  craftTier: 'ember',
  // About half the day's gold surplus — enough to clear most of the two stalls they sit in front
  // of, and never enough for the rows the stall puts there to be saved for.
  stallGoldPerDay: 60_000,
  shelfPerWeek: ['shelf.champion_xp_boost', 'shelf.brewery_boost'],
};

/** The same month played by someone who sits down once a day — the floor the design must not block. */
export const CASUAL: EconomyScript = {
  ...MID_GAME,
  id: 'casual',
  label: 'mid-game, casual: one sitting a day, one chest, one boss key',
  logins: 1,
  idleClaims: 1,
  mineVisits: 1,
  dailyBossKeys: 1,
  weeklyBossKeys: 1,
  breweryRunsPerDay: 6,
  breweryStage: 2,
  // One expedition a week, won at the first rungs.
  unwrittenWardensPerWeek: 3,
  unwrittenOmen: 1,
  bossDamagePct: 30,
  missionsPerWeek: 3,
  firstClearsPerDay: 2,
  refillsPerWeek: 0,
  ancientShardsPerWeek: 0,
  fadedShardsPerDay: 2,
  gearLevelsPerDay: 6,
  championLevelsPerDay: 10,
  craftsPerWeek: 2,
  stallGoldPerDay: 30_000,
  shelfPerWeek: ['shelf.champion_xp_boost'],
};

/**
 * The ceiling: someone who spends the whole day's regen, four bars of it. Nothing checks this
 * script — it is here so a tuning pass can see what the most active possible player earns, which
 * is the number that decides whether the game runs out of things to want.
 */
export const DEDICATED: EconomyScript = {
  ...MID_GAME,
  id: 'dedicated',
  label: 'mid-game, dedicated: four sittings a day, every drop of the regen spent',
  logins: 4,
  idleClaims: 3,
  mineVisits: 3,
  // The ceiling: the day's twenty runs on the deepest stage a finished roster farms.
  breweryRunsPerDay: 20,
  breweryStage: 4,
  // More expeditions than the Tithe pays for; the six it pays, at a higher Omen.
  unwrittenWardensPerWeek: 9,
  unwrittenOmen: 5,
  firstClearsPerDay: 6,
  missionsPerWeek: 12,
  gearLevelsPerDay: 40,
  championLevelsPerDay: 60,
  fadedShardsPerDay: 14,
  craftsPerWeek: 12,
  stallGoldPerDay: 90_000,
  shelfPerWeek: [
    'shelf.champion_xp_boost',
    'shelf.player_xp_boost',
    'shelf.brewery_boost',
    'shelf.brewery_token',
  ],
};

export const SCRIPTS: readonly EconomyScript[] = [CASUAL, MID_GAME, DEDICATED];
export const SCRIPT_BY_ID: Readonly<Record<string, EconomyScript>> = Object.fromEntries(
  SCRIPTS.map((script) => [script.id, script]),
);

/** A figure from ECONOMY.md the simulated ledger is held against. */
export interface EconomyBand {
  script: string;
  currency: CurrencyId;
  per: 'day' | 'week';
  side: 'income' | 'spend' | 'net';
  /**
   * One ledger line by name, instead of the script's whole book — `'daily rewards'`, `'gold market'`.
   * A line band is how a *source* is held to a size: a total says the week is healthy, and says
   * nothing about one line having quietly grown to be all of it. `net` is meaningless for a line,
   * so a line band is `income` or `spend`.
   */
  line?: string;
  /** What the design prints. `min`/`max` are the range the sim must land in. */
  min?: number;
  max?: number;
  why: string;
}

/**
 * What `pnpm sim:economy` holds the ledger to.
 *
 * ECONOMY.md §7–§8 used to print a single composition — "≈ 800 gems a week … bosses 100" — written
 * while the bosses were still a plan. BOSSES.md §2's tier tables, authored in Phase 10, give
 * Gargoyle's Normal tier 60 gems a day and Titan's 120 a week, so the boss line alone is worth
 * ~600 a week and the old total was stale by exactly that much. Every other line the design named
 * came in where it said (first clears ~273 against 250, the daily hundred ~350 against 280, the
 * weekly chest ~112 against 120, missions ~42 against 50).
 *
 * So these bands guard the design's *intent* rather than that arithmetic: a day must never end in
 * the red at any activity level, a light player must still be able to summon, and the ceiling must
 * not run away. The ranges sit around what the content currently pays (§7–§8 now prints those
 * figures), wide enough not to trip on a rounding change and tight enough that anything doubling an
 * income line fails here. The measured figures are in `docs/design/ECONOMY.md` §7–§8.
 */
export const ECONOMY_BANDS: readonly EconomyBand[] = [
  {
    script: 'mid_active',
    currency: 'gems',
    per: 'week',
    side: 'income',
    min: 1_150,
    max: 1_950,
    why: 'ECONOMY.md §7: ~1,830 gems a week — ~600 the two bosses, ~240 the Rewards Calendar, ~150 the Mine',
  },
  {
    script: 'mid_active',
    currency: 'gems',
    per: 'week',
    side: 'net',
    min: 0,
    why: '§7: a week of play pays for its own shards and refills',
  },
  {
    script: 'mid_active',
    currency: 'gold',
    per: 'day',
    side: 'income',
    min: 240_000,
    max: 420_000,
    why: 'ECONOMY.md §8: ~320k gold a day (campaign ~155k, boss 80k, idle ~58k, boards ~19k)',
  },
  {
    script: 'mid_active',
    currency: 'gold',
    per: 'day',
    side: 'net',
    min: 0,
    why: '§8: gold should feel tight but never blocking, so a day must not end in the red',
  },
  {
    script: 'mid_active',
    line: 'brewery',
    currency: 'brew_valor',
    per: 'day',
    side: 'income',
    min: 12,
    why: "BREWERY.md §7: the Brewery is the main source of every element's brews, not only the one the player's own stand happens to drop",
  },
  {
    script: 'mid_active',
    line: 'brewery',
    currency: 'brew_eclipse',
    per: 'day',
    side: 'income',
    min: 4,
    why: 'BREWERY.md §4: the Waning Cellar opens three days a week, which must still be enough to rank an Eclipse champion',
  },
  {
    script: 'casual',
    currency: 'gold',
    per: 'day',
    side: 'net',
    min: 0,
    why: 'one sitting a day must still pay for what that day spends',
  },
  {
    script: 'casual',
    currency: 'gems',
    per: 'week',
    side: 'income',
    min: 500,
    why: 'a light player must still reach an Ancient Shard most weeks (300 gems)',
  },
  {
    script: 'casual',
    currency: 'gems',
    per: 'week',
    side: 'net',
    min: 0,
    why: 'a casual week saves towards a shard rather than falling behind',
  },
  {
    script: 'dedicated',
    currency: 'gold',
    per: 'day',
    side: 'income',
    max: 600_000,
    why: 'the ceiling must not run away: four bars a day is ~1.5× the active player, not 5×',
  },
  {
    script: 'dedicated',
    currency: 'gems',
    per: 'week',
    side: 'income',
    max: 2_600,
    why: 'the same for gems — the boss, chest and calendar lines do not scale with sittings, and should not',
  },
  {
    script: 'mid_active',
    line: 'daily rewards',
    currency: 'gems',
    per: 'week',
    side: 'income',
    min: 180,
    max: 340,
    why: 'LOGIN.md §5: the board loops forever, so its ~240 gems a week must stay a bonus — about a seventh of an active week — and never a second job',
  },
  {
    script: 'mid_active',
    line: 'daily rewards',
    currency: 'gold',
    per: 'day',
    side: 'income',
    max: 12_000,
    why: "LOGIN.md §5: the board's gold is a top-up on the day, not a wage — well under a twentieth of it",
  },
  {
    script: 'mid_active',
    line: 'mine',
    currency: 'gems',
    per: 'week',
    side: 'income',
    min: 100,
    max: 250,
    why: 'MINE.md §2: a steady tenth of an active week, collected morning and evening — never a second boss',
  },
  {
    script: 'casual',
    line: 'mine',
    currency: 'gems',
    per: 'week',
    side: 'income',
    min: 80,
    why: 'MINE.md §3: one visit a day still takes a whole store, so the Mine is worth a light player’s while',
  },
  {
    script: 'mid_active',
    line: 'gold market',
    currency: 'gold',
    per: 'day',
    side: 'spend',
    min: 30_000,
    why: 'MARKET.md §1: the stall is where a day of surplus gold goes, so a budget this size must find things to buy — if it cannot, the pool is priced out of reach',
  },
];

/**
 * The most days of a script's spare gold — the day's net, plus what it leaves at the stall — and of
 * each material's net income that digging its Mine to the level its chronicle opens may take
 * (MINE.md §4). The Mine is a goal, not a wall: a level that asked for a month's surplus would be
 * priced for a player who does nothing else, and this is the check that says so.
 */
export const MINE_DIG_DAYS_MAX = 30;
