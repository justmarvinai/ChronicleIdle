import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyDef, CurrencyId } from '@content/currencies/types';
import { energyCap, msUntilNextEnergy } from '@engine/economy/energy';
import type { FeatureId } from '@content/balance/unlocks';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import type { GameStore } from './store';

import type { Roster } from '@engine/champions/instance';
import type { Route } from './ui-types';

export const selectSave = (s: GameStore) => s.save;
const EMPTY_ROSTER: Roster = {};
export const selectRoster = (s: GameStore): Roster => s.save?.roster ?? EMPTY_ROSTER;
export const selectRosterView = (s: GameStore) => s.ui.roster.view;
export const selectSelectedChampion = (s: GameStore) => s.ui.roster.selected;
export const selectAvatarChampionId = (s: GameStore) => s.save?.profile.avatarChampionId ?? null;
/** Where a loaded chronicle enters the game: Emberhold, or the starter choice while the roster is empty. */
export const entryRoute = (s: GameStore): Route =>
  s.save && Object.keys(s.save.roster).length === 0 ? { name: 'starter' } : { name: 'hub' };
export const selectProfile = (s: GameStore) => s.save?.profile ?? null;
export const selectSettings = (s: GameStore) => s.save?.settings ?? null;
export const selectWallet = (s: GameStore) => s.save?.wallet ?? null;
const TITLE_ROUTE = { name: 'title' } as const;
// Selectors must return stable references: a fresh object per call makes useSyncExternalStore loop.
export const selectRoute = (s: GameStore) => s.ui.stack[s.ui.stack.length - 1] ?? TITLE_ROUTE;
export const selectPlayerLevel = (s: GameStore): number => s.save?.profile.level ?? 0;
export const selectDialog = (s: GameStore) => s.ui.dialog;
export const selectToasts = (s: GameStore) => s.ui.toasts;
export const selectActions = (s: GameStore) => s.actions;
export const selectBoot = (s: GameStore) => s.boot;

export const selectCurrencyAmount =
  (id: CurrencyId) =>
  (s: GameStore): number =>
    s.save?.wallet[id] ?? 0;

export const TOP_BAR_CURRENCIES: readonly CurrencyDef[] = Object.values(CURRENCY_BY_ID).filter(
  (c) => c.topBar,
);

export interface EnergyView {
  value: number;
  cap: number;
  overCap: boolean;
  msUntilNext: number | null;
}

export function energyView(s: GameStore, now: number): EnergyView | null {
  if (!s.save) return null;
  const cap = energyCap(s.save.profile.level);
  return {
    value: s.save.energy.value,
    cap,
    overCap: s.save.energy.value > cap,
    msUntilNext: msUntilNextEnergy(s.save.energy, s.save.profile.level, now),
  };
}

/** Level gate only; the required level itself is static content (`unlockLevel(feature)`). */
export const selectFeatureUnlocked =
  (feature: FeatureId) =>
  (s: GameStore): boolean =>
    isFeatureUnlocked(feature, s.save?.profile.level ?? 0);
