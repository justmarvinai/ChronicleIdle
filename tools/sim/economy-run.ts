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
import { SHARD_EXCHANGE } from '@content/balance/summon';
import type { CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import { rollRunRewards } from '@engine/campaign/rewards';
import { energyCap } from '@engine/economy/energy';
import { farmTier, idleCapacityHours, idleHaul } from '@engine/economy/idle';
import { craftCost } from '@engine/forge/craft';
import { flatMissions } from '@engine/missions/path';
import { levelUpGold } from '@engine/progression/tavern-level';
import { visibleQuests } from '@engine/quests/board';
import { createRng, type Rng } from '@engine/rng/rng';
import { levelCost } from '@state/gear';
import type { EconomyScript } from './economy-script';

const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;
const SECONDS_PER_DAY = 86_400;

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
    ledger.payAll('crafting', craftCost(script.craftTier, true), script.craftsPerWeek);
    const ancient = SHARD_EXCHANGE.ancient;
    if (ancient) ledger.pay('ancient shards', ancient.currency, script.ancientShardsPerWeek * ancient.amount);
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
