import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { SummonSummary } from '@state/summon';
import { Button } from '@ui/components/Button/Button';
import { ChampionCard } from '@ui/components/ChampionCard/ChampionCard';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { revealOrder } from '@ui/summon/portal-view';
import styles from './RevealOverlay.module.css';

export interface RevealOverlayProps {
  summary: SummonSummary;
  /** Runs the Pixi ritual; resolves when the burst is over. */
  ritual: (rarity: SummonSummary['best']['record']['rarity']) => Promise<void>;
  /** Cuts the ritual short (the player pressed Skip). */
  skipRitual: () => void;
  /** Shards left for another press of the same kind. */
  shardsLeft: number;
  onAgain: () => void;
  onView: (instanceId: string) => void;
  onClose: () => void;
}

type Phase = 'ritual' | 'cards' | 'done';

/** Milliseconds between two cards of a ×10 (SUMMONING.md §5.4). */
const CARD_STEP = 190;

/**
 * The reveal (docs/design/SUMMONING.md §5): the ritual plays in the gate behind this overlay, then
 * the cards land in order with the rarest last, then the results panel offers the way out.
 *
 * Skipping is allowed throughout: it cuts the ritual to its burst and lands every card at once,
 * which is the player's time being respected rather than a different outcome.
 */
export function RevealOverlay({
  summary,
  ritual,
  skipRitual,
  shardsLeft,
  onAgain,
  onView,
  onClose,
}: RevealOverlayProps) {
  const cards = useMemo(() => revealOrder(summary.pulls, summary.best), [summary]);
  const rarity = summary.best.record.rarity;
  const [phase, setPhase] = useState<Phase>('ritual');
  const [shown, setShown] = useState(0);
  const skipped = useRef(false);
  const reduced = prefersReducedMotion();

  // One run per press: the ritual, then the cards, then the panel. The overlay is keyed by the
  // press, so it always starts from its initial state; the flag stops a late timer from writing
  // into a press that has already been closed.
  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const step = (index: number): void => {
      if (!live) return;
      if (skipped.current || index >= cards.length) {
        setShown(cards.length);
        setPhase('done');
        return;
      }
      setShown(index + 1);
      if (index + 1 >= cards.length) {
        setPhase('done');
        return;
      }
      timer = setTimeout(() => step(index + 1), reduced ? 60 : CARD_STEP);
    };

    void ritual(rarity).then(() => {
      if (!live) return;
      setPhase('cards');
      step(0);
    });

    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [rarity, cards, ritual, reduced]);

  const skip = (): void => {
    skipped.current = true;
    playSfx('ui.tab');
    skipRitual();
    setShown(cards.length);
    setPhase('done');
  };

  return (
    <div className={styles.overlay} data-testid="summon-reveal" data-phase={phase}>
      <div className={styles.scrim} />
      {phase !== 'done' ? (
        <Button
          variant="secondary"
          size="sm"
          className={styles.skip}
          onClick={skip}
          data-testid="summon-skip"
        >
          {t('summon.reveal.skip')}
        </Button>
      ) : null}

      <div className={[styles.grid, cards.length > 1 ? styles.gridMany : ''].join(' ')}>
        {cards.slice(0, shown).map((pull, index) => {
          const def = content.championById(pull.record.championId);
          if (!def) return null;
          const isBest = pull === summary.best;
          return (
            <motion.div
              key={pull.instance.instanceId}
              className={styles.cell}
              initial={reduced ? { opacity: 1 } : { scale: 1.6, opacity: 0, rotate: -3 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 26 }}
              data-testid={`summon-card-${index}`}
            >
              <ChampionCard
                name={t(def.name as 'champ.anuria.name')}
                rarity={def.rarity}
                element={def.element}
                role={def.role}
                stars={pull.instance.stars}
                level={pull.instance.level}
                avatar={def.art.avatar}
                tint={def.art.tint}
                placeholder={def.art.placeholder}
                placeholderLabel={t('champions.placeholder')}
                size={cards.length > 1 ? 128 : 192}
                testId={`summon-champion-${pull.instance.instanceId}`}
              />
              <span className={styles.name}>{t(def.name as 'champ.anuria.name')}</span>
              <span className={styles.note}>
                {pull.copiesBefore === 0 ? (
                  <strong className={styles.new}>{t('summon.reveal.new')}</strong>
                ) : (
                  t('summon.reveal.duplicate')
                )}
              </span>
              {isBest && cards.length > 1 ? (
                <span className={styles.best}>{t('summon.result.best')}</span>
              ) : null}
            </motion.div>
          );
        })}
      </div>

      {phase === 'done' ? (
        <motion.div
          className={styles.actions}
          initial={reduced ? { opacity: 1 } : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.25 }}
          data-testid="summon-results"
        >
          <p className={styles.summary}>
            {cards.length > 1
              ? translate('summon.toast.many', {
                  best: t(
                    (content.championById(summary.best.record.championId)?.name ??
                      'champ.anuria.name') as 'champ.anuria.name',
                  ),
                })
              : translate('summon.toast.one', {
                  name: t(
                    (content.championById(summary.best.record.championId)?.name ??
                      'champ.anuria.name') as 'champ.anuria.name',
                  ),
                })}
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
