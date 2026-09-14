import { DAILY_RESET_HOUR, STARTING_WALLET, WEEKLY_RESET_WEEKDAY } from '@content/balance/economy';
import { energyCap } from '@engine/economy/energy';
import { walletWith } from '@engine/economy/wallet';
import {
  DEFAULT_SETTINGS,
  SAVE_VERSION,
  emptyCampaign,
  emptyTeams,
  type SaveGame,
  type Settings,
} from '@engine/schema/save';
import { dailyKey, weeklyKey } from '@engine/time/clock';

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
    counters: { instances: 0 },
    teams: emptyTeams(),
    campaign: emptyCampaign(),
    settings: { ...DEFAULT_SETTINGS, ...settings },
    stats: {},
    periods: {
      lastDailyKey: dailyKey(now, DAILY_RESET_HOUR),
      lastWeeklyKey: weeklyKey(now, DAILY_RESET_HOUR, WEEKLY_RESET_WEEKDAY),
    },
  };
}
