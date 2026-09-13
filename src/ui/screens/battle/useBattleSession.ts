import { useStore } from 'zustand';
import { battleController, type BattleSessionState } from '@state/battle/index';

/** React subscription to the battle controller's presented state. */
export function useBattleSession<T>(selector: (s: BattleSessionState) => T): T {
  return useStore(battleController.store, selector);
}
