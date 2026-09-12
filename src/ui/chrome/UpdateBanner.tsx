import { AnimatePresence, motion } from 'motion/react';
import { t } from '@i18n/index';
import { selectActions } from '@state/selectors';
import { services, servicesReady } from '@state/services';
import { useGameStore } from '@state/store';
import { Button } from '@ui/components/Button/Button';
import { kitBorder } from '@ui/styles/kit';
import styles from './UpdateBanner.module.css';

/** "A new chapter is ready": prompt-style PWA update, never applied without consent. */
export function UpdateBanner() {
  const visible = useGameStore((s) => s.ui.updateAvailable);
  const actions = useGameStore(selectActions);
  const restart = async (): Promise<void> => {
    if (servicesReady()) {
      await services().persistence.flush();
      await services().applyUpdate();
    } else window.location.reload();
  };
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className={styles.banner}
          style={kitBorder('ui.dark_ember.frame_sm_thin', 0.35)}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          role="status"
          data-testid="update-banner"
        >
          <div
            className={styles.fill}
            style={kitBorder('ui.dark_ember.bg_tile_sm', 0.5)}
            aria-hidden="true"
          />
          <div className={styles.content}>
            <div>
              <div className={`display ${styles.title}`}>{t('app.update.title')}</div>
              <div className={styles.body}>{t('app.update.body')}</div>
            </div>
            <div className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                sound="ui.cancel"
                onClick={() => actions.setUpdateAvailable(false)}
              >
                {t('app.update.later')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => void restart()}>
                {t('app.update.restart')}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
