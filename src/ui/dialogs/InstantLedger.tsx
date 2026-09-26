import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { STAGE_MAX_STARS } from '@content/balance/campaign';
import { t } from '@i18n/index';
import { FxSprite } from '@ui/components/FxSprite/FxSprite';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import styles from './InstantLedger.module.css';

/** The whole tally takes about this long, however many runs it counts. */
const TALLY_MS = 1_100;
/** …but no page turns faster than this, so a ×50 still reads as pages rather than a blur. */
const PAGE_MIN_MS = 28;
/** How long a single run's page takes to turn. */
const PAGE_MAX_MS = 160;

/**
 * Counts from nothing to `target`, a page at a time, turning a page each count. Under reduced
 * motion the count is simply the target, and a single page turns.
 */
function useTally(target: number, reduced: boolean): number {
  const [counted, setCounted] = useState(0);
  useEffect(() => {
    if (reduced) {
      playSfx('instant.write');
      return undefined;
    }
    const step = Math.max(PAGE_MIN_MS, Math.min(PAGE_MAX_MS, TALLY_MS / Math.max(1, target)));
    let count = 0;
    const timer = window.setInterval(() => {
      count += 1;
      setCounted(count);
      playSfx('instant.write');
      if (count >= target) window.clearInterval(timer);
    }, step);
    return () => window.clearInterval(timer);
  }, [target, reduced]);
  return reduced ? target : counted;
}

export interface InstantLedgerProps {
  /** `Stand 1-3 · Intro`. */
  stand: string;
  /** The encounter's own name. */
  name: string;
  runs: number;
  /** Runs asked for; more than `runs` when the energy ran short. */
  requested: number;
  energySpent: number;
  reduced: boolean;
}

/**
 * The chronicle's page for an instant clear (docs/tech/UI_DESIGN.md §5.30): the stand and its
 * three stars, the quill in a ring of light, and the runs written down counted up a page at a time
 * — then what they cost, and whether the energy covered all that was asked.
 */
export function InstantLedger({ stand, name, runs, requested, energySpent, reduced }: InstantLedgerProps) {
  const shown = useTally(runs, reduced);
  const done = shown >= runs;
  return (
    <section className={styles.ledger} data-testid="instant-ledger" data-runs={runs}>
      <span className={`display ${styles.kicker}`}>{t('instant.kicker')}</span>
      <h3 className={`display ${styles.stand}`}>{stand}</h3>
      <p className={styles.name}>{name}</p>
      <StarRow stars={STAGE_MAX_STARS} max={STAGE_MAX_STARS} size={26} />

      <div className={styles.seal} data-done={done}>
        <span className={styles.ring} aria-hidden="true" />
        {done && !reduced ? (
          <FxSprite effect="fx.gamefx.light_cast" size={220} className={styles.flare} />
        ) : null}
        <motion.span
          className={styles.quill}
          animate={reduced || done ? { rotate: 0, y: 0 } : { rotate: [-8, 6, -8], y: [0, -3, 0] }}
          transition={{ duration: 0.45, repeat: done ? 0 : Infinity, ease: 'easeInOut' }}
        >
          <Glyph glyph="glyph.magic_feather" size={64} color="var(--gold-3)" />
        </motion.span>
      </div>

      <span className={`display ${styles.cleared}`}>{t('instant.cleared')}</span>
      <span className={`num ${styles.count}`} data-testid="instant-count">
        {t('instant.times', { count: shown })}
      </span>
      <span className={`num ${styles.spent}`} data-testid="instant-spent">
        {t('instant.spent', { energy: energySpent })}
      </span>
      {runs < requested ? (
        <p className={styles.short} data-testid="instant-short">
          {t('instant.short', { count: runs, total: requested })}
        </p>
      ) : null}
    </section>
  );
}
