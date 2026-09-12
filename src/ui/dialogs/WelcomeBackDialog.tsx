import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

export function WelcomeBackDialog({ onClose }: { onClose: () => void }) {
  const report = useGameStore((s) => s.lastOffline);
  if (!report) return null;
  return (
    <Dialog
      title={t('welcome.title')}
      onClose={onClose}
      width={640}
      testId="dialog-welcome-back"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('common.continue')}
        </Button>
      }
    >
      <p className={styles.body}>{t('welcome.body', { time: formatDuration(report.elapsedMs) })}</p>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('welcome.energy')}</span>
        <span className={`num ${styles.rowValue}`}>+{report.energyGained}</span>
      </div>
    </Dialog>
  );
}
