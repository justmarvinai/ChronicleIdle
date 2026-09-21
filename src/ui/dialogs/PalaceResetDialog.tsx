import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { palaceLedgerOf, selectActions, selectPalaceSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

/**
 * Last word before the Glorious Palace goes dark. The reset is free and can be done any time
 * (the owner's answer), so this asks once and takes no toll — it is here because darkening a
 * tree somebody spent an evening on should never be one stray click away.
 */
export function PalaceResetDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const palace = useGameStore(selectPalaceSave);
  const spent = palace ? palaceLedgerOf(palace).spent : 0;
  return (
    <Dialog
      title={t('palace.resetConfirm.title')}
      onClose={onClose}
      width={640}
      testId="dialog-palace-reset"
      footer={
        <>
          <Button variant="ghost" sound="ui.cancel" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            disabled={spent === 0}
            onClick={() => {
              const result = actions.resetPalace();
              playSfx(result.ok ? 'gate.open' : 'ui.error');
              onClose();
            }}
            data-testid="confirm-palace-reset"
          >
            {t('palace.resetConfirm.confirm')}
          </Button>
        </>
      }
    >
      <p className={styles.body}>
        {spent === 0 ? t('palace.resetNothing') : t('palace.resetConfirm.body', { count: spent })}
      </p>
    </Dialog>
  );
}
