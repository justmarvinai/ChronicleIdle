/**
 * The words a deed reads in (docs/design/ACHIEVEMENTS.md, `UI_DESIGN.md` §5.31): a goal's line
 * with its numbers filled in, a tier's numeral and a ledger's name.
 *
 * A line names only the placeholders the content validator allows (`DEED_LINE_TOKENS`); this is
 * the one place that fills them, from whichever goal the open tier or the challenge asks.
 */
import type { DeedLedger } from '@content/deeds/types';
import type { Goal } from '@content/quests/types';
import { content } from '@content/registry';
import { hasKey, t, translate, type I18nKey, type I18nParams } from '@i18n/index';

const number = (value: number): string => value.toLocaleString('en-US');

/** The numbers a goal's line may name, formatted as the line prints them. */
export function goalParams(goal: Goal): I18nParams {
  switch (goal.type) {
    case 'counter':
    case 'own_champions':
    case 'boss_fights':
    case 'palace_nodes':
      return { count: number(goal.count) };
    case 'champion_reach_stars':
      return { count: number(goal.count), stars: goal.stars };
    case 'champion_reach_level':
      return { count: number(goal.count), level: goal.level };
    case 'gear_reach_level':
      return { count: number(goal.count), level: goal.level };
    case 'equip_pieces':
      return { count: goal.count, stars: goal.minStars ?? 1 };
    case 'mine_level':
      return { level: goal.level };
    case 'path_walked':
      return { missions: number(goal.missions) };
    case 'difficulty_stars':
      return { stars: number(goal.stars), difficulty: t(`campaign.difficulty.${goal.difficulty}`) };
    case 'boss_percent':
      return { pct: goal.pct };
    case 'clear_stage': {
      const settlement = content.settlementByIndex(goal.settlement);
      return {
        settlement: settlement ? translate(settlement.name) : number(goal.settlement),
        difficulty: t(`campaign.difficulty.${goal.difficulty}`),
      };
    }
    default:
      return {};
  }
}

/** How many things a goal asks for, when it asks for a number of things at all. */
function countOf(goal: Goal): number | null {
  switch (goal.type) {
    case 'counter':
    case 'own_champions':
    case 'champion_reach_stars':
    case 'champion_reach_level':
    case 'boss_fights':
      return goal.count;
    default:
      return null;
  }
}

/**
 * A deed's line for this goal: its `.one` form when the goal asks for exactly one thing and the
 * line has such a form ("Summon an Epic champion", not "Summon 1 Epic champions").
 */
export function deedLine(line: string, goal: Goal): string {
  const one = `${line}.one`;
  const key = countOf(goal) === 1 && hasKey(one) ? one : line;
  return translate(key, goalParams(goal));
}

/** I–V. */
export function tierNumeral(tier: number): string {
  const key = `deeds.numeral.${tier}`;
  return hasKey(key) ? t(key as I18nKey) : String(tier);
}

export function ledgerName(ledger: DeedLedger | 'all'): string {
  return t(`deeds.ledger.${ledger}`);
}
