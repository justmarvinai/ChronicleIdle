/**
 * The Palace's skill points: what a chronicle has earned, what it has spent, and whether a node
 * can be bought right now (docs/design/GLORIOUS_PALACE.md §3).
 *
 * Points earned are a running total rather than something derived, because two of the four sources
 * repeat: the tower pays again every season and the bosses again every period, and no amount of
 * looking at today's progress can recover what last month paid. Spent, on the other hand, is
 * always the sum of what is bought — so a reset needs no bookkeeping at all (CLAUDE.md §5.5).
 */
import type { PalaceNodeDef } from '@content/palace/types';

export interface PalaceLedger {
  earned: number;
  spent: number;
  available: number;
}

/** Why a node cannot be bought, or that it can. */
export type PalaceNodeState = 'owned' | 'ready' | 'unreachable' | 'tooShort';

export function palaceSpent(
  bought: readonly string[],
  nodeById: (id: string) => PalaceNodeDef | undefined,
): number {
  let spent = 0;
  for (const id of bought) spent += nodeById(id)?.cost ?? 0;
  return spent;
}

export function palaceLedger(
  earned: number,
  bought: readonly string[],
  nodeById: (id: string) => PalaceNodeDef | undefined,
): PalaceLedger {
  const spent = palaceSpent(bought, nodeById);
  return { earned, spent, available: Math.max(0, earned - spent) };
}

/**
 * A node is reachable when **every** node it names is already bought. The core names none, so it
 * is the only node a fresh chronicle can reach, and the tree grows outward from there.
 */
export function isReachable(node: PalaceNodeDef, bought: ReadonlySet<string>): boolean {
  return node.requires.every((id) => bought.has(id));
}

/** What the screen draws a node as, and what `unlockPalaceNode` checks before it spends. */
export function nodeState(
  node: PalaceNodeDef,
  bought: ReadonlySet<string>,
  available: number,
): PalaceNodeState {
  if (bought.has(node.id)) return 'owned';
  if (!isReachable(node, bought)) return 'unreachable';
  return node.cost <= available ? 'ready' : 'tooShort';
}
