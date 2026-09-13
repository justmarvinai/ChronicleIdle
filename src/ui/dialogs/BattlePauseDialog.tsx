import { useState } from 'react';
import { battleController } from '@state/battle/index';
import { t } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

/** Pause menu (docs/tech/UI_DESIGN.md §5.9): resume, settings, retreat with a confirmation. */
export function BattlePauseDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const [confirming, setConfirming] = useState(false);
  const resume = (): void => {
    battleController.setPaused(false);
    onClose();
  };
  return (
    <Dialog title={t('pause.title')} onClose={resume} width={520} testId="dialog-battle-pause">
      <div className={styles.stack}>
        <Button variant="primary" size="lg" onClick={resume} data-testid="pause-resume">
          {t('pause.resume')}
        </Button>
        <Button
          variant="secondary"
          size="md"
          onClick={() => actions.openDialog({ name: 'settings' })}
          data-testid="pause-settings"
        >
          {t('pause.settings')}
        </Button>
        {confirming ? (
          <div className={styles.confirmRow}>
            <p className={styles.hint}>{t('pause.retreatConfirm')}</p>
            <Button
              variant="danger"
              size="md"
              onClick={() => (battleController.retreat(), onClose())}
              data-testid="pause-retreat-confirm"
            >
              {t('pause.retreatYes')}
            </Button>
            <Button variant="secondary" size="md" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="md"
            sound="ui.cancel"
            onClick={() => setConfirming(true)}
            data-testid="pause-retreat"
          >
            {t('pause.retreat')}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
