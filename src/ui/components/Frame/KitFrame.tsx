import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { kitBorder, type KitKey } from '@ui/styles/kit';
import styles from './Frame.module.css';

export interface KitFrameProps extends HTMLAttributes<HTMLDivElement> {
  kit: KitKey;
  scale?: number;
  /** Optional filled texture drawn behind the content (e.g. `ui.dark_ember.bg_wide`). */
  fill?: KitKey;
  fillScale?: number;
  padding?: number | string;
  children?: ReactNode;
}

/** A 9-sliced kit texture as a container (frames, panels, bars). */
export function KitFrame({
  kit,
  scale = 0.5,
  fill,
  fillScale = 0.5,
  padding,
  className,
  style,
  children,
  ...rest
}: KitFrameProps) {
  const border = kitBorder(kit, scale);
  const merged: CSSProperties = { ...border, padding, ...style };
  return (
    <div className={[styles.kit, className ?? ''].join(' ')} style={merged} {...rest}>
      {fill ? <div className={styles.fill} style={kitBorder(fill, fillScale)} aria-hidden="true" /> : null}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
