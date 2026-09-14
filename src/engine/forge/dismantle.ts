/**
 * Dismantling (docs/design/GEAR.md §6). Breaking a piece returns materials by its rarity and 20 %
 * of the gold its levels cost — so levelling a piece you later break is a loss, not a trap: the
 * refund is stated on the screen before the press.
 *
 * A worn or locked piece is never broken. The rules say so here rather than in the UI, because a
 * multi-select is exactly where a mistake is expensive.
 */
import { DISMANTLE_GOLD_REFUND, DISMANTLE_YIELD } from '@content/balance/gear';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { fail, ok, type Result } from '@engine/errors';
import type { GearInstance } from '@engine/gear/instance';

/** Why a piece cannot be broken; the UI greys the card and says which. */
export type DismantleRefusal = 'worn' | 'locked' | 'unknown';

export interface DismantlePlan {
  /** The pieces that will be broken, in the order they were given. */
  pieces: readonly GearInstance[];
  /** What they return, merged and sorted by currency id so the preview never jumps. */
  yield: CurrencyAmount[];
  /** Gold from the levels invested, already inside `yield`. */
  goldRefund: number;
}

/**
 * What one piece returns: its rarity's materials, plus the refund on every level it bought
 * (`levelCost` is the state layer's, so the price list is passed in).
 */
export function pieceYield(
  piece: GearInstance,
  goldSpentOnLevels: number,
): { materials: CurrencyAmount[]; goldRefund: number } {
  const materials = Object.entries(DISMANTLE_YIELD[piece.rarity]).map(([currency, amount]) => ({
    currency: currency as CurrencyId,
    amount,
  }));
  return { materials, goldRefund: Math.floor(goldSpentOnLevels * DISMANTLE_GOLD_REFUND) };
}

/** Whether a piece may be broken at all. */
export function dismantleRefusal(piece: GearInstance): DismantleRefusal | null {
  if (piece.locked) return 'locked';
  if (piece.equippedTo !== null) return 'worn';
  return null;
}

/**
 * Prices a whole selection. Refuses the lot when any piece is worn, locked or unknown: a partial
 * dismantle is worse than none, because the player cannot see which half went.
 */
export function planDismantle(
  pieces: readonly GearInstance[],
  goldSpentOn: (piece: GearInstance) => number,
): Result<DismantlePlan> {
  if (pieces.length === 0) return fail('invalid_argument', 'Nothing selected');
  const totals = new Map<CurrencyId, number>();
  let goldRefund = 0;
  for (const piece of pieces) {
    const refusal = dismantleRefusal(piece);
    if (refusal)
      return fail('locked', `${piece.instanceId} is ${refusal}`, {
        instanceId: piece.instanceId,
        refusal,
      });
    const one = pieceYield(piece, goldSpentOn(piece));
    for (const entry of one.materials)
      totals.set(entry.currency, (totals.get(entry.currency) ?? 0) + entry.amount);
    goldRefund += one.goldRefund;
  }
  if (goldRefund > 0) totals.set('gold', (totals.get('gold') ?? 0) + goldRefund);
  const merged = [...totals.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
  return ok({ pieces, yield: merged, goldRefund });
}
