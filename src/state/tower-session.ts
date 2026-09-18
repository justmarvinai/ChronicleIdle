/**
 * The tower floor in flight (docs/design/ETERNAL_TOWER.md §3). Not persisted: it lives as long as
 * the battle and its result screen do, and carries which floor the key was spent on so the result
 * can say what the climb did.
 *
 * One floor at a time, like a boss race and unlike a campaign batch: every attempt costs a key.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { TowerFloorSummary } from './tower';

export interface TowerSessionState {
  floor: number | null;
  /** The team that went in, in slot order (instance ids). */
  team: string[];
  control: 'manual' | 'auto';
  /** What the floor paid, once it is over. */
  summary: TowerFloorSummary | null;
}

const EMPTY: TowerSessionState = { floor: null, team: [], control: 'auto', summary: null };

export type TowerSessionStore = StoreApi<TowerSessionState>;

export const towerSession: TowerSessionStore = createStore<TowerSessionState>(() => ({ ...EMPTY }));

export function beginTowerFloor(input: {
  floor: number;
  team: readonly string[];
  control: 'manual' | 'auto';
}): void {
  towerSession.setState({
    floor: input.floor,
    team: [...input.team],
    control: input.control,
    summary: null,
  });
}

export function noteTowerFloorFinished(summary: TowerFloorSummary): void {
  towerSession.setState({ summary });
}

export function clearTowerSession(): void {
  towerSession.setState({ ...EMPTY });
}
