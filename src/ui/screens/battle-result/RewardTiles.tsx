import type { CSSProperties } from 'react';
import type { RewardTile } from './reward-tile';
import styles from './RewardTiles.module.css';

/** The beat between one tile landing and the next, in milliseconds. */
const TILE_STEP = 60;

/**
 * What a fight paid as tiles, four to a row (docs/tech/UI_DESIGN.md §5.10), landing one after
 * another. Every result draws its spoils this way, whatever the mode.
 */
export function RewardTiles({ tiles, testId }: { tiles: readonly RewardTile[]; testId?: string }) {
  /** The `n`th tile lands a beat after the one before it. */
  const delay = (n: number): CSSProperties => ({ animationDelay: `${(n + 1) * TILE_STEP}ms` });
  return (
    <ul className={styles.tiles} data-testid={testId}>
      {tiles.map((tile, n) => (
        <li key={tile.id} className={[styles.tile, styles[tile.tone]].join(' ')} style={delay(n)}>
          {tile.icon}
          <span className={`num ${styles.amount}`}>{tile.amount}</span>
          <span className={styles.name}>{tile.label}</span>
        </li>
      ))}
    </ul>
  );
}
