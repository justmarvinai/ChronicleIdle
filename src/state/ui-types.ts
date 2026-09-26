import type { FeatureId } from '@content/balance/unlocks';
import type { Element, GearSlot } from '@content/champions/types';
import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import type { QuestPeriod } from '@content/quests/types';
import type { I18nKey, I18nParams } from '@i18n/index';
import type { DecodedChronicle } from './chronicle-file';

/** Screens (docs/tech/ARCHITECTURE.md §6): an in-memory stack; the URL is not used. */
export type ChampionTab = 'info' | 'abilities' | 'lore' | 'gear';
export type TavernTab = 'level' | 'rank' | 'skills';
export type ForgeTab = 'craft' | 'dismantle' | 'refine';
export type IndexTab = 'champions' | 'bestiary' | 'sets' | 'statuses';

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
  /** The menu of period bosses; `bosses` is one of them, at its own gate. */
  | { name: 'boss-menu' }
  | { name: 'bosses'; boss?: string; tier?: string }
  /** The Chronicler's Ledger; `period` opens on one of its boards (`QUESTS_MISSIONS.md` §2–§3). */
  | { name: 'quests'; period?: QuestPeriod }
  /** The Chronicler's Path; `chapter` opens on one of its ten tabs (`QUESTS_MISSIONS.md` §4). */
  | { name: 'missions'; chapter?: number }
  /** The Eternal Tower; `floor` scrolls the ladder to one (`ETERNAL_TOWER.md` §7). */
  | { name: 'tower'; floor?: number }
  /** The Glorious Palace, the account-wide skill tree (`GLORIOUS_PALACE.md`). */
  | { name: 'palace' }
  /** The Brewery; `hall` opens on one of its four halls (`BREWERY.md`). */
  | { name: 'brewery'; hall?: Element }
  /** The five keeps, as cards (`DUNGEONS.md`). */
  | { name: 'dungeons' }
  /** One keep; `difficulty` opens on a tab and `stage` scrolls its ladder to a rung. */
  | { name: 'dungeon'; dungeon: string; difficulty?: 'normal' | 'hard'; stage?: number }
  /** The Chronicle Index; `tab` opens one of its four catalogues (`UI_DESIGN.md` §5.20). */
  /** The Market's two shelves (MARKET.md). */
  | { name: 'market'; tab?: MarketTab }
  | { name: 'index'; tab?: IndexTab }
  | { name: 'game-modes' }
  /** The world map; `settlement` is the settlement screen with its ten stands. */
  | { name: 'campaign' }
  | { name: 'settlement'; settlement: number }
  | { name: 'battle-setup'; encounterId: string }
  /** `bench`: started by the perf screen; the result returns there instead of the result screen. */
  | { name: 'battle'; bench?: boolean }
  | { name: 'battle-result' }
  /** `reasonKey` overrides the level count for a feature no level opens (the tower). */
  | { name: 'locked'; feature: FeatureId | 'later-phase'; titleKey: I18nKey; reasonKey?: I18nKey }
  | { name: 'devkit' }
  | { name: 'perf' };

/** Which shelf the Market opens on. */
export type MarketTab = 'gold' | 'gems';

export type RouteName = Route['name'];

export type DialogRoute =
  | { name: 'settings' }
  | { name: 'profile' }
  /** Opens on one currency when the press came from its purse in the top bar. */
  | { name: 'wallet'; currency?: CurrencyId }
  | { name: 'new-game' }
  | { name: 'new-game-confirm' }
  | { name: 'import-confirm'; decoded: DecodedChronicle; fileName: string }
  | { name: 'credits' }
  /** The Chronicle of Changes, the same one the title screen keeps open (UI_DESIGN.md §5.21). */
  | { name: 'changelog' }
  /** Last word before the Glorious Palace goes dark and every point comes back. */
  | { name: 'palace-reset' }
  | { name: 'reset-confirm' }
  | { name: 'welcome-back' }
  | { name: 'avatar-picker' }
  /** Names the slot and set of the 6★ Legendary piece the Path's last chest owes. */
  | { name: 'mission-gift' }
  /** What the chronicle is holding, and what using it would do (MARKET.md §5). */
  | { name: 'bag' }
  /** The thirty-day welcome, opened from the hub or by the day itself (LOGIN.md). */
  | { name: 'login' }
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
  /**
   * Which champion a Bag item is used on. Its own dialog rather than the champion picker above:
   * that one picks from a *choice list* the campaign owes, this one from the whole roster.
   */
  | { name: 'bag-target'; item: string }
  /** The Idle Chest at the docks (`ECONOMY.md` §6). */
  | { name: 'idle-chest' }
  /** The Mine under the market square (`MINE.md`): its store, its level and the next one down. */
  | { name: 'mine' }
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
