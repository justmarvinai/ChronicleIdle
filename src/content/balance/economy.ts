import type { CurrencyAmount } from '@content/currencies/types';

/** Local hour at which the game day rolls over (owner's answer Q3: 00:00 local). */
export const DAILY_RESET_HOUR = 0;
/** Weekday (0 = Sunday … 6 = Saturday) on which the game week starts (Q3: Monday). */
export const WEEKLY_RESET_WEEKDAY = 1;

/** What a brand-new chronicle owns before the tutorial hands anything out. Energy is set to the cap separately. */
export const STARTING_WALLET: readonly CurrencyAmount[] = [{ currency: 'gold', amount: 2_500 }];

/** Gold granted for renaming is zero; listed here so the rule is visible: renames are free. */
export const RENAME_COST: readonly CurrencyAmount[] = [];

/** Maximum length of the chronicle (player) name. */
export const PLAYER_NAME_MAX_LENGTH = 18;
export const PLAYER_NAME_MIN_LENGTH = 2;
