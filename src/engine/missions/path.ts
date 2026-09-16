/**
 * The Chronicler's Path (docs/design/QUESTS_MISSIONS.md §4).
 *
 * One line, walked in order: the chronicle is always on exactly one mission — the first it has not
 * claimed — and a chapter opens when the chapter before it is finished. That makes the whole line
 * derivable from one list of claimed ids (the discipline of ADR-040 again): there is no "active"
 * pointer to keep in step with the content, and a mission inserted in a later release simply
 * becomes the next one to walk into.
 *
 * What a save keeps is that list, the counters the open mission started from, and which chapter
 * chests have been taken. Everything on the screen is a function of those.
 */
import type { MissionChapterDef, MissionDef } from '@content/missions/types';
import { evaluateGoal, goalCounterKeys, type GoalContext, type GoalProgress } from '@engine/quests/goals';

/** The Path as the save keeps it. */
export interface PathState {
  /** Mission ids claimed, in the order they were claimed. */
  claimed: readonly string[];
  /** The counters when the open mission became open; its counter goals measure the delta. */
  baseline: Readonly<Record<string, number>>;
  /** Chapter indices whose chest has been taken. */
  chests: readonly number[];
}

/**
 * `claimed` — done and paid. `claimable` — the open mission, finished. `open` — the one being
 * walked. `locked` — still to come; its counter goals read zero because it has not started.
 */
export type MissionStatus = 'claimed' | 'claimable' | 'open' | 'locked';

export interface MissionView {
  mission: MissionDef;
  progress: GoalProgress;
  status: MissionStatus;
}

export interface ChapterView {
  chapter: MissionChapterDef;
  missions: MissionView[];
  /** Missions claimed in this chapter, of its twelve. */
  claimed: number;
  /** Every mission of the chapter is claimed. */
  complete: boolean;
  chestClaimed: boolean;
  chestClaimable: boolean;
  /** Open once the chapter before it is finished. */
  unlocked: boolean;
}

export interface PathView {
  chapters: ChapterView[];
  /** The one mission the chronicle is on, or null once the Path is walked. */
  active: MissionView | null;
  /** The chapter that mission sits in — the tab the screen opens on. */
  activeChapter: number;
  /** Missions claimed, of the Path's whole length. */
  claimed: number;
  total: number;
  /** Chapters whose chest is waiting to be taken. */
  claimableChests: number[];
  finished: boolean;
}

/** Every mission in Path order: chapter by chapter, mission by mission. */
export function flatMissions(chapters: readonly MissionChapterDef[]): MissionDef[] {
  return [...chapters]
    .sort((a, b) => a.index - b.index)
    .flatMap((chapter) => [...chapter.missions].sort((a, b) => a.index - b.index));
}

/** The first mission not yet claimed — the one the Path is on. */
export function activeMission(
  chapters: readonly MissionChapterDef[],
  claimed: readonly string[],
): MissionDef | null {
  const done = new Set(claimed);
  return flatMissions(chapters).find((mission) => !done.has(mission.id)) ?? null;
}

/** The counters a mission's goal measures, for the baseline taken when it opens. */
export function missionBaselineKeys(mission: MissionDef): string[] {
  return goalCounterKeys([mission.goal]);
}

/** Whether a chapter's twelve are all claimed. */
function chapterComplete(chapter: MissionChapterDef, done: ReadonlySet<string>): boolean {
  return chapter.missions.length > 0 && chapter.missions.every((mission) => done.has(mission.id));
}

/**
 * Everything the Chronicler's Path screen and the hub's dot read. `ctx` carries the chronicle;
 * the open mission is measured against the save's stored baseline, while a mission still to come
 * is measured against the counters as they stand — so its counter goals read zero (it has not
 * started) and its state predicates read the truth (the chronicle may already satisfy them).
 */
export function pathView(
  chapters: readonly MissionChapterDef[],
  state: PathState,
  ctx: Omit<GoalContext, 'baseline' | 'allPrevious'>,
): PathView {
  const done = new Set(state.claimed);
  const takenChests = new Set(state.chests);
  const active = activeMission(chapters, state.claimed);
  const ordered = [...chapters].sort((a, b) => a.index - b.index);

  const views: ChapterView[] = ordered.map((chapter, position) => {
    const previous = ordered[position - 1];
    const unlocked = previous === undefined || chapterComplete(previous, done);
    const missions: MissionView[] = [...chapter.missions]
      .sort((a, b) => a.index - b.index)
      .map((mission) => {
        if (done.has(mission.id)) {
          const target = evaluateGoal(mission.goal, { ...ctx, baseline: state.baseline }).target;
          return { mission, progress: { progress: target, target, done: true }, status: 'claimed' };
        }
        if (mission.id === active?.id) {
          // Everything before the open mission is claimed by definition: that is the line.
          const progress = evaluateGoal(mission.goal, {
            ...ctx,
            baseline: state.baseline,
            allPrevious: true,
          });
          return { mission, progress, status: progress.done ? 'claimable' : 'open' };
        }
        return {
          mission,
          progress: evaluateGoal(mission.goal, { ...ctx, baseline: ctx.save.stats }),
          status: 'locked',
        };
      });

    const complete = chapterComplete(chapter, done);
    const chestClaimed = takenChests.has(chapter.index);
    return {
      chapter,
      missions,
      claimed: missions.filter((view) => view.status === 'claimed').length,
      complete,
      chestClaimed,
      chestClaimable: complete && !chestClaimed,
      unlocked,
    };
  });

  const total = flatMissions(chapters).length;
  const activeView = views.flatMap((view) => view.missions).find((view) => view.mission.id === active?.id);
  return {
    chapters: views,
    active: activeView ?? null,
    activeChapter: active?.chapter ?? ordered[ordered.length - 1]?.index ?? 1,
    claimed: state.claimed.length,
    total,
    claimableChests: views.filter((view) => view.chestClaimable).map((view) => view.chapter.index),
    finished: active === null,
  };
}
