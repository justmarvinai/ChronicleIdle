/**
 * `quest` and `board`: the small builders quest files are written with
 * (docs/tech/CONTENT_AUTHORING.md §3.3). They only assemble plain objects — ids and i18n keys
 * derive from the slug, so a quest is a few lines of numbers and a goal.
 */
import type { GlyphKey } from '@assets/manifest.generated';
import type { CurrencyAmount } from '@content/currencies/types';
import type { FeatureId } from '@content/balance/unlocks';
import type { Goal, QuestBoardDef, QuestChestDef, QuestDef, QuestPeriod } from './types';

interface QuestInput {
  /** `<snake_case>`; the id becomes `quest.<period>.<slug>` and its line `quest.<slug>.name`. */
  slug: string;
  icon: GlyphKey;
  goal: Goal;
  points: number;
  rewards: CurrencyAmount[];
  /** The feature the quest needs, or `null` for one every chronicle can do. */
  feature: FeatureId | null;
  version?: number;
}

interface BoardInput {
  period: QuestPeriod;
  feature: FeatureId;
  quests: ((period: QuestPeriod) => QuestDef)[];
  replacement: (period: QuestPeriod) => QuestDef;
  chests: QuestChestDef[];
  version?: number;
}

/**
 * One quest, still missing the period it belongs to — `board` supplies that, so a quest cannot
 * end up with an id that disagrees with the board it sits on.
 */
export function quest(input: QuestInput): (period: QuestPeriod) => QuestDef {
  return (period) => ({
    id: `quest.${period}.${input.slug}`,
    period,
    name: `quest.${input.slug}.name`,
    icon: input.icon,
    goal: input.goal,
    points: input.points,
    rewards: input.rewards,
    feature: input.feature,
    version: input.version ?? 1,
  });
}

export function board(input: BoardInput): QuestBoardDef {
  return {
    period: input.period,
    feature: input.feature,
    quests: input.quests.map((make) => make(input.period)),
    replacement: input.replacement(input.period),
    chests: input.chests,
    version: input.version ?? 1,
  };
}
