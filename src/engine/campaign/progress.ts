/**
 * Campaign progress: stars, best turns, and everything the campaign unlocks (CAMPAIGN.md §1, §3).
 *
 * Only what was actually played is stored — stars and best turns per stage and difficulty. Which
 * stage, settlement, difficulty and battle speed are open is *derived* from those (CLAUDE.md
 * §5.5), so a save can never disagree with its own progress.
 */
import type { Difficulty } from '@content/balance/battle';
import {
  BOSS_STAGE_NUMBER,
  SETTLEMENT_COUNT,
  STAGES_PER_SETTLEMENT,
  STARS_PER_SETTLEMENT,
  STAR_CHEST_THRESHOLDS,
} from '@content/balance/campaign';
import type { BattleOutcome } from '@engine/battle/types';

/** `<stageId>|<difficulty>`, e.g. `stage.03.07|normal`. */
export type ProgressKey = string;

export interface CampaignProgress {
  /** Stars 1..3 per cleared stage; a missing entry means never cleared. */
  stars: Record<ProgressKey, number>;
  /** Fewest ally turns a clear took, per stage. */
  bestTurns: Record<ProgressKey, number>;
}

export const DIFFICULTY_ORDER: readonly Difficulty[] = ['intro', 'normal', 'hard'];

export function emptyCampaignProgress(): CampaignProgress {
  return { stars: {}, bestTurns: {} };
}

export function progressKey(stageId: string, difficulty: Difficulty): ProgressKey {
  return `${stageId}|${difficulty}`;
}

/** `stage.<nn>.<nn>` for a settlement and stage number. */
export function stageIdOf(settlement: number, stage: number): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `stage.${pad(settlement)}.${pad(stage)}`;
}

/** The inverse of `stageIdOf`: `stage.03.07` → settlement 3, stage 7. */
export function parseStageId(stageId: string): { settlement: number; stage: number } | null {
  const match = /^stage\.(\d{2})\.(\d{2})$/.exec(stageId);
  if (!match?.[1] || !match[2]) return null;
  return { settlement: Number(match[1]), stage: Number(match[2]) };
}

export function starsOf(progress: CampaignProgress, stageId: string, difficulty: Difficulty): number {
  return progress.stars[progressKey(stageId, difficulty)] ?? 0;
}

export function bestTurnsOf(
  progress: CampaignProgress,
  stageId: string,
  difficulty: Difficulty,
): number | null {
  return progress.bestTurns[progressKey(stageId, difficulty)] ?? null;
}

export function isStageCleared(progress: CampaignProgress, stageId: string, difficulty: Difficulty): boolean {
  return starsOf(progress, stageId, difficulty) > 0;
}

/** Stars earned in one settlement on one difficulty (0..30). */
export function settlementStars(
  progress: CampaignProgress,
  settlement: number,
  difficulty: Difficulty,
): number {
  let total = 0;
  for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1)
    total += starsOf(progress, stageIdOf(settlement, stage), difficulty);
  return total;
}

/** Stages cleared on one difficulty (0..120). */
export function clearedStages(progress: CampaignProgress, difficulty: Difficulty): number {
  let total = 0;
  for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
    for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1)
      if (isStageCleared(progress, stageIdOf(settlement, stage), difficulty)) total += 1;
  return total;
}

/**
 * The highest settlement whose boss stand has fallen on `difficulty`, or 0 when none has. It is
 * what the Idle Chest's farm tier is read from (`ECONOMY.md` §6).
 */
export function highestBossCleared(progress: CampaignProgress, difficulty: Difficulty): number {
  for (let settlement = SETTLEMENT_COUNT; settlement >= 1; settlement -= 1)
    if (isStageCleared(progress, stageIdOf(settlement, BOSS_STAGE_NUMBER), difficulty)) return settlement;
  return 0;
}

export function isDifficultyComplete(progress: CampaignProgress, difficulty: Difficulty): boolean {
  return clearedStages(progress, difficulty) === SETTLEMENT_COUNT * STAGES_PER_SETTLEMENT;
}

/**
 * Stars for a finished run (CAMPAIGN.md §3): one for the clear, a second when nobody went down
 * (a revived champion still counts as down), a third when it took no more than the stage's
 * `turnLimit3Star` ally turns.
 */
export function evaluateStars(outcome: BattleOutcome, turnLimit3Star: number): number {
  if (outcome.kind !== 'victory') return 0;
  const flawless = outcome.units.every((u) => u.side !== 'ally' || !u.died);
  if (!flawless) return 1;
  return outcome.allyTurns <= turnLimit3Star ? 3 : 2;
}

export interface RunRecord {
  progress: CampaignProgress;
  /** The first clear of this stage on this difficulty — the one that pays the first-clear bundle. */
  firstClear: boolean;
  /** Star-chest thresholds crossed by this run, in order (CAMPAIGN.md §7). */
  chestThresholds: number[];
  /** Stars before and after, so the UI can show what the run added. */
  starsBefore: number;
  starsAfter: number;
  /** The clear set the stage's best ally turns (the first clear always does). */
  newRecord: boolean;
  bestTurns: number | null;
  /** This difficulty was completed by this run (it opens the next one). */
  completedDifficulty: boolean;
  /** This run took the difficulty to three stars everywhere — its milestone chest is due. */
  masteredDifficulty: boolean;
}

/**
 * Records a cleared run. Stars and best turns only ever improve, and a star chest is granted the
 * moment a settlement's star total crosses a threshold — which is why neither has to be stored.
 */
export function recordRun(
  progress: CampaignProgress,
  input: { settlement: number; stage: number; difficulty: Difficulty; stars: number; allyTurns: number },
): RunRecord {
  const stageId = stageIdOf(input.settlement, input.stage);
  const key = progressKey(stageId, input.difficulty);
  const starsBefore = progress.stars[key] ?? 0;
  const starsAfter = Math.max(starsBefore, input.stars);
  const before = settlementStars(progress, input.settlement, input.difficulty);
  const previousBest = progress.bestTurns[key];
  const stars = { ...progress.stars };
  const bestTurns = { ...progress.bestTurns };
  if (input.stars > 0) {
    stars[key] = starsAfter;
    bestTurns[key] = previousBest === undefined ? input.allyTurns : Math.min(previousBest, input.allyTurns);
  }
  const next: CampaignProgress = { stars, bestTurns };
  const after = before - starsBefore + starsAfter;
  return {
    progress: next,
    firstClear: starsBefore === 0 && input.stars > 0,
    newRecord: input.stars > 0 && (previousBest === undefined || input.allyTurns < previousBest),
    bestTurns: bestTurns[key] ?? null,
    chestThresholds: STAR_CHEST_THRESHOLDS.filter((t) => before < t && after >= t),
    starsBefore,
    starsAfter,
    completedDifficulty:
      input.stars > 0 &&
      starsBefore === 0 &&
      isDifficultyComplete(next, input.difficulty) &&
      !isDifficultyComplete(progress, input.difficulty),
    masteredDifficulty:
      starsAfter > starsBefore &&
      isDifficultyMastered(next, input.difficulty) &&
      !isDifficultyMastered(progress, input.difficulty),
  };
}

/** Three stars on every stand of a difficulty — the milestone chest's condition (CAMPAIGN.md §7). */
export function isDifficultyMastered(progress: CampaignProgress, difficulty: Difficulty): boolean {
  const { stars, max } = difficultyStars(progress, difficulty);
  return stars === max;
}

// ---------------------------------------------------------------------------------------------
// Unlocks (CAMPAIGN.md §1)
// ---------------------------------------------------------------------------------------------

/** Intro is always open; Normal needs all of Intro cleared, Hard all of Normal. */
export function isDifficultyUnlocked(progress: CampaignProgress, difficulty: Difficulty): boolean {
  if (difficulty === 'intro') return true;
  if (difficulty === 'normal') return isDifficultyComplete(progress, 'intro');
  return isDifficultyComplete(progress, 'normal');
}

export function unlockedDifficulties(progress: CampaignProgress): Difficulty[] {
  return DIFFICULTY_ORDER.filter((d) => isDifficultyUnlocked(progress, d));
}

/** Settlement 1 is always open; the rest need the previous settlement's boss beaten. */
export function isSettlementUnlocked(
  progress: CampaignProgress,
  settlement: number,
  difficulty: Difficulty,
): boolean {
  if (!isDifficultyUnlocked(progress, difficulty)) return false;
  if (settlement <= 1) return settlement === 1;
  if (settlement > SETTLEMENT_COUNT) return false;
  return isStageCleared(progress, stageIdOf(settlement - 1, BOSS_STAGE_NUMBER), difficulty);
}

/** Stage 1 of an unlocked settlement is open; the rest need the stage before them cleared. */
export function isStageUnlocked(
  progress: CampaignProgress,
  settlement: number,
  stage: number,
  difficulty: Difficulty,
): boolean {
  if (stage < 1 || stage > STAGES_PER_SETTLEMENT) return false;
  if (!isSettlementUnlocked(progress, settlement, difficulty)) return false;
  if (stage === 1) return true;
  return isStageCleared(progress, stageIdOf(settlement, stage - 1), difficulty);
}

export interface StagePointer {
  settlement: number;
  stage: number;
  difficulty: Difficulty;
}

/**
 * Where the player is: the first unlocked stage they have not cleared, on the hardest difficulty
 * they have opened. Drives the Game Modes card and the map's initial focus.
 */
export function nextStage(progress: CampaignProgress): StagePointer {
  const difficulties = unlockedDifficulties(progress);
  for (const difficulty of [...difficulties].reverse()) {
    for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1) {
      if (!isSettlementUnlocked(progress, settlement, difficulty)) break;
      for (let stage = 1; stage <= STAGES_PER_SETTLEMENT; stage += 1) {
        if (!isStageUnlocked(progress, settlement, stage, difficulty)) break;
        if (!isStageCleared(progress, stageIdOf(settlement, stage), difficulty))
          return { settlement, stage, difficulty };
      }
    }
  }
  // Everything unlocked is cleared: point at the last stand of the hardest difficulty.
  const difficulty = difficulties[difficulties.length - 1] ?? 'intro';
  return { settlement: SETTLEMENT_COUNT, stage: STAGES_PER_SETTLEMENT, difficulty };
}

/** ×1 and ×2 from the start, ×3 once Normal is complete, ×4 once Hard is (GAME_DESIGN.md §6). */
export function maxBattleSpeed(progress: CampaignProgress): 1 | 2 | 3 | 4 {
  if (isDifficultyComplete(progress, 'hard')) return 4;
  if (isDifficultyComplete(progress, 'normal')) return 3;
  return 2;
}

/** Total stars on a difficulty, and the most it could be — for the map header. */
export function difficultyStars(
  progress: CampaignProgress,
  difficulty: Difficulty,
): { stars: number; max: number } {
  let stars = 0;
  for (let settlement = 1; settlement <= SETTLEMENT_COUNT; settlement += 1)
    stars += settlementStars(progress, settlement, difficulty);
  return { stars, max: SETTLEMENT_COUNT * STARS_PER_SETTLEMENT };
}
