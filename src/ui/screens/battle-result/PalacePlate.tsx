import { t } from '@i18n/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './PalacePlate.module.css';

/**
 * A skill point earned (GLORIOUS_PALACE.md §3). It is a button rather than a line: the point is no
 * use where it was won, and the Palace is two screens away from here.
 */
export function PalacePlate({ points, onOpen }: { points: number; onOpen: () => void }) {
  return (
    <button type="button" className={styles.palace} onClick={onOpen} data-testid="result-palace-points">
      <Glyph glyph="glyph.arcane_symbol" size={26} color="var(--r-epic)" />
      <span className={`display ${styles.label}`}>{t('palace.title')}</span>
      <span className={`num ${styles.value}`}>
        {t(points === 1 ? 'palace.pointsEarned' : 'palace.pointsEarnedPlural', { count: points })}
      </span>
    </button>
  );
}
