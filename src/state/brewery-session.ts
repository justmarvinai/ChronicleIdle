/**
 * The brewery run in flight (docs/design/BREWERY.md §3). Not persisted: it lives as long as the
 * battle and its result screen do, and carries which hall and stage the run was spent on so the
 * result can say what came out of the cellar.
 *
 * One run at a time, like a tower floor and unlike a campaign batch: every attempt costs one of
 * the day's twenty, won or lost.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { Element } from '@content/champions/types';
import type { BreweryRunSummary } from './brewery';

export interface BrewerySessionState {
  element: Element | null;
  stage: number;
  /** The team that went in, in slot order (instance ids). */
  team: string[];
  control: 'manual' | 'auto';
  /** What the run paid, once it is over. */
  summary: BreweryRunSummary | null;
}

const EMPTY: BrewerySessionState = { element: null, stage: 0, team: [], control: 'auto', summary: null };

export type BrewerySessionStore = StoreApi<BrewerySessionState>;

export const brewerySession: BrewerySessionStore = createStore<BrewerySessionState>(() => ({
  ...EMPTY,
}));

export function beginBreweryRun(input: {
  element: Element;
  stage: number;
  team: readonly string[];
  control: 'manual' | 'auto';
}): void {
  brewerySession.setState({
    element: input.element,
    stage: input.stage,
    team: [...input.team],
    control: input.control,
    summary: null,
  });
}

export function noteBreweryRunFinished(summary: BreweryRunSummary): void {
  brewerySession.setState({ summary });
}

export function clearBrewerySession(): void {
  brewerySession.setState({ ...EMPTY });
}
