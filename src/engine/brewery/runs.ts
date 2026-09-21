/**
 * The Brewery's day (docs/design/BREWERY.md §2): twenty runs across all four halls, and which
 * stage of a hall is open next.
 *
 * The allowance is stored as a period key and a count, the way a quest board is: a record stamped
 * with an older day reads as a fresh one, so the reset happens at the door and nothing has to run
 * at midnight.
 */
import { BREWERY_DAILY_RUNS } from '@content/balance/brewery';
import type { BreweryDef, BreweryStageDef } from '@content/brewery/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { BrewerySave } from '@engine/schema/save';

/** The day's allowance as it stands at `todayKey`, with a stale record read as a fresh day. */
export function breweryDay(save: BrewerySave, todayKey: string): BrewerySave {
  return save.periodKey === todayKey ? save : { ...save, periodKey: todayKey, runs: 0 };
}

/** Runs left today. Never negative, whatever a hand-edited save says. */
export function runsLeft(save: BrewerySave, todayKey: string): number {
  return Math.max(0, BREWERY_DAILY_RUNS - breweryDay(save, todayKey).runs);
}

/** The deepest stage of a hall the chronicle has cleared; 0 when it has never been in. */
export function clearedStage(save: BrewerySave, breweryId: string): number {
  return save.cleared[breweryId] ?? 0;
}

/**
 * A stage is open when the one before it is cleared, the way a settlement's stands are: stage 1
 * always, and each clear opens the next.
 */
export function isStageUnlocked(cleared: number, stage: number): boolean {
  return stage <= cleared + 1;
}

/** What the screen draws a stage as. */
export type BreweryStageState = 'cleared' | 'next' | 'locked';

export function stageState(cleared: number, stage: number): BreweryStageState {
  if (stage <= cleared) return 'cleared';
  return stage === cleared + 1 ? 'next' : 'locked';
}

/** What a clear pays: the stage's own number, in the hall's brew (the owner's rule). */
export function breweryRewards(def: BreweryDef, stage: BreweryStageDef): CurrencyAmount[] {
  return [{ currency: def.brew, amount: stage.brews }];
}
