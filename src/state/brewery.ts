/**
 * The Brewery through the store (docs/design/BREWERY.md).
 *
 * The engine owns the rules — the day's twenty runs, which stage is open, which halls brew today —
 * and this spends the run, hands the battle its encounter and banks the brews. The day is read at
 * the door (`breweryDay`), so a chronicle opened tomorrow finds its runs back without anything
 * having had to run while it was closed.
 */
import { BREWERY_DAILY_RUNS } from '@content/balance/brewery';
import { DAILY_RESET_HOUR } from '@content/balance/economy';
import type { BreweryDef, BreweryStageDef } from '@content/brewery/types';
import type { Element } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import type { BattleOutcome } from '@engine/battle/types';
import {
  breweryDay,
  breweryEncounterId,
  breweryRewards,
  clearedStage,
  isBreweryOpen,
  isStageUnlocked,
  msUntilBreweryOpens,
  nextOpenWeekday,
  runsLeft,
  stageState,
  type BreweryStageState,
} from '@engine/brewery/index';
import type { CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { bumpCounter, bumpCounterId } from '@engine/progression/counters';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import type { SaveGame } from '@engine/schema/save';
import { dailyKey, msUntilDailyReset } from '@engine/time/clock';
import { boostedBrews } from './boosts';
import { payCurrencies } from './payout';

/** Whether the Brewery is open to this chronicle at all: player level 3 (owner's brief). */
export function isBreweryUnlocked(save: SaveGame): boolean {
  return isFeatureUnlocked('brewery', save.profile.level);
}

export interface BreweryStageView {
  stage: BreweryStageDef;
  state: BreweryStageState;
  /** What a clear pays. */
  rewards: CurrencyAmount[];
}

export interface BreweryHallView {
  def: BreweryDef;
  /** Its doors today. */
  open: boolean;
  /** Milliseconds until they open; 0 while open, `null` for a hall with no open days. */
  msToOpen: number | null;
  /** The weekday it next opens on, `0` = Sunday. */
  nextDay: number | null;
  /** 0 when the hall has never been taken. */
  cleared: number;
  stages: readonly BreweryStageView[];
}

export interface BreweryView {
  unlocked: boolean;
  runsLeft: number;
  runsTotal: number;
  /** Milliseconds until the day's runs come back. */
  msToReset: number;
  halls: readonly BreweryHallView[];
  /** How many halls brew today — the number the Game Modes card carries. */
  openHalls: number;
}

/** The Brewery as it stands at `now`. Pure: nothing is written, the day is only read. */
export function breweryView(save: SaveGame, now: number): BreweryView {
  const today = dailyKey(now, DAILY_RESET_HOUR);
  const halls = content.breweries.map((def) => {
    const cleared = clearedStage(save.brewery, def.id);
    return {
      def,
      open: isBreweryOpen(def, now),
      msToOpen: msUntilBreweryOpens(def, now),
      nextDay: nextOpenWeekday(def, now),
      cleared,
      stages: def.stages.map((stage) => ({
        stage,
        state: stageState(cleared, stage.number),
        rewards: breweryRewards(def, stage),
      })),
    };
  });
  return {
    unlocked: isBreweryUnlocked(save),
    runsLeft: runsLeft(save.brewery, today),
    runsTotal: BREWERY_DAILY_RUNS,
    msToReset: msUntilDailyReset(now, DAILY_RESET_HOUR),
    halls,
    openHalls: halls.filter((hall) => hall.open).length,
  };
}

export interface BreweryRunStarted {
  element: Element;
  stage: number;
  encounterId: string;
  /** Runs left after this one is taken. */
  runsLeft: number;
}

/**
 * Spends one of the day's runs and points the save at the stage it bought.
 *
 * The run goes *before* the fight, like the campaign's energy and the tower's key, so a reload
 * mid-battle cannot buy a free attempt — and a defeat costs a run, which is what makes choosing a
 * stage a decision rather than a formality.
 */
export function applyBreweryRunStart(
  save: SaveGame,
  input: { element: Element; stage: number; now: number },
): Result<BreweryRunStarted> {
  if (!isBreweryUnlocked(save)) return fail('locked', 'The Brewery opens at level 3');
  const hall = content.breweryByElement(input.element);
  const stage = hall.stages.find((entry) => entry.number === input.stage);
  if (!stage) return fail('invalid_argument', `No stage ${input.stage} in ${hall.id}`);
  if (!isBreweryOpen(hall, input.now)) return fail('locked', `${hall.id} is closed today`);
  if (!isStageUnlocked(clearedStage(save.brewery, hall.id), input.stage))
    return fail('locked', `Stage ${input.stage} of ${hall.id} is not open yet`);

  const today = dailyKey(input.now, DAILY_RESET_HOUR);
  const day = breweryDay(save.brewery, today);
  if (runsLeft(day, today) <= 0) return fail('insufficient_keys', 'No brewery runs left today');
  save.brewery = { ...day, runs: day.runs + 1 };
  return ok({
    element: input.element,
    stage: input.stage,
    encounterId: breweryEncounterId(input.element, input.stage),
    runsLeft: runsLeft(save.brewery, today),
  });
}

export interface BreweryRunSummary {
  element: Element;
  stage: number;
  cleared: boolean;
  /** The clear opened the next stage. */
  firstClear: boolean;
  /** The deepest stage of this hall after the run. */
  deepest: number;
  /** Brews handed over, and the wallet lines they moved. */
  brews: CurrencyAmount[];
  changes: CurrencyChange[];
  runsLeft: number;
}

/**
 * Banks a finished run. A defeat pays nothing — the run is already spent — and a stage already
 * cleared pays in full every time, because that is what the Brewery is for.
 */
export function applyBreweryRunFinish(
  save: SaveGame,
  input: { element: Element; stage: number; outcome: BattleOutcome; now: number },
): Result<BreweryRunSummary> {
  const hall = content.breweryByElement(input.element);
  const stage = hall.stages.find((entry) => entry.number === input.stage);
  if (!stage) return fail('invalid_argument', `No stage ${input.stage} in ${hall.id}`);
  const today = dailyKey(input.now, DAILY_RESET_HOUR);
  const cleared = input.outcome.kind === 'victory';
  const before = clearedStage(save.brewery, hall.id);

  bumpCounter(save, 'brewery.runs');
  bumpCounterId(save, 'brewery.runs.', hall.id);
  const summary: BreweryRunSummary = {
    element: input.element,
    stage: input.stage,
    cleared,
    firstClear: false,
    deepest: before,
    brews: [],
    changes: [],
    runsLeft: runsLeft(save.brewery, today),
  };
  if (!cleared) return ok(summary);

  if (input.stage > before) {
    save.brewery = { ...save.brewery, cleared: { ...save.brewery.cleared, [hall.id]: input.stage } };
    summary.firstClear = true;
    summary.deepest = input.stage;
    bumpCounter(save, 'brewery.cleared');
  }
  summary.brews = boostedBrews(save, breweryRewards(hall, stage), input.now);
  summary.changes = payCurrencies(save, summary.brews, input.now);
  bumpCounter(save, 'brewery.brews', stage.brews);
  return ok(summary);
}
