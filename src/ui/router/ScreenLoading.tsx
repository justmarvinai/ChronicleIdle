import { t } from '@i18n/index';
import styles from './ScreenLoading.module.css';

/** Shown while a screen chunk or its asset group loads: an ember ring on the dark ground. */
export function ScreenLoading({ label }: { label?: string }) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={styles.ring} aria-hidden="true" />
      <div className={`display ${styles.label}`}>{label ?? t('app.loading')}</div>
    </div>
  );
}
