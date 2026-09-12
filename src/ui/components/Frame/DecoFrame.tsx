import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useDecoTint } from '@ui/hooks/useDecoTint';
import { DECO_SLICE, decoKey, type DecoVariant } from '@ui/styles/kit';
import styles from './Frame.module.css';

export type { DecoVariant } from '@ui/styles/kit';

export interface DecoFrameProps extends HTMLAttributes<HTMLDivElement> {
  /** Frame number 1–32 of the pixel deco set. */
  frame: number;
  variant?: DecoVariant;
  /** CSS colour; null keeps the ivory source. */
  tint?: string | null;
  /** Border thickness in virtual px (source corners are 32 px; 16 draws them at 2:1, 32 at 1:1). */
  thickness?: number;
  padding?: number | string;
  background?: string;
  children?: ReactNode;
}

/** Pixel-art ornamental frame, tinted at runtime (rarity colours, gold, ember). */
export function DecoFrame({
  frame,
  variant = 'solid',
  tint = null,
  thickness = 16,
  padding,
  background,
  className,
  style,
  children,
  ...rest
}: DecoFrameProps) {
  const url = useDecoTint(decoKey(frame, variant), tint);
  const merged: CSSProperties = {
    borderStyle: 'solid',
    borderWidth: thickness,
    borderImageSource: `url("${url}")`,
    borderImageSlice: String(DECO_SLICE),
    // React emits `border-image-width` without a unit, and a unitless value is a multiple of the
    // border width (16 → 256 px slabs), so the unit is explicit here.
    borderImageWidth: `${thickness}px`,
    borderImageRepeat: 'stretch',
    padding,
    background,
    ...style,
  };
  return (
    <div className={[styles.deco, 'pixel', className ?? ''].join(' ')} style={merged} {...rest}>
      {children}
    </div>
  );
}
