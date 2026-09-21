/**
 * The quest boards in the save (docs/design/QUESTS_MISSIONS.md §2–§3).
 *
 * The same discipline as the period bosses (ADR-033): the save stores the period its claims belong
 * to and the counters that period began with, and everything else is read against the clock. A
 * board whose stored key is older than now *is* a fresh board — no midnight job, nothing to run
 * twice, and a rollover that happened while the game was closed lands exactly once, on the read
 * that notices it.
 *
 * Claiming is the only thing that writes: a quest's reward and its points, or a chest's contents.
 * Both are once per period, and both are idempotent — a second press is refused, not paid.
 */
import { content } from '@content/registry';
import type { CurrencyAmount } from '@content/currencies/types';
import { QUEST_PERIODS, type QuestChestDef, type QuestPeriod } from '@content/quests/types';
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { fail, ok, type Result } from '@engine/errors';
import type { CurrencyChange } from '@engine/economy/wallet';
import { QUEST_CHEST_COUNTER, bumpCounter, bumpCounterId, counter } from '@engine/progression/counters';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import { boardComplete, boardView, type BoardView } from '@engine/quests/board';
import type { QuestPeriodSave, SaveGame } from '@engine/schema/save';
import { palaceBonusOf } from './palace';
import { dailyKey, msUntilDailyReset, msUntilWeeklyReset, weeklyKey } from '@engine/time/clock';
import { GOAL_LOOKUPS } from './goal-lookups';
import { mergeAmounts, payCurrencies } from './payout';

/** Quests claimed in a day that the mission line counts as a day's work (`QUESTS_MISSIONS.md` §4). */
const DAILY_FIVE = 5;

/** The key of the period a board is in right now. */
export function questPeriodKey(period: QuestPeriod, now: number): string {
  return period === 'daily'
    ? dailyKey(now, DAILY_RESET_HOUR)
    : weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
}

/** How long the period still has to run, for the header's countdown. */
export function msUntilQuestReset(period: QuestPeriod, now: number): number {
  return period === 'daily'
    ? msUntilDailyReset(now, DAILY_RESET_HOUR)
    : msUntilWeeklyReset(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
}

/**
 * The board's record as it stands at `now`: the stored one when it is this period's, a fresh one
 * baselined against the counters as they are otherwise. Pure — nothing is written here, so reading
 * the screen never changes the game.
 */
export function currentQuestPeriod(save: SaveGame, period: QuestPeriod, now: number): QuestPeriodSave {
  const key = questPeriodKey(period, now);
  const stored = save.quests[period];
  return stored.periodKey === key ? stored : freshPeriod(save, key);
}

/** A board at the start of a period: this period's key, the counters so far, nothing claimed. */
function freshPeriod(save: SaveGame, periodKey: string): QuestPeriodSave {
  return { periodKey, baseline: { ...save.stats }, claimed: [], chests: [], dayCounted: false };
}

export interface QuestBoardState extends BoardView {
  /** The period's own key, so the caller can tell one day's board from the next. */
  periodKey: string;
  msUntilReset: number;
  unlocked: boolean;
  unlockLevel: number;
}

/** Everything the Quests screen and the hub's dot read for one period. */
export function questBoardState(save: SaveGame, period: QuestPeriod, now: number): QuestBoardState {
  const board = content.questBoard(period);
  const record = currentQuestPeriod(save, period, now);
  const view = boardView(board, {
    save,
    baseline: record.baseline,
    now,
    palace: palaceBonusOf(save.palace.nodes),
    lookups: GOAL_LOOKUPS,
    playerLevel: save.profile.level,
    claimedQuests: record.claimed,
    claimedChests: record.chests,
  });
  return {
    ...view,
    periodKey: record.periodKey,
    msUntilReset: msUntilQuestReset(period, now),
    unlocked: isFeatureUnlocked(board.feature, save.profile.level),
    unlockLevel: unlockLevel(board.feature),
  };
}

/**
 * Quests and chests waiting to be taken across both boards — the dot on the hub's Quests button.
 * A board the chronicle has not unlocked is not counted: it cannot be claimed from yet.
 */
export function questsClaimable(save: SaveGame, now: number): number {
  let total = 0;
  for (const period of QUEST_PERIODS) {
    const state = questBoardState(save, period, now);
    if (state.unlocked) total += state.claimableQuests + state.claimableChests;
  }
  return total;
}

/** What claiming paid, for the toast and the reward moment. */
export interface QuestClaim {
  questIds: string[];
  points: number;
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  /** True when that claim finished the board, which the weekly quest counts. */
  boardCompleted: boolean;
}

/**
 * Claims one quest, or every claimable one when `questId` is omitted ("Claim all"). A quest that
 * is not finished, or already claimed, is refused rather than paid — pressing twice cannot pay
 * twice, whatever the UI does.
 */
export function applyQuestClaim(
  save: SaveGame,
  period: QuestPeriod,
  now: number,
  questId?: string,
): Result<QuestClaim> {
  const state = questBoardState(save, period, now);
  if (!state.unlocked) return fail('locked', `The ${period} board opens at level ${state.unlockLevel}`);
  const claimable = state.quests.filter(
    (view) => view.claimable && (questId === undefined || view.quest.id === questId),
  );
  if (!claimable.length) {
    const named = questId ? state.quests.find((view) => view.quest.id === questId) : undefined;
    if (questId && !named) return fail('invalid_argument', `No quest ${questId} on this board`);
    if (named?.claimed) return fail('invalid_argument', 'That quest is already claimed');
    return fail('invalid_argument', 'Nothing to claim');
  }

  const record = writeableRecord(save, period, now);
  const claimedBefore = record.claimed.length;
  let points = 0;
  const rewards: CurrencyAmount[] = [];
  for (const view of claimable) {
    record.claimed.push(view.quest.id);
    points += view.quest.points;
    rewards.push(...view.quest.rewards);
    bumpCounter(save, 'quests.claimed');
  }
  /*
   * Half a day's board is a day the mission line counts ("5 daily quests on 5 different days").
   * A period's claims only ever grow, so the fifth is crossed exactly once in it.
   */
  if (period === 'daily' && claimedBefore < DAILY_FIVE && record.claimed.length >= DAILY_FIVE)
    bumpCounter(save, 'quests.daily.days5');
  // Paid in one go, so five quests that each hand over gold read as one pile of it.
  const currencies = mergeAmounts(rewards);
  const changes = payCurrencies(save, currencies, now);

  // A board finished is the day the weekly quest counts (QUESTS_MISSIONS.md §3) — and one day
  // counts once, even for a chronicle that levels past a feature gate after finishing it and
  // finds one more quest waiting on the board it had just cleared.
  const completed = boardComplete(questBoardState(save, period, now));
  if (completed && period === 'daily' && !record.dayCounted) {
    record.dayCounted = true;
    bumpCounter(save, 'quests.daily.days');
  }
  return ok({
    questIds: claimable.map((view) => view.quest.id),
    points,
    currencies,
    changes,
    boardCompleted: completed,
  });
}

export interface QuestChestClaim {
  points: number;
  currencies: CurrencyAmount[];
  changes: CurrencyChange[];
  /** True when the cadence paid its alternate reward (the daily hundred's shard). */
  cycled: boolean;
}

/** Claims one chest on the points track. Once per period, and only once the points are there. */
export function applyQuestChestClaim(
  save: SaveGame,
  period: QuestPeriod,
  points: number,
  now: number,
): Result<QuestChestClaim> {
  const state = questBoardState(save, period, now);
  if (!state.unlocked) return fail('locked', `The ${period} board opens at level ${state.unlockLevel}`);
  const chest = state.chests.find((view) => view.chest.points === points);
  if (!chest) return fail('invalid_argument', `No ${points}-point chest on the ${period} board`);
  if (chest.claimed) return fail('invalid_argument', 'That chest is already taken');
  if (!chest.earned) return fail('invalid_argument', 'Those points are not in yet');

  const record = writeableRecord(save, period, now);
  record.chests.push(points);
  const paid = payout(save, period, chest.chest);
  const changes = payCurrencies(save, paid.currencies, now);
  bumpCounter(save, 'quests.chests');
  return ok({ points, currencies: paid.currencies, changes, cycled: paid.cycled });
}

/**
 * What a chest pays this time. A chest with a cadence pays its alternate on every `every`-th
 * claim, counted per chest and for the life of the chronicle, so the daily hundred hands over a
 * shard on the third full board and gems on the other two (QUESTS_MISSIONS.md §2).
 */
function payout(
  save: SaveGame,
  period: QuestPeriod,
  chest: QuestChestDef,
): { currencies: CurrencyAmount[]; cycled: boolean } {
  const key = `${QUEST_CHEST_COUNTER}${period}.${chest.points}`;
  const nth = counter(save, key) + 1;
  bumpCounterId(save, QUEST_CHEST_COUNTER, `${period}.${chest.points}`);
  const cycled = chest.cycle !== undefined && nth % chest.cycle.every === 0;
  return { currencies: cycled && chest.cycle ? chest.cycle.instead : chest.currencies, cycled };
}

/**
 * The record a claim writes into: the stored one when the period still matches, a fresh one
 * otherwise. This is the only place a rollover is *persisted*, and it happens on the first claim
 * of the new period rather than at midnight.
 */
function writeableRecord(save: SaveGame, period: QuestPeriod, now: number): QuestPeriodSave {
  const key = questPeriodKey(period, now);
  const stored = save.quests[period];
  if (stored.periodKey !== key) save.quests = { ...save.quests, [period]: freshPeriod(save, key) };
  return save.quests[period];
}

/**
 * Brings both boards up to the current period on load, so a save that sat closed across midnight
 * writes its new baseline once. Returns which boards turned over, for the Welcome Back panel.
 */
export function applyQuestRollover(save: SaveGame, now: number): QuestPeriod[] {
  const rolled: QuestPeriod[] = [];
  for (const period of ['daily', 'weekly'] as const) {
    const key = questPeriodKey(period, now);
    if (save.quests[period].periodKey === key) continue;
    save.quests = { ...save.quests, [period]: freshPeriod(save, key) };
    rolled.push(period);
  }
  return rolled;
}
