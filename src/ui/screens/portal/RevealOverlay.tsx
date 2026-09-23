import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import type { AssetKey } from '@assets/manifest.generated';
import { RARITIES } from '@content/champions/types';
import { t, translate } from '@i18n/index';
import type { SummonSummary } from '@state/summon';
import { Button } from '@ui/components/Button/Button';
import { POP_STEP_MS } from '@ui/components/StarRow/StarRow';
import { RING } from '@render/summon/ritualScene';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { championName, revealOrder } from '@ui/summon/portal-view';
import { RevealCard } from './RevealCard';
import styles from './RevealOverlay.module.css';

export interface RevealOverlayProps {
  summary: SummonSummary;
  /** Runs the Pixi ritual; resolves when the burst is over (the gate caps how long that takes). */
  ritual: (rarity: SummonSummary['best']['record']['rarity']) => Promise<void>;
  /** Cuts the ritual short (the player pressed Skip). */
  skipRitual: () => void;
  /** Shards left for another press of the same kind. */
  shardsLeft: number;
  /** The shard pressed: its icon backs every card of ten until it turns. */
  shard: { icon: AssetKey; tint: string | null; glow: string };
  onAgain: () => void;
  onView: (instanceId: string) => void;
  onClose: () => void;
}

type Phase = 'ritual' | 'deal' | 'turn' | 'done';

/**
 * The beats of the cards (SUMMONING.md §5.3–§5.4), in milliseconds from the moment the gate lets
 * them go. Ten are dealt face down, then turned one after another; the best waits a breath longer
 * and turns last. A single card spins in whole, its stars pop and its rarity is stamped under it.
 */
const CARD_BEATS = {
  /** From the deal to the first card turning. */
  dealt: 850,
  turnStep: 170,
  /** The breath before the best of ten turns. */
  bestPause: 520,
  /** The single card has landed and its stars begin. */
  starsAt: 700,
  /** From the last star to the single card's stamp starting its fall. */
  stampGap: 120,
  /** The stamp's fall (`@keyframes stamp` in RevealCard.module.css), and when in it the seal meets the page. */
  stampLength: 420,
  stampImpact: 290,
  /** From the last card turning to the way out. */
  settle: 420,
} as const;

/**
 * The longest the cards wait for the gate before landing anyway. The gate caps its own ceremony,
 * so this is the backstop for a ritual that never answers at all — a scene that failed to build.
 * The shards are spent before the gate lights: the cards are owed either way, and a press that
 * shows nothing is the one outcome a summon may never have.
 */
const RITUAL_BACKSTOP_MS = 12_000;

/** Grid of ten: a cell's pitch across and down, to deal each card out of the gate's heart. */
const GRID_PITCH = { x: 142, y: 250 } as const;
const GRID_COLUMNS = 5;

/** An Epic or better is stamped with a sound as it turns. */
const LOUD = RARITIES.indexOf('epic');

/**
 * The reveal (docs/design/SUMMONING.md §5): the ritual plays in the gate behind this overlay, then
 * the cards come out of it — rarest last — and the results offer the way out.
 *
 * Skipping is allowed throughout: it cuts the ritual to its burst and turns every card at once,
 * which is the player's time being respected rather than a different outcome.
 */
export function RevealOverlay({
  summary,
  ritual,
  skipRitual,
  shardsLeft,
  shard,
  onAgain,
  onView,
  onClose,
}: RevealOverlayProps) {
  const cards = useMemo(() => revealOrder(summary.pulls, summary.best), [summary]);
  const rarity = summary.best.record.rarity;
  const single = cards.length === 1;
  // A single card's stamp falls once its last star has popped.
  const stampAfter = CARD_BEATS.starsAt + (cards[0]?.instance.stars ?? 0) * POP_STEP_MS + CARD_BEATS.stampGap;
  const [phase, setPhase] = useState<Phase>('ritual');
  const [turned, setTurned] = useState(0);
  const skipped = useRef(false);
  const reduced = prefersReducedMotion();

  // One run per press: the ritual, then the cards, then the way out. The overlay is keyed by the
  // press, so it always starts from its initial state; the flag stops a late timer from writing
  // into a press that has already been closed or skipped.
  useEffect(() => {
    let live = true;
    let landed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, run: () => void): void => {
      timers.push(
        setTimeout(() => {
          if (live && !skipped.current) run();
        }, ms),
      );
    };

    const dealTen = (): void => {
      setPhase('deal');
      playSfx('summon.flip', { volume: 0.6 });
      let when = CARD_BEATS.dealt;
      cards.forEach((pull, index) => {
        const best = index === cards.length - 1;
        if (best) when += CARD_BEATS.bestPause;
        at(when, () => {
          setPhase('turn');
          setTurned(index + 1);
          playSfx('summon.flip');
          if (RARITIES.indexOf(pull.record.rarity) >= LOUD)
            playSfx('summon.stamp', { volume: best ? 1 : 0.55 });
        });
        when += CARD_BEATS.turnStep;
      });
      at(when + CARD_BEATS.settle, () => setPhase('done'));
    };

    const landOne = (): void => {
      setPhase('turn');
      setTurned(1);
      const stars = cards[0]?.instance.stars ?? 0;
      for (let i = 0; i < stars; i += 1)
        at(CARD_BEATS.starsAt + i * POP_STEP_MS, () => playSfx('summon.star', { rate: 1 + i * 0.07 }));
      // The seal is heard as it meets the page, not as it starts to fall.
      if (RARITIES.indexOf(rarity) >= LOUD)
        at(stampAfter + CARD_BEATS.stampImpact, () => playSfx('summon.stamp'));
      at(stampAfter + CARD_BEATS.stampLength + CARD_BEATS.settle, () => setPhase('done'));
    };

    // Whichever comes first: the gate finishing, the gate failing, or the backstop.
    const land = (): void => {
      if (!live || landed) return;
      landed = true;
      clearTimeout(backstop);
      if (skipped.current) return;
      if (reduced) {
        setTurned(cards.length);
        setPhase('done');
      } else if (single) landOne();
      else dealTen();
    };

    // `land` only ever runs from one of these two, so the timer it clears is already assigned.
    const backstop = setTimeout(land, RITUAL_BACKSTOP_MS);
    void ritual(rarity)
      .catch(() => undefined)
      .then(land);

    return () => {
      live = false;
      for (const timer of timers) clearTimeout(timer);
      clearTimeout(backstop);
    };
  }, [rarity, cards, ritual, reduced, single, stampAfter]);

  const skip = (): void => {
    skipped.current = true;
    playSfx('ui.tab');
    skipRitual();
    setTurned(cards.length);
    setPhase('done');
  };

  const shown = phase !== 'ritual';
  const bestName = championName(summary.best.record.championId);

  return (
    <div
      className={styles.overlay}
      style={{ ['--ring-x' as string]: `${RING.x}px`, ['--ring-y' as string]: `${RING.y}px` }}
      data-testid="summon-reveal"
      data-phase={phase}
    >
      <div className={styles.scrim} />
      {phase !== 'done' ? (
        <div className={styles.skip}>
          <Button variant="secondary" size="sm" onClick={skip} data-testid="summon-skip">
            {t('summon.reveal.skip')}
          </Button>
        </div>
      ) : null}

      {shown ? (
        <div className={[styles.grid, single ? '' : styles.gridMany].join(' ')}>
          {cards.map((pull, index) => (
            <RevealCard
              key={pull.instance.instanceId}
              pull={pull}
              index={index}
              size={single ? 192 : 128}
              faceUp={index < turned}
              best={!single && pull === summary.best}
              shardIcon={shard.icon}
              shardTint={shard.tint}
              shardGlow={shard.glow}
              dealFrom={{
                x: -((index % GRID_COLUMNS) - (GRID_COLUMNS - 1) / 2) * GRID_PITCH.x,
                y: -(Math.floor(index / GRID_COLUMNS) - 0.5) * GRID_PITCH.y,
              }}
              reduced={reduced}
              {...(single ? { starsPopAfter: CARD_BEATS.starsAt, stampAfter } : {})}
            />
          ))}
        </div>
      ) : null}

      {phase === 'done' ? (
        <motion.div
          className={styles.actions}
          initial={reduced ? { opacity: 1 } : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          data-testid="summon-results"
        >
          <p className={styles.summary}>
            {single
              ? translate('summon.toast.one', { name: bestName })
              : translate('summon.toast.many', { best: bestName })}
          </p>
          <div className={styles.buttons}>
            <Button onClick={onClose} data-testid="summon-continue">
              {t('summon.result.continue')}
            </Button>
            <Button
              variant="secondary"
              disabled={shardsLeft < cards.length}
              onClick={onAgain}
              data-testid="summon-again"
            >
              {t('summon.result.again')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => onView(summary.best.instance.instanceId)}
              data-testid="summon-view"
            >
              {t('summon.result.view')}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
