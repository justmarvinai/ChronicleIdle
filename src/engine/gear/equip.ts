/**
 * Wearing gear (docs/design/GEAR.md §7). Equipping is a swap: a slot holds one piece, a piece
 * has one wearer, and taking someone else's piece asks the caller first — the rules here only
 * report that it would happen.
 */
import type { GearSlot } from '@content/champions/types';
import type { ChampionInstance, Roster } from '@engine/champions/instance';
import { fail, ok, type Result } from '@engine/errors';
import type { GearInstance, Inventory } from './instance';

export interface EquipPlan {
  piece: GearInstance;
  slot: GearSlot;
  /** The piece coming off the champion's own slot, if any. */
  replaced: GearInstance | null;
  /** The champion the piece is being taken from, if it was worn elsewhere. */
  takenFrom: ChampionInstance | null;
}

/** Checks one equip; the store performs it. */
export function planEquip(
  champion: ChampionInstance,
  pieceId: string,
  inventory: Inventory,
  roster: Roster,
): Result<EquipPlan> {
  const piece = inventory[pieceId];
  if (!piece) return fail('invalid_argument', `Unknown gear ${pieceId}`);
  if (piece.equippedTo === champion.instanceId)
    return fail('invalid_argument', `${pieceId} is already worn there`);
  const wornId = champion.gear[piece.slot];
  const replaced = wornId ? (inventory[wornId] ?? null) : null;
  const takenFrom = piece.equippedTo ? (roster[piece.equippedTo] ?? null) : null;
  return ok({ piece, slot: piece.slot, replaced, takenFrom });
}

/** Checks one unequip. */
export function planUnequip(
  champion: ChampionInstance,
  slot: GearSlot,
  inventory: Inventory,
): Result<GearInstance> {
  const wornId = champion.gear[slot];
  if (!wornId) return fail('invalid_argument', `${champion.instanceId} wears nothing on ${slot}`);
  const piece = inventory[wornId];
  if (!piece) return fail('invalid_argument', `Unknown gear ${wornId}`);
  return ok(piece);
}

/** The pieces a champion is wearing right now, in slot order. */
export function wornBy(champion: ChampionInstance, inventory: Inventory): GearInstance[] {
  const worn: GearInstance[] = [];
  for (const id of Object.values(champion.gear)) {
    if (!id) continue;
    const piece = inventory[id];
    if (piece) worn.push(piece);
  }
  return worn;
}
