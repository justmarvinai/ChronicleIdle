/**
 * Gear instances as stored in the save (docs/design/GEAR.md §8). A piece holds what was rolled
 * for it — the set, the rarity, the stars, the level and its stats — and who wears it; every
 * derived number (the main stat's current value, the power it adds) is recomputed on read.
 */
import type { GearSource, GearStat } from '@content/balance/gear';
import type { GearSlot } from '@content/champions/types';
import type { Rarity } from '@content/champions/types';

export interface GearSubStat {
  stat: GearStat;
  /** The sum of every roll this substat has taken. */
  value: number;
  /** How many rolls made that value, so the UI can show a piece's history. */
  rolls: number;
}

export interface GearInstance {
  instanceId: string;
  slot: GearSlot;
  setId: string;
  rarity: Rarity;
  stars: number;
  level: number;
  /** The main stat's identity; its value follows from star and level (`mainStatValue`). */
  mainStat: GearStat;
  subs: GearSubStat[];
  /** Champion instance id, or null while the piece sits in the inventory. */
  equippedTo: string | null;
  locked: boolean;
  acquiredAt: number;
  source: GearSource;
}

export type Inventory = Record<string, GearInstance>;

/** Instance ids are `gear-<n>` from the save's running counter, so they never collide. */
export function gearInstanceIdFor(serial: number): string {
  return `gear-${serial}`;
}

/**
 * A detached copy of a piece. State actions run inside an immer producer, so anything they hand
 * back has to leave the draft behind: the proxies are revoked the moment the producer returns.
 */
export function clonePiece(piece: GearInstance): GearInstance {
  return { ...piece, subs: piece.subs.map((sub) => ({ ...sub })) };
}
