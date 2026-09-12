import { t } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

export function NewGameConfirmDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  return (
    <Dialog
      title={t('title.newChronicle')}
      onClose={onClose}
      width={680}
      testId="dialog-new-game-confirm"
      footer={
        <>
          <Button variant="ghost" sound="ui.cancel" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            onClick={() => actions.openDialog({ name: 'new-game' })}
            data-testid="confirm-overwrite"
          >
            {t('common.continue')}
          </Button>
        </>
      }
    >
      <p className={styles.body}>{t('title.newChronicle.warning')}</p>
    </Dialog>
  );
}
