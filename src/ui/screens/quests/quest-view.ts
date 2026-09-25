/**
 * What the Chronicler's Ledger draws about its board beyond the numbers (docs/tech/UI_DESIGN.md
 * §5.14): the order the quests stand in, and where each chest stands on the tally's rail.
 */
import type { QuestChestView, QuestView } from '@engine/quests/board';

export type QuestState = 'claimable' | 'open' | 'claimed';

export function questState(view: QuestView): QuestState {
  if (view.claimed) return 'claimed';
  return view.claimable ? 'claimable' : 'open';
}

const ORDER: Readonly<Record<QuestState, number>> = { claimable: 0, open: 1, claimed: 2 };

/**
 * What is owed first, then what is still to do, and what is done last — each group in the board's
 * own order, so a quest only ever moves when its state does.
 */
export function orderQuests(quests: readonly QuestView[]): QuestView[] {
  return quests
    .map((view, index) => ({ view, index }))
    .sort((a, b) => ORDER[questState(a.view)] - ORDER[questState(b.view)] || a.index - b.index)
    .map((entry) => entry.view);
}

export type ChestState = 'claimable' | 'claimed' | 'locked';

export function chestState(view: QuestChestView): ChestState {
  if (view.claimed) return 'claimed';
  return view.claimable ? 'claimable' : 'locked';
}

/** The points still to earn before a chest opens; zero once it has. */
export function pointsToGo(view: QuestChestView, points: number): number {
  return Math.max(0, view.chest.points - points);
}

/** Where a threshold, or the points themselves, stand along the rail: 0 at its top, 1 at its foot. */
export function railShare(points: number, possible: number): number {
  return possible > 0 ? Math.max(0, Math.min(1, points / possible)) : 0;
}
