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
  // The pixel divider art is a half ornament (lines running off the left, the motif at the right),
  // so it is drawn twice with the left half mirrored: the motif lands in the centre.
  return (
    <div className={[styles.deco, 'pixel', className ?? ''].join(' ')} style={{ width }} aria-hidden="true">
      <span
        className={[styles.half, styles.flip].join(' ')}
        style={{ backgroundImage: `url("${tinted}")` }}
      />
      <span className={styles.half} style={{ backgroundImage: `url("${tinted}")` }} />
    </div>
  );
}
