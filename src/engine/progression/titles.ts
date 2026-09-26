/**
 * Which titles a chronicle has earned (docs/design/ECONOMY.md §4). Derived, never stored: the
 * condition is re-evaluated against the save, so a title can never drift from the play that won
 * it — and a save edited by hand cannot mint one.
 */
import { BOSS_STAGE_NUMBER, SETTLEMENT_COUNT, STAGES_PER_SETTLEMENT } from '@content/balance/campaign';
import type { TitleCondition, TitleDef } from '@content/titles/types';
import {
  clearedStages,
  difficultyStars,
  isStageCleared,
  stageIdOf,
  type CampaignProgress,
} from '@engine/campaign/progress';

export interface TitleContext {
  level: number;
  progress: CampaignProgress;
  /** Champions in the roster. */
  championsOwned: number;
  /** Ranks of the Hall of Deeds claimed, and the challenges claimed (ACHIEVEMENTS.md §4). */
  hallRanks: number;
  challenges: readonly string[];
}

export function isTitleEarned(condition: TitleCondition, ctx: TitleContext): boolean {
  switch (condition.kind) {
    case 'level':
      return ctx.level >= condition.level;
    case 'champions_owned':
      return ctx.championsOwned >= condition.count;
    case 'settlement_boss':
      return isStageCleared(
        ctx.progress,
        stageIdOf(condition.settlement, BOSS_STAGE_NUMBER),
        condition.difficulty,
      );
    case 'difficulty_cleared':
      return clearedStages(ctx.progress, condition.difficulty) === SETTLEMENT_COUNT * STAGES_PER_SETTLEMENT;
    case 'difficulty_mastered': {
      const { stars, max } = difficultyStars(ctx.progress, condition.difficulty);
      return stars === max;
    }
    case 'hall_rank':
      return ctx.hallRanks >= condition.rank;
    case 'challenge':
      return ctx.challenges.includes(condition.id);
  }
}

/** The earned titles, in the content's display order. */
export function earnedTitles(titles: readonly TitleDef[], ctx: TitleContext): TitleDef[] {
  return titles.filter((title) => isTitleEarned(title.condition, ctx));
}

/** The title a chronicle wears: the last one earned, or none while it has only the first. */
export function currentTitle(titles: readonly TitleDef[], ctx: TitleContext): TitleDef | null {
  const earned = earnedTitles(titles, ctx);
  return earned[earned.length - 1] ?? null;
}
