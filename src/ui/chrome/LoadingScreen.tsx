import { t } from '@i18n/index';
import { Bar } from '@ui/components/Bar/Bar';
import { BOOT_ASSETS } from '@assets/manifest.generated';
import styles from './LoadingScreen.module.css';

/** Cold-start screen: logo over the dark ground with the asset progress bar. */
export function LoadingScreen({ progress, label }: { progress: number; label?: string }) {
  const pct = Math.round(progress * 100);
  return (
    <div className={styles.root} data-testid="loading-screen">
      <img src={BOOT_ASSETS.logo} alt={t('app.name')} className={styles.logo} draggable={false} />
      <div className={styles.progress}>
        <Bar
          value={pct}
          max={100}
          kind="ember"
          height={40}
          width={520}
          label={label ?? t('app.loading.assets', { percent: pct })}
        />
      </div>
    </div>
  );
}
