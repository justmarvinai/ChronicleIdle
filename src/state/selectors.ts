import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyDef, CurrencyId } from '@content/currencies/types';
import { energyCap, msUntilNextEnergy } from '@engine/economy/energy';
import type { FeatureId } from '@content/balance/unlocks';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import type { GameStore } from './store';

export const selectSave = (s: GameStore) => s.save;
export const selectProfile = (s: GameStore) => s.save?.profile ?? null;
export const selectSettings = (s: GameStore) => s.save?.settings ?? null;
export const selectWallet = (s: GameStore) => s.save?.wallet ?? null;
export const selectRoute = (s: GameStore) => s.ui.stack[s.ui.stack.length - 1] ?? { name: 'title' as const };
export const selectDialog = (s: GameStore) => s.ui.dialog;
export const selectToasts = (s: GameStore) => s.ui.toasts;
export const selectActions = (s: GameStore) => s.actions;
export const selectBoot = (s: GameStore) => s.boot;

export const selectCurrencyAmount =
  (id: CurrencyId) =>
  (s: GameStore): number =>
    s.save?.wallet[id] ?? 0;

export const TOP_BAR_CURRENCIES: readonly CurrencyDef[] = Object.values(CURRENCY_BY_ID).filter((c) => c.topBar);

export interface EnergyView {
  value: number;
  cap: number;
  overCap: boolean;
  msUntilNext: number | null;
}

export function energyView(s: GameStore, now: number): EnergyView | null {
  if (!s.save) return null;
  const cap = energyCap(s.save.profile.level);
  return { value: s.save.energy.value, cap, overCap: s.save.energy.value > cap, msUntilNext: msUntilNextEnergy(s.save.energy, s.save.profile.level, now) };
}

export interface FeatureView {
  unlocked: boolean;
  level: number;
}

export const selectFeature =
  (feature: FeatureId) =>
  (s: GameStore): FeatureView => ({ unlocked: isFeatureUnlocked(feature, s.save?.profile.level ?? 0), level: unlockLevel(feature) });
