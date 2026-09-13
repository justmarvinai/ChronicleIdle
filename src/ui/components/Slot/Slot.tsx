import type { HTMLAttributes, ReactNode } from 'react';
import { playSfx } from '@audio/index';
import type { GlyphKey } from '@assets/manifest.generated';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { KitSurface } from '@ui/components/Frame/KitSurface';
import type { KitKey } from '@ui/styles/kit';
import styles from './Slot.module.css';

export type SlotSize = 'sm' | 'md' | 'lg';

const SCALE = 0.45;

const FRAME: Record<SlotSize, { frame: KitKey; fill: KitKey; px: number; aspect: number }> = {
  sm: {
    frame: 'ui.stone_vine.slot_stone_sm',
    fill: 'ui.stone_vine.slot_stone_sm_fill',
    px: 96,
    aspect: 1.04,
  },
  md: {
    frame: 'ui.stone_vine.slot_stone_md',
    fill: 'ui.stone_vine.slot_stone_md_fill',
    px: 128,
    aspect: 1.04,
  },
  lg: {
    frame: 'ui.stone_vine.slot_stone_lg',
    fill: 'ui.stone_vine.slot_stone_lg_fill',
    px: 176,
    aspect: 1.08,
  },
};

export interface SlotProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  size?: SlotSize;
  /** Glyph shown when the slot is empty. */
  emptyGlyph?: GlyphKey;
  label?: string;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

/** Stone slot (team, gear, brew): a framed square with an empty-state glyph. */
export function Slot({
  size = 'md',
  emptyGlyph,
  label,
  selected,
  locked,
  onClick,
  children,
  className,
  style,
  ...rest
}: SlotProps) {
  const meta = FRAME[size];
  const interactive = !!onClick && !locked;
  return (
    <KitSurface
      frame={meta.frame}
      scale={SCALE}
      fill={meta.fill}
      fillScale={SCALE}
      contentClassName={styles.inner}
      role={onClick ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      aria-disabled={locked || undefined}
      className={[
        styles.slot,
        selected ? styles.selected : '',
        locked ? styles.locked : '',
        interactive ? styles.interactive : '',
        className ?? '',
      ].join(' ')}
      style={{ width: meta.px, height: meta.px * meta.aspect, ...style }}
      onMouseEnter={() => interactive && playSfx('ui.hover')}
      onClick={() => interactive && (playSfx('ui.tab'), onClick())}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      {...rest}
    >
      {children ??
        (emptyGlyph ? (
          <Glyph glyph={emptyGlyph} size={meta.px * 0.42} color="rgba(243,236,220,0.22)" />
        ) : null)}
      {locked ? (
        <Glyph glyph="glyph.broken_shackle" size={24} color="var(--text-3)" className={styles.lock} />
      ) : null}
    </KitSurface>
  );
}
