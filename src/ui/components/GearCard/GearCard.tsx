import type { ReactNode } from 'react';
import type { EmblemKey, GearArtKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { RARITY_HEX, SLOT_GLYPH, type GearSlot, type Rarity } from '@ui/styles/display-maps';
import styles from './GearCard.module.css';

/** The emblem's plate as a share of the card's side: ~33 px on a 128 card, ~25 px on a 96. */
const EMBLEM_SHARE = 0.26;

export interface GearCardProps {
  rarity: Rarity;
  stars: number;
  level: number;
  slot: GearSlot;
  /** The piece's own painting; null only for a piece whose set no longer exists. */
  art: GearArtKey | null;
  /** Its set's emblem, badged in the corner so a piece names its set wherever it turns up. */
  emblem: EmblemKey | null;
  mainStat: string;
  setName?: string;
  size?: 96 | 128;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
  /** What the piece is, shown on hover — `GearTooltip` wherever a card stands for a real piece. */
  tooltip?: ReactNode;
  /** The tooltip's width, when it has one. */
  tooltipWidth?: number;
}

/**
 * Gear piece card: rarity frame, the piece's painting, stars, +level badge and its set's emblem.
 * The painting shows the slot by itself — a helmet is a helmet — which is why the corner that used
 * to carry a slot glyph now carries the set, the one thing the painting cannot say.
 */
export function GearCard({
  rarity,
  stars,
  level,
  slot,
  art,
  emblem,
  mainStat,
  setName,
  size = 128,
  selected,
  locked,
  onClick,
  tooltip,
  tooltipWidth,
}: GearCardProps) {
  const color = RARITY_HEX[rarity];
  const interactive = !!onClick;
  const card = (
    <DecoFrame
      frame={10}
      tint={color}
      thickness={12}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${setName ?? ''} ${slot} ${rarity} +${level}`}
      className={[styles.card, selected ? styles.selected : '', interactive ? styles.interactive : ''].join(
        ' ',
      )}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && playSfx('ui.hover')}
      onClick={() => interactive && (playSfx('ui.tab'), onClick())}
    >
      {art ? (
        // 256 for a card of 96 or 128: the frame scales with the window, so twice the side.
        <AssetImage asset={art} size={256} className={styles.art} />
      ) : (
        <Glyph glyph={SLOT_GLYPH[slot]} size={size * 0.4} color="var(--text-3)" className={styles.orphan} />
      )}
      <div className={styles.shade} />
      <div className={styles.stars}>
        <StarRow stars={stars} max={6} size={Math.max(10, size * 0.1)} tone="rarity" tint={color} />
      </div>
      {emblem ? (
        <SetEmblem
          emblem={emblem}
          size={Math.round(size * EMBLEM_SHARE)}
          kind="plate"
          className={styles.emblem}
        />
      ) : null}
      <span className={`num ${styles.level}`}>+{level}</span>
      <span className={styles.main}>{mainStat}</span>
      {locked ? (
        <Glyph
          glyph="glyph.broken_shackle"
          size={size * 0.16}
          color="var(--text-1)"
          className={styles.lock}
          label="locked"
        />
      ) : null}
    </DecoFrame>
  );
  return tooltip ? (
    <Tooltip content={tooltip} {...(tooltipWidth ? { maxWidth: tooltipWidth } : {})}>
      {card}
    </Tooltip>
  ) : (
    card
  );
}
