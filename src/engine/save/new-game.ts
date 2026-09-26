import { DAILY_RESET_HOUR, STARTING_WALLET, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { energyCap } from '@engine/economy/energy';
import { walletWith } from '@engine/economy/wallet';
import {
  DEFAULT_SETTINGS,
  SAVE_VERSION,
  emptyCampaign,
  emptyLogin,
  emptyMarket,
  emptySummon,
  emptyTeams,
  emptyBrewery,
  emptyDeeds,
  emptyDungeons,
  emptyPalace,
  type SaveGame,
  type Settings,
} from '@engine/schema/save';
import { newMine } from '@engine/mine/index';
import { dailyKey, weeklyKey } from '@engine/time/clock';
import { emptyTower } from '@engine/tower/tower';

export interface NewGameInput {
  name: string;
  now: number;
  seedRoot: string;
  /** Settings chosen before the chronicle existed (title-screen toggles) carry over. */
  settings?: Partial<Settings>;
}

/** A brand-new chronicle: level 1, starting gold, energy at cap, no champions until the starter is chosen. */
export function createNewGame({ name, now, seedRoot, settings }: NewGameInput): SaveGame {
  return {
    saveVersion: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    seedRoot,
    profile: { name: name.trim(), level: 1, xp: 0, avatarChampionId: null, title: null },
    wallet: walletWith(STARTING_WALLET),
    energy: { value: energyCap(1), lastTickAt: now },
    provisionsClaimed: [],
    roster: {},
    inventory: {},
    counters: { instances: 0, gear: 0 },
    teams: emptyTeams(),
    campaign: emptyCampaign(),
    summon: emptySummon(),
    idle: { lastClaimAt: now },
    bosses: {},
    // Nothing held, nothing boosted, nothing shopped, and the calendar waiting on day 1.
    bag: {},
    boosts: {},
    market: emptyMarket(),
    login: emptyLogin(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
    stats: {},
    periods: {
      lastDailyKey: dailyKey(now, DAILY_RESET_HOUR),
      lastWeeklyKey: weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY),
    },
    // Both boards start with this instant and an empty baseline: nothing has been counted yet.
    quests: {
      daily: {
        periodKey: dailyKey(now, DAILY_RESET_HOUR),
        baseline: {},
        claimed: [],
        chests: [],
        dayCounted: false,
      },
      weekly: {
        periodKey: weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY),
        baseline: {},
        claimed: [],
        chests: [],
        dayCounted: false,
      },
    },
    // The Path starts at its first page, with nothing behind it to measure against.
    missions: { claimed: [], baseline: {}, chests: [], gearChoice: null },
    // Nothing taught yet: chapter 1 opens over the new-game dialog itself (TUTORIAL.md 1.1).
    tutorial: { completedSteps: [], skippedChapters: [] },
    // The tower waits on the whole Intro campaign; its season starts on the first floor attempted.
    tower: emptyTower(now),
    palace: emptyPalace(),
    brewery: emptyBrewery(),
    dungeons: emptyDungeons(),
    // The Mine opens at level 6 already dug to its first level, its first store full (MINE.md §1).
    mine: newMine(now),
    deeds: emptyDeeds(),
  };
}
