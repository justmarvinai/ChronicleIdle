/**
 * The overlay's own state (docs/design/TUTORIAL.md, ADR-042).
 *
 * The step machine says which lesson to *open*; this hook is what holds it. A step runs in two
 * beats — Eldric's line, then the action — and the world is only watched in the second, so a
 * lifetime counter that happened to be met before the line was read can never finish a lesson
 * unseen.
 *
 * Holding matters for the steps whose own gate closes behind them: "open the Tavern" is triggered
 * on the hub and finished off it. The overlay therefore keeps a step it has *read out* until the
 * save records it, which is also why the only thing it remembers is the id of the step whose line
 * has been acknowledged — everything else is derived, every render, from the save and the world.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { content } from '@content/registry';
import type { TutorialStepDef, TutorialTarget } from '@content/tutorial/types';
import { stepSatisfied, type TutorialView } from '@engine/tutorial/index';
import { selectActions, selectDialog, selectRoute, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import {
  tutorialContext,
  tutorialGrantsOwed,
  tutorialOver,
  tutorialStep,
  type TutorialWorld,
} from '@state/tutorial';
import { playSfx } from '@audio/index';
import { useBattleSession } from '@ui/screens/battle/useBattleSession';
import { useViewport, toStageCoords, type ViewportInfo } from '@ui/viewport/viewport';
import { targetElements } from './targets';

/** A rectangle in stage space (1920×1080), which is what the overlay draws in. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TutorialUi {
  view: TutorialView | null;
  /** The line has been read: the pointer is up and the world is being watched. */
  acting: boolean;
  /** What the pointer rests on, or null when the target is nowhere on screen. */
  spotlight: Rect | null;
  /** Rectangles that stay clickable; everything else is swallowed by the scrim. */
  holes: Rect[];
  /** The line has been read — the Continue press. */
  acknowledge(): void;
  /** "Skip this lesson" (owner's answer Q4). */
  skip(): void;
}

const EMPTY: Rect[] = [];
/** Stable empties, so a render with no lesson open does not restart the measuring loop. */
const NO_TARGETS: readonly TutorialTarget[] = [];

/** The rectangle a stack of elements covers, in stage space; null when none of them is on screen. */
function unionRect(info: ViewportInfo, elements: readonly HTMLElement[]): Rect | null {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const element of elements) {
    const box = element.getBoundingClientRect();
    // A zero box is an element that is not laid out: it counts as "not there".
    if (box.width <= 0 || box.height <= 0) continue;
    const start = toStageCoords(info, box.left, box.top);
    const end = toStageCoords(info, box.right, box.bottom);
    left = Math.min(left, start.x);
    top = Math.min(top, start.y);
    right = Math.max(right, end.x);
    bottom = Math.max(bottom, end.y);
  }
  if (!Number.isFinite(left)) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function sameRects(a: readonly Rect[], b: readonly Rect[]): boolean {
  return a.length === b.length && a.every((rect, index) => sameRect(rect, b[index] ?? null));
}

/**
 * Measures the targets a step names, on a frame loop, and hands back the same objects when nothing
 * moved: a lesson over the battle screen must not cost a React commit per frame (CLAUDE.md §5.6).
 */
function useTargetRects(
  spotlightTargets: readonly TutorialTarget[],
  allowTargets: 'all' | readonly TutorialTarget[],
  active: boolean,
): { spotlight: Rect | null; holes: Rect[] } {
  const info = useViewport();
  const [spotlight, setSpotlight] = useState<Rect | null>(null);
  const [holes, setHoles] = useState<Rect[]>(EMPTY);

  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const measure = (): void => {
      // The pointer rests on the furthest target the player has reached: a lesson lists them in
      // the order it is walked ("the Hall, then the card inside it").
      let next: Rect | null = null;
      for (const target of spotlightTargets) {
        const rect = unionRect(info, targetElements(target));
        if (rect) next = rect;
      }
      const openings =
        allowTargets === 'all'
          ? EMPTY
          : allowTargets
              .map((target) => unionRect(info, targetElements(target)))
              .filter((rect): rect is Rect => rect !== null);
      setSpotlight((current) => (sameRect(current, next) ? current : next));
      setHoles((current) => (sameRects(current, openings) ? current : openings));
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [active, allowTargets, spotlightTargets, info]);

  // While no step is acting the last measurements are stale, so they are not handed out.
  return active ? { spotlight, holes } : { spotlight: null, holes: EMPTY };
}

export function useTutorial(): TutorialUi {
  const save = useGameStore(selectSave);
  const route = useGameStore(selectRoute);
  const dialog = useGameStore(selectDialog);
  const actions = useGameStore(selectActions);
  const battle = useBattleSession((session) => session);

  const over = tutorialOver(save);
  const world = useMemo<TutorialWorld>(
    () => ({ save, route, dialog, battle }),
    [save, route, dialog, battle],
  );
  const open = useMemo(() => (over ? null : tutorialStep(world)), [over, world]);

  /** The one thing the overlay remembers: the step whose line the player has read. */
  const [ackedId, setAckedId] = useState<string | null>(null);
  const taught = save?.tutorial.completedSteps ?? [];
  const acked = ackedId ? (content.tutorialStepById(ackedId) ?? null) : null;
  // A step that has been read out is held until the save records it — even after its gate closes.
  const held: TutorialStepDef | null = open?.step ?? (acked && !taught.includes(acked.id) ? acked : null);
  const heldId = held?.id ?? null;
  const acting = held !== null && held.id === ackedId;

  const view = useMemo<TutorialView | null>(() => {
    if (open) return open;
    if (!held) return null;
    const chapter = content.tutorialChapters.find((one) => one.index === held.chapter);
    return chapter
      ? {
          chapter,
          step: held,
          number: held.index,
          count: chapter.steps.length,
          skippable: chapter.skippable,
        }
      : null;
  }, [open, held]);

  // Eldric clearing his throat, once per lesson.
  useEffect(() => {
    if (heldId) playSfx('ui.open');
  }, [heldId]);

  const satisfied = held !== null && stepSatisfied(held, tutorialContext(world));

  // The world's own answer, watched only once the line has been read.
  useEffect(() => {
    if (!held || !acting || !satisfied) return;
    actions.completeTutorialStep(held.id);
  }, [held, acting, satisfied, actions]);

  // What a lesson hands over, paid as it opens and once per chronicle.
  useEffect(() => {
    if (!save || over) return;
    for (const grant of tutorialGrantsOwed(world)) {
      if (!actions.claimGrant(grant.id, grant.currencies)) continue;
      const energy = grant.currencies.find((entry) => entry.currency === 'energy');
      playSfx(energy ? 'reward.medium' : 'reward.small');
      if (energy) actions.toast('reward', 'tut.provision', { amount: energy.amount }, grant.currencies);
      else actions.toast('reward', 'tut.gift', undefined, grant.currencies);
    }
  }, [save, over, world, actions]);

  const isClickStep = held?.complete.type === 'clicked';
  const { spotlight, holes } = useTargetRects(
    held?.spotlight ?? NO_TARGETS,
    held?.allow ?? NO_TARGETS,
    held !== null && acting,
  );

  // "Use the thing" steps: the overlay is the only witness of a press that changes nothing in the
  // save (choosing whom to raise, pouring a brew), so it watches for one on the spotlit element.
  useEffect(() => {
    if (!held || !acting || !isClickStep) return;
    const step = held;
    const onDown = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const hit = step.spotlight.some((name) =>
        targetElements(name).some((element) => element.contains(target)),
      );
      if (hit) actions.completeTutorialStep(step.id);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [held, acting, isClickStep, actions]);

  const acknowledge = useCallback((): void => {
    if (!held) return;
    playSfx('ui.confirm');
    // A line that only asks to be read is finished by reading it.
    if (held.complete.type === 'acknowledged') actions.completeTutorialStep(held.id);
    else setAckedId(held.id);
  }, [held, actions]);

  const skip = useCallback((): void => {
    if (!view?.skippable) return;
    playSfx('ui.close');
    if (!actions.skipTutorialChapter(view.chapter.id).ok) return;
    setAckedId(null);
    actions.toast('info', 'tut.skipped');
  }, [view, actions]);

  return { view, acting, spotlight, holes, acknowledge, skip };
}
