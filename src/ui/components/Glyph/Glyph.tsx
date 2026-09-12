import type { CSSProperties, HTMLAttributes } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { cssVar } from '@ui/styles/kit';
import styles from './Glyph.module.css';

export interface GlyphProps extends HTMLAttributes<HTMLSpanElement> {
  glyph: GlyphKey;
  size?: number;
  /** Any CSS colour; defaults to the current text colour. */
  color?: string;
  label?: string;
}

/** A line glyph rendered through a CSS mask so it takes any colour (status, roles, elements, nav). */
export function Glyph({
  glyph,
  size = 24,
  color = 'currentColor',
  label,
  className,
  style,
  ...rest
}: GlyphProps) {
  const mask = cssVar(glyph);
  const merged: CSSProperties = {
    width: size,
    height: size,
    backgroundColor: color,
    WebkitMaskImage: mask,
    maskImage: mask,
    ...style,
  };
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={[styles.glyph, className ?? ''].join(' ')}
      style={merged}
      {...rest}
    />
  );
}
