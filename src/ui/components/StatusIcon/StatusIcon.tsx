import type { GlyphKey } from '@assets/manifest.generated';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './StatusIcon.module.css';

export interface StatusIconProps {
  glyph: GlyphKey;
  kind: 'buff' | 'debuff';
  turns?: number;
  label: string;
  size?: number;
}

/** Status effect chip: glyph tinted green (buff) or red (debuff) with a duration digit. */
export function StatusIcon({ glyph, kind, turns, label, size = 28 }: StatusIconProps) {
  return (
    <span
      className={[styles.status, styles[kind]].join(' ')}
      style={{ width: size, height: size }}
      role="img"
      aria-label={turns ? `${label}, ${turns} turns` : label}
    >
      <Glyph glyph={glyph} size={size * 0.7} color={kind === 'buff' ? 'var(--buff)' : 'var(--debuff)'} />
      {turns ? <span className={`num ${styles.turns}`}>{turns}</span> : null}
      <span className={styles.sign}>{kind === 'buff' ? '+' : '−'}</span>
    </span>
  );
}
