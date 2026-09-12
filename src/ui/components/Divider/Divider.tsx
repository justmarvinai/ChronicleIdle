import { imageUrl } from '@assets/manifest';
import type { DecoKey } from '@assets/manifest.generated';
import { useDecoTint } from '@ui/hooks/useDecoTint';
import styles from './Divider.module.css';

export interface DividerProps {
  kind?: 'vine' | 'deco' | 'deco-fade';
  /** Deco divider number 1–6. */
  index?: number;
  tint?: string | null;
  width?: number | string;
  className?: string;
}

/** Horizontal ornament: the vine divider from stone-vine or a pixel deco divider. */
export function Divider({
  kind = 'deco',
  index = 1,
  tint = '#c9a24a',
  width = '100%',
  className,
}: DividerProps) {
  const key = (
    kind === 'deco-fade'
      ? `deco.divider_fade.${String(index).padStart(2, '0')}`
      : `deco.divider.${String(index).padStart(2, '0')}`
  ) as DecoKey;
  const tinted = useDecoTint(kind === 'vine' ? 'deco.divider.01' : key, kind === 'vine' ? null : tint);
  if (kind === 'vine') {
    return (
      <div
        className={[styles.vine, className ?? ''].join(' ')}
        style={{ width, backgroundImage: `url("${imageUrl('ui.stone_vine.divider_vine')}")` }}
        aria-hidden="true"
      />
    );
  }
  return (
    <div
      className={[styles.deco, 'pixel', className ?? ''].join(' ')}
      style={{ width, backgroundImage: `url("${tinted}")` }}
      aria-hidden="true"
    />
  );
}
