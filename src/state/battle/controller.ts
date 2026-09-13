/**
 * Battle controller (docs/tech/ARCHITECTURE.md §3.3): owns the live simulation, drives `step`
 * with back-pressure from the presenter, exposes the presented view to React, and hands the
 * outcome back to the game store when the fight ends.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import { content } from '@content/registry';
import type { EncounterDef } from '@content/encounters/types';
import {
  createBattle,
  retreat as retreatBattle,
  setControl as setBattleControl,
  snapshot,
  step,
  type BattleEvent,
  type BattleOutcome,
  type BattleState,
  type BattleView,
  type Decision,
  type DecisionRequest,
} from '@engine/battle/index';
import { validateTeam } from '@engine/battle/teams';
import type { Roster } from '@engine/champions/instance';
import { fail, ok, type Result } from '@engine/errors';
import { hashString } from '@engine/rng/rng';
import { instantPresenter, type BattlePresenter } from './presenter';
import { applyEventToView } from './view';

export type BattleSpeed = 1 | 2 | 3 | 4;

export interface BattleSessionState {
  status: 'idle' | 'running' | 'ended';
  encounter: EncounterDef | null;
  /** What the presenter has shown so far. */
  view: BattleView | null;
  /** The request the player must answer (manual mode). */
  request: DecisionRequest | null;
  control: 'manual' | 'auto';
  speed: BattleSpeed;
  paused: boolean;
  /** Recent events for the Info panel's battle log (newest last, capped). */
  log: BattleEvent[];
  outcome: BattleOutcome | null;
  seed: string;
}

export interface StartBattleInput {
  encounterId: string;
  instanceIds: readonly string[];
  roster: Roster;
  control: 'manual' | 'auto';
  speed: BattleSpeed;
  /** Deterministic seed material (the save's seedRoot + a counter). */
  seed: string;
}

const LOG_LIMIT = 400;

const initial: BattleSessionState = {
  status: 'idle',
  encounter: null,
  view: null,
  request: null,
  control: 'manual',
  speed: 1,
  paused: false,
  log: [],
  outcome: null,
  seed: '',
};

export interface BattleController {
  store: StoreApi<BattleSessionState>;
  start(input: StartBattleInput): Result<void>;
  /** Answers the pending request (manual mode). */
  decide(decision: Decision): Result<void>;
  setControl(control: 'manual' | 'auto'): void;
  setSpeed(speed: BattleSpeed): void;
  setPaused(paused: boolean): void;
  retreat(): void;
  /** Tears the session down (after the result screen or on exit). */
  end(): void;
  attachPresenter(presenter: BattlePresenter | null): void;
  onEnded(listener: (outcome: BattleOutcome) => void): () => void;
  /** Test/bench hook: the live simulation (never read it from React). */
  simulation(): BattleState | null;
}

export function createBattleController(): BattleController {
  const store = createStore<BattleSessionState>(() => ({ ...initial }));
  let state: BattleState | null = null;
  let presenter: BattlePresenter = instantPresenter;
  let playing = false;
  let session = 0;
  const endedListeners = new Set<(outcome: BattleOutcome) => void>();

  const publish = (patch: Partial<BattleSessionState>): void => store.setState(patch);

  const land = (event: BattleEvent): void => {
    const current = store.getState();
    if (!current.view) return;
    const view = applyEventToView(current.view, event);
    const log =
      current.log.length >= LOG_LIMIT
        ? [...current.log.slice(-LOG_LIMIT + 1), event]
        : [...current.log, event];
    publish(view === current.view ? { log } : { view, log });
  };

  /** Runs simulation steps until a decision is needed, the battle ends, or the controller pauses. */
  const pump = async (): Promise<void> => {
    if (playing || !state) return;
    playing = true;
    const mySession = session;
    try {
      while (state && mySession === session) {
        const current = store.getState();
        if (current.paused) break;
        if (state.phase === 'ended') break;
        if (state.pending) break;
        const result = step(state);
        await presenter.play(result.events, store.getState().speed, land);
        if (mySession !== session || !state) return;
        if (result.outcome) {
          publish({
            status: 'ended',
            outcome: result.outcome,
            request: null,
            view: { ...(store.getState().view ?? snapshot(state)), outcome: result.outcome, phase: 'ended' },
          });
          for (const listener of endedListeners) listener(result.outcome);
          break;
        }
        if (result.request) {
          publish({
            request: result.request,
            view: {
              ...(store.getState().view ?? snapshot(state)),
              pending: result.request,
              phase: 'awaiting_decision',
            },
          });
          break;
        }
      }
    } finally {
      if (mySession === session) playing = false;
    }
  };

  return {
    store,
    start(input) {
      const encounter = content.encounterById(input.encounterId);
      if (!encounter) return fail('invalid_argument', `Unknown encounter ${input.encounterId}`);
      const team = validateTeam(input.roster, input.instanceIds, encounter.partySize);
      if (!team.ok) return team;
      const party = team.value.instanceIds.map((id) => {
        const instance = input.roster[id];
        const def = instance ? content.championById(instance.defId) : undefined;
        if (!instance || !def) throw new Error(`Roster instance ${id} has no definition`);
        return { instance, def };
      });
      session += 1;
      playing = false;
      const seed = `${input.seed}:${hashString(`${input.encounterId}:${team.value.instanceIds.join(',')}`).toString(16)}`;
      state = createBattle(
        { encounter, party, enemyById: (id) => content.enemyById(id), control: input.control },
        seed,
      );
      const view = snapshot(state);
      store.setState({
        ...initial,
        status: 'running',
        encounter,
        view,
        control: input.control,
        speed: input.speed,
        seed,
      });
      presenter.mount?.(view);
      void pump();
      return ok(undefined);
    },
    decide(decision) {
      if (!state || !state.pending) return fail('battle_invalid_state', 'No decision is pending');
      try {
        const result = step(state, decision);
        publish({ request: null });
        const sim = state;
        void (async () => {
          await presenter.play(result.events, store.getState().speed, land);
          if (sim !== state) return;
          if (result.outcome) {
            publish({
              status: 'ended',
              outcome: result.outcome,
              view: { ...(store.getState().view ?? snapshot(sim)), outcome: result.outcome, phase: 'ended' },
            });
            for (const listener of endedListeners) listener(result.outcome);
            return;
          }
          void pump();
        })();
        return ok(undefined);
      } catch (error) {
        return fail('invalid_argument', error instanceof Error ? error.message : String(error));
      }
    },
    setControl(control) {
      publish({ control });
      if (!state) return;
      setBattleControl(state, control);
      // Switching to auto while a request is open answers it with the policy.
      if (control === 'auto' && state.pending) {
        const pending = state.pending;
        state.pending = null;
        state.phase = 'running';
        // Re-run the turn: the unit's turn already started, so decide via the AI and resolve it.
        const unit = state.units[pending.unitId];
        if (unit) {
          state.pending = pending;
          const choice = pending.abilities.find(
            (a) => a.ready && a.abilityId === (pending.forced?.abilityId ?? a.abilityId),
          );
          const auto = choice
            ? {
                unitId: unit.id,
                abilityId: choice.abilityId,
                targetId: choice.targeting === 'none' ? null : choice.autoTarget,
              }
            : null;
          if (auto && (auto.targetId !== null || choice?.targeting === 'none')) {
            this.decide(auto);
            return;
          }
          state.pending = null;
          state.phase = 'running';
        }
      }
      void pump();
    },
    setSpeed(speed) {
      publish({ speed });
    },
    setPaused(paused) {
      publish({ paused });
      if (!paused) void pump();
    },
    retreat() {
      if (!state || state.phase === 'ended') return;
      const result = retreatBattle(state);
      for (const event of result.events) land(event);
      if (result.outcome) {
        publish({ status: 'ended', outcome: result.outcome, request: null, paused: false });
        for (const listener of endedListeners) listener(result.outcome);
      }
    },
    end() {
      session += 1;
      playing = false;
      state = null;
      presenter.destroy?.();
      store.setState({ ...initial });
    },
    attachPresenter(next) {
      presenter = next ?? instantPresenter;
      const view = store.getState().view;
      if (next && view) next.mount?.(view);
    },
    onEnded(listener) {
      endedListeners.add(listener);
      return () => endedListeners.delete(listener);
    },
    simulation: () => state,
  };
}

/** The app-wide controller; screens read it through `useBattleSession`. */
export const battleController: BattleController = createBattleController();
