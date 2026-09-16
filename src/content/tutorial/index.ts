/**
 * The tutorial script: six chapters, taught in order (docs/design/TUTORIAL.md).
 */
import chapter_1 from './chapter_1';
import chapter_2 from './chapter_2';
import chapter_3 from './chapter_3';
import chapter_4 from './chapter_4';
import chapter_5 from './chapter_5';
import chapter_6 from './chapter_6';
import type { TutorialChapterDef, TutorialStepDef } from './types';

export const TUTORIAL_CHAPTERS: readonly TutorialChapterDef[] = [
  chapter_1,
  chapter_2,
  chapter_3,
  chapter_4,
  chapter_5,
  chapter_6,
];

/** Every step, in script order — for the validator, the i18n check and the overlay's counter. */
export const TUTORIAL_STEPS: readonly TutorialStepDef[] = TUTORIAL_CHAPTERS.flatMap(
  (chapter) => chapter.steps,
);

export const TUTORIAL_STEP_BY_ID: Readonly<Record<string, TutorialStepDef>> = Object.fromEntries(
  TUTORIAL_STEPS.map((step) => [step.id, step]),
);

export const TUTORIAL_CHAPTER_BY_ID: Readonly<Record<string, TutorialChapterDef>> = Object.fromEntries(
  TUTORIAL_CHAPTERS.map((chapter) => [chapter.id, chapter]),
);
