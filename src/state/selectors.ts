import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyDef, CurrencyId } from '@content/currencies/types';
import { maxBattleSpeed } from '@engine/campaign/progress';
import { energyCap, msUntilNextEnergy } from '@engine/economy/energy';
import type { FeatureId } from '@content/balance/unlocks';
import { isFeatureUnlocked } from '@engine/progression/unlocks';
import { currentPointer, progressOf } from './campaign';
import { titlesOf, type LevelUpResult } from './progression';
import type { GameStore } from './store';

import type { StagePointer } from '@engine/campaign/progress';
import type { Roster } from '@engine/champions/instance';
import type { CampaignSave } from '@engine/schema/save';
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

// ---------------------------------------------------------------------------------------------
// Campaign
// ---------------------------------------------------------------------------------------------

export const selectCampaign = (s: GameStore): CampaignSave | null => s.save?.campaign ?? null;
export const selectAutoRepeat = (s: GameStore): number => s.save?.campaign.autoRepeat ?? 1;

/**
 * Battle speeds a chronicle may use: ×3 and ×4 are earned by finishing Normal and Hard
 * (GAME_DESIGN.md §6), so the setting is clamped to this rather than to the content list.
 */
export const selectMaxBattleSpeed = (s: GameStore): 1 | 2 | 3 | 4 =>
  s.save ? maxBattleSpeed(progressOf(s.save)) : 2;

/**
 * Where the campaign screens open. Returns a fresh object, so components must memoise it on the
 * campaign slice rather than subscribe to it directly.
 */
export function campaignPointer(s: GameStore): StagePointer | null {
  return s.save ? currentPointer(s.save) : null;
}

// ---------------------------------------------------------------------------------------------
// Chronicle level and titles (docs/design/ECONOMY.md §4)
// ---------------------------------------------------------------------------------------------

/** The level-up waiting to be celebrated, or null when there is nothing to show. */
export const selectLevelUp = (s: GameStore): LevelUpResult | null => s.ui.levelUp;

/** The title the chronicle wears, or null. Earned titles are derived — see `earnedTitleIds`. */
export const selectWornTitle = (s: GameStore): string | null => s.save?.profile.title ?? null;

/**
 * Ids of every title the chronicle has earned. Returns a fresh array, so components must not
 * subscribe to it directly — read it from the save inside a memo.
 */
export function earnedTitleIds(s: GameStore): string[] {
  return s.save ? titlesOf(s.save) : [];
}

/** The Tavern's table: the champion being upgraded and what is on it (`ECONOMY.md` §3). */
export const selectTavern = (s: GameStore) => s.ui.tavern;
