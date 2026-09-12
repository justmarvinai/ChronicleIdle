import styles from './NotificationDot.module.css';

export interface NotificationDotProps {
  count?: number;
  className?: string;
}

/** Pulsing ember dot for "something to do" markers. */
export function NotificationDot({ count, className }: NotificationDotProps) {
  return (
    <span
      className={[styles.dot, count ? styles.withCount : '', className ?? ''].join(' ')}
      aria-hidden="true"
    >
      {count ? <span className={`num ${styles.count}`}>{count > 99 ? '99+' : count}</span> : null}
    </span>
  );
}
