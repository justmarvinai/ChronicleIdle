import { formatDuration } from '@engine/time/clock';
import { useNow } from '@ui/hooks/useNow';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './Timer.module.css';

export interface TimerProps {
  /** Absolute time (ms) the countdown ends at; or pass `remainingMs` directly. */
  endsAt?: number;
  remainingMs?: number;
  label?: string;
  showIcon?: boolean;
  className?: string;
}

/** Countdown in the numerals font with an hourglass glyph. */
export function Timer({ endsAt, remainingMs, label, showIcon = true, className }: TimerProps) {
  const now = useNow(1000);
  const remaining = remainingMs ?? (endsAt !== undefined ? Math.max(0, endsAt - now) : 0);
  return (
    <span className={[styles.timer, className ?? ''].join(' ')}>
      {showIcon ? <Glyph glyph="glyph.hourglass" size={18} color="var(--gold-2)" /> : null}
      {label ? <span className={styles.label}>{label}</span> : null}
      <span className="num">{formatDuration(remaining)}</span>
    </span>
  );
}
