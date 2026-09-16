/**
 * A period's quest board (docs/design/QUESTS_MISSIONS.md §2–3): which quests a chronicle sees,
 * how far along each is, the points they have earned and the chests those points unlock.
 *
 * The board is derived, never stored. What a save keeps is the period it belongs to, the counters
 * that period started from, and which quests and chests have been claimed — everything else is a
 * function of those and the play (the discipline of ADR-033, applied to quests).
 *
 * A quest whose feature is still locked would be a dead row, so it is hidden and the period's
 * replacement quest stands in for exactly the points it was worth. The board a level-5 chronicle
 * sees is therefore shorter than a level-20 one's, and both can still reach the full hundred.
 */
import type { QuestBoardDef, QuestChestDef, QuestDef } from '@content/quests/types';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import { evaluateGoal, type GoalContext, type GoalProgress } from './goals';

export interface QuestView {
  quest: QuestDef;
  progress: GoalProgress;
  /** Claimed this period; a claim is once per quest per period. */
  claimed: boolean;
  /** Finished and not yet claimed — what the Claim button and the hub's dot look at. */
  claimable: boolean;
}

export interface QuestChestView {
  chest: QuestChestDef;
  /** Points needed against points earned. */
  earned: boolean;
  claimed: boolean;
  claimable: boolean;
}

export interface BoardView {
  period: QuestBoardDef['period'];
  quests: QuestView[];
  chests: QuestChestView[];
  /** Points from claimed quests, which is what the track fills with. */
  points: number;
  /** Every point the board can pay this period — always the design's hundred. */
  pointsPossible: number;
  /** Quests finished and unclaimed, for "Claim all" and the hub's dot. */
  claimableQuests: number;
  claimableChests: number;
}

/** What the board needs to know about the chronicle beyond its counters. */
export interface BoardContext extends GoalContext {
  playerLevel: number;
  /** Quest ids already claimed this period. */
  claimedQuests: readonly string[];
  /** Chest thresholds already taken this period. */
  claimedChests: readonly number[];
}

/**
 * The quests a chronicle at this level sees, and the replacement quest carrying the points of the
 * ones it does not. The replacement appears once, worth the sum it stands in for, so the total is
 * the same at every unlock state.
 */
export function visibleQuests(board: QuestBoardDef, playerLevel: number): QuestDef[] {
  const open: QuestDef[] = [];
  let hiddenPoints = 0;
  for (const quest of board.quests) {
    if (quest.feature === null || isFeatureUnlocked(quest.feature, playerLevel)) open.push(quest);
    else hiddenPoints += quest.points;
  }
  if (hiddenPoints > 0) open.push({ ...board.replacement, points: hiddenPoints });
  return open;
}

/** Everything the screen draws for one period. */
export function boardView(board: QuestBoardDef, ctx: BoardContext): BoardView {
  const claimedQuests = new Set(ctx.claimedQuests);
  const claimedChests = new Set(ctx.claimedChests);

  const quests: QuestView[] = visibleQuests(board, ctx.playerLevel).map((quest) => {
    const progress = evaluateGoal(quest.goal, ctx);
    const claimed = claimedQuests.has(quest.id);
    return { quest, progress, claimed, claimable: progress.done && !claimed };
  });

  // Points come from claimed quests: the track fills as the player takes the rewards, so pressing
  // Claim is always what moves it (QUESTS_MISSIONS.md §2).
  const points = quests.reduce((sum, view) => sum + (view.claimed ? view.quest.points : 0), 0);
  const chests: QuestChestView[] = board.chests.map((chest) => {
    const earned = points >= chest.points;
    const claimed = claimedChests.has(chest.points);
    return { chest, earned, claimed, claimable: earned && !claimed };
  });

  return {
    period: board.period,
    quests,
    chests,
    points,
    pointsPossible: quests.reduce((sum, view) => sum + view.quest.points, 0),
    claimableQuests: quests.filter((view) => view.claimable).length,
    claimableChests: chests.filter((chest) => chest.claimable).length,
  };
}

/** Whether every quest on the board has been claimed — the day the weekly quest counts. */
export function boardComplete(view: BoardView): boolean {
  return view.quests.length > 0 && view.quests.every((quest) => quest.claimed);
}
