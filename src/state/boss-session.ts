/**
 * The boss fight in flight (docs/design/BOSSES.md §1). Not persisted: it lives as long as the
 * battle and its result screen do, and carries which tier a key was spent on so the result can
 * say what the damage did to the period's pool.
 *
 * A boss fight is never repeated automatically — each one costs a key, and a key is the player's
 * to spend — so unlike the campaign's batch this holds one fight at a time.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { BossFightSummary } from './bosses';

export interface BossSessionState {
  bossId: string | null;
  tierId: string | null;
  /** The team that went in, in slot order (instance ids). */
  team: string[];
  control: 'manual' | 'auto';
  /** What the fight banked, once it is over. */
  summary: BossFightSummary | null;
}

const EMPTY: BossSessionState = { bossId: null, tierId: null, team: [], control: 'auto', summary: null };

export type BossSessionStore = StoreApi<BossSessionState>;

export const bossSession: BossSessionStore = createStore<BossSessionState>(() => ({ ...EMPTY }));

export function beginBossFight(input: {
  bossId: string;
  tierId: string;
  team: readonly string[];
  control: 'manual' | 'auto';
}): void {
  bossSession.setState({
    bossId: input.bossId,
    tierId: input.tierId,
    team: [...input.team],
    control: input.control,
    summary: null,
  });
}

export function noteBossFightFinished(summary: BossFightSummary): void {
  bossSession.setState({ summary });
}

export function clearBossSession(): void {
  bossSession.setState({ ...EMPTY });
}
