/**
 * The Chronicler's Path: ten chapters, walked in order (`docs/design/QUESTS_MISSIONS.md` §4).
 */
import chapter_01 from './chapter_01';
import chapter_02 from './chapter_02';
import chapter_03 from './chapter_03';
import chapter_04 from './chapter_04';
import chapter_05 from './chapter_05';
import chapter_06 from './chapter_06';
import chapter_07 from './chapter_07';
import chapter_08 from './chapter_08';
import chapter_09 from './chapter_09';
import chapter_10 from './chapter_10';
import type { MissionChapterDef, MissionDef } from './types';

export const MISSION_CHAPTERS: readonly MissionChapterDef[] = [
  chapter_01,
  chapter_02,
  chapter_03,
  chapter_04,
  chapter_05,
  chapter_06,
  chapter_07,
  chapter_08,
  chapter_09,
  chapter_10,
];

/** Every mission, in Path order — for the validator, the i18n check and the screen's totals. */
export const MISSIONS: readonly MissionDef[] = MISSION_CHAPTERS.flatMap((chapter) => chapter.missions);

export const MISSION_BY_ID: Readonly<Record<string, MissionDef>> = Object.fromEntries(
  MISSIONS.map((mission) => [mission.id, mission]),
);
