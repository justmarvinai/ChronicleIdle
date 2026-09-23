import type { ReactNode } from 'react';
import styles from './FillRing.module.css';

export interface FillRingProps {
  /** 0..1 of the ring drawn. */
  fraction: number;
  size: number;
  /** Ring thickness in virtual px. */
  thickness?: number;
  /** CSS colour of the filled arc; the track behind it is always the dark carved groove. */
  color?: string;
  children?: ReactNode;
  className?: string;
}

/** Radius of the drawn circle in the 100×100 view box, leaving room for the stroke. */
const R = 46;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * A progress ring for round chrome (the Idle Chest at the docks). An SVG arc rather than a masked
 * gradient: it is exact at any size, keeps its thickness when the viewport scales, and cannot be
 * defeated by a mask the renderer decides to ignore.
 */
export function FillRing({
  fraction,
  size,
  thickness = 4,
  color = 'var(--gold-3)',
  children,
  className,
}: FillRingProps) {
  const clamped = Math.max(0, Math.min(1, fraction));
  // The stroke is in view-box units, so the ring keeps its on-screen thickness at any size.
  const stroke = (thickness / size) * 100;
  return (
    <span className={[styles.ring, className ?? ''].join(' ')} style={{ width: size, height: size }}>
      <svg className={styles.svg} viewBox="0 0 100 100" aria-hidden="true">
        <circle className={styles.track} cx="50" cy="50" r={R} strokeWidth={stroke} />
        <circle
          className={styles.arc}
          cx="50"
          cy="50"
          r={R}
          strokeWidth={stroke}
          stroke={color}
          // A round cap would draw a dot at zero; an empty ring shows only its groove.
          strokeOpacity={clamped > 0 ? 1 : 0}
          strokeDasharray={`${clamped * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      {children}
    </span>
  );
}
