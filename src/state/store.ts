/**
 * The game store (docs/tech/ARCHITECTURE.md §4): one persisted `save` document plus transient
 * boot/ui state. Actions call pure engine reducers and emit domain events.
 */
import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH } from '@content/balance/economy';
import type { CurrencyAmount } from '@content/currencies/types';
import { addEnergy, regenerateEnergy, spendEnergy } from '@engine/economy/energy';
import { grant, spend } from '@engine/economy/wallet';
import { fail, ok, type Result } from '@engine/errors';
import { createNewGame } from '@engine/save/new-game';
import type { SaveGame, Settings } from '@engine/schema/save';
import type { Clock } from '@engine/time/clock';
import { hashString } from '@engine/rng/rng';
import { systemClock } from '@platform/clock';
import { EventBus } from './events';
import type { OfflineReport } from './offline';
import type { DialogRoute, Route, Toast, ToastKind } from './ui-types';
import type { I18nKey, I18nParams } from '@i18n/index';

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
}

export type GameStore = GameState & { actions: GameActions };
export type GameStoreApi = UseBoundStore<Mutate<StoreApi<GameStore>, [['zustand/subscribeWithSelector', never], ['zustand/immer', never]]>>;

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
          boot: { status: 'booting', hasSave: false, storageKind: 'memory', unsupportedSaveVersion: null, corruptSaveText: null, error: null },
          save: null,
          lastOffline: null,
          ui: { stack: [{ name: 'title' }], dialog: null, toasts: [], updateAvailable: false, offlineReady: false, fullscreen: false },

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
              const save = createNewGame(previous ? { name: valid.value, now, seedRoot, settings: previous.settings } : { name: valid.value, now, seedRoot });
              set((state) => {
                state.save = save;
                state.lastOffline = null;
                state.boot.hasSave = true;
                state.ui.stack = [{ name: 'hub' }];
                state.ui.dialog = null;
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
              if (next === current.energy || (next.value === current.energy.value && next.lastTickAt === current.energy.lastTickAt)) return;
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
              events.emit({ type: 'energy.changed', delta: next.value - current.energy.value, total: next.value });
              events.emit({ type: 'currency.changed', changes: [{ currency: 'energy', delta: amount, total: next.value }], reason });
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
