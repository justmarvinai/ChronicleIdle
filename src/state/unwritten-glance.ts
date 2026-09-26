/**
 * The Unwritten at a glance (docs/design/UNWRITTEN.md §2, §14.2): what the places outside its own
 * screen say of it — the Game Modes card, the rift on Emberhold's square. Eager and small on
 * purpose (ADR-050): it reads the save's own slice and the Tithe's arithmetic, and never touches
 * the mode's content, which loads with its screen.
 */
import { DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { TITHE_PER_WEEK } from '@content/balance/unwritten';
import type { SaveGame } from '@engine/schema/save';
import { weeklyKey } from '@engine/time/clock';
import { titheLeft } from '@engine/unwritten/rewards';

/** This week's key, the Tithe's clock (`ECONOMY.md` §9). */
export function unwrittenWeekKey(now: number): string {
  return weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY);
}

export interface UnwrittenGlance {
  /** The expedition under way, if there is one. */
  run: { folio: number; omen: number } | null;
  /** The highest Omen open. */
  open: number;
  titheLeft: number;
  tithePerWeek: number;
}

export function unwrittenGlance(save: SaveGame, now: number): UnwrittenGlance {
  const { unwritten } = save;
  return {
    run: unwritten.run ? { folio: unwritten.run.folio, omen: unwritten.run.omen } : null,
    open: unwritten.omen.open,
    titheLeft: titheLeft(unwritten, unwrittenWeekKey(now)),
    tithePerWeek: TITHE_PER_WEEK,
  };
}
