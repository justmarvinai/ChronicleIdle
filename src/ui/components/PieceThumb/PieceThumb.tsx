import type { CSSProperties } from 'react';
import type { EmblemKey, GearArtKey } from '@assets/manifest.generated';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import styles from './PieceThumb.module.css';

/** The emblem's plate as a share of the thumbnail: large enough to read, small enough to leave the painting. */
const EMBLEM_SHARE = 0.46;

export interface PieceThumbProps {
  art: GearArtKey | null;
  /** Badged in the corner where the piece stands alone; left off where its set is named beside it. */
  emblem?: EmblemKey | null;
  /** The frame's colour: a piece's rarity, or gold for the Index's catalogue of a set. */
  tint: string;
  /** Side in CSS pixels. */
  size: number;
  className?: string | undefined;
}

/**
 * A piece's painting at list size, framed in a hairline of `tint` — for the places a full card
 * would be a wall: the drops under a campaign result, the six pieces of a set in the Index.
 */
export function PieceThumb({ art, emblem = null, tint, size, className }: PieceThumbProps) {
  const style = { width: size, height: size, '--thumb-tint': tint } as CSSProperties;
  return (
    <span className={[styles.thumb, className ?? ''].join(' ')} style={style}>
      {art ? <AssetImage asset={art} size={size * 2} className={styles.art} /> : null}
      {emblem ? (
        <SetEmblem
          emblem={emblem}
          size={Math.round(size * EMBLEM_SHARE)}
          kind="plate"
          className={styles.emblem}
        />
      ) : null}
    </span>
  );
}
