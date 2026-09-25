import { useState } from 'react';
import { playSfx } from '@audio/index';
import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { loginView } from '@state/login';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { useNow } from '@ui/hooks/useNow';
import { LoginHero } from './LoginHero';
import { LoginTile } from './LoginTile';
import styles from './LoginDialog.module.css';

/**
 * Daily Rewards (docs/tech/UI_DESIGN.md §5.27): the day in question large on the left, with the one
 * press on the board, and the whole round of thirty on the right — every day visible at once, each
 * in its tier's colour and with what it pays drawn as reward slots.
 *
 * The line on the panel is the whole design in a sentence — **a day is a day you came**, so missing
 * one costs nothing. Saying it on the board matters: a player who has met a login calendar before
 * will assume there is a streak to protect, and will feel punished by a day they missed that in
 * fact cost them nothing.
 */
export function LoginDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const now = useNow(1000);
  const [took, setTook] = useState<number | null>(null);
  if (!save) return null;
  const view = loginView(save, now);

  const claim = (): void => {
    const result = actions.claimLoginDay();
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.large');
    setTook(result.value.day);
  };

  return (
    <Dialog title={t('login.title')} onClose={onClose} width={1600} testId="dialog-login">
      <div className={styles.layout}>
        <LoginHero view={view} took={took} onClaim={claim} />

        <section className={styles.round}>
          <header className={styles.head}>
            <span className={`display ${styles.subtitle}`}>{t('login.subtitle')}</span>
            <span className={`num ${styles.cycle}`} data-testid="login-cycle">
              {t('login.cycle', { cycle: view.cycle })}
            </span>
          </header>
          <ol className={styles.board} data-testid="login-board">
            {view.tiles.map((tile) => (
              <LoginTile
                key={tile.day}
                tile={tile}
                next={!view.claimable && tile.day === view.pending}
                justTaken={tile.day === took}
              />
            ))}
          </ol>
          <p className={`num ${styles.foot}`} data-testid="login-foot">
            {took !== null
              ? t('login.tookIt', { day: took })
              : view.claimable
                ? t('login.finale')
                : t('login.nextIn', { time: formatDuration(view.nextIn) })}
          </p>
        </section>
      </div>
    </Dialog>
  );
}
