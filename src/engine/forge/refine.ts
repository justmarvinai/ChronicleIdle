/**
 * Refining (docs/design/GEAR.md §4). A piece climbs one star by eating a twin — same slot, same
 * star, any rarity — plus Refining Cores and gold. It keeps its rarity, its level and every
 * substat value it has rolled; only the main stat is re-based onto the new star's row.
 *
 * That is the point of it: a refined piece is a little weaker than a native drop of the same
 * star, and it is how a great substat roll survives the campaign getting harder.
 */
import { GEAR_MAX_STARS, REFINE_GOLD, refineCores } from '@content/balance/gear';
import type { CurrencyAmount } from '@content/currencies/types';
import { fail, ok, type Result } from '@engine/errors';
import type { GearInstance } from '@engine/gear/instance';
import { clonePiece } from '@engine/gear/instance';
import { mainStatValue } from '@engine/gear/stats';

export interface RefineCost {
  cores: number;
  gold: number;
  /** As the wallet reads it. */
  amounts: CurrencyAmount[];
}

/** Cores and gold for `n★ → (n+1)★` (GEAR.md §4). */
export function refineCost(stars: number): RefineCost {
  const star = Math.max(1, Math.round(stars));
  const cores = refineCores(star);
  const gold = REFINE_GOLD[star] ?? 0;
  return {
    cores,
    gold,
    amounts: [
      { currency: 'mat_refining_core', amount: cores },
      { currency: 'gold', amount: gold },
    ],
  };
}

export interface RefinePlan {
  piece: GearInstance;
  sacrifice: GearInstance;
  cost: RefineCost;
  /** The piece as it will be: one star higher, main stat re-based. */
  result: GearInstance;
  /** The main stat either side of the climb, for the preview. */
  mainBefore: number;
  mainAfter: number;
}

/** Whether a piece may be the sacrifice: same slot, same star, and free to be spent. */
export function canSacrifice(piece: GearInstance, sacrifice: GearInstance): boolean {
  if (sacrifice.instanceId === piece.instanceId) return false;
  if (sacrifice.locked || sacrifice.equippedTo !== null) return false;
  return sacrifice.slot === piece.slot && sacrifice.stars === piece.stars;
}

/**
 * Checks one refine and describes the result; the store performs it. The piece being refined may
 * be worn — taking it off to climb a star would be busywork — but it must not be locked, and the
 * sacrifice must be neither.
 */
export function planRefine(piece: GearInstance, sacrifice: GearInstance): Result<RefinePlan> {
  if (piece.stars >= GEAR_MAX_STARS)
    return fail('invalid_argument', `${piece.instanceId} is already ${GEAR_MAX_STARS}★`);
  if (piece.locked) return fail('locked', `${piece.instanceId} is locked`);
  if (sacrifice.instanceId === piece.instanceId)
    return fail('invalid_argument', 'A piece cannot refine itself');
  if (sacrifice.locked) return fail('locked', `${sacrifice.instanceId} is locked`);
  if (sacrifice.equippedTo !== null) return fail('locked', `${sacrifice.instanceId} is worn`);
  if (sacrifice.slot !== piece.slot) return fail('invalid_argument', `The sacrifice must be a ${piece.slot}`);
  if (sacrifice.stars !== piece.stars)
    return fail('invalid_argument', `The sacrifice must be ${piece.stars}★`);

  const result = clonePiece(piece);
  result.stars = piece.stars + 1;
  return ok({
    piece,
    sacrifice,
    cost: refineCost(piece.stars),
    result,
    mainBefore: mainStatValue(piece.mainStat, piece.stars, piece.level),
    mainAfter: mainStatValue(result.mainStat, result.stars, result.level),
  });
}
