/**
 * The Brewery (docs/design/BREWERY.md): four halls — one per element — where the brews that level
 * champions are farmed.
 *
 * Five stages per hall, and a stage is authored nowhere: everything it fields, pays and demands is
 * derived from its number and the numbers here, the way a tower floor is (`balance/tower.ts`). One
 * multiplier decides how hard a stage is, which is what makes the five tiers below a ladder a
 * tuning pass can actually fit.
 *
 * The whole mode is gated by one thing: twenty runs a day across **all four halls**, so a day in
 * the Brewery is a choice about which element needs brews most (the owner's brief).
 */
import type { Element } from '@content/champions/types';

/** Stages in every hall. Stage 1 is day one; stage 5 is the endgame. */
export const BREWERY_STAGES = 5;

/** Runs a day, across every hall together — the only thing the Brewery costs. */
export const BREWERY_DAILY_RUNS = 20;

/**
 * Enemy scaling per stage, in the same `archetypeBase ×` units the campaign and the tower use: a
 * brewery encounter is pitched at Intro's flat multiplier and stage index 0, so this is the only
 * curve acting on a brewery guard.
 *
 * Fitted to `pnpm sim:balance --brewery --scan`, which measures the scale each reference team wins
 * 85 % of its runs at, in the hall where that stage is hardest. Stage by stage, the team it is
 * pitched at, and that team's measured line:
 *
 * | Stage | Scale | Tier | Pitched at | Its 85 % line |
 * | --- | --- | --- | --- | --- |
 * | 1 | 1 | starting fresh | the roster a new chronicle is given, on day one | 3.2 |
 * | 2 | 2.8 | early game | that roster at its star caps | 2.6 |
 * | 3 | 6 | mid game | a mid-Epic roster, ungeared | 7.6 |
 * | 4 | 15 | late game | a 5★ Epic roster, half-geared | 15.6 |
 * | 5 | 34 | endgame | a finished 6★ roster | 36.0 |
 *
 * Stage 1 sits far under its tier's line on purpose: day one must not be a coin flip. The others
 * sit just under theirs, which is what makes a stage a farm for the tier it is pitched at and a
 * wall for the tier below — every one of them is out of reach for the tier below at under 10 %.
 *
 * The four halls measure within ~10 % of each other at stages 1–4; only stage 5 spreads (its
 * captains are four authored kits, and the Ashen Legion's is the softest), so the bands ask stage
 * 5 to be winnable in the *hardest* hall and unwinnable by a late-game roster in the *easiest*.
 */
export const BREWERY_STAGE_SCALE: readonly number[] = [1, 2.8, 6, 15, 34];

/**
 * Brews a stage pays: its own number (the owner's rule — stage 1 pays 1, stage 5 pays 5). A table
 * rather than the identity function, because it is the reward curve and a reward curve is data.
 */
export const BREWERY_STAGE_BREWS: readonly number[] = [1, 2, 3, 4, 5];

/**
 * Guards in a stage's single wave. One wave, never a gauntlet: twenty runs a day have to fit in an
 * evening. Stage 5 is the hall's captain plus three of its own, which is why it fields fewer.
 */
export const BREWERY_STAGE_GUARDS: readonly number[] = [2, 3, 4, 4, 3];

/** Which stage the hall's named captain leads. */
export const BREWERY_BOSS_STAGE = 5;

/** Plate level per stage: display only, like the campaign's (owner's answer Q29). */
export const BREWERY_STAGE_LEVEL: readonly number[] = [8, 20, 34, 48, 60];

/** Ally turns before a run is lost; the captain's stage is allowed the campaign's boss limit. */
export const BREWERY_TURN_LIMIT = 40;
export const BREWERY_TURN_LIMIT_BOSS = 50;

/**
 * Days a hall unbars its doors, `0` = Sunday … `6` = Saturday, in the player's own week (the day
 * is taken from the same local reset the daily quests use).
 *
 * Three halls brew every day. The Eclipse hall keeps the old calendar and opens on Wednesday, and
 * again for the weekend (the owner's brief) — so an Eclipse week is three days long, and a player
 * who wants Eclipse brews has to be there for them.
 */
export const BREWERY_OPEN_DAYS: Readonly<Record<Element, readonly number[]>> = {
  justice: [0, 1, 2, 3, 4, 5, 6],
  valor: [0, 1, 2, 3, 4, 5, 6],
  faith: [0, 1, 2, 3, 4, 5, 6],
  eclipse: [3, 6, 0],
};
