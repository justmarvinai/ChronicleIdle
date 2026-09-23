import type { ReactNode } from 'react';
import type { GlyphKey } from '@assets/manifest.generated';
import { Glyph } from '@ui/components/Glyph/Glyph';
import styles from './ResultBanner.module.css';

/** What a banner is saying: a gain, something owed at the Portal, a loss, or a plain fact. */
export type BannerTone = 'gold' | 'purple' | 'ember' | 'plain';

const TONE_COLOR: Record<BannerTone, string> = {
  gold: 'var(--gold-3)',
  purple: 'var(--r-epic)',
  ember: '#ff8a74',
  plain: 'var(--text-2)',
};

export interface ResultBannerProps {
  glyph: GlyphKey;
  tone?: BannerTone;
  /** The glyph's own colour, where it carries a meaning of its own (a boost's tint). */
  glyphColor?: string;
  testId?: string;
  children: ReactNode;
}

/**
 * One line worth a banner on a result (docs/tech/UI_DESIGN.md §5.10) — a first clear, a chest, a
 * record, a floor that held — as a glyph and a sentence on a band of its tone, landing with the rest.
 */
export function ResultBanner({ glyph, tone = 'gold', glyphColor, testId, children }: ResultBannerProps) {
  return (
    <p className={[styles.banner, styles[tone]].join(' ')} data-testid={testId}>
      <span className={styles.glyph} aria-hidden="true">
        <Glyph glyph={glyph} size={20} color={glyphColor ?? TONE_COLOR[tone]} />
      </span>
      <span className={styles.text}>{children}</span>
    </p>
  );
}
