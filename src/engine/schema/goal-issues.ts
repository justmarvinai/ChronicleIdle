/**
 * The checks every goal of the shared DSL gets, whoever asks it — a quest, a mission, a deed
 * (docs/design/QUESTS_MISSIONS.md §1). Kept apart from the validators that call it, so the three
 * ledgers cannot drift into three different ideas of what a sound goal is.
 */
import { SETTLEMENT_COUNT, STARS_PER_SETTLEMENT } from '@content/balance/campaign';
import type { Goal } from '@content/quests/types';
import { levelCap } from '@engine/champions/stats';
import { isCounterKey } from '@engine/progression/counters';
import { goalCounterKeys } from '@engine/quests/goals';

/** How big the things a goal can count are, when the caller knows (the Palace, the Path). */
export interface GoalLimits {
  palaceNodes: number;
  missions: number;
}

/**
 * A goal's references, whatever family it belongs to: the boss it names, the settlement and stand
 * it asks for, the counter it measures. A mission that names a stand nobody can fight, or counts
 * something nothing writes, would sit unfinishable at the head of the line — so it is a build
 * error, not a surprise on somebody's save.
 */
export function goalIssues(
  goal: Goal,
  tiersByBoss: ReadonlyMap<string, readonly string[]>,
  limits?: GoalLimits,
): string[] {
  const problems: string[] = [];
  const bossTiers = (id: string): readonly string[] => tiersByBoss.get(id) ?? [];
  const known = (id: string): boolean => tiersByBoss.has(id);
  switch (goal.type) {
    case 'boss_fights':
      if (!known(goal.boss)) problems.push(`names an unknown boss ${goal.boss}`);
      else if (goal.tier && !bossTiers(goal.boss).includes(goal.tier))
        problems.push(`names ${goal.boss} tier ${goal.tier}, which does not exist`);
      break;
    case 'boss_damage':
    case 'boss_percent':
      if (!known(goal.boss)) problems.push(`names an unknown boss ${goal.boss}`);
      else if (!bossTiers(goal.boss).includes(goal.tier))
        problems.push(`names ${goal.boss} tier ${goal.tier}, which does not exist`);
      break;
    case 'clear_stage':
      if (goal.settlement > SETTLEMENT_COUNT) problems.push(`settlement ${goal.settlement} does not exist`);
      break;
    case 'settlement_stars':
      if (goal.settlement > SETTLEMENT_COUNT) problems.push(`settlement ${goal.settlement} does not exist`);
      if (goal.stars > STARS_PER_SETTLEMENT)
        problems.push(`asks for ${goal.stars} stars; a settlement holds ${STARS_PER_SETTLEMENT}`);
      break;
    case 'difficulty_stars': {
      const most = SETTLEMENT_COUNT * STARS_PER_SETTLEMENT;
      if (goal.stars > most) problems.push(`asks for ${goal.stars} stars; a difficulty holds ${most}`);
      break;
    }
    case 'champion_reach_level':
      if (goal.level > levelCap(goal.stars ?? 6))
        problems.push(`asks for level ${goal.level}, past the cap at ${goal.stars ?? 6}★`);
      break;
    case 'palace_nodes':
      if (limits && goal.count > limits.palaceNodes)
        problems.push(`asks for ${goal.count} Palace nodes; the Palace has ${limits.palaceNodes}`);
      break;
    case 'path_walked':
      if (limits && goal.missions > limits.missions)
        problems.push(`asks for ${goal.missions} missions; the Path has ${limits.missions}`);
      break;
    default:
      break;
  }
  for (const key of goalCounterKeys([goal]))
    if (!isCounterKey(key)) problems.push(`counts ${key}, which nothing writes`);
  return problems;
}

/** Tier ids per boss, read straight off the boss content the registry hands over. */
export function tiersByBoss(bosses: readonly unknown[]): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  for (const raw of bosses) {
    const boss = raw as { id?: unknown; tiers?: readonly { id?: unknown }[] };
    if (typeof boss.id !== 'string') continue;
    map.set(
      boss.id,
      (boss.tiers ?? []).map((tier) => tier.id).filter((id): id is string => typeof id === 'string'),
    );
  }
  return map;
}
