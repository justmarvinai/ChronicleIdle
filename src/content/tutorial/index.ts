/**
 * The tutorial script: six chapters, taught in order (docs/design/TUTORIAL.md).
 *
 * Files are named for their chapter, not their number, because the number is a *position* — this
 * array is where the order lives, and moving a chapter should not rename a file. The Path sits
 * second: the missions open at level 1 and are what guides the player from the first stand on.
 */
import awakening from './awakening';
import the_path from './the_path';
import the_hold from './the_hold';
import the_binding from './the_binding';
import routine from './routine';
import steel_and_bone from './steel_and_bone';
import type { TutorialChapterDef, TutorialStepDef } from './types';

export const TUTORIAL_CHAPTERS: readonly TutorialChapterDef[] = [
  awakening,
  the_path,
  the_hold,
  the_binding,
  routine,
  steel_and_bone,
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
