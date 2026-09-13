/**
 * The campaign run in flight (docs/design/CAMPAIGN.md §9). Not persisted: it lives as long as the
 * battle screen does, and holds what a batch of auto-repeat runs has earned so far so the HUD can
 * show it and the result screen can summarise it.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { StagePointer } from '@engine/campaign/progress';
import { mergeRunRewards, type RunRewards } from '@engine/campaign/rewards';
import type { RunSummary } from './campaign';

export interface CampaignSessionState {
  pointer: StagePointer | null;
  /** The team that fights every run of the batch, in slot order. */
  team: string[];
  control: 'manual' | 'auto';
  /** Energy the current run cost, and which run of this stage it is (the drop seed). */
  cost: number;
  runIndex: number;
  /** Runs asked for, and how many have finished. */
  requested: number;
  completed: number;
  /** The player pressed Stop: finish this run, then end the batch. */
  stopping: boolean;
  /** Why the batch ended, for the summary. */
  endedBecause: 'done' | 'stopped' | 'defeat' | 'energy' | null;
  summaries: RunSummary[];
}

const EMPTY: CampaignSessionState = {
  pointer: null,
  team: [],
  control: 'auto',
  cost: 0,
  runIndex: 0,
  requested: 1,
  completed: 0,
  stopping: false,
  endedBecause: null,
  summaries: [],
};

export type CampaignSessionStore = StoreApi<CampaignSessionState>;

export const campaignSession: CampaignSessionStore = createStore<CampaignSessionState>(() => ({
  ...EMPTY,
}));

export function beginCampaignBatch(input: {
  pointer: StagePointer;
  team: readonly string[];
  control: 'manual' | 'auto';
  requested: number;
}): void {
  campaignSession.setState({
    ...EMPTY,
    pointer: input.pointer,
    team: [...input.team],
    control: input.control,
    requested: Math.max(1, input.requested),
  });
}

/** Records what `applyRunStart` charged for the run about to be fought. */
export function noteRunStarted(cost: number, runIndex: number): void {
  campaignSession.setState({ cost, runIndex });
}

export function noteRunFinished(summary: RunSummary): void {
  const state = campaignSession.getState();
  campaignSession.setState({ completed: state.completed + 1, summaries: [...state.summaries, summary] });
}

export function stopCampaignBatch(): void {
  campaignSession.setState({ stopping: true });
}

export function endCampaignBatch(reason: NonNullable<CampaignSessionState['endedBecause']>): void {
  campaignSession.setState({ endedBecause: reason });
}

export function clearCampaignSession(): void {
  campaignSession.setState({ ...EMPTY });
}

/** Everything a batch earned, merged (CAMPAIGN.md §9 summary panel). */
export function batchRewards(state: CampaignSessionState): RunRewards | null {
  const rewards = state.summaries.map((s) => s.rewards).filter((r): r is RunRewards => r !== null);
  return rewards.length ? mergeRunRewards(rewards) : null;
}

/** Stars the batch added, and whether any run set a first clear. */
export function batchStars(state: CampaignSessionState): {
  gained: number;
  best: number;
  firstClear: boolean;
} {
  let gained = 0;
  let best = 0;
  let firstClear = false;
  for (const summary of state.summaries) {
    gained += Math.max(0, summary.stars - summary.starsBefore);
    best = Math.max(best, summary.stars);
    firstClear = firstClear || summary.firstClear;
  }
  return { gained, best, firstClear };
}
