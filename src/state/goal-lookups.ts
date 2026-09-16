/**
 * The content a goal's state predicates reach for (`@engine/quests/goals`): a champion's rarity
 * and kit, a set's size, a boss's pool and period. The engine takes them as functions so it never
 * imports the registry (CLAUDE.md §5.1); binding them happens once, here.
 */
import { content } from '@content/registry';
import type { ChampionId } from '@content/champions/types';
import type { GoalLookups } from '@engine/quests/goals';

export const GOAL_LOOKUPS: GoalLookups = {
  champion: (id) => content.championById(id as ChampionId),
  gearSet: (id) => content.gearSetById(id),
  boss: (id) => content.bossById(id),
};
