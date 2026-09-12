import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import { selectActions, selectToasts } from '@state/selectors';
import { useGameStore } from '@state/store';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { kitBorder } from '@ui/styles/kit';
import styles from './ToastHost.module.css';

const LIFETIME_MS = 4200;

/** Stacked notifications (info, reward bursts, errors) in the top-right of the stage. */
export function ToastHost() {
  const toasts = useGameStore(selectToasts);
  const { dismissToast } = useGameStore(selectActions);

  useEffect(() => {
    if (toasts.length === 0) return;
    const oldest = toasts[0];
    if (!oldest) return;
    const remaining = Math.max(0, LIFETIME_MS - (Date.now() - oldest.createdAt));
    const id = setTimeout(() => dismissToast(oldest.id), remaining);
    return () => clearTimeout(id);
  }, [toasts, dismissToast]);

  return (
    <div className={styles.host} aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className={[styles.toast, styles[toast.kind]].join(' ')}
            style={kitBorder('ui.dark_ember.frame_sm_thin', 0.35)}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            onClick={() => dismissToast(toast.id)}
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            <div
              className={styles.fill}
              style={kitBorder('ui.dark_ember.bg_tile_sm', 0.5)}
              aria-hidden="true"
            />
            <div className={styles.content}>
              <div className={styles.text}>{t(toast.textKey, toast.params)}</div>
              {toast.rewards?.length ? (
                <div className={styles.rewards}>
                  {toast.rewards.map((r) => {
                    const def = CURRENCY_BY_ID[r.currency];
                    return (
                      <span key={r.currency} className={styles.reward} title={translate(def.name)}>
                        <TintedIcon asset={def.icon} tint={def.tint} size={26} />
                        <span className="num">+{formatAmount(r.amount)}</span>
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
