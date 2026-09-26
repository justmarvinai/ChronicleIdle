/**
 * What the title screen says about the chronicle saved on this device (docs/tech/UI_DESIGN.md §5.1):
 * who it is, how far it has come and when it was last played. Read from the save and the engine,
 * so the card and the game can never disagree; the screen keeps no state of its own.
 */
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import type { Difficulty } from '@content/balance/battle';
import type { ChampionId } from '@content/champions/types';
import { content } from '@content/registry';
import { accountPower } from '@engine/champions/query';
import { isDifficultyComplete, nextStage } from '@engine/campaign/progress';
import { xpToNextLevel } from '@engine/progression/player-level';
import type { SaveGame } from '@engine/schema/save';
import { progressOf } from '@state/campaign';
import { entriesOf } from '@ui/screens/champions/roster-view';

export interface ChronicleCardView {
  name: string;
  level: number;
  /** i18n key of the worn title's name, or null when none is worn. */
  titleName: string | null;
  /** Progress towards the next level, 0–1; 1 at the level cap. */
  xp: number;
  /** Experience into this level and what the next asks, or null at the level cap. */
  xpLine: { now: number; next: number } | null;
  avatarChampionId: ChampionId | null;
  frameId: string | null;
  /** Every champion's power, gear and sets included — the header's Account Power. */
  power: number;
  champions: number;
  /** The next stand to clear, or null once Hard is cleared end to end. */
  campaign: { settlement: number; stage: number; difficulty: Difficulty } | null;
  /** How long ago the chronicle was last played, or null when it is not known. */
  awayMs: number | null;
}

/**
 * The card's view of `save`. `awayMs` is the time the boot measured since the save was last written
 * (the welcome-back figure); without it the card falls back to the save's own stamp and `now`.
 */
export function chronicleCardView(
  save: SaveGame,
  frameId: string | null,
  now: number,
  awayMs: number | null,
): ChronicleCardView {
  const { profile } = save;
  const title = profile.title ? content.titleById(profile.title) : null;
  const toNext = xpToNextLevel(profile.level);
  const maxed = profile.level >= PLAYER_MAX_LEVEL;
  const progress = progressOf(save);
  const next = nextStage(progress);
  return {
    name: profile.name,
    level: profile.level,
    titleName: title ? title.name : null,
    xp: maxed ? 1 : Math.min(1, profile.xp / Math.max(1, toNext)),
    xpLine: maxed ? null : { now: profile.xp, next: toNext },
    avatarChampionId: profile.avatarChampionId,
    frameId,
    power: accountPower(entriesOf(save.roster, save.inventory)),
    champions: Object.keys(save.roster).length,
    campaign: isDifficultyComplete(progress, 'hard') ? null : next,
    awayMs: awayMs ?? (save.updatedAt > 0 ? Math.max(0, now - save.updatedAt) : null),
  };
}

/**
 * "Last played" as a player says it: minutes, hours or days, never seconds — the title screen does
 * not tick, so a figure finer than a minute would stand still and look wrong.
 */
export function awayLabel(ms: number): { key: 'now' | 'minutes' | 'hours' | 'days'; count: number } {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return { key: 'now', count: 0 };
  if (minutes < 60) return { key: 'minutes', count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return { key: 'hours', count: hours };
  return { key: 'days', count: Math.floor(hours / 24) };
}
