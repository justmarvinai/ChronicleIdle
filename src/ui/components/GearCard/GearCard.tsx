import type { SpellKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import { RARITY_HEX, SLOT_GLYPH, type GearSlot, type Rarity } from '@ui/styles/display-maps';
import styles from './GearCard.module.css';

export interface GearCardProps {
  rarity: Rarity;
  stars: number;
  level: number;
  slot: GearSlot;
  icon: SpellKey;
  mainStat: string;
  setName?: string;
  size?: 96 | 128;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
}

/** Gear piece card: rarity frame, painted icon, stars, +level badge and slot glyph. */
export function GearCard({
  rarity,
  stars,
  level,
  slot,
  icon,
  mainStat,
  setName,
  size = 128,
  selected,
  locked,
  onClick,
}: GearCardProps) {
  const color = RARITY_HEX[rarity];
  const interactive = !!onClick;
  return (
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
      <AssetImage asset={icon} size="full" className={styles.art} />
      <div className={styles.shade} />
      <div className={styles.stars}>
        <StarRow stars={stars} max={6} size={Math.max(10, size * 0.1)} tone="rarity" tint={color} />
      </div>
      <span className={styles.slot}>
        <Glyph glyph={SLOT_GLYPH[slot]} size={size * 0.16} color="var(--text-2)" label={slot} />
      </span>
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
}
