import { useState } from 'react';
import { PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH } from '@content/balance/economy';
import { t } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { startNewChronicle } from '@ui/flows/newChronicle';
import styles from './dialogs.module.css';

export function NewGameDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    const result = await startNewChronicle(name);
    if (!result.ok) {
      const key = result.error.message as 'tooShort' | 'tooLong' | 'invalid';
      setError(
        key === 'tooShort'
          ? t('newGame.error.tooShort', { min: PLAYER_NAME_MIN_LENGTH })
          : key === 'tooLong'
            ? t('newGame.error.tooLong', { max: PLAYER_NAME_MAX_LENGTH })
            : t('newGame.error.invalid'),
      );
      actions.toast('error', 'newGame.error.invalid');
    }
  };

  return (
    <Dialog
      title={t('newGame.title')}
      onClose={onClose}
      width={720}
      testId="dialog-new-game"
      footer={
        <Button variant="primary" size="lg" onClick={() => void submit()} data-testid="begin-chronicle">
          {t('newGame.begin')}
        </Button>
      }
    >
      <p className={styles.body}>{t('newGame.body')}</p>
      <input
        className={styles.input}
        placeholder={t('newGame.placeholder')}
        value={name}
        maxLength={PLAYER_NAME_MAX_LENGTH}
        autoFocus
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => e.key === 'Enter' && void submit()}
        aria-label={t('newGame.placeholder')}
        data-testid="name-input"
      />
      <div className={styles.error} role="alert">
        {error}
      </div>
    </Dialog>
  );
}
