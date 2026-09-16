/**
 * Tutorial tunables (docs/design/TUTORIAL.md). The script itself is content
 * (`src/content/tutorial/*`); what lives here are the numbers around it — the scripted moments and
 * the pace Eldric speaks at.
 */
import type { Rarity } from '@content/champions/types';

/** The six chapters of the script (`TUTORIAL.md` §1–§6). */
export const TUTORIAL_CHAPTER_COUNT = 6;

/**
 * The seed the first stand is fought on (`TUTORIAL.md` §Data shape). The opening fight is the one
 * lesson that must always contain the same moments — a first turn to spend, a second wave to spend
 * a cooldown in — so it is not rolled from the chronicle's own seed.
 */
export const TUTORIAL_BATTLE_SEED = 'tutorial:first_stand';

/**
 * What the Ancient Shard Eldric kept back always turns up (`TUTORIAL.md` 3.2). The reveal teaches
 * the colour of a rarity, so the colour cannot be left to the dice.
 */
export const TUTORIAL_SUMMON_RARITY: Rarity = 'epic';

/** Milliseconds per character of Eldric's typewriter; a click reveals the rest at once. */
export const TUTORIAL_TYPE_MS = 16;

/**
 * How long after a line finishes before Continue can be pressed. Long enough that a player
 * clicking through a previous step cannot skip the next line by accident, short enough not to be
 * felt.
 */
export const TUTORIAL_CONTINUE_DELAY_MS = 220;

/** How long the pointer takes for one pulse over the spotlight. */
export const TUTORIAL_PULSE_MS = 1_400;

/** Padding (px, stage space) between the spotlight cut-out and the element it frames. */
export const TUTORIAL_SPOTLIGHT_PAD = 14;
