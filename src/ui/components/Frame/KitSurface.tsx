import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { kitBorder, kitFillInset, kitWidths, type KitKey } from '@ui/styles/kit';
import styles from './Frame.module.css';

export interface KitSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Hollow 9-slice frame drawn on top. */
  frame: KitKey;
  scale?: number;
  /** Filled texture drawn underneath, bleeding under the frame's ring. */
  fill?: KitKey | undefined;
  fillScale?: number;
  /** Padding inside the frame's ring; the ring's own thickness is added to it. */
  padding?: number;
  /** Layout classes for the content box (the frame and fill layers stay untouched). */
  contentClassName?: string | undefined;
  children?: ReactNode;
}

/**
 * A kit frame over a kit fill (docs/tech/UI_DESIGN.md §4).
 *
 * The frame is its own layer *above* the fill rather than the surface's `border-image`: a
 * positioned child always paints above its parent's border, so a fill can never reach under the
 * ring, and every panel showed a ring of backdrop between frame and texture. Here the fill starts
 * at the frame's measured corner inset (`kitFillInset`) and the frame hides its edges.
 */
export function KitSurface({
  frame,
  scale = 0.5,
  fill,
  fillScale = 0.5,
  padding = 0,
  contentClassName,
  className,
  style,
  children,
  ...rest
}: KitSurfaceProps) {
  const [top, right, bottom, left] = kitWidths(frame, scale);
  const inset = kitFillInset(frame, scale);
  const content: CSSProperties = {
    paddingTop: top + padding,
    paddingRight: right + padding,
    paddingBottom: bottom + padding,
    paddingLeft: left + padding,
  };
  return (
    <div className={[styles.surface, className ?? ''].join(' ')} style={style} {...rest}>
      {fill ? (
        <div className={styles.fill} style={{ inset, ...kitBorder(fill, fillScale) }} aria-hidden="true" />
      ) : null}
      <div className={styles.frame} style={kitBorder(frame, scale)} aria-hidden="true" />
      <div
        className={[styles.content, contentClassName ?? ''].join(' ')}
        style={content}
        data-surface-content=""
      >
        {children}
      </div>
    </div>
  );
}
