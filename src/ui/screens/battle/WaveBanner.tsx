import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { t } from '@i18n/index';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import styles from './Hud.module.css';

/** How long a wave's name holds the middle of the screen, in milliseconds. */
const HOLD_MS = 1400;

/**
 * A wave's name across the middle of the screen as it begins (docs/tech/UI_DESIGN.md §5.9) — a
 * ribbon that sweeps in, holds, and goes. It never takes the pointer: the fight goes on under it.
 */
export function WaveBanner({ wave, waveCount }: { wave: number; waveCount: number }) {
  // The wave whose banner has already had its moment; a new wave is shown until its own ends.
  const [spent, setSpent] = useState<number | null>(null);
  const shown = spent === wave ? null : wave;
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const id = window.setTimeout(() => setSpent(wave), HOLD_MS);
    return () => window.clearTimeout(id);
  }, [wave]);

  return (
    <AnimatePresence>
      {shown !== null ? (
        <motion.div
          key={shown}
          className={styles.waveBanner}
          initial={reduced ? { opacity: 0 } : { opacity: 0, scaleX: 0.4 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0.9, 0.2, 1] }}
          aria-hidden="true"
          data-testid="wave-banner"
        >
          <span className={`display ${styles.waveTitle}`}>{t('battle.waveBanner', { wave: shown })}</span>
          <span className={`num ${styles.waveOf}`}>
            {t('battle.waveOf', { wave: shown, count: waveCount })}
          </span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
