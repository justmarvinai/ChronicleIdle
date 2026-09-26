/**
 * Battle controller (docs/tech/ARCHITECTURE.md §3.3): owns the live simulation, drives `step`
 * with back-pressure from the presenter, exposes the presented view to React, and hands the
 * outcome back to the game store when the fight ends.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import { content } from '@content/registry';
import type { EncounterDef } from '@content/encounters/types';
import type { EnemyDef } from '@content/enemies/types';
import {
  createBattle,
  retreat as retreatBattle,
  setControl as setBattleControl,
  setFocus as setBattleFocus,
  snapshot,
  step,
  type BattleEvent,
  type BattleOutcome,
  type BattleShaping,
  type BattleState,
  type BattleView,
  type Decision,
  type DecisionRequest,
} from '@engine/battle/index';
import { validateTeam } from '@engine/battle/teams';
import type { Roster } from '@engine/champions/instance';
import { wornBy } from '@engine/gear/equip';
import type { Inventory } from '@engine/gear/instance';
import type { PalaceBonus } from '@engine/palace/index';
import { fail, ok, type Result } from '@engine/errors';
import { hashString } from '@engine/rng/rng';
import { instantPresenter, type BattlePresenter } from './presenter';
import { applyEventToView } from './view';

export type BattleSpeed = 1 | 2 | 3 | 4;

/** Frame-time percentiles (ms) the stage measured over a fight (CLAUDE.md §5.6 budget). */
export interface FrameStats {
  p50: number;
  p95: number;
  max: number;
  samples: number;
}

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
  /** Set by the battle screen when a bench fight ends, read by the perf screen. */
  frameStats: FrameStats | null;
  /**
   * Whether the AI has steered any part of this fight — true from the first moment auto is on.
   * "Win a battle in Manual mode" (QUESTS_MISSIONS.md §2) means the player answered every turn
   * themselves, so a fight that was handed over once does not count, however it started.
   */
  usedAuto: boolean;
}

export interface StartBattleInput {
  encounterId: string;
  instanceIds: readonly string[];
  roster: Roster;
  /**
   * What the Glorious Palace adds to this chronicle's champions (`GLORIOUS_PALACE.md` §3). Required
   * rather than defaulted: a fight that quietly left it out would field champions weaker than the
   * sheet that sent them in. `NO_PALACE` is what a bench or a test passes.
   */
  palace: PalaceBonus;
  /**
   * The chronicle's armoury, so every champion fights in what they wear — the pieces' stats and
   * their sets' bonuses (`GEAR.md` §5). Required for the same reason as `palace`: until 0.12.0 it
   * was not passed at all, and every fight was fought as if nobody wore anything.
   */
  inventory: Inventory;
  control: 'manual' | 'auto';
  speed: BattleSpeed;
  /** Deterministic seed material (the save's seedRoot + a counter). */
  seed: string;
  /**
   * An encounter built for this one fight, used in place of looking `encounterId` up — the
   * Unwritten's passages are drawn from an expedition, not from the registry (UNWRITTEN.md §6).
   * Its id must be `encounterId`.
   */
  encounter?: EncounterDef;
  /** Resolves this fight's foes when they are not the registry's (an Elite's affixes, a Warden). */
  enemyById?: (id: string) => EnemyDef | undefined;
  /** What the fight carries beyond the encounter and the champions (the Unwritten's run). */
  shaping?: BattleShaping;
  /**
   * Hold the simulation until a presenter attaches (the battle screen mounting its stage), so no
   * turn is resolved off-screen. Headless runs leave it off and play through the instant presenter.
   */
  awaitPresenter?: boolean;
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
  frameStats: null,
  usedAuto: false,
};

export interface BattleController {
  store: StoreApi<BattleSessionState>;
  start(input: StartBattleInput): Result<void>;
  /** Answers the pending request (manual mode). */
  decide(decision: Decision): Result<void>;
  setControl(control: 'manual' | 'auto'): void;
  /**
   * Marks the enemy every ally attacks while it stands (BATTLE.md §7.1), or clears it with `null`.
   * It steers the policy rather than answering a request, so it works in both control modes and
   * between turns.
   */
  setFocus(unitId: string | null): void;
  setSpeed(speed: BattleSpeed): void;
  setPaused(paused: boolean): void;
  retreat(): void;
  /** Tears the session down (after the result screen or on exit). */
  end(): void;
  attachPresenter(presenter: BattlePresenter | null): void;
  /** Stores the stage's frame statistics for the perf screen (bench fights only). */
  recordFrameStats(stats: FrameStats | null): void;
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
  /** False while `awaitPresenter` holds the pump until a stage presenter attaches. */
  let armed = true;
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
    if (playing || !state || !armed) return;
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
      const encounter = input.encounter ?? content.encounterById(input.encounterId);
      if (!encounter || encounter.id !== input.encounterId)
        return fail('invalid_argument', `Unknown encounter ${input.encounterId}`);
      const team = validateTeam(input.roster, input.instanceIds, encounter.partySize);
      if (!team.ok) return team;
      const party = team.value.instanceIds.map((id) => {
        const instance = input.roster[id];
        const def = instance ? content.championById(instance.defId) : undefined;
        if (!instance || !def) throw new Error(`Roster instance ${id} has no definition`);
        return { instance, def, worn: wornBy(instance, input.inventory) };
      });
      session += 1;
      playing = false;
      armed = !input.awaitPresenter || presenter !== instantPresenter;
      const seed = `${input.seed}:${hashString(`${input.encounterId}:${team.value.instanceIds.join(',')}`).toString(16)}`;
      state = createBattle(
        {
          encounter,
          party,
          enemyById: input.enemyById ?? ((id) => content.enemyById(id)),
          setById: (id) => content.gearSetById(id),
          palace: input.palace,
          control: input.control,
          ...(input.shaping ? { shaping: input.shaping } : {}),
        },
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
        usedAuto: input.control === 'auto',
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
      // Once the AI has had the wheel the fight is no longer a manual win, even if it is handed
      // back (QUESTS_MISSIONS.md §2).
      publish(control === 'auto' ? { control, usedAuto: true } : { control });
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
    setFocus(unitId) {
      if (!state) return;
      setBattleFocus(state, unitId);
      const view = store.getState().view;
      // The mark is drawn from the view, so it has to reach the HUD before the next event does.
      if (view && view.focusId !== state.focusId) publish({ view: { ...view, focusId: state.focusId } });
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
      if (next && !armed) {
        armed = true;
        void pump();
      }
    },
    recordFrameStats(stats) {
      publish({ frameStats: stats });
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
