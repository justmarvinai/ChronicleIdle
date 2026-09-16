import type { FeatureId } from '@content/balance/unlocks';
import type { GearSlot } from '@content/champions/types';
import type { CurrencyAmount } from '@content/currencies/types';
import type { QuestPeriod } from '@content/quests/types';
import type { I18nKey, I18nParams } from '@i18n/index';
import type { DecodedChronicle } from './chronicle-file';

/** Screens (docs/tech/ARCHITECTURE.md §6): an in-memory stack; the URL is not used. */
export type ChampionTab = 'info' | 'abilities' | 'lore' | 'gear';
export type TavernTab = 'level' | 'rank' | 'skills';
export type ForgeTab = 'craft' | 'dismantle' | 'refine';

export type Route =
  | { name: 'title' }
  | { name: 'starter' }
  | { name: 'hub' }
  | { name: 'champions'; instanceId?: string; tab?: ChampionTab }
  /** The Tavern; `tab` deep-links one of its three tracks (`ECONOMY.md` §3). */
  | { name: 'tavern'; instanceId?: string; tab?: TavernTab }
  /** The Armoury; `pieceId` opens with one piece already on the bench. */
  | { name: 'armoury'; pieceId?: string }
  /** The Forge; `tab` deep-links one of its three benches (`GEAR.md` §4, §6). */
  | { name: 'forge'; tab?: ForgeTab; pieceId?: string }
  /** The Summoning Portal; `banner` opens on a banner tab (`SUMMONING.md` §3). */
  | { name: 'portal'; banner?: string }
  /** The boss gate; `boss` opens on one of its tabs and `tier` selects a card (`BOSSES.md` §4). */
  | { name: 'bosses'; boss?: string; tier?: string }
  /** The Chronicler's Ledger; `period` opens on one of its boards (`QUESTS_MISSIONS.md` §2–§3). */
  | { name: 'quests'; period?: QuestPeriod }
  /** The Chronicler's Path; `chapter` opens on one of its ten tabs (`QUESTS_MISSIONS.md` §4). */
  | { name: 'missions'; chapter?: number }
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
  /** Names the slot and set of the 6★ Legendary piece the Path's last chest owes. */
  | { name: 'mission-gift' }
  /** Seats a companion at the Tavern table (the food picker). */
  | { name: 'food-picker'; instanceId: string; mode: 'level' | 'rank'; seats: number }
  /** Last word before champions are eaten: `food` is what leaves the chronicle. */
  | {
      name: 'tavern-confirm';
      kind: 'level' | 'rank';
      instanceId: string;
      food: string[];
      brews: Record<string, number>;
    }
  /** The racks, filtered to one champion's slot: pick a piece, compare it, wear it. */
  | { name: 'gear-picker'; instanceId: string; slot: GearSlot }
  /** The Portal's rates and mercy table for one banner (`SUMMONING.md` §1–§2). */
  | { name: 'summon-rates'; bannerId: string }
  /** The Portal's pull history, newest first. */
  | { name: 'summon-history' }
  /** Takes a champion choice the campaign owes (`CAMPAIGN.md` §7). */
  | { name: 'champion-picker'; choiceId: string }
  /** The Idle Chest at the docks (`ECONOMY.md` §6). */
  | { name: 'idle-chest' }
  /** A boss's mechanics sheet: its kit, what never lands on it, and how to fight it. */
  | { name: 'boss-sheet'; bossId: string }
  | { name: 'level-up' }
  | { name: 'title-picker' }
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
