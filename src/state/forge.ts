/**
 * The Forge as it touches the save (docs/design/GEAR.md §4, §6).
 *
 * The rules are in `@engine/forge/*`; this is the bookkeeping — what the wallet pays, which
 * pieces leave the racks and which arrive. Every action is all-or-nothing: the cost is checked
 * before anything is written, so a half-struck piece cannot exist.
 */
import { CRAFT_TIER, type CraftTier } from '@content/balance/forge';
import type { GearSlot } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import { grant, spend, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { craftCost, craftGear, craftPool } from '@engine/forge/craft';
import { planDismantle } from '@engine/forge/dismantle';
import { planRefine } from '@engine/forge/refine';
import { clonePiece, type GearInstance } from '@engine/gear/instance';
import type { Rng } from '@engine/rng/rng';
import type { SaveGame } from '@engine/schema/save';
import { inventoryRoom, levelGoldSpent } from './gear';
import { bumpCounter } from '@engine/progression/counters';

export interface CraftInput {
  tier: CraftTier;
  slot: GearSlot;
  /** The set a Glyph Sigil names; without one the tier's pool is rolled. */
  setId?: string;
  now: number;
  rng: Rng;
}

export interface CraftSummary {
  piece: GearInstance;
  tier: CraftTier;
  /** Whether a Glyph Sigil was spent naming the set. */
  named: boolean;
  changes: CurrencyChange[];
}

/** Strikes one piece: the wallet pays the recipe, the engine rolls it, the racks keep it. */
export function applyCraft(save: SaveGame, input: CraftInput): Result<CraftSummary> {
  if (inventoryRoom(save) <= 0) return fail('invalid_argument', 'The armoury is full');
  const named = input.setId !== undefined;
  const paid = spend(save.wallet, craftCost(input.tier, named));
  if (!paid.ok) return paid;

  const serial = save.counters.gear + 1;
  const struck = craftGear(
    {
      tier: input.tier,
      slot: input.slot,
      ...(input.setId !== undefined ? { setId: input.setId } : {}),
      pool: craftPool(input.tier, content.gearSets),
      serial,
      now: input.now,
    },
    input.rng,
  );
  if (!struck.ok) return struck;

  save.wallet = paid.value.wallet;
  save.counters.gear = serial;
  save.inventory[struck.value.instanceId] = struck.value;
  bumpCounter(save, 'forge.crafts');
  return ok({
    piece: clonePiece(struck.value),
    tier: input.tier,
    named,
    changes: paid.value.changes,
  });
}

export interface DismantleSummary {
  /** The pieces that were broken, as they were before they went. */
  pieces: GearInstance[];
  yield: CurrencyAmount[];
  goldRefund: number;
  changes: CurrencyChange[];
}

/** Breaks a selection for materials; a worn or locked piece refuses the whole press. */
export function applyDismantle(
  save: SaveGame,
  input: { pieceIds: readonly string[] },
): Result<DismantleSummary> {
  const pieces: GearInstance[] = [];
  for (const id of input.pieceIds) {
    const piece = save.inventory[id];
    if (!piece) return fail('invalid_argument', `Unknown gear ${id}`);
    pieces.push(piece);
  }
  const plan = planDismantle(pieces, levelGoldSpent);
  if (!plan.ok) return plan;

  const paid = grant(save.wallet, plan.value.yield);
  save.wallet = paid.wallet;
  const broken = pieces.map((piece) => clonePiece(piece));
  for (const piece of broken) delete save.inventory[piece.instanceId];
  bumpCounter(save, 'forge.dismantles', broken.length);
  return ok({
    pieces: broken,
    yield: plan.value.yield,
    goldRefund: plan.value.goldRefund,
    changes: paid.changes,
  });
}

export interface RefineSummary {
  piece: GearInstance;
  /** The twin that was spent. */
  sacrifice: GearInstance;
  from: number;
  to: number;
  mainBefore: number;
  mainAfter: number;
  changes: CurrencyChange[];
}

/**
 * Climbs one star: the twin is consumed, the cores and gold are paid, and the piece keeps
 * everything but its main stat's base (GEAR.md §4).
 */
export function applyRefine(
  save: SaveGame,
  input: { pieceId: string; sacrificeId: string },
): Result<RefineSummary> {
  const piece = save.inventory[input.pieceId];
  if (!piece) return fail('invalid_argument', `Unknown gear ${input.pieceId}`);
  const sacrifice = save.inventory[input.sacrificeId];
  if (!sacrifice) return fail('invalid_argument', `Unknown gear ${input.sacrificeId}`);

  const plan = planRefine(piece, sacrifice);
  if (!plan.ok) return plan;
  const paid = spend(save.wallet, plan.value.cost.amounts);
  if (!paid.ok) return paid;

  const spent = clonePiece(sacrifice);
  const from = piece.stars;
  save.wallet = paid.value.wallet;
  piece.stars = plan.value.result.stars;
  delete save.inventory[spent.instanceId];
  bumpCounter(save, 'forge.refines');
  return ok({
    piece: clonePiece(piece),
    sacrifice: spent,
    from,
    to: piece.stars,
    mainBefore: plan.value.mainBefore,
    mainAfter: plan.value.mainAfter,
    changes: paid.value.changes,
  });
}

/** What a tier costs right now, for the screen's cost pill. */
export function craftPrice(tier: CraftTier, named: boolean): CurrencyAmount[] {
  return craftCost(tier, named);
}

/** The sets a tier may be asked for, as content defs, in catalogue order. */
export function craftSets(tier: CraftTier): readonly { id: string; name: string }[] {
  const pool = new Set(craftPool(tier, content.gearSets));
  return content.gearSets.filter((set) => pool.has(set.id)).map((set) => ({ id: set.id, name: set.name }));
}

/** The level a tier opens at; the Forge itself is gated by the `forge` feature. */
export function craftTierLevel(tier: CraftTier): number {
  return CRAFT_TIER[tier].level;
}
