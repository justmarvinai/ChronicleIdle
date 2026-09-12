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
}

/** Row of kit stars; earned ones glow, the rest are dark. */
export function StarRow({ stars, max = 6, size = 18, tone = 'gold', tint, className }: StarRowProps) {
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
          className={[styles.star, i < stars ? styles.on : styles.off].join(' ')}
          style={{
            width: size,
            height: size,
            backgroundImage: `url("${url}")`,
            ...(i < stars && tone === 'rarity' && tint ? { filter: `drop-shadow(0 0 3px ${tint})` } : {}),
          }}
        />
      ))}
    </span>
  );
}
