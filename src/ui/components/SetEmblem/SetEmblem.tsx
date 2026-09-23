import type { CSSProperties } from 'react';
import { imageUrl } from '@assets/manifest';
import type { EmblemKey } from '@assets/manifest.generated';
import styles from './SetEmblem.module.css';

export interface SetEmblemProps {
  emblem: EmblemKey;
  /** Side in CSS pixels. */
  size: number;
  /**
   * `plate` sets it on a square of dark stone, for the corner of a piece's painting: the paintings
   * are as saturated as the emblems, and Ember Guard's red emblem laid bare on Ember Guard's lava
   * is simply not there. `bare` lays it straight onto a panel, which is dark already.
   */
  kind?: 'plate' | 'bare';
  /** The set's name, for a reader that cannot see the shape; omit it where the name is printed beside. */
  label?: string | undefined;
  className?: string | undefined;
}

/**
 * A gear set's emblem (GEAR.md §5.1) — the one mark that says which set a thing belongs to, on a
 * piece wherever it turns up, on the Armoury's headings and in the Index.
 */
export function SetEmblem({ emblem, size, kind = 'bare', label, className }: SetEmblemProps) {
  // The whole game frame scales with the window (UI_DESIGN.md §2), so the file is picked for twice
  // the CSS size and stays sharp on a large screen.
  const style = { width: size, height: size, '--emblem-side': `${size}px` } as CSSProperties;
  return (
    <span
      className={[styles.emblem, styles[kind], className ?? ''].join(' ')}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-emblem={emblem}
    >
      <img src={imageUrl(emblem, size * 2)} alt="" draggable={false} decoding="async" />
    </span>
  );
}
