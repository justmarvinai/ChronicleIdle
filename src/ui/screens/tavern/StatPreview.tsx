import { t, type I18nKey } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { STAT_GLYPH } from '@ui/styles/display-maps';
import type { GrowthPreview } from './tavern-view';
import styles from './StatPreview.module.css';

export interface StatPreviewProps {
  growth: GrowthPreview;
  testId?: string;
}

const format = (value: number): string => value.toLocaleString('en-US');

/**
 * What an upgrade does to the champion's sheet (docs/tech/UI_DESIGN.md §5.5): HP, ATK and DEF
 * before and after, the gain in green, and the power they add up to — the reason to press.
 */
export function StatPreview({ growth, testId }: StatPreviewProps) {
  const gain = growth.power.after - growth.power.before;
  return (
    <div className={styles.preview} data-testid={testId}>
      <span className={`display ${styles.caption}`}>{t('tavern.growth')}</span>
      <dl className={styles.rows}>
        {growth.rows.map((row) => (
          <div key={row.stat} className={styles.row}>
            <dt className={styles.stat}>
              <Glyph glyph={STAT_GLYPH[row.stat]} size={20} color="var(--gold-2)" />
              <span>{t(`champions.stat.${row.stat}` as I18nKey)}</span>
            </dt>
            <dd className={`num ${styles.values}`}>
              <span className={styles.before}>{format(row.before)}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <span className={row.after > row.before ? styles.up : styles.same}>{format(row.after)}</span>
            </dd>
          </div>
        ))}
        <div className={`${styles.row} ${styles.powerRow}`}>
          <dt className={styles.stat}>
            <Glyph glyph="glyph.sword_clash" size={20} color="var(--gold-3)" />
            <span>{t('tavern.growth.power')}</span>
          </dt>
          <dd className={`num ${styles.values}`}>
            <span className={styles.before}>{format(growth.power.before)}</span>
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
            <span className={gain > 0 ? styles.up : styles.same}>{format(growth.power.after)}</span>
            {gain > 0 ? <span className={styles.gain}>+{format(gain)}</span> : null}
          </dd>
        </div>
      </dl>
    </div>
  );
}
