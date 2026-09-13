import type { FeatureId } from '@content/balance/unlocks';
import type { CurrencyAmount } from '@content/currencies/types';
import type { I18nKey, I18nParams } from '@i18n/index';
import type { DecodedChronicle } from './chronicle-file';

/** Screens (docs/tech/ARCHITECTURE.md §6): an in-memory stack; the URL is not used. */
export type ChampionTab = 'info' | 'abilities' | 'lore' | 'gear';

export type Route =
  | { name: 'title' }
  | { name: 'starter' }
  | { name: 'hub' }
  | { name: 'champions'; instanceId?: string; tab?: ChampionTab }
  | { name: 'game-modes' }
  /** The world map; `settlement` is the settlement screen with its ten stands. */
  | { name: 'campaign' }
  | { name: 'settlement'; settlement: number }
  | { name: 'battle-setup'; encounterId: string }
  /** `bench`: started by the perf screen; the result returns there instead of the result screen. */
  | { name: 'battle'; bench?: boolean }
  | { name: 'battle-result' }
  | { name: 'locked'; feature: FeatureId | 'later-phase'; titleKey: I18nKey }
  | { name: 'devkit' }
  | { name: 'perf' };

export type RouteName = Route['name'];

export type DialogRoute =
  | { name: 'settings' }
  | { name: 'profile' }
  | { name: 'wallet' }
  | { name: 'new-game' }
  | { name: 'new-game-confirm' }
  | { name: 'import-confirm'; decoded: DecodedChronicle; fileName: string }
  | { name: 'credits' }
  | { name: 'reset-confirm' }
  | { name: 'welcome-back' }
  | { name: 'avatar-picker' }
  | { name: 'battle-pause' }
  | { name: 'debug' };

export type ToastKind = 'info' | 'reward' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  textKey: I18nKey;
  params?: I18nParams;
  rewards?: CurrencyAmount[];
  createdAt: number;
}
