import type { CSSProperties } from 'react';
import { imageUrl } from '@assets/manifest';
import type { AssetKey } from '@assets/manifest.generated';
import styles from './TintedIcon.module.css';

export interface TintedIconProps {
  asset: AssetKey;
  size?: number | undefined;
  /** CSS colour multiplied over the icon (brews, tomes, keys share one icon). */
  tint?: string | undefined;
  label?: string | undefined;
  className?: string | undefined;
}

/** Painted icon with an optional colour tint (multiply blend masked to the icon's own alpha). */
export function TintedIcon({ asset, size = 32, tint, label, className }: TintedIconProps) {
  const url = imageUrl(asset, 'thumb');
  const style: CSSProperties = { width: size, height: size, backgroundImage: `url("${url}")` };
  const overlay: CSSProperties | undefined = tint
    ? { backgroundColor: tint, WebkitMaskImage: `url("${url}")`, maskImage: `url("${url}")` }
    : undefined;
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={[styles.icon, className ?? ''].join(' ')}
      style={style}
    >
      {overlay ? <span className={styles.tint} style={overlay} /> : null}
    </span>
  );
}
