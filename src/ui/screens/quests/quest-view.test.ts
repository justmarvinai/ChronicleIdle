/**
 * What the Ledger reads off its board (docs/tech/UI_DESIGN.md §5.14): the order the quests stand
 * in, and where each chest stands on the tally's rail.
 */
import { describe, expect, it } from 'vitest';
import type { QuestChestView, QuestView } from '@engine/quests/board';
import { content } from '@content/registry';
import { chestState, orderQuests, pointsToGo, questState, railShare } from './quest-view';

const board = content.questBoard('daily');
const quest = (index: number): QuestView['quest'] => {
  const def = board.quests[index];
  if (!def) throw new Error(`no quest ${index}`);
  return def;
};
const view = (index: number, claimed: boolean, claimable: boolean): QuestView => ({
  quest: quest(index),
  progress: { progress: claimable || claimed ? 1 : 0, target: 1, done: claimable || claimed },
  claimed,
  claimable,
});

describe('the Ledger’s view of its board', () => {
  it('reads a quest as owed, still to do or taken', () => {
    expect(questState(view(0, false, true))).toBe('claimable');
    expect(questState(view(0, false, false))).toBe('open');
    expect(questState(view(0, true, false))).toBe('claimed');
  });

  it('puts what is owed first and what is taken last, each group in the board’s order', () => {
    const quests = [
      view(0, true, false),
      view(1, false, false),
      view(2, false, true),
      view(3, false, false),
      view(4, false, true),
    ];
    expect(orderQuests(quests).map((entry) => entry.quest.id)).toEqual([
      quest(2).id,
      quest(4).id,
      quest(1).id,
      quest(3).id,
      quest(0).id,
    ]);
  });

  it('knows how far off a chest is, and where it stands on the rail', () => {
    const chest = board.chests[1];
    if (!chest) throw new Error('no second chest');
    const locked: QuestChestView = { chest, earned: false, claimed: false, claimable: false };
    expect(chestState(locked)).toBe('locked');
    expect(pointsToGo(locked, 10)).toBe(chest.points - 10);
    expect(pointsToGo({ ...locked, earned: true, claimable: true }, 100)).toBe(0);
    expect(chestState({ ...locked, earned: true, claimed: true })).toBe('claimed');
    expect(railShare(20, 100)).toBeCloseTo(0.2);
    expect(railShare(140, 100)).toBe(1);
    expect(railShare(10, 0)).toBe(0);
  });
});
