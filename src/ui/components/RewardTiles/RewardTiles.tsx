import type { CSSProperties } from 'react';
import type { RewardTile } from './reward-tile';
import styles from './RewardTiles.module.css';

/** The beat between one tile landing and the next, in milliseconds. */
const TILE_STEP = 60;

export interface RewardTilesProps {
  tiles: readonly RewardTile[];
  /** Tiles to a row; a result's side panel holds four. */
  columns?: number;
  testId?: string;
}

/**
 * What a fight pays as tiles (docs/tech/UI_DESIGN.md §5.10), landing one after another. Every
 * result draws its spoils this way whatever the mode, and a screen that previews a fight's pay —
 * a tower floor's dossier — draws it the same way, so the two read alike.
 */
export function RewardTiles({ tiles, columns = 4, testId }: RewardTilesProps) {
  /** The `n`th tile lands a beat after the one before it. */
  const delay = (n: number): CSSProperties => ({ animationDelay: `${(n + 1) * TILE_STEP}ms` });
  return (
    <ul className={styles.tiles} style={{ '--cols': columns } as CSSProperties} data-testid={testId}>
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
