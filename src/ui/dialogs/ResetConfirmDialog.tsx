import { useState } from 'react';
import { t } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { resetChronicle } from '@ui/flows/resetChronicle';
import styles from './dialogs.module.css';

export function ResetConfirmDialog({ onClose }: { onClose: () => void }) {
  const word = t('settings.reset.word');
  const [typed, setTyped] = useState('');
  return (
    <Dialog
      title={t('settings.reset')}
      onClose={onClose}
      width={680}
      testId="dialog-reset-confirm"
      footer={
        <>
          <Button variant="ghost" sound="ui.cancel" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={typed !== word}
            sound="ui.error"
            onClick={() => void resetChronicle()}
            data-testid="confirm-reset"
          >
            {t('settings.reset.confirm')}
          </Button>
        </>
      }
    >
      <p className={styles.body}>{t('settings.reset.body', { word })}</p>
      <input
        className={styles.input}
        value={typed}
        onChange={(e) => setTyped(e.target.value.toUpperCase())}
        aria-label={word}
        data-testid="reset-input"
      />
    </Dialog>
  );
}
