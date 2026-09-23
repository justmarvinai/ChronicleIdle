/**
 * The tutorial overlay (docs/tech/UI_DESIGN.md §5.18): the screen dimmed except for a cut-out
 * around what the lesson points at, a pulsing ring and caret on it, and Eldric in a panel that
 * types his line out.
 *
 * The scrim is one element with the allowed rectangles punched out of it, so what the player can
 * see through and what the player can press are the same shape — there is no second list of
 * "blocked" elements to fall out of step with the script. When a lesson's target is nowhere on
 * screen (a screen still loading, a rack with nothing selected) the cut-out is the whole screen:
 * Eldric still speaks, and nothing is ever trapped behind a spotlight that does not exist.
 */
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  TUTORIAL_CONTINUE_DELAY_MS,
  TUTORIAL_PULSE_MS,
  TUTORIAL_SPOTLIGHT_PAD,
  TUTORIAL_TYPE_MS,
} from '@content/balance/tutorial';
import { t, translate } from '@i18n/index';
import type { I18nKey } from '@i18n/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '@ui/viewport/viewport';
import { useTutorial, type Rect } from './useTutorial';
import styles from './TutorialOverlay.module.css';

/** Above this the caret sits over the spotlight; below it, under (there is no room above). */
const CARET_ABOVE_FROM = 140;

const round = (value: number): number => Math.round(value * 10) / 10;

/** The scrim, with one rectangle punched out per allowed target (`evenodd` makes them holes). */
function clipFor(holes: readonly Rect[]): string | undefined {
  if (holes.length === 0) return undefined;
  const outer = `M0 0H${VIRTUAL_WIDTH}V${VIRTUAL_HEIGHT}H0Z`;
  const inner = holes
    .map((rect) => {
      const left = round(rect.x - TUTORIAL_SPOTLIGHT_PAD);
      const top = round(rect.y - TUTORIAL_SPOTLIGHT_PAD);
      const right = round(rect.x + rect.width + TUTORIAL_SPOTLIGHT_PAD);
      const bottom = round(rect.y + rect.height + TUTORIAL_SPOTLIGHT_PAD);
      return `M${left} ${top}H${right}V${bottom}H${left}Z`;
    })
    .join(' ');
  return `path(evenodd, '${outer} ${inner}')`;
}

/** A ring's box: the target grown by the spotlight's pad, pulsing at the lesson's beat. */
function ringBox(rect: Rect): CSSProperties {
  return {
    left: rect.x - TUTORIAL_SPOTLIGHT_PAD,
    top: rect.y - TUTORIAL_SPOTLIGHT_PAD,
    width: rect.width + TUTORIAL_SPOTLIGHT_PAD * 2,
    height: rect.height + TUTORIAL_SPOTLIGHT_PAD * 2,
    ['--tut-pulse' as string]: `${TUTORIAL_PULSE_MS}ms`,
  };
}

/**
 * Eldric's line, typed out. It is mounted with the step's id as its `key`, so a new lesson resets
 * it the way React prescribes — by remounting — rather than through an effect that writes state
 * back. `reveal` is the panel having been clicked: the rest of the line appears at once, as it
 * does in any game, and reduced motion starts there.
 */
function EldricLine({ text, reveal }: { text: string; reveal: boolean }) {
  const [count, setCount] = useState(() => (prefersReducedMotion() ? text.length : 0));
  const shown = reveal ? text.length : count;
  useEffect(() => {
    if (count >= text.length) return;
    const timer = window.setTimeout(() => setCount((current) => current + 1), TUTORIAL_TYPE_MS);
    return () => window.clearTimeout(timer);
  }, [count, text.length]);
  return (
    <p className={styles.line} data-testid="tutorial-line">
      {text.slice(0, shown)}
      {shown >= text.length ? null : <span className={styles.caretText} aria-hidden="true" />}
    </p>
  );
}

export function TutorialOverlay() {
  const { view, acting, spotlight, holes, marks, acknowledge, skip } = useTutorial();
  const step = view?.step ?? null;
  const stepId = step?.id ?? null;
  const line = step ? translate(step.dialogue as I18nKey) : '';
  const continueRef = useRef<HTMLButtonElement>(null);
  // A press held over from the lesson before must not answer this one, so Continue arms a beat late.
  const [armedFor, setArmedFor] = useState<string | null>(null);
  const [revealedFor, setRevealedFor] = useState<string | null>(null);
  const armed = step !== null && armedFor === step.id;

  useEffect(() => {
    if (!stepId) return;
    const timer = window.setTimeout(() => setArmedFor(stepId), TUTORIAL_CONTINUE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [stepId]);

  useEffect(() => {
    if (armed && !acting) continueRef.current?.focus();
  }, [armed, acting, stepId]);

  // While a read-only line is spoken its targets are cut out of the dim to be seen, not pressed.
  const clip = useMemo(() => clipFor(acting ? holes : marks), [acting, holes, marks]);
  // While the line is being read the screen is held; afterwards only what the lesson allows is.
  const free = acting && holes.length === 0;
  const lit = !acting && marks.length > 0;

  return (
    <AnimatePresence>
      {view ? (
        <div
          className={styles.root}
          data-testid="tutorial-overlay"
          data-step={view.step.id}
          data-phase={acting ? 'action' : 'dialogue'}
        >
          <div
            className={free ? styles.scrimOpen : styles.scrim}
            style={clip ? { clipPath: clip, WebkitClipPath: clip } : undefined}
            aria-hidden="true"
          />
          {lit ? (
            <>
              {/* The cut-outs show; this clear layer keeps them, like the rest, out of reach. */}
              <div className={styles.hold} data-testid="tutorial-hold" aria-hidden="true" />
              {/* Keyed by place in the lesson's list, so a target still settling keeps its pulse. */}
              {marks.map((mark, index) => (
                <div
                  key={index}
                  className={styles.ring}
                  style={ringBox(mark)}
                  data-testid="tutorial-mark"
                  aria-hidden="true"
                />
              ))}
            </>
          ) : null}
          {acting && spotlight ? (
            <>
              <div
                className={styles.ring}
                style={ringBox(spotlight)}
                data-testid="tutorial-spotlight"
                aria-hidden="true"
              />
              <div
                className={spotlight.y > CARET_ABOVE_FROM ? styles.caretAbove : styles.caretBelow}
                style={{
                  left: spotlight.x + spotlight.width / 2,
                  top:
                    spotlight.y > CARET_ABOVE_FROM
                      ? spotlight.y - TUTORIAL_SPOTLIGHT_PAD
                      : spotlight.y + spotlight.height + TUTORIAL_SPOTLIGHT_PAD,
                }}
                aria-hidden="true"
              />
            </>
          ) : null}

          {acting ? (
            /*
             * The line has been read: Eldric steps aside to a strip above the bottom bar, so the
             * lesson can be done on a screen the player can actually see and use.
             */
            <motion.aside
              className={styles.strip}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              aria-live="polite"
              data-testid="tutorial-hint"
            >
              <AssetImage
                asset="avatar.tutorial_npc"
                size={128}
                className={styles.stripFace}
                alt={t('tut.speaker')}
              />
              <p className={styles.stripLine}>{line}</p>
              {view.skippable ? (
                <button type="button" className={styles.skip} onClick={skip} data-testid="tutorial-skip">
                  {t('tut.skip')}
                </button>
              ) : null}
            </motion.aside>
          ) : (
            <motion.aside
              className={styles.panel}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              role="dialog"
              aria-live="polite"
              aria-label={t('tut.speaker')}
              onClick={() => step && setRevealedFor(step.id)}
            >
              <Panel kind="ornate-wide" padding={10} contentClassName={styles.grid}>
                <AssetImage
                  asset="avatar.tutorial_npc"
                  size={256}
                  className={styles.portrait}
                  alt={t('tut.speaker')}
                />
                <div className={styles.body}>
                  <header className={styles.head}>
                    <span className={`display ${styles.speaker}`}>{t('tut.speaker')}</span>
                    <span className={`num ${styles.chapter}`} data-testid="tutorial-lesson">
                      {t('tut.chapterLabel', {
                        index: view.chapter.index,
                        name: translate(view.chapter.name as I18nKey),
                      })}{' '}
                      · {t('tut.lesson', { index: view.number, total: view.count })}
                    </span>
                  </header>
                  <EldricLine key={view.step.id} text={line} reveal={revealedFor === view.step.id} />
                  <footer className={styles.actions}>
                    <Button
                      ref={continueRef}
                      variant="primary"
                      size="md"
                      disabled={!armed}
                      onClick={acknowledge}
                      data-testid="tutorial-continue"
                    >
                      {t('tut.continue')}
                    </Button>
                    {view.skippable ? (
                      <button
                        type="button"
                        className={styles.skip}
                        onClick={skip}
                        data-testid="tutorial-skip"
                      >
                        {t('tut.skip')}
                      </button>
                    ) : null}
                  </footer>
                </div>
              </Panel>
            </motion.aside>
          )}
        </div>
      ) : null}
    </AnimatePresence>
  );
}
