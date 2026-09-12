import type { DecodedChronicle } from '@state/chronicle-file';
import { t } from '@i18n/index';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { applyImportedChronicle } from '@ui/flows/importChronicle';
import styles from './dialogs.module.css';

export function ImportConfirmDialog({
  decoded,
  fileName,
  onClose,
}: {
  decoded: DecodedChronicle;
  fileName: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      title={t('save.import.title')}
      onClose={onClose}
      width={720}
      testId="dialog-import-confirm"
      footer={
        <>
          <Button variant="ghost" sound="ui.cancel" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => void applyImportedChronicle(decoded)}
            data-testid="confirm-import"
          >
            {t('save.import.confirm')}
          </Button>
        </>
      }
    >
      <p className={styles.body}>{t('save.import.body')}</p>
      <p className={`display ${styles.rowValue}`}>
        {t('save.import.summary', {
          name: decoded.save.profile.name,
          level: decoded.save.profile.level,
          date: new Date(decoded.save.updatedAt).toLocaleString(),
        })}
      </p>
      <p className={styles.hint}>{fileName}</p>
    </Dialog>
  );
}
