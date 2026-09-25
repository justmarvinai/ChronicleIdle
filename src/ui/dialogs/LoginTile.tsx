import type { CSSProperties } from 'react';
import { LOGIN_FINALE_FROM } from '@content/balance/login';
import { t } from '@i18n/index';
import type { LoginTileView } from '@state/login';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { RARITY_COLOR } from '@ui/styles/display-maps';
import styles from './LoginTile.module.css';

export interface LoginTileProps {
  tile: LoginTileView;
  /** The day that opens at the next reset, once today's has been taken. */
  next: boolean;
  /** The day taken a moment ago, which lands its seal. */
  justTaken: boolean;
}

/**
 * One day of the thirty (docs/tech/UI_DESIGN.md §5.27): its number, what it pays as reward slots —
 * a Bag item drawn in its own art, never a name alone — and its state in its frame. Its edge is its
 * tier's colour, so the shuffle reads as a scatter; the three that lead the board wear gold.
 */
export function LoginTile({ tile, next, justTaken }: LoginTileProps) {
  const finale = tile.day >= LOGIN_FINALE_FROM;
  return (
    <li
      className={styles.tile}
      data-testid={`login-day-${tile.day}`}
      data-today={tile.today}
      data-taken={tile.taken}
      data-finale={finale}
      data-next={next}
      data-just={justTaken}
      style={{ '--tier': RARITY_COLOR[tile.def.tier] } as CSSProperties}
    >
      <span className={styles.head}>
        <span className={`num ${styles.day}`}>{t('login.day', { day: tile.day })}</span>
        {finale ? <Glyph glyph="glyph.shooting_stars" size={16} className={styles.star ?? ''} /> : null}
      </span>
      <RewardSlots grants={tile.def.rewards} size="sm" muted={tile.taken} className={styles.slots ?? ''} />
      {tile.today ? <span className={`display ${styles.ribbon}`}>{t('login.today')}</span> : null}
      {tile.taken ? (
        <span className={styles.seal} role="img" aria-label={t('login.claimed')}>
          <Glyph glyph="glyph.trophy_cup" size={18} />
        </span>
      ) : null}
    </li>
  );
}
