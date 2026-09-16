/**
 * The quest boards the game knows: one a day, one a week
 * (`docs/design/QUESTS_MISSIONS.md` §2–§3).
 */
import daily from './daily';
import weekly from './weekly';
import type { QuestBoardDef, QuestDef, QuestPeriod } from './types';

export const QUEST_BOARDS: readonly QuestBoardDef[] = [daily, weekly];

export const QUEST_BOARD_BY_PERIOD: Readonly<Record<QuestPeriod, QuestBoardDef>> = {
  daily,
  weekly,
};

/** Every quest either board can show, the replacements included — for the validator and i18n. */
export const QUESTS: readonly QuestDef[] = QUEST_BOARDS.flatMap((board) => [
  ...board.quests,
  board.replacement,
]);

export const QUEST_BY_ID: Readonly<Record<string, QuestDef>> = Object.fromEntries(
  QUESTS.map((quest) => [quest.id, quest]),
);
