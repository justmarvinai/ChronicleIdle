import { imageUrl } from '@assets/manifest';
import styles from './StarRow.module.css';

export interface StarRowProps {
  stars: number;
  max?: number;
  size?: number;
  /** Colour class for the earned stars: gold (rank) or the rarity's tint. */
  tone?: 'gold' | 'rarity';
  tint?: string;
  className?: string;
  /**
   * Milliseconds before the earned stars pop in, one after another (`POP_STEP_MS` apart) — a
   * freshly summoned card (SUMMONING.md §5.3). Absent: they are simply there.
   */
  popAfter?: number;
}

/** Milliseconds between two stars popping in. */
export const POP_STEP_MS = 110;

/** Row of kit stars; earned ones glow, the rest are dark. */
export function StarRow({
  stars,
  max = 6,
  size = 18,
  tone = 'gold',
  tint,
  className,
  popAfter,
}: StarRowProps) {
  const url = imageUrl('ui.stone_vine.icon_star');
  return (
    <span
      className={[styles.row, className ?? ''].join(' ')}
      role="img"
      aria-label={`${stars} of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={[
            styles.star,
            i < stars ? styles.on : styles.off,
            i < stars && popAfter !== undefined ? styles.pop : '',
          ].join(' ')}
          style={{
            width: size,
            height: size,
            backgroundImage: `url("${url}")`,
            ...(i < stars && tone === 'rarity' && tint ? { filter: `drop-shadow(0 0 3px ${tint})` } : {}),
            ...(i < stars && popAfter !== undefined
              ? { animationDelay: `${popAfter + i * POP_STEP_MS}ms` }
              : {}),
          }}
        />
      ))}
    </span>
  );
}
