/**
 * The Unwritten's fight in flight (docs/design/UNWRITTEN.md §6, ADR-050). Not persisted, and tiny
 * on purpose: the battle screen settles every fight through the mode that started it, but the
 * Unwritten's engine and content load with its own screen, never with the first one — so the fight
 * is launched from that chunk, which leaves its settle here for the battle screen to call.
 *
 * A fight lost to a reload is not kept (§17): the passage is as it was before it began, and the
 * company may enter it again, because nothing here survives the page.
 */
import type { BattleOutcome } from '@engine/battle/types';

type Settle = (outcome: BattleOutcome) => void;

let held: Settle | null = null;

/** The Unwritten's launcher leaves its settle for the fight it has just started. */
export function holdUnwrittenFight(settle: Settle): void {
  held = settle;
}

/** Another mode's fight is starting: whatever the Unwritten left behind is not this fight's. */
export function clearUnwrittenSession(): void {
  held = null;
}

/** Settles the fight if it was the Unwritten's. Returns whether it was. */
export function settleUnwrittenFight(outcome: BattleOutcome): boolean {
  const settle = held;
  if (!settle) return false;
  held = null;
  settle(outcome);
  return true;
}

/** Whether the fight on the battle screen is an Unwritten one (the pause menu's retreat says so). */
export function unwrittenFightInFlight(): boolean {
  return held !== null;
}
