import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { useAnimatedNumber } from '@ui/hooks/useAnimatedNumber';
import styles from './RunsCard.module.css';

export interface RunsCardProps {
  left: number;
  total: number;
  msToReset: number;
}

/**
 * The day's runs (docs/tech/UI_DESIGN.md §5.23): the one number the whole Brewery is governed by,
 * said three ways — as a numeral, as a rack of flasks with the spent ones gone dark, and as the
 * sentence that explains why every Brew button is grey once the day is spent.
 */
export function RunsCard({ left, total, msToReset }: RunsCardProps) {
  const shown = Math.round(useAnimatedNumber(left));
  const line = left > 0 ? t('brewery.runs', { left, total }) : t('brewery.runsNone');
  return (
    <section className={styles.card} data-testid="brewery-runs" aria-label={t('brewery.runsTitle')}>
      <header className={styles.head}>
        <span className={`display ${styles.title}`}>{t('brewery.runsTitle')}</span>
        <span className={`num ${styles.value}`} data-testid="brewery-runs-left">
          {shown}
          <span className={styles.total}>/{total}</span>
        </span>
      </header>
      {/* A flask per run, the spent ones dark: the budget as a thing on a shelf, not a bar. */}
      <ol className={styles.rack} aria-hidden="true">
        {Array.from({ length: total }, (_, index) => (
          <li key={index} className={styles.flask} data-full={index < left}>
            <Glyph
              glyph="glyph.health_potion"
              size={22}
              color={index < left ? 'var(--gold-3)' : 'var(--text-3)'}
            />
          </li>
        ))}
      </ol>
      <p className={styles.line} data-empty={left === 0} data-testid="brewery-runs-line">
        {line}
      </p>
      <p className={styles.resets} data-testid="brewery-resets">
        {t('brewery.resets', { time: formatDuration(msToReset) })} · {t('brewery.spent')}
      </p>
    </section>
  );
}
