import type { FeatureId } from '@content/balance/unlocks';
import type { CurrencyAmount } from '@content/currencies/types';
import type { I18nKey, I18nParams } from '@i18n/index';
import type { DecodedChronicle } from './chronicle-file';

/** Screens (docs/tech/ARCHITECTURE.md §6): an in-memory stack; the URL is not used. */
export type Route =
  | { name: 'title' }
  | { name: 'hub' }
  | { name: 'game-modes' }
  | { name: 'locked'; feature: FeatureId | 'later-phase'; titleKey: I18nKey }
  | { name: 'devkit' };

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
  | { name: 'welcome-back' };

export type ToastKind = 'info' | 'reward' | 'error';

export interface Toast {
  id: number;
  kind: ToastKind;
  textKey: I18nKey;
  params?: I18nParams;
  rewards?: CurrencyAmount[];
  createdAt: number;
}
