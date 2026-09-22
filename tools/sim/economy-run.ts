/**
 * The economy simulation behind `pnpm sim:economy` (ROADMAP.md Phase 15, ECONOMY.md §7–§8).
 *
 * Pure and deterministic: a script plus a sample number is a seed, so the same call always returns
 * the same ledger. `economy.ts` is the command line over this; `economy-script.ts` is the data.
 *
 * What it does *not* do is fight: whether a team can clear the stand it farms is `sim:balance`'s
 * question. This module assumes the script's stand is farmable and asks the other one — whether a
 * day of that farming pays for a day of that spending. Every figure comes from the content and the
 * balance tables through the same functions the game uses, so the report follows a tuning change
 * without being told.
 */
import { ENERGY_COST, STAGES_PER_SETTLEMENT, globalStageIndex } from '@content/balance/campaign';
import { ENERGY_REFILL_AMOUNT, ENERGY_REFILL_GEMS, ENERGY_REGEN_SECONDS } from '@content/balance/energy';
import { FARM_TIER_BAND } from '@content/balance/idle';
import { LOGIN_DAYS } from '@content/balance/login';
import { SHARD_EXCHANGE } from '@content/balance/summon';
import type { CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import { rollRunRewards } from '@engine/campaign/rewards';
import { energyCap } from '@engine/economy/energy';
import { farmTier, idleCapacityHours, idleHaul } from '@engine/economy/idle';
import { breweryRewards, opensOn } from '@engine/brewery/index';
import { craftCost } from '@engine/forge/craft';
import { goldShelf, slotCost } from '@engine/market/index';
import { flatMissions } from '@engine/missions/path';
import { levelUpGold } from '@engine/progression/tavern-level';
import { visibleQuests } from '@engine/quests/board';
import { createRng, type Rng } from '@engine/rng/rng';
import { levelCost } from '@state/gear';
import type { EconomyScript } from './economy-script';

const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;
const SECONDS_PER_DAY = 86_400;
const MS_PER_HOUR = 3_600_000;

/**
 * What the Standing Welcome pays in a day (LOGIN.md §5).
 *
 * The board hands over one tile per login and **loops** when it ends (the owner's answer), so it
 * is permanent income rather than an onboarding arc, and every script claims it: a calendar nobody
 * would skip is a calendar the ledger has to carry.
 *
 * It is booked at the cycle's rate rather than walked tile by tile, because the board is thirty
 * days long and a script is twenty-eight — four whole weeks, which every weekly line here needs to
 * land on a whole number of claims. A walk would stop two tiles short, and those two are days 29
 * and 30: the finale, the richest part of the board and the one part worth arguing about. Booking
 * the rate is exact at any `--days`, and it is the truer figure besides — these scripts are
 * mid-game players a month in, somewhere in the middle of their own cycle rather than on day one.
 *
 * Tiles that pay an **item** rather than a currency are not counted. The ledger is kept in
 * currencies, and what a Brewery Token is worth is the Market audit's question, not this one.
 */
const WELCOME_PER_DAY: readonly { currency: CurrencyId; amount: number }[] = (() => {
  const cycle = new Map<CurrencyId, number>();
  for (const tile of content.loginBoard)
    for (const grant of tile.rewards)
      if (grant.kind === 'currency')
        cycle.set(grant.currency, (cycle.get(grant.currency) ?? 0) + grant.amount);
  return [...cycle].map(([currency, amount]) => ({ currency, amount: amount / LOGIN_DAYS }));
})();

/** Income and spend, kept per line so the report can name where a currency came from. */
export class Ledger {
  readonly income = new Map<string, Map<CurrencyId, number>>();
  readonly spend = new Map<string, Map<CurrencyId, number>>();

  private static put(
    book: Map<string, Map<CurrencyId, number>>,
    line: string,
    currency: CurrencyId,
    amount: number,
  ): void {
    if (amount <= 0) return;
    const row = book.get(line) ?? new Map<CurrencyId, number>();
    row.set(currency, (row.get(currency) ?? 0) + amount);
    book.set(line, row);
  }

  earn(line: string, currency: CurrencyId, amount: number): void {
    Ledger.put(this.income, line, currency, amount);
  }

  pay(line: string, currency: CurrencyId, amount: number): void {
    Ledger.put(this.spend, line, currency, amount);
  }

  earnAll(line: string, gains: readonly { currency: CurrencyId; amount: number }[]): void {
    for (const gain of gains) this.earn(line, gain.currency, gain.amount);
  }

  payAll(line: string, costs: readonly { currency: CurrencyId; amount: number }[], times = 1): void {
    for (const cost of costs) this.pay(line, cost.currency, cost.amount * times);
  }

  private static total(book: Map<string, Map<CurrencyId, number>>, currency: CurrencyId): number {
    let sum = 0;
    for (const row of book.values()) sum += row.get(currency) ?? 0;
    return sum;
  }

  totalIncome(currency: CurrencyId): number {
    return Ledger.total(this.income, currency);
  }

  totalSpend(currency: CurrencyId): number {
    return Ledger.total(this.spend, currency);
  }

  /** Every currency either book touched, gold and gems first. */
  currencies(): CurrencyId[] {
    const seen = new Set<CurrencyId>();
    for (const book of [this.income, this.spend])
      for (const row of book.values()) for (const currency of row.keys()) seen.add(currency);
    const order = (currency: CurrencyId): number =>
      currency === 'gold' ? 0 : currency === 'gems' ? 1 : currency === 'energy' ? 2 : 3;
    return [...seen].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  }
}

/** The farm tier a script has earned: Intro mastered, then as far as it has pushed this difficulty. */
export function tierOf(script: EconomyScript): number {
  const reached = [
    FARM_TIER_BAND,
    script.difficulty === 'intro' ? 0 : script.settlement - 1,
    script.difficulty === 'hard' ? script.settlement - 1 : 0,
  ];
  return farmTier(reached);
}

/** One day of the script, rolled once. */
function playDay(script: EconomyScript, day: number, ledger: Ledger, rng: Rng): void {
  const settlement = content.settlements[script.settlement - 1];
  if (!settlement) throw new Error(`no settlement ${script.settlement}`);
  const cap = energyCap(script.playerLevel);
  const regenPerDay = SECONDS_PER_DAY / ENERGY_REGEN_SECONDS;
  const endOfWeek = day % DAYS_PER_WEEK === DAYS_PER_WEEK - 1;

  // ── Energy for the day: a sitting is worth a bar, and the day cannot outrun the regen.
  const refills = endOfWeek ? script.refillsPerWeek : 0;
  let energy = Math.min(script.logins * cap, regenPerDay) + refills * ENERGY_REFILL_AMOUNT;
  if (refills > 0) {
    ledger.pay('energy refills', 'gems', refills * ENERGY_REFILL_GEMS);
    ledger.earn('energy refills', 'energy', refills * ENERGY_REFILL_AMOUNT);
  }

  // ── The campaign: the new stands first (they pay the first-clear bundle), then the farm.
  const band = Math.min(2, Math.floor((script.settlement - 1) / 4));
  const cost = ENERGY_COST[script.difficulty][band] ?? 0;
  const runReward = (stageNumber: number, firstClear: boolean) =>
    rollRunRewards(
      {
        settlementIndex: script.settlement,
        stageNumber,
        globalIndex: globalStageIndex(script.settlement, stageNumber),
        difficulty: script.difficulty,
        boss: stageNumber === STAGES_PER_SETTLEMENT,
        element: settlement.element,
        energySpent: cost,
        firstClear,
        chestThresholds: firstClear ? [1, 2, 3] : [],
      },
      rng,
    );

  for (let i = 0; i < script.firstClearsPerDay && energy >= cost; i += 1) {
    energy -= cost;
    const rewards = runReward(((day * script.firstClearsPerDay + i) % STAGES_PER_SETTLEMENT) + 1, true);
    ledger.earnAll('first clears', rewards.currencies);
    ledger.earn('first clears', 'gems', rewards.gems);
    ledger.earn('first clears', 'energy', rewards.energy);
  }
  let runs = 0;
  while (energy >= cost) {
    energy -= cost;
    runs += 1;
    const rewards = runReward(1 + (runs % STAGES_PER_SETTLEMENT), false);
    ledger.earnAll('campaign farming', rewards.currencies);
    ledger.earn('campaign farming', 'gems', rewards.gems);
  }

  // ── The idle chest: each claim holds what has built up since the last one, up to the band's cap.
  const heldHours = Math.min(HOURS_PER_DAY / script.idleClaims, idleCapacityHours(script.playerLevel));
  for (let claim = 0; claim < script.idleClaims; claim += 1) {
    const haul = idleHaul({ tier: tierOf(script), hours: heldHours, brewElement: settlement.element }, rng);
    ledger.earnAll('idle chest', haul.currencies);
  }

  // ── The Standing Welcome: a tile a day, booked at the board's own rate (see WELCOME_PER_DAY).
  ledger.earnAll('the welcome', WELCOME_PER_DAY);

  // ── The stall: the day's surplus gold, spent on whatever this hour happens to carry.
  stallDay(script, day, ledger);

  // ── The Brewery: the day's runs, spread over the halls whose doors are open this weekday.
  brewDay(script, day, ledger);

  // ── The boards: every quest the level shows, and the chests the points earn.
  claimBoard('daily', day, ledger, script);
  if (endOfWeek) claimBoard('weekly', day, ledger, script);

  // ── The bosses: the chests the period's damage has earned, once per period.
  for (const boss of content.bosses) {
    if (boss.period === 'weekly' && !endOfWeek) continue;
    if ((boss.period === 'daily' ? script.dailyBossKeys : script.weeklyBossKeys) <= 0) continue;
    const tier = boss.tiers.find((one) => one.id === script.bossTier) ?? boss.tiers[0];
    if (!tier) continue;
    for (const chest of tier.chests)
      if (chest.pct <= script.bossDamagePct) ledger.earnAll(`${boss.period} boss`, chest.currencies);
  }

  // ── The Path: the missions of the week, drawn in order, and a chapter chest as one closes.
  if (endOfWeek) {
    const all = flatMissions(content.missionChapters);
    const week = Math.floor(day / DAYS_PER_WEEK);
    const from = week * script.missionsPerWeek;
    for (const mission of all.slice(from, from + script.missionsPerWeek))
      ledger.earnAll('missions', mission.rewards);
    const chapter = content.missionChapters[Math.floor((from / all.length) * content.missionChapters.length)];
    if (chapter && (from + script.missionsPerWeek) % chapter.missions.length < script.missionsPerWeek)
      ledger.earnAll('mission chapters', chapter.chest.currencies);
  }

  // ── The sinks ECONOMY.md §7–§8 names.
  ledger.pay(
    'gear levels',
    'gold',
    script.gearLevelsPerDay * levelCost(script.gearStars, script.gearLevelAround),
  );
  ledger.pay('tavern', 'gold', script.championLevelsPerDay * levelUpGold(script.championLevelAround));
  const faded = SHARD_EXCHANGE.faded;
  if (faded) ledger.pay('faded shards', faded.currency, script.fadedShardsPerDay * faded.amount);
  if (endOfWeek) {
    buyShelf(script, ledger);
    ledger.payAll('crafting', craftCost(script.craftTier, true), script.craftsPerWeek);
    const ancient = SHARD_EXCHANGE.ancient;
    if (ancient) ledger.pay('ancient shards', ancient.currency, script.ancientShardsPerWeek * ancient.amount);
  }
}

/**
 * The day at the hourly stall (MARKET.md §1): the surplus gold, spent on what this hour carries.
 *
 * The script walks the stalls it actually sits down in front of — one per sitting, spread across
 * the day, each drawn by the game's own `goldShelf` — and takes whole slots in shelf order until
 * the day's budget is gone. Shelf order rather than cheapest-first is deliberate: the shelf is
 * already a random draw from the pool, so taking it as it comes is the average basket, while a
 * cheapest-first shopper is one the stall does not have. The dear rows price themselves out
 * without any rule saying so — a Sacred Shard at 260,000 gold never fits a day's budget, which is
 * the whole point of that row being on the board.
 */
function stallDay(script: EconomyScript, day: number, ledger: Ledger): void {
  let budget = script.stallGoldPerDay;
  if (budget <= 0) return;
  for (let sitting = 0; sitting < script.logins && budget > 0; sitting += 1) {
    // Sittings spread over the day, so each one meets a stall the last one did not.
    const hour = day * HOURS_PER_DAY + Math.floor((sitting * HOURS_PER_DAY) / script.logins);
    for (const slot of goldShelf(`economy:${script.id}`, hour * MS_PER_HOUR)) {
      const count = Math.min(slot.stock, Math.floor(budget / slot.unitGold));
      if (count <= 0) continue;
      const cost = slotCost(slot, count);
      budget -= cost;
      ledger.pay('gold market', 'gold', cost);
      ledger.earn('gold market', slot.currency, count);
    }
  }
}

/**
 * The week at the Gem Market's fixed shelf (MARKET.md §2).
 *
 * A script names entries by id and every figure comes from the content, so a repricing moves the
 * ledger without a line here being touched. Bundles are in no script's week on purpose: they are
 * once per chronicle (the owner's answer), which makes them a one-off rather than a rate, and a
 * one-off has no honest place in a figure printed per week.
 */
function buyShelf(script: EconomyScript, ledger: Ledger): void {
  for (const id of script.shelfPerWeek) {
    const entry = content.gemShelfById(id);
    if (!entry) throw new Error(`no shelf entry ${id}`);
    ledger.pay('gem market', 'gems', entry.price);
    for (const grant of entry.contents)
      if (grant.kind === 'currency') ledger.earn('gem market', grant.currency, grant.amount);
  }
}

/**
 * The day in the Brewery: the script's runs dealt round-robin to the halls that brew today. A run
 * is a run whichever hall takes it — twenty a day, all four halls together — so what the calendar
 * changes is *which* brew the day pays, which is exactly the choice the mode is about.
 */
function brewDay(script: EconomyScript, day: number, ledger: Ledger): void {
  // Day 0 of a simulated month is a Monday, the same day the weekly reset falls on.
  const weekday = (1 + day) % DAYS_PER_WEEK;
  const open = content.breweries.filter((hall) => opensOn(hall, weekday));
  if (!open.length) return;
  for (let run = 0; run < script.breweryRunsPerDay; run += 1) {
    const hall = open[run % open.length];
    const stage = hall?.stages.find((entry) => entry.number === script.breweryStage);
    if (hall && stage) ledger.earnAll('brewery', breweryRewards(hall, stage));
  }
}

/** A period's board: every quest the level shows plus the chests its points reach. */
function claimBoard(period: 'daily' | 'weekly', day: number, ledger: Ledger, script: EconomyScript): void {
  const board = content.questBoard(period);
  const quests = visibleQuests(board, script.playerLevel);
  let points = 0;
  for (const quest of quests) {
    ledger.earnAll(`${period} quests`, quest.rewards);
    points += quest.points;
  }
  // Hidden quests are stood in for, so the board's points are always reachable in full.
  const full = board.quests.reduce((sum, quest) => sum + quest.points, 0);
  points = Math.max(points, full);
  const claims = period === 'daily' ? day + 1 : Math.floor(day / DAYS_PER_WEEK) + 1;
  for (const chest of board.chests) {
    if (chest.points > points) continue;
    const cycle = chest.cycle;
    const cycled = cycle !== undefined && claims % cycle.every === 0;
    ledger.earnAll(`${period} chests`, cycled && cycle ? cycle.instead : chest.currencies);
  }
}

export function simulate(script: EconomyScript, sample: number, days: number): Ledger {
  const ledger = new Ledger();
  const rng = createRng(`economy:${script.id}:${sample}`);
  for (let day = 0; day < days; day += 1) playDay(script, day, ledger, rng);
  return ledger;
}

/**
 * One row of the shelf audit: what an entry costs, and the most it can ever hand back in gems.
 *
 * This is the question the Gem Market has to answer before anything else. Every entry is a gem
 * **sink** — gems in, progress out — and the one way that breaks is an entry that pays back more
 * gems than it costs, because then it is not a sink at all but a loop, and a loop with infinite
 * stock is infinite gems. `pnpm sim:economy --strict` fails when any row's `gemsBack` reaches its
 * price, so a future repricing cannot open one by accident.
 */
export interface ShelfAudit {
  id: string;
  price: number;
  /** The ceiling on what one purchase can return in gems, contents and effects together. */
  gemsBack: number;
  /** Where those gems would come from, for the report to name. */
  via: string;
}

/** The most gems one full sweep of a board can pay: its quests, plus the richer face of each chest. */
function boardGems(period: 'daily' | 'weekly'): number {
  const board = content.questBoard(period);
  const gems = (rows: readonly { currency: CurrencyId; amount: number }[]): number =>
    rows.reduce((sum, row) => sum + (row.currency === 'gems' ? row.amount : 0), 0);
  let total = board.quests.reduce((sum, quest) => sum + gems(quest.rewards), 0);
  for (const chest of board.chests)
    // A chest with a cadence shows two faces; the audit has to assume the one that pays gems.
    total += Math.max(gems(chest.currencies), chest.cycle ? gems(chest.cycle.instead) : 0);
  return total;
}

/**
 * The most gems using one of an item can return.
 *
 * Exhaustive over the effect union, so a new kind of consumable cannot ship without someone
 * deciding — here, in the open — whether it can pay gems back.
 */
function consumableGems(item: string, count: number): { gems: number; via: string } {
  const def = content.consumableById(item);
  if (!def) throw new Error(`no consumable ${item}`);
  const effect = def.effect;
  switch (effect.kind) {
    case 'quest_reset': {
      // The one that can: a reset board is a board whose chests pay again.
      const per = boardGems(effect.period);
      return { gems: per * count, via: `${count}× the ${effect.period} board, ${per} gems a sweep` };
    }
    case 'boost':
      // Boosts multiply experience, which no currency in this ledger is.
      return { gems: 0, via: '' };
    case 'brewery_runs':
      return { gems: 0, via: '' };
    case 'mission_skip':
      // A skipped step is marked done and left unpaid (the owner's answer), so it pays nothing.
      return { gems: 0, via: '' };
    case 'champion_level':
    case 'champion_stars':
      return { gems: 0, via: '' };
  }
}

/** Every entry of the Gem Market, priced against the most it can ever pay back. */
export function shelfAudit(): readonly ShelfAudit[] {
  return content.gemShelf.map((entry) => {
    let gemsBack = 0;
    const via: string[] = [];
    for (const grant of entry.contents) {
      if (grant.kind === 'currency') {
        if (grant.currency !== 'gems') continue;
        gemsBack += grant.amount;
        via.push(`${grant.amount} gems in the box`);
        continue;
      }
      const from = consumableGems(grant.item, grant.count);
      if (from.gems <= 0) continue;
      gemsBack += from.gems;
      via.push(from.via);
    }
    return { id: entry.id, price: entry.price, gemsBack, via: via.join(', ') || 'nothing' };
  });
}
