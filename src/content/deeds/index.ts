/** The Hall of Deeds' content, indexed (docs/design/ACHIEVEMENTS.md). */
import { ACHIEVEMENTS } from './achievements';
import { CHALLENGES } from './challenges';
import { PORTRAIT_FRAMES } from './frames';
import { HALL_RANKS } from './ranks';
import type { AchievementDef, ChallengeDef, PortraitFrameDef } from './types';

export { ACHIEVEMENTS, CHALLENGES, HALL_RANKS, PORTRAIT_FRAMES };
export { DEFAULT_FRAME } from './frames';

const byId = <T extends { id: string }>(list: readonly T[]): Readonly<Record<string, T>> =>
  Object.fromEntries(list.map((entry) => [entry.id, entry]));

export const ACHIEVEMENT_BY_ID: Readonly<Record<string, AchievementDef>> = byId(ACHIEVEMENTS);
export const CHALLENGE_BY_ID: Readonly<Record<string, ChallengeDef>> = byId(CHALLENGES);
export const FRAME_BY_ID: Readonly<Record<string, PortraitFrameDef>> = byId(PORTRAIT_FRAMES);
