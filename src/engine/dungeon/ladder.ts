/**
 * The dungeon ladder (docs/design/DUNGEONS.md §4): which stages a chronicle may walk into.
 *
 * Pure functions over the record a save keeps — `{ normal, hard }` per dungeon, each the deepest
 * stage cleared there. Everything else the screens need (what is next, whether Hard is open, how
 * deep the keep has been taken) is derived from those two numbers, so the save never stores a
 * list of stages and can never disagree with itself (`CLAUDE.md` §5.5).
 */
import { DUNGEON_STAGES, type DungeonDifficulty } from '@content/balance/dungeon';

/** What a save keeps for one dungeon: the deepest stage cleared on each difficulty, 0 = none. */
export interface DungeonProgress {
  normal: number;
  hard: number;
}

export const NO_DUNGEON_PROGRESS: DungeonProgress = { normal: 0, hard: 0 };

/** A dungeon's record, or an empty one — a keep never entered reads the same as one never stored. */
export function progressOf(
  cleared: Readonly<Record<string, DungeonProgress>>,
  slug: string,
): DungeonProgress {
  return cleared[slug] ?? NO_DUNGEON_PROGRESS;
}

/**
 * Hard opens per dungeon, when that dungeon's Normal 20 falls (the owner's answer). Earned in the
 * place it is spent: clearing Cindervault to the bottom opens Cindervault's Hard and nothing else.
 */
export function isHardOpen(progress: DungeonProgress): boolean {
  return progress.normal >= DUNGEON_STAGES;
}

/**
 * The deepest stage a difficulty may be entered at: one past what has been cleared, capped at the
 * last. Stage 1 of Normal is always open; stage 1 of Hard waits on Normal's twentieth.
 */
export function highestOpenStage(progress: DungeonProgress, difficulty: DungeonDifficulty): number {
  if (difficulty === 'hard' && !isHardOpen(progress)) return 0;
  const cleared = difficulty === 'hard' ? progress.hard : progress.normal;
  return Math.min(DUNGEON_STAGES, Math.max(0, cleared) + 1);
}

/** Whether a stage may be entered right now. */
export function isStageOpen(
  progress: DungeonProgress,
  difficulty: DungeonDifficulty,
  stage: number,
): boolean {
  if (stage < 1 || stage > DUNGEON_STAGES) return false;
  return stage <= highestOpenStage(progress, difficulty);
}

/**
 * The stage a chronicle is pointed at in a dungeon: the deepest it may enter. A cleared stage is
 * still farmable — this is where the screen opens, not a restriction.
 */
export function nextStage(progress: DungeonProgress, difficulty: DungeonDifficulty): number {
  return Math.max(1, highestOpenStage(progress, difficulty));
}

/**
 * Records a clear and reports what it opened. A clear only ever moves the record forward, so
 * re-running a cleared stage is worth its spoils and nothing else — which is what makes a dungeon
 * a farm rather than a checklist.
 */
export interface ClearResult {
  progress: DungeonProgress;
  /** This clear took the keep deeper than it had ever been on this difficulty. */
  first: boolean;
  /** This clear was Normal's twentieth, and Hard is now open. */
  openedHard: boolean;
}

export function recordClear(
  progress: DungeonProgress,
  difficulty: DungeonDifficulty,
  stage: number,
): ClearResult {
  const clamped = Math.max(1, Math.min(DUNGEON_STAGES, Math.round(stage)));
  const before = difficulty === 'hard' ? progress.hard : progress.normal;
  const first = clamped > before;
  const deepest = Math.max(before, clamped);
  const next: DungeonProgress =
    difficulty === 'hard' ? { ...progress, hard: deepest } : { ...progress, normal: deepest };
  return {
    progress: next,
    first,
    openedHard: difficulty === 'normal' && !isHardOpen(progress) && isHardOpen(next),
  };
}

/** How deep a keep has been taken overall, for the overview's one-line summary. */
export function deepestLabel(progress: DungeonProgress): {
  difficulty: DungeonDifficulty;
  stage: number;
} | null {
  if (progress.hard > 0) return { difficulty: 'hard', stage: progress.hard };
  if (progress.normal > 0) return { difficulty: 'normal', stage: progress.normal };
  return null;
}
