import { useEffect } from 'react';
import { motion } from 'motion/react';
import { imageUrl } from '@assets/manifest';
import { playSfx } from '@audio/index';
import type { BattleOutcomeKind } from '@engine/battle/index';
import { t, type I18nKey } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import styles from './ResultCrest.module.css';

const TITLE: Record<BattleOutcomeKind, I18nKey> = {
  victory: 'battleResult.victory',
  defeat: 'battleResult.defeat',
  timeout: 'battleResult.timeout',
  retreat: 'battleResult.retreat',
};
/** How long after the title each star lands, and the beat between them, in seconds. */
const STAR_DELAY = 0.45;
const STAR_STEP = 0.28;

export interface ResultCrestProps {
  kind: BattleOutcomeKind;
  subtitle: string;
  /** A stand's stars, earned of three; null where a fight pays no stars. */
  stars: number | null;
  newRecord: boolean;
  /** A batch's line under the stars: how many runs, and how it ended. */
  batch: string | null;
  /** A lost fight: how much of the enemy's health was left, 0–1. */
  enemyLeft: number | null;
}

/**
 * The head of the result (docs/tech/UI_DESIGN.md §5.10): the word — Victory in gold on a turning
 * crown of light, Defeat in red on a cold one — the stand's stars landing one by one with a sound
 * each, and under a lost fight how close it came: the enemy's health that was left, as a bar.
 */
export function ResultCrest({ kind, subtitle, stars, newRecord, batch, enemyLeft }: ResultCrestProps) {
  const won = kind === 'victory';
  const reduced = prefersReducedMotion();
  const starUrl = imageUrl('ui.stone_vine.icon_star');

  // Each earned star lands with a small chime, after the title has.
  useEffect(() => {
    if (!stars || reduced) return;
    const ids = Array.from({ length: stars }, (_, i) =>
      window.setTimeout(() => playSfx('reward.small'), (STAR_DELAY + i * STAR_STEP) * 1000),
    );
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [stars, reduced]);

  return (
    <header className={[styles.crest, won ? styles.won : styles.lost].join(' ')}>
      <span className={styles.rays} aria-hidden="true" />
      <motion.div
        className={styles.emblem}
        initial={reduced ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.3, 1.4, 0.5, 1] }}
        aria-hidden="true"
      >
        <Glyph
          glyph={won ? 'glyph.trophy_cup' : kind === 'retreat' ? 'glyph.nature_shield' : 'glyph.skull_wreath'}
          size={64}
          color={won ? 'var(--gold-3)' : '#ff8a74'}
        />
      </motion.div>
      <motion.h1
        className={`display ${styles.title}`}
        initial={reduced ? false : { opacity: 0, letterSpacing: '0.02em' }}
        animate={{ opacity: 1, letterSpacing: '0.14em' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        data-testid="result-title"
      >
        {t(TITLE[kind])}
      </motion.h1>
      <p className={styles.subtitle}>{subtitle}</p>

      {stars !== null ? (
        <div
          className={styles.stars}
          data-testid="result-stars"
          role="img"
          aria-label={`${stars} of 3 stars`}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className={[styles.star, i < stars ? styles.starOn : ''].join(' ')}
              style={{ backgroundImage: `url("${starUrl}")` }}
              initial={reduced ? false : { opacity: 0, scale: 2.2, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: STAR_DELAY + i * STAR_STEP, duration: 0.35, ease: [0.3, 1.5, 0.5, 1] }}
            />
          ))}
          {newRecord ? (
            <motion.span
              className={`display ${styles.record}`}
              initial={reduced ? false : { opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: STAR_DELAY + 3 * STAR_STEP, duration: 0.3 }}
            >
              {t('battleResult.newRecord')}
            </motion.span>
          ) : null}
        </div>
      ) : null}
      {batch ? <p className={`num ${styles.batch}`}>{batch}</p> : null}

      {enemyLeft !== null ? (
        <div className={styles.close} data-testid="result-enemy-left">
          <span className={styles.closeLabel}>
            {t('battleResult.enemyHpLeft', { percent: Math.round(enemyLeft * 100) })}
          </span>
          <span className={styles.closeBar} aria-hidden="true">
            <span style={{ width: `${Math.max(0, Math.min(1, enemyLeft)) * 100}%` }} />
          </span>
        </div>
      ) : null}
    </header>
  );
}
