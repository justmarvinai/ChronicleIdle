/**
 * The game store (docs/tech/ARCHITECTURE.md §4): one persisted `save` document plus transient
 * boot/ui state. Actions call pure engine reducers and emit domain events.
 */
import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH } from '@content/balance/economy';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import type { Difficulty } from '@content/balance/battle';
import { CHAMPION_IDS, type ChampionId, type ObtainSource } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import { content } from '@content/registry';
import { DEFAULT_ROSTER_VIEW, type RosterView } from '@engine/champions/query';
import {
  addChampion,
  generateRoster,
  seedStartingRoster,
  setFavourite,
  setLocked,
} from '@engine/champions/roster';
import { addEnergy, regenerateEnergy, spendEnergy } from '@engine/economy/energy';
import { grant, spend } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { createNewGame } from '@engine/save/new-game';
import type { SaveGame, Settings, TeamMode } from '@engine/schema/save';
import type { BattleOutcome } from '@engine/battle/index';
import { sanitizeTeam, validateTeam } from '@engine/battle/teams';
import type { Clock } from '@engine/time/clock';
import { createRng, hashString } from '@engine/rng/rng';
import { systemClock } from '@platform/clock';
import { maxBattleSpeed, type StagePointer } from '@engine/campaign/progress';
import {
  applyRunFinish,
  applyRunStart,
  progressOf,
  stageRefOf,
  type RunFinishInput,
  type RunStarted,
  type RunSummary,
} from './campaign';
import { EventBus } from './events';
import type { OfflineReport } from './offline';
import type { DialogRoute, Route, Toast, ToastKind } from './ui-types';
import { t, type I18nKey, type I18nParams } from '@i18n/index';

export type BootStatus = 'booting' | 'ready' | 'failed';

export interface BootState {
  status: BootStatus;
  /** A save exists in storage (Continue is offered). */
  hasSave: boolean;
  storageKind: string;
  /** The stored save is from a newer game version; it is kept untouched. */
  unsupportedSaveVersion: number | null;
  /** Raw text of a save that could not be loaded, offered for export. */
  corruptSaveText: string | null;
  error: string | null;
}

export interface UiState {
  stack: Route[];
  dialog: DialogRoute | null;
  toasts: Toast[];
  updateAvailable: boolean;
  offlineReady: boolean;
  fullscreen: boolean;
  /** The one-time fullscreen offer (owner's answer Q27): asked this session / declined. */
  fullscreenOffered: boolean;
  fullscreenDeclined: boolean;
  /** Champions index state (sort, filters, selection) — kept for the session, never saved. */
  roster: { view: RosterView; selected: string | null };
}

export interface GameState {
  boot: BootState;
  save: SaveGame | null;
  lastOffline: OfflineReport | null;
  ui: UiState;
}

export interface GameActions {
  setBoot(patch: Partial<BootState>): void;
  loadSave(save: SaveGame, report: OfflineReport | null): void;
  newGame(name: string): Result<void>;
  rename(name: string): Result<void>;
  resetGame(): void;
  grantCurrency(amounts: readonly CurrencyAmount[], reason: string): void;
  spendCurrency(cost: readonly CurrencyAmount[]): Result<void>;
  tickEnergy(): void;
  addEnergy(amount: number, reason: string): void;
  spendEnergy(amount: number): Result<void>;
  claimProvision(id: string, amount: number): boolean;
  updateSettings(patch: Partial<Settings>): void;
  touchStat(key: string, delta?: number): void;
  push(route: Route): void;
  replace(route: Route): void;
  pop(): void;
  resetStack(route: Route): void;
  openDialog(dialog: DialogRoute): void;
  closeDialog(): void;
  toast(kind: ToastKind, textKey: I18nKey, params?: I18nParams, rewards?: CurrencyAmount[]): void;
  dismissToast(id: number): void;
  setUpdateAvailable(value: boolean): void;
  setOfflineReady(value: boolean): void;
  setFullscreen(value: boolean): void;
  setFullscreenOffer(patch: { offered?: boolean; declined?: boolean }): void;
  /** Seeds the roster with the chosen Rare starter and the tutorial companions, then enters Emberhold. */
  chooseStarter(defId: ChampionId): Result<string>;
  grantChampion(defId: ChampionId, source: ObtainSource, reason: string): Result<string>;
  setChampionLocked(instanceId: string, locked: boolean): Result<void>;
  setChampionFavourite(instanceId: string, favourite: boolean): Result<void>;
  setAvatar(defId: ChampionId | null): Result<void>;
  /** Dev/debug: `count` seeded random copies (perf tests, the Chronicle Debug panel). */
  generateDebugRoster(count: number, seed: string): Result<void>;
  setRosterView(patch: Partial<RosterView>): void;
  selectChampion(instanceId: string | null): void;
  /** Stores a team preset (ordered instance ids, slot 0 = leader) for a party-size mode. */
  saveTeamPreset(
    mode: TeamMode,
    index: number,
    instanceIds: readonly string[],
    partySize: number,
  ): Result<void>;
  /** Remembers the team that just went into battle. */
  setLastUsedTeam(mode: TeamMode, instanceIds: readonly string[]): void;
  /** Lifetime battle counters for the profile and later quests. */
  recordBattle(outcome: BattleOutcome, encounterId: string): void;
  /** Points the map, stage list and battle setup at a stage; it reopens there. */
  selectStage(pointer: StagePointer): Result<void>;
  /** Runs the auto-repeat selector is set to (1 = a single run). */
  setAutoRepeat(runs: number): void;
  /**
   * Charges one run of a stage and returns the encounter to fight. The energy leaves the wallet
   * before the battle starts, so a reload mid-fight never yields a free run.
   */
  startCampaignRun(pointer: StagePointer): Result<RunStarted>;
  /** Records a finished run: stars, best turns, rewards, champion and player XP. */
  finishCampaignRun(input: RunFinishInput): Result<RunSummary>;
  /** Dev/debug (Chronicle Debug panel): the player level, for verifying level gates. */
  debugSetPlayerLevel(level: number): void;
  /** Dev/debug: marks a whole difficulty cleared, for verifying the unlock chain. */
  debugClearCampaign(difficulty: Difficulty, stars?: number): void;
}

export type GameStore = GameState & { actions: GameActions };
export type GameStoreApi = UseBoundStore<
  Mutate<StoreApi<GameStore>, [['zustand/subscribeWithSelector', never], ['zustand/immer', never]]>
>;

export interface StoreDeps {
  clock: Clock;
  events?: EventBus;
}

export const NAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;

export function validateName(name: string): Result<string> {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (trimmed.length < PLAYER_NAME_MIN_LENGTH) return fail('invalid_argument', 'tooShort');
  if (trimmed.length > PLAYER_NAME_MAX_LENGTH) return fail('invalid_argument', 'tooLong');
  if (!NAME_PATTERN.test(trimmed)) return fail('invalid_argument', 'invalid');
  return ok(trimmed);
}

let toastSeq = 0;

export function createGameStore(deps: StoreDeps): { store: GameStoreApi; events: EventBus } {
  const events = deps.events ?? new EventBus();
  const clock = deps.clock;

  const store = create<GameStore>()(
    subscribeWithSelector(
      immer((set, get) => {
        /** Runs `fn` against the current save; no-op (false) when no chronicle is loaded. */
        const withSave = (fn: (save: SaveGame) => void): boolean => {
          if (!get().save) return false;
          set((state) => {
            if (state.save) {
              fn(state.save);
              state.save.updatedAt = clock.now();
            }
          });
          return true;
        };

        return {
          boot: {
            status: 'booting',
            hasSave: false,
            storageKind: 'memory',
            unsupportedSaveVersion: null,
            corruptSaveText: null,
            error: null,
          },
          save: null,
          lastOffline: null,
          ui: {
            stack: [{ name: 'title' }],
            dialog: null,
            toasts: [],
            updateAvailable: false,
            offlineReady: false,
            fullscreen: false,
            fullscreenOffered: false,
            fullscreenDeclined: false,
            roster: { view: DEFAULT_ROSTER_VIEW, selected: null },
          },

          actions: {
            setBoot(patch) {
              set((state) => {
                Object.assign(state.boot, patch);
              });
            },

            loadSave(save, report) {
              set((state) => {
                state.save = save;
                state.lastOffline = report;
                state.boot.hasSave = true;
              });
              events.emit({ type: 'game.loaded', migrated: false });
            },

            newGame(name) {
              const valid = validateName(name);
              if (!valid.ok) return valid;
              const now = clock.now();
              const seedRoot = `${hashString(`${valid.value}:${now}`).toString(16)}-${now.toString(36)}`;
              const previous = get().save;
              const created = createNewGame(
                previous
                  ? { name: valid.value, now, seedRoot, settings: previous.settings }
                  : { name: valid.value, now, seedRoot },
              );
              // A fullscreen offer declined before the chronicle existed is remembered by it.
              const save =
                !previous && get().ui.fullscreenDeclined
                  ? { ...created, settings: { ...created.settings, launchFullscreen: false } }
                  : created;
              set((state) => {
                state.save = save;
                state.lastOffline = null;
                state.boot.hasSave = true;
                // A chronicle begins by binding a starter (TUTORIAL.md 1.2).
                state.ui.stack = [{ name: 'starter' }];
                state.ui.dialog = null;
                state.ui.roster = { view: DEFAULT_ROSTER_VIEW, selected: null };
              });
              events.emit({ type: 'game.created', name: valid.value });
              return ok(undefined);
            },

            rename(name) {
              const valid = validateName(name);
              if (!valid.ok) return valid;
              withSave((save) => {
                save.profile.name = valid.value;
              });
              events.emit({ type: 'profile.renamed', name: valid.value });
              return ok(undefined);
            },

            resetGame() {
              set((state) => {
                state.save = null;
                state.lastOffline = null;
                state.boot.hasSave = false;
                state.ui.stack = [{ name: 'title' }];
                state.ui.dialog = null;
              });
              events.emit({ type: 'game.reset' });
            },

            grantCurrency(amounts, reason) {
              const current = get().save;
              if (!current) return;
              const { wallet, changes } = grant(current.wallet, amounts);
              if (changes.length === 0) return;
              withSave((save) => {
                save.wallet = wallet;
              });
              events.emit({ type: 'currency.changed', changes, reason });
            },

            spendCurrency(cost) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              const result = spend(current.wallet, cost);
              if (!result.ok) return result;
              withSave((save) => {
                save.wallet = result.value.wallet;
              });
              events.emit({ type: 'currency.changed', changes: result.value.changes, reason: 'spend' });
              return ok(undefined);
            },

            tickEnergy() {
              const current = get().save;
              if (!current) return;
              const next = regenerateEnergy(current.energy, current.profile.level, clock.now());
              if (
                next === current.energy ||
                (next.value === current.energy.value && next.lastTickAt === current.energy.lastTickAt)
              )
                return;
              const delta = next.value - current.energy.value;
              set((state) => {
                if (state.save) state.save.energy = next;
              });
              if (delta !== 0) events.emit({ type: 'energy.changed', delta, total: next.value });
            },

            addEnergy(amount, reason) {
              const current = get().save;
              if (!current || amount <= 0) return;
              const next = addEnergy(current.energy, amount, current.profile.level, clock.now());
              withSave((save) => {
                save.energy = next;
              });
              events.emit({
                type: 'energy.changed',
                delta: next.value - current.energy.value,
                total: next.value,
              });
              events.emit({
                type: 'currency.changed',
                changes: [{ currency: 'energy', delta: amount, total: next.value }],
                reason,
              });
            },

            spendEnergy(amount) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              const result = spendEnergy(current.energy, amount, current.profile.level, clock.now());
              if (!result.ok) return result;
              withSave((save) => {
                save.energy = result.value;
              });
              events.emit({ type: 'energy.changed', delta: -amount, total: result.value.value });
              return ok(undefined);
            },

            claimProvision(id, amount) {
              const current = get().save;
              if (!current || current.provisionsClaimed.includes(id)) return false;
              withSave((save) => {
                save.provisionsClaimed.push(id);
              });
              get().actions.addEnergy(amount, `provision:${id}`);
              return true;
            },

            updateSettings(patch) {
              withSave((save) => {
                Object.assign(save.settings, patch);
              });
              events.emit({ type: 'settings.changed' });
            },

            touchStat(key, delta = 1) {
              withSave((save) => {
                save.stats[key] = (save.stats[key] ?? 0) + delta;
              });
            },

            push(route) {
              set((state) => {
                state.ui.stack.push(route);
                state.ui.dialog = null;
              });
            },
            replace(route) {
              set((state) => {
                state.ui.stack[Math.max(0, state.ui.stack.length - 1)] = route;
                state.ui.dialog = null;
              });
            },
            pop() {
              set((state) => {
                if (state.ui.stack.length > 1) state.ui.stack.pop();
                state.ui.dialog = null;
              });
            },
            resetStack(route) {
              set((state) => {
                state.ui.stack = [route];
                state.ui.dialog = null;
              });
            },
            openDialog(dialog) {
              set((state) => {
                state.ui.dialog = dialog;
              });
            },
            closeDialog() {
              set((state) => {
                state.ui.dialog = null;
              });
            },
            toast(kind, textKey, params, rewards) {
              const id = ++toastSeq;
              set((state) => {
                const toast: Toast = { id, kind, textKey, createdAt: clock.now() };
                if (params) toast.params = params;
                if (rewards) toast.rewards = rewards;
                state.ui.toasts.push(toast);
                if (state.ui.toasts.length > 5) state.ui.toasts.shift();
              });
            },
            dismissToast(id) {
              set((state) => {
                state.ui.toasts = state.ui.toasts.filter((t) => t.id !== id);
              });
            },
            setUpdateAvailable(value) {
              set((state) => {
                state.ui.updateAvailable = value;
              });
            },
            setOfflineReady(value) {
              set((state) => {
                state.ui.offlineReady = value;
              });
            },
            setFullscreen(value) {
              set((state) => {
                state.ui.fullscreen = value;
              });
            },
            setFullscreenOffer(patch) {
              set((state) => {
                if (patch.offered !== undefined) state.ui.fullscreenOffered = patch.offered;
                if (patch.declined !== undefined) state.ui.fullscreenDeclined = patch.declined;
              });
            },

            chooseStarter(defId) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              const seeded = seedStartingRoster(
                { roster: current.roster, counters: current.counters },
                content,
                defId,
                clock.now(),
              );
              if (!seeded.ok) return seeded;
              withSave((save) => {
                save.roster = seeded.value.state.roster;
                save.counters = seeded.value.state.counters;
                save.profile.avatarChampionId = defId;
              });
              set((state) => {
                state.ui.stack = [{ name: 'hub' }];
                state.ui.dialog = null;
                state.ui.roster.selected = seeded.value.starterInstanceId;
              });
              for (const instance of Object.values(seeded.value.state.roster))
                events.emit({
                  type: 'champion.added',
                  defId: instance.defId,
                  instanceId: instance.instanceId,
                  source: 'starter',
                });
              events.emit({ type: 'starter.chosen', defId, instanceId: seeded.value.starterInstanceId });
              return ok(seeded.value.starterInstanceId);
            },

            grantChampion(defId, source, reason) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              // The first champion of every chronicle is the bound starter (TUTORIAL.md 1.2); a
              // grant before that would leave the starter choice unfulfillable.
              if (Object.keys(current.roster).length === 0)
                return fail('invalid_argument', 'Bind a starter before granting champions');
              const added = addChampion(
                { roster: current.roster, counters: current.counters },
                content,
                defId,
                source,
                clock.now(),
              );
              if (!added.ok) return added;
              withSave((save) => {
                save.roster = added.value.state.roster;
                save.counters = added.value.state.counters;
              });
              events.emit({
                type: 'champion.added',
                defId,
                instanceId: added.value.instance.instanceId,
                source: reason,
              });
              return ok(added.value.instance.instanceId);
            },

            setChampionLocked(instanceId, locked) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              const next = setLocked(
                { roster: current.roster, counters: current.counters },
                instanceId,
                locked,
              );
              if (!next.ok) return next;
              withSave((save) => {
                save.roster = next.value.roster;
              });
              events.emit({ type: 'champion.updated', instanceId, change: 'locked' });
              return ok(undefined);
            },

            setChampionFavourite(instanceId, favourite) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              const next = setFavourite(
                { roster: current.roster, counters: current.counters },
                instanceId,
                favourite,
              );
              if (!next.ok) return next;
              withSave((save) => {
                save.roster = next.value.roster;
              });
              events.emit({ type: 'champion.updated', instanceId, change: 'favourite' });
              return ok(undefined);
            },

            setAvatar(defId) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              if (defId !== null && !Object.values(current.roster).some((i) => i.defId === defId))
                return fail('invalid_argument', 'Avatar must be an owned champion');
              withSave((save) => {
                save.profile.avatarChampionId = defId;
              });
              events.emit({ type: 'profile.avatarChanged', defId });
              return ok(undefined);
            },

            generateDebugRoster(count, seed) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              const generated = generateRoster(
                { roster: current.roster, counters: current.counters },
                content,
                CHAMPION_IDS,
                Math.max(0, Math.min(1000, Math.floor(count))),
                createRng(seed),
                clock.now(),
              );
              if (!generated.ok) return generated;
              withSave((save) => {
                save.roster = generated.value.roster;
                save.counters = generated.value.counters;
              });
              return ok(undefined);
            },

            setRosterView(patch) {
              set((state) => {
                Object.assign(state.ui.roster.view, patch);
              });
            },
            selectChampion(instanceId) {
              set((state) => {
                state.ui.roster.selected = instanceId;
              });
            },

            saveTeamPreset(mode, index, instanceIds, partySize) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              if (index < 0 || index > 2) return fail('invalid_argument', 'Presets are numbered 0–2');
              if (instanceIds.length) {
                const valid = validateTeam(current.roster, instanceIds, partySize);
                if (!valid.ok) return valid;
              }
              withSave((save) => {
                save.teams[mode].presets[index] = [...instanceIds];
              });
              return ok(undefined);
            },
            setLastUsedTeam(mode, instanceIds) {
              withSave((save) => {
                save.teams[mode].lastUsed = sanitizeTeam(save.roster, instanceIds, 4);
              });
            },
            selectStage(pointer) {
              if (!get().save) return fail('invalid_argument', 'No chronicle loaded');
              if (!stageRefOf(pointer))
                return fail('invalid_argument', `No stage ${pointer.settlement}.${pointer.stage}`);
              withSave((save) => {
                save.campaign.selected = pointer;
              });
              return ok(undefined);
            },

            setAutoRepeat(runs) {
              withSave((save) => {
                save.campaign.autoRepeat = Math.max(1, Math.min(50, Math.round(runs)));
              });
            },

            startCampaignRun(pointer) {
              const current = get().save;
              if (!current) return fail('invalid_argument', 'No chronicle loaded');
              let result: Result<RunStarted> = fail('invalid_argument', 'No chronicle loaded');
              const now = clock.now();
              set((state) => {
                if (!state.save) return;
                result = applyRunStart(state.save, pointer, now);
                if (result.ok) state.save.updatedAt = now;
              });
              if (result.ok)
                events.emit({
                  type: 'energy.changed',
                  delta: -result.value.cost,
                  total: get().save?.energy.value ?? 0,
                });
              return result;
            },

            finishCampaignRun(input) {
              if (!get().save) return fail('invalid_argument', 'No chronicle loaded');
              let result: Result<RunSummary> = fail('invalid_argument', 'No chronicle loaded');
              set((state) => {
                if (!state.save) return;
                result = applyRunFinish(state.save, input);
                if (result.ok) state.save.updatedAt = input.now;
              });
              if (!result.ok) return result;
              const summary = result.value;
              if (summary.changes.length)
                events.emit({ type: 'currency.changed', changes: summary.changes, reason: 'campaign' });
              // Finishing a difficulty opens the next one and, with it, a faster battle speed.
              if (summary.completedDifficulty && input.pointer.difficulty !== 'hard') {
                const next = input.pointer.difficulty === 'intro' ? 'normal' : 'hard';
                const toast = get().actions.toast;
                toast('reward', 'campaign.difficultyOpen', { difficulty: t(`campaign.difficulty.${next}`) });
                const save = get().save;
                if (save)
                  toast('reward', 'campaign.speedUnlocked', {
                    speed: maxBattleSpeed(progressOf(save)),
                  });
              }
              events.emit({
                type: 'campaign.runFinished',
                stageId: `stage.${String(input.pointer.settlement).padStart(2, '0')}.${String(
                  input.pointer.stage,
                ).padStart(2, '0')}`,
                difficulty: input.pointer.difficulty,
                stars: summary.stars,
                firstClear: summary.firstClear,
              });
              return result;
            },

            debugSetPlayerLevel(level) {
              withSave((save) => {
                save.profile.level = Math.max(1, Math.min(PLAYER_MAX_LEVEL, Math.round(level)));
                save.profile.xp = 0;
              });
            },

            debugClearCampaign(difficulty, stars = 3) {
              withSave((save) => {
                for (const stage of content.stages) {
                  save.campaign.stars[`${stage.id}|${difficulty}`] = Math.max(1, Math.min(3, stars));
                  save.campaign.bestTurns[`${stage.id}|${difficulty}`] = 10;
                }
              });
            },

            recordBattle(outcome, encounterId) {
              withSave((save) => {
                const bump = (key: string, by = 1): void => {
                  save.stats[key] = (save.stats[key] ?? 0) + by;
                };
                bump('battles.fought');
                bump(`battles.${outcome.kind}`);
                bump('battles.allyTurns', outcome.allyTurns);
                bump(`battles.fought.${encounterId}`);
                if (outcome.kind === 'victory') bump(`battles.won.${encounterId}`);
              });
              events.emit({ type: 'battle.ended', outcome: outcome.kind, encounterId });
            },
          },
        };
      }),
    ),
  );

  return { store, events };
}

/** Application singleton. Tests create their own stores with a FixedClock. */
const singleton = createGameStore({ clock: systemClock });
export const useGameStore: GameStoreApi = singleton.store;
export const gameEvents: EventBus = singleton.events;
export const gameActions = (): GameActions => useGameStore.getState().actions;
