import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { IconButton } from '@ui/components/Button/IconButton';
import { kitBorder } from '@ui/styles/kit';
import styles from './Dialog.module.css';

export interface DialogProps {
  title: string;
  onClose?: () => void;
  width?: number;
  /** Hide the close button (confirmations with explicit choices). */
  dismissible?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Modal dialog on the dimmed stage: ember frame, banner title, focus trap, Esc to close. */
export function Dialog({
  title,
  onClose,
  width = 760,
  dismissible = true,
  children,
  footer,
  testId,
}: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    playSfx('ui.open');
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    return () => {
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && dismissible && onClose) {
        e.stopPropagation();
        playSfx('ui.close');
        onClose();
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const firstEl = items[0] as HTMLElement;
        const lastEl = items[items.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [dismissible, onClose]);

  return (
    <motion.div
      className={styles.scrim}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={() => dismissible && onClose && (playSfx('ui.close'), onClose())}
    >
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        tabIndex={-1}
        className={styles.panel}
        style={{ width, ...kitBorder('ui.dark_ember.frame_wide', 0.7) }}
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.fill} style={kitBorder('ui.dark_ember.bg_wide', 0.5)} aria-hidden="true" />
        <header className={styles.header}>
          <div className={styles.banner} style={kitBorder('ui.dark_ember.banner_plain', 0.3)}>
            <h2 className={`display ${styles.title}`}>{title}</h2>
          </div>
          {dismissible && onClose ? (
            <IconButton
              kind="close"
              label={t('common.close')}
              size={56}
              sound="ui.close"
              onClick={onClose}
              className={styles.close}
            />
          ) : null}
        </header>
        <div className={styles.body}>{children}</div>
        {footer ? <footer className={styles.footer}>{footer}</footer> : null}
      </motion.div>
    </motion.div>
  );
}
