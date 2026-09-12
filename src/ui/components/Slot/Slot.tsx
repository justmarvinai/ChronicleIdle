import type { HTMLAttributes, ReactNode } from 'react';
import { playSfx } from '@audio/index';
import type { GlyphKey } from '@assets/manifest.generated';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { kitBorder, type KitKey } from '@ui/styles/kit';
import styles from './Slot.module.css';

export type SlotSize = 'sm' | 'md' | 'lg';

const FRAME: Record<SlotSize, { frame: KitKey; fill: KitKey; px: number }> = {
  sm: { frame: 'ui.stone_vine.slot_stone_sm', fill: 'ui.stone_vine.slot_stone_sm_fill', px: 96 },
  md: { frame: 'ui.stone_vine.slot_stone_md', fill: 'ui.stone_vine.slot_stone_md_fill', px: 128 },
  lg: { frame: 'ui.stone_vine.slot_stone_lg', fill: 'ui.stone_vine.slot_stone_lg_fill', px: 176 },
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
    <div
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
      style={{
        width: meta.px,
        height: meta.px * (meta.frame === 'ui.stone_vine.slot_stone_lg' ? 1.08 : 1.04),
        ...kitBorder(meta.frame, 0.45),
        ...style,
      }}
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
      <div className={styles.fill} style={kitBorder(meta.fill, 0.45)} aria-hidden="true" />
      <div className={styles.content}>
        {children ??
          (emptyGlyph ? (
            <Glyph glyph={emptyGlyph} size={meta.px * 0.42} color="rgba(243,236,220,0.22)" />
          ) : null)}
      </div>
      {locked ? (
        <Glyph glyph="glyph.broken_shackle" size={28} color="var(--text-3)" className={styles.lock} />
      ) : null}
    </div>
  );
}
