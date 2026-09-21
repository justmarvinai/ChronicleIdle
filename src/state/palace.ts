/**
 * The Glorious Palace in the store (docs/design/GLORIOUS_PALACE.md).
 *
 * Every function is a reducer over the save's `palace` slice: the engine decides what a source
 * owes and whether a node may be bought, and these apply the answer. The four `award*` reducers
 * are called from the places that finish content — a settlement's boss stand falling, a tower floor
 * cleared, a boss pool emptied — and each is safe to call again, because the engine's watermarks
 * say what has already been paid.
 */
import { content } from '@content/registry';
import type { Difficulty } from '@content/balance/battle';
import type { PalaceNodeDef } from '@content/palace/types';
import { highestBossCleared } from '@engine/campaign/progress';
import { fail, ok, type Result } from '@engine/errors';
import {
  awardBossKill,
  awardSettlement,
  awardTowerFloor,
  nodeState,
  palaceBonus,
  palaceLedger,
  type PalaceAward,
  type PalaceBonus,
  type PalaceLedger,
} from '@engine/palace/index';
import type { PalaceSave, SaveGame } from '@engine/schema/save';

/** The tree's own lookup, which the engine takes as a function so it stays free of the registry. */
const nodeById = (id: string) => content.palace.byId[id];

export const palaceBonusOf = (nodes: readonly string[]): PalaceBonus => palaceBonus(nodes, nodeById);

export const palaceLedgerOf = (palace: PalaceSave): PalaceLedger =>
  palaceLedger(palace.earned, palace.nodes, nodeById);

/**
 * Whether the Palace's doors are open at all: the first settlement's boss stand has fallen (the
 * owner's answer). Progress, not player level — the same shape of gate the Eternal Tower uses.
 */
export function isPalaceUnlocked(save: SaveGame): boolean {
  return highestBossCleared(save.campaign, 'intro') >= 1;
}

/** Applies an award in place. Returns the points added, so a caller can report them. */
function apply(palace: PalaceSave, award: PalaceAward): number {
  Object.assign(palace, award.paid);
  palace.earned += award.points;
  return award.points;
}

/** A settlement's boss stand fell on a difficulty: one point, the first time only. */
export function grantSettlementPoint(save: SaveGame, difficulty: Difficulty, settlement: number): number {
  return apply(save.palace, awardSettlement(save.palace, difficulty, settlement));
}

/** The tower reached a floor: one point per fifth floor, and a new season pays the climb again. */
export function grantTowerPoints(save: SaveGame, season: number, floor: number): number {
  return apply(save.palace, awardTowerFloor(save.palace, season, floor));
}

/** A boss's pool is empty for its period: one point for the daily, three for the weekly. */
export function grantBossPoints(
  save: SaveGame,
  bossId: string,
  periodKey: string,
  period: 'daily' | 'weekly',
): number {
  return apply(save.palace, awardBossKill(save.palace, bossId, periodKey, period));
}

export interface PalaceUnlock {
  node: PalaceNodeDef;
  /** The ledger as it stands after the purchase. */
  ledger: PalaceLedger;
}

/** Buys a node, if it is reachable and the points are there. */
export function applyPalaceUnlock(save: SaveGame, id: string): Result<PalaceUnlock> {
  const node = nodeById(id);
  if (!node) return fail('invalid_argument', `No Palace node ${id}`);
  const bought = new Set(save.palace.nodes);
  const state = nodeState(node, bought, palaceLedgerOf(save.palace).available);
  if (state === 'owned') return fail('invalid_argument', `${id} is already lit`);
  if (state === 'unreachable') return fail('locked', `${id} has nothing leading to it yet`);
  if (state === 'tooShort')
    return fail('insufficient_currency', `${id} costs ${node.cost} skill points`, { cost: node.cost });
  save.palace.nodes.push(id);
  return ok({ node, ledger: palaceLedgerOf(save.palace) });
}

/**
 * Gives every spent point back (the owner's answer: free, any time). Nothing else moves — the
 * points return by the simple fact that `spent` is the sum of what is bought, and nothing is.
 */
export function applyPalaceReset(save: SaveGame): Result<number> {
  const { spent } = palaceLedgerOf(save.palace);
  if (spent === 0) return fail('invalid_argument', 'Nothing is spent in the Palace');
  save.palace.nodes = [];
  return ok(spent);
}
