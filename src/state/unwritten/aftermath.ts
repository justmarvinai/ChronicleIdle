/**
 * What the last Unwritten step left to announce (docs/design/UNWRITTEN.md §4.2, §7.5, §16). Not
 * persisted: the save already holds everything that happened — the wounds, the offer, the Tale —
 * and this only remembers how it should be told the moment the company comes back to the map.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { BattleOutcomeKind } from '@engine/battle/types';
import type { CurrencyChange } from '@engine/economy/wallet';
import type { Tale } from '@engine/schema/unwritten-save';
import type { UnwrittenReceipt } from '@engine/unwritten/index';

export interface Aftermath {
  /** How the fight just fought ended, if a fight was what just happened. */
  fight: BattleOutcomeKind | null;
  /** Champions who fell in it, by company id. */
  fell: string[];
  /** Inks lit by the step. */
  illuminated: UnwrittenReceipt['illuminated'];
  /** The Tale, when the step ended the expedition. */
  ended: Tale | null;
  /** What the step paid into the wallet: a Warden's Tithe, an Omen's seal. */
  paid: CurrencyChange[];
}

const EMPTY: Aftermath = { fight: null, fell: [], illuminated: [], ended: null, paid: [] };

export const unwrittenAftermath: StoreApi<Aftermath> = createStore<Aftermath>(() => ({ ...EMPTY }));

/** Keeps what a step left to tell, adding to anything not yet told. */
export function noteAftermath(next: Partial<Aftermath>): void {
  const now = unwrittenAftermath.getState();
  unwrittenAftermath.setState({
    fight: next.fight ?? now.fight,
    fell: [...now.fell, ...(next.fell ?? [])],
    illuminated: [...now.illuminated, ...(next.illuminated ?? [])],
    ended: next.ended ?? now.ended,
    paid: [...now.paid, ...(next.paid ?? [])],
  });
}

export function clearAftermath(): void {
  unwrittenAftermath.setState({ ...EMPTY });
}
