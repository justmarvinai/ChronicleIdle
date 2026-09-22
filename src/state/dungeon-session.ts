/**
 * The dungeon run in flight (docs/design/DUNGEONS.md §6). Not persisted: it lives as long as the
 * battle and its result screen do.
 *
 * A dungeon run is a **batch** like a campaign stand's, not a single attempt like a tower floor —
 * a keep is farmed, and the ×10 / ×25 / ×50 the campaign already unlocks are what makes farming
 * one bearable. The batch carries what it has earned so far, so the result screen can report the
 * evening rather than the last fight of it.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { DungeonDifficulty } from '@content/balance/dungeon';
import type { CurrencyAmount } from '@content/currencies/types';
import type { GearInstance } from '@engine/gear/instance';
import type { DungeonRunSummary } from './dungeon';

export type DungeonBatchEnd = 'done' | 'defeat' | 'energy' | 'stopped';

export interface DungeonSessionState {
  slug: string | null;
  difficulty: DungeonDifficulty;
  stage: number;
  /** The team that went in, in slot order (instance ids). */
  team: string[];
  control: 'manual' | 'auto';
  /** Runs asked for, and how many have finished. */
  requested: number;
  completed: number;
  /** The run index the next fight seeds from; the store's counter drives it. */
  runIndex: number;
  energySpent: number;
  /** The player pressed stop, so the batch ends after this fight. */
  stopping: boolean;
  /** Why the batch ended, once it has. */
  ended: DungeonBatchEnd | null;
  /** The last run's own summary, and what the whole batch has taken. */
  summary: DungeonRunSummary | null;
  gear: GearInstance[];
  gearLost: number;
  currencies: CurrencyAmount[];
  championXp: number;
  playerXp: number;
  cleared: number;
}

const EMPTY: DungeonSessionState = {
  slug: null,
  difficulty: 'normal',
  stage: 0,
  team: [],
  control: 'auto',
  requested: 1,
  completed: 0,
  runIndex: 0,
  energySpent: 0,
  stopping: false,
  ended: null,
  summary: null,
  gear: [],
  gearLost: 0,
  currencies: [],
  championXp: 0,
  playerXp: 0,
  cleared: 0,
};

export type DungeonSessionStore = StoreApi<DungeonSessionState>;

export const dungeonSession: DungeonSessionStore = createStore<DungeonSessionState>(() => ({
  ...EMPTY,
}));

export function beginDungeonBatch(input: {
  slug: string;
  difficulty: DungeonDifficulty;
  stage: number;
  team: readonly string[];
  control: 'manual' | 'auto';
  requested: number;
}): void {
  dungeonSession.setState({
    ...EMPTY,
    slug: input.slug,
    difficulty: input.difficulty,
    stage: input.stage,
    team: [...input.team],
    control: input.control,
    requested: Math.max(1, input.requested),
  });
}

/** What the run that is about to start costs and seeds from. */
export function noteDungeonRunStarted(input: { energySpent: number; runIndex: number }): void {
  dungeonSession.setState({ energySpent: input.energySpent, runIndex: input.runIndex });
}

/** Folds one finished run into the batch's running total. */
export function noteDungeonRunFinished(summary: DungeonRunSummary): void {
  const state = dungeonSession.getState();
  const currencies = [...state.currencies];
  for (const entry of summary.currencies) {
    const at = currencies.findIndex((one) => one.currency === entry.currency);
    const existing = currencies[at];
    if (existing) currencies[at] = { ...existing, amount: existing.amount + entry.amount };
    else currencies.push({ ...entry });
  }
  dungeonSession.setState({
    summary,
    completed: state.completed + 1,
    gear: [...state.gear, ...summary.gear],
    gearLost: state.gearLost + summary.gearLost,
    currencies,
    championXp: state.championXp + summary.championXp,
    playerXp: state.playerXp + summary.playerXp,
    cleared: state.cleared + (summary.cleared ? 1 : 0),
  });
}

/** Asks the batch to stop after the fight now running. */
export function stopDungeonBatch(): void {
  dungeonSession.setState({ stopping: true });
}

export function endDungeonBatch(ended: DungeonBatchEnd): void {
  dungeonSession.setState({ ended });
}

export function clearDungeonSession(): void {
  dungeonSession.setState({ ...EMPTY });
}
