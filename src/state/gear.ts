/**
 * Gear as it touches the save (docs/design/GEAR.md §3, §7).
 *
 * The rules live in `@engine/gear/*`; this module is the bookkeeping: which draft fields an
 * equip, an upgrade or a drop changes, and in what order. Every action is all-or-nothing — a
 * refusal leaves the save exactly as it was.
 */
import {
  DROP_RARITY_WEIGHTS,
  type GearSource,
  INVENTORY_CAPACITY,
  INVENTORY_OVERFLOW,
  LEVEL_COST_BASE,
  LEVEL_COST_GROWTH,
  dropStarRange,
} from '@content/balance/gear';
import type { CurrencyAmount } from '@content/currencies/types';
import type { GearSlot, Rarity } from '@content/champions/types';
import { content } from '@content/registry';
import { GEAR_SLOTS } from '@content/champions/types';
import { spend, type CurrencyChange } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { generateGear } from '@engine/gear/generate';
import { levelGear, type LevelRoll } from '@engine/gear/generate';
import { planEquip, planUnequip } from '@engine/gear/equip';
import { clonePiece, type GearInstance } from '@engine/gear/instance';
import type { SaveGame } from '@engine/schema/save';
import type { Rng } from '@engine/rng/rng';

/** Gold for one level of a piece: `LEVEL_COST_BASE[star] × (1 + 0.35 × level)` (GEAR.md §3). */
export function levelCost(stars: number, level: number): number {
  const base = LEVEL_COST_BASE[Math.max(1, Math.min(6, Math.round(stars)))] ?? 0;
  return Math.round(base * (1 + LEVEL_COST_GROWTH * Math.max(0, level)));
}

/** Gold for taking a piece up by `levels`, one level at a time — what the running total shows. */
export function levelCostTotal(piece: GearInstance, levels: number): number {
  let total = 0;
  for (let i = 0; i < Math.max(0, levels); i += 1) {
    const level = piece.level + i;
    if (level >= 16) break;
    total += levelCost(piece.stars, level);
  }
  return total;
}

/** The gold a piece's levels have already cost — what a dismantle refunds a fifth of. */
export function levelGoldSpent(piece: GearInstance): number {
  let total = 0;
  for (let level = 0; level < piece.level; level += 1) total += levelCost(piece.stars, level);
  return total;
}

/** Pieces held; the cap is what the inventory screen warns about (GEAR.md §7). */
export function inventoryCount(save: SaveGame): number {
  return Object.keys(save.inventory).length;
}

/** Room left before the cap, counting the overflow a drop may still use. */
export function inventoryRoom(save: SaveGame): number {
  return INVENTORY_CAPACITY + INVENTORY_OVERFLOW - inventoryCount(save);
}

export interface EquipSummary {
  piece: GearInstance;
  slot: GearSlot;
  /** The piece that came off, if any. */
  replaced: GearInstance | null;
  /** The champion it was taken from, if it was worn elsewhere. */
  takenFrom: string | null;
}

/** Puts a piece on a champion, taking it off whoever wore it and whatever the slot held. */
export function applyEquip(
  save: SaveGame,
  input: { instanceId: string; pieceId: string },
): Result<EquipSummary> {
  const champion = save.roster[input.instanceId];
  if (!champion) return fail('invalid_argument', `Unknown champion ${input.instanceId}`);
  const plan = planEquip(champion, input.pieceId, save.inventory, save.roster);
  if (!plan.ok) return plan;
  const { piece, slot, replaced, takenFrom } = plan.value;

  if (takenFrom) {
    const previous = save.roster[takenFrom.instanceId];
    if (previous) previous.gear[slot] = null;
  }
  if (replaced) {
    const stored = save.inventory[replaced.instanceId];
    if (stored) stored.equippedTo = null;
  }
  const stored = save.inventory[piece.instanceId];
  if (stored) stored.equippedTo = champion.instanceId;
  champion.gear[slot] = piece.instanceId;
  return ok({
    piece: { ...clonePiece(piece), equippedTo: champion.instanceId },
    slot,
    replaced: replaced ? { ...clonePiece(replaced), equippedTo: null } : null,
    takenFrom: takenFrom?.instanceId ?? null,
  });
}

/** Takes a piece off a champion; it stays in the armoury. */
export function applyUnequip(
  save: SaveGame,
  input: { instanceId: string; slot: GearSlot },
): Result<GearInstance> {
  const champion = save.roster[input.instanceId];
  if (!champion) return fail('invalid_argument', `Unknown champion ${input.instanceId}`);
  const plan = planUnequip(champion, input.slot, save.inventory);
  if (!plan.ok) return plan;
  const stored = save.inventory[plan.value.instanceId];
  if (stored) stored.equippedTo = null;
  champion.gear[input.slot] = null;
  return ok({ ...clonePiece(plan.value), equippedTo: null });
}

export interface GearLevelSummary {
  piece: GearInstance;
  from: number;
  to: number;
  rolls: LevelRoll[];
  changes: CurrencyChange[];
}

/** Buys levels for a piece: the wallet pays, the engine rolls, the save keeps the result. */
export function applyGearLevel(
  save: SaveGame,
  input: { pieceId: string; levels: number; rng: Rng },
): Result<GearLevelSummary> {
  const piece = save.inventory[input.pieceId];
  if (!piece) return fail('invalid_argument', `Unknown gear ${input.pieceId}`);
  const levels = Math.max(1, Math.round(input.levels));
  const gold = levelCostTotal(piece, levels);
  if (gold <= 0) return fail('invalid_argument', `${input.pieceId} is at +${piece.level}`);
  const cost: CurrencyAmount[] = [{ currency: 'gold', amount: gold }];
  const paid = spend(save.wallet, cost);
  if (!paid.ok) return paid;

  const result = levelGear(piece, levels, input.rng);
  if (!result.ok) return result;
  save.wallet = paid.value.wallet;
  save.inventory[input.pieceId] = result.value.piece;
  bump(save, 'gear.levels', result.value.piece.level - piece.level);
  return ok({
    // `result.value.piece` is handed to the draft on the line above; the summary keeps its own.
    piece: clonePiece(result.value.piece),
    from: piece.level,
    to: result.value.piece.level,
    rolls: result.value.rolls,
    changes: paid.value.changes,
  });
}

/** Locking protects a piece from the Forge's dismantle and refine (GEAR.md §7). */
export function applyGearLock(
  save: SaveGame,
  input: { pieceId: string; locked: boolean },
): Result<GearInstance> {
  const piece = save.inventory[input.pieceId];
  if (!piece) return fail('invalid_argument', `Unknown gear ${input.pieceId}`);
  piece.locked = input.locked;
  return ok(clonePiece(piece));
}

export interface DropInput {
  /** The settlement the run was in: it decides the star band and the set pool. */
  settlementIndex: number;
  /** The drop rolled from the settlement's own sets rather than the whole catalogue. */
  fromSetPool: boolean;
  source: GearSource;
  now: number;
  rng: Rng;
}

/**
 * Mints one dropped piece (GEAR.md §7, `CAMPAIGN.md` §7). Returns null when the armoury is full
 * past its overflow — the run still pays everything else, and the screen says so.
 */
export function applyGearDrop(save: SaveGame, input: DropInput): GearInstance | null {
  if (inventoryRoom(save) <= 0) return null;
  const settlement = content.settlementByIndex(input.settlementIndex);
  const pool = input.fromSetPool && settlement ? settlement.setPool : content.gearSets.map((s) => s.id);
  const setId = pool.length ? input.rng.pick(pool) : content.gearSets[0]?.id;
  if (!setId) return null;
  const [minStars, maxStars] = dropStarRange(input.settlementIndex);
  const serial = save.counters.gear + 1;
  const piece = generateGear(
    {
      serial,
      slot: input.rng.pick(GEAR_SLOTS) as GearSlot,
      setId,
      rarity: input.rng.weighted(
        Object.entries(DROP_RARITY_WEIGHTS).map(([rarity, weight]) => ({
          item: rarity as Rarity,
          weight,
        })),
      ),
      stars: input.rng.int(minStars, maxStars),
      source: input.source,
      now: input.now,
    },
    input.rng,
  );
  save.counters.gear = serial;
  save.inventory[piece.instanceId] = piece;
  bump(save, 'gear.drops', 1);
  return clonePiece(piece);
}

function bump(save: SaveGame, key: string, by: number): void {
  if (by <= 0) return;
  save.stats[key] = (save.stats[key] ?? 0) + by;
}
