import { memo } from 'react';
import { avatarUrl } from '@assets/manifest';
import type { AvatarKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { StarRow } from '@ui/components/StarRow/StarRow';
import {
  ELEMENT_COLOR,
  ELEMENT_GLYPH,
  RARITY_HEX,
  ROLE_GLYPH,
  type Element,
  type Rarity,
  type Role,
} from '@ui/styles/display-maps';
import styles from './ChampionCard.module.css';

/** Deco frame ids per rarity so cards read at a glance even without colour. */
const RARITY_FRAME: Record<Rarity, number> = {
  common: 16,
  uncommon: 2,
  rare: 7,
  epic: 3,
  legendary: 13,
  mythic: 26,
};

export interface ChampionCardProps {
  name: string;
  rarity: Rarity;
  element: Element;
  role: Role;
  stars: number;
  level: number;
  avatar: AvatarKey;
  size?: 96 | 128 | 192 | 256;
  /** Placeholder art: multiply tint over the borrowed lizard avatar plus an "art pending" mark. */
  tint?: string | null;
  placeholder?: boolean;
  placeholderLabel?: string;
  selected?: boolean;
  locked?: boolean;
  favourite?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  /** Identity only (avatar picker, previews): no star row and no level badge. */
  compact?: boolean;
  /** Test hook for e2e specs (`roster-card-<instanceId>` in the Champions index). */
  testId?: string;
}

/**
 * Roster card: rarity-tinted pixel frame, avatar, stars, level badge, element and role sigils.
 * Memoised: the virtual grid re-renders on every row-window change and most cards are unchanged
 * (callers pass stable `onClick` handlers for that to pay off).
 */
export const ChampionCard = memo(function ChampionCard({
  name,
  rarity,
  element,
  role,
  stars,
  level,
  avatar,
  size = 128,
  tint = null,
  placeholder = false,
  placeholderLabel,
  selected,
  locked,
  favourite,
  dimmed,
  onClick,
  compact = false,
  testId,
}: ChampionCardProps) {
  const color = RARITY_HEX[rarity];
  const interactive = !!onClick;
  const iconSize = Math.max(16, size * 0.16);
  return (
    <DecoFrame
      frame={RARITY_FRAME[rarity]}
      variant="solid"
      tint={color}
      thickness={size >= 192 ? 16 : 12}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={`${name}, ${rarity}, level ${level}, ${stars} stars`}
      data-testid={testId}
      data-favourite={favourite ? 'true' : 'false'}
      className={[
        styles.card,
        styles[rarity],
        selected ? styles.selected : '',
        dimmed ? styles.dimmed : '',
        interactive ? styles.interactive : '',
      ].join(' ')}
      style={{ width: size, height: Math.round(size * 1.28) }}
      onMouseEnter={() => interactive && playSfx('ui.hover')}
      onClick={() => interactive && (playSfx('ui.tab'), onClick())}
      onKeyDown={(e) => {
        if (interactive && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className={styles.art}
        style={{ backgroundImage: `url("${avatarUrl(avatar, size >= 192 ? 512 : 256)}")` }}
      />
      {tint ? (
        <div
          className={styles.tint}
          style={{
            backgroundColor: tint,
            WebkitMaskImage: `url("${avatarUrl(avatar, size >= 192 ? 512 : 256)}")`,
            maskImage: `url("${avatarUrl(avatar, size >= 192 ? 512 : 256)}")`,
          }}
          aria-hidden="true"
        />
      ) : null}
      <div className={styles.shade} />
      {/* The mark needs room to stay legible; small and compact cards carry the tint alone. */}
      {placeholder && !compact && size >= 128 ? (
        <span className={`display ${styles.placeholder}`} title={placeholderLabel}>
          {placeholderLabel ?? 'ART PENDING'}
        </span>
      ) : null}
      {rarity === 'legendary' || rarity === 'mythic' ? (
        <div
          className={[styles.shimmer, rarity === 'mythic' ? styles.mythic : ''].join(' ')}
          aria-hidden="true"
        />
      ) : null}
      {compact ? null : (
        <div className={styles.stars}>
          <StarRow stars={stars} max={6} size={Math.max(10, size * 0.11)} tone="rarity" tint={color} />
        </div>
      )}
      <span
        className={styles.element}
        style={{
          background: `radial-gradient(circle, ${ELEMENT_COLOR[element]} 0%, rgba(11,10,13,0.9) 75%)`,
        }}
      >
        <Glyph glyph={ELEMENT_GLYPH[element]} size={iconSize} color="var(--text-1)" label={element} />
      </span>
      <span className={styles.role}>
        <Glyph glyph={ROLE_GLYPH[role]} size={iconSize} color="var(--text-2)" label={role} />
      </span>
      {compact ? null : <span className={`num ${styles.level}`}>{level}</span>}
      {locked ? (
        <Glyph
          glyph="glyph.broken_shackle"
          size={iconSize}
          color="var(--text-1)"
          className={styles.lock}
          label="locked"
        />
      ) : null}
      {favourite ? (
        <Glyph
          glyph="glyph.health_potion"
          size={iconSize}
          color="#ff6b8a"
          className={styles.fav}
          label="favourite"
        />
      ) : null}
      {size >= 192 ? <span className={`display ${styles.name}`}>{name}</span> : null}
    </DecoFrame>
  );
});
