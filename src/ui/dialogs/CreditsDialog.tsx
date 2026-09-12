import { t } from '@i18n/index';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

export function CreditsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title={t('credits.title')} onClose={onClose} width={720} testId="dialog-credits">
      <p className={styles.credits}>{t('credits.body')}</p>
    </Dialog>
  );
}
