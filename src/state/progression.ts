/**
 * Chronicle levels as they touch the save (docs/design/ECONOMY.md §4).
 *
 * Every XP source in the game funnels through `applyPlayerXp`: it fills the bar, levels while it
 * can, pays each level it crossed, tops the energy up by the new cap and reports what happened so
 * the celebration has something to show.
 */
import type { FeatureId } from '@content/balance/unlocks';
import { content } from '@content/registry';
import { levelUpRewards, mergeLevelRewards, type LevelReward } from '@engine/progression/level-rewards';
import { addPlayerXp } from '@engine/progression/player-level';
import { earnedTitles } from '@engine/progression/titles';
import { addEnergy } from '@engine/economy/energy';
import { grant, type CurrencyChange } from '@engine/economy/wallet';
import type { SaveGame } from '@engine/schema/save';
import { progressOf } from './campaign';

export interface LevelUpResult {
  /** Levels crossed, in order, with what each paid. Empty when the XP did not fill the bar. */
  levels: LevelReward[];
  /** Features these levels opened (`GAME_DESIGN.md` §6). */
  unlocks: FeatureId[];
  /** Wallet and energy deltas, for the toast and the dialog. */
  changes: CurrencyChange[];
  /** Ids of titles the chronicle did not have before (ECONOMY.md §4). */
  titlesEarned: string[];
}

export const NO_LEVEL_UP: LevelUpResult = { levels: [], unlocks: [], changes: [], titlesEarned: [] };

/** Titles the save has earned right now — derived, so it can never disagree with the play. */
export function titlesOf(save: SaveGame): string[] {
  return earnedTitles(content.titles, {
    level: save.profile.level,
    progress: progressOf(save),
    championsOwned: Object.keys(save.roster).length,
    hallRanks: save.deeds.ranks,
    challenges: save.deeds.challenges,
  }).map((title) => title.id);
}

/** True when the chronicle has earned the title and may wear it (ECONOMY.md §4). */
export function canWearTitle(save: SaveGame, titleId: string): boolean {
  return titlesOf(save).includes(titleId);
}

/**
 * Two celebrations become one: an auto-repeat batch can cross several levels before the player
 * sees a screen, and one dialog should show the lot.
 */
export function mergeLevelUps(a: LevelUpResult, b: LevelUpResult): LevelUpResult {
  if (a.levels.length === 0 && a.titlesEarned.length === 0) return b;
  if (b.levels.length === 0 && b.titlesEarned.length === 0) return a;
  const changes: CurrencyChange[] = a.changes.map((change) => ({ ...change }));
  for (const change of b.changes) {
    const existing = changes.find((c) => c.currency === change.currency);
    // The newest total wins; the deltas add up to what the batch as a whole paid.
    if (existing) {
      existing.delta += change.delta;
      existing.total = change.total;
    } else changes.push({ ...change });
  }
  return {
    levels: [...a.levels, ...b.levels],
    unlocks: [...a.unlocks, ...b.unlocks.filter((id) => !a.unlocks.includes(id))],
    changes,
    titlesEarned: [...a.titlesEarned, ...b.titlesEarned.filter((id) => !a.titlesEarned.includes(id))],
  };
}

/**
 * Adds player XP to the save and pays for every level it crosses. Mutates the draft; returns what
 * to celebrate.
 */
export function applyPlayerXp(save: SaveGame, amount: number, now: number): LevelUpResult {
  const before = save.profile.level;
  const titlesBefore = new Set(titlesOf(save));
  const gain = addPlayerXp(save.profile, amount);
  save.profile.level = gain.level;
  save.profile.xp = gain.xp;
  if (gain.levelsGained === 0) {
    const titlesEarned = titlesOf(save).filter((id) => !titlesBefore.has(id));
    return titlesEarned.length ? { ...NO_LEVEL_UP, titlesEarned } : NO_LEVEL_UP;
  }

  const levels = levelUpRewards(before, gain.level);
  const merged = mergeLevelRewards(levels);
  const granted = grant(save.wallet, merged.currencies);
  save.wallet = granted.wallet;
  const changes: CurrencyChange[] = [...granted.changes];
  if (merged.energy > 0) {
    // The refill lands on top of whatever is in the wallet and may overflow the cap (Q15).
    save.energy = addEnergy(save.energy, merged.energy, save.profile.level, now);
    changes.push({ currency: 'energy', delta: merged.energy, total: save.energy.value });
  }
  return {
    levels,
    unlocks: merged.unlocks,
    changes,
    titlesEarned: titlesOf(save).filter((id) => !titlesBefore.has(id)),
  };
}
