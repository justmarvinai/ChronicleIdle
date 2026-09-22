import { BOOST_IDS } from '@content/balance/boosts';
import { activeBoosts } from '@engine/boosts/index';
import { formatDuration } from '@engine/time/clock';
import { t, type I18nKey } from '@i18n/index';
import { selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { useNow } from '@ui/hooks/useNow';
import { BOOST_GLYPH, BOOST_TINT } from '@ui/styles/display-maps';
import styles from './BoostPills.module.css';

/**
 * The live boosts, beside the profile chip in the header (the owner's brief).
 *
 * **Only running boosts are drawn.** Three permanently dimmed icons on every screen would be
 * clutter that says nothing; an icon that is *there* is the whole signal, and it carries its own
 * countdown so a player never has to open a screen to ask how long is left.
 *
 * The countdown ticks off `useNow`, not off a timer of its own: the expiry is an instant in the
 * save, so this only has to re-read the clock (`MARKET.md` §4).
 */
export function BoostPills() {
  const save = useGameStore(selectSave);
  const now = useNow(1000);
  if (!save) return null;
  const live = activeBoosts(save.boosts, now);
  if (live.length === 0) return null;
  return (
    <span className={styles.pills} data-testid="boost-pills">
      {live.map(({ boost, remaining }) => (
        <span
          key={boost}
          className={styles.pill}
          data-testid={`boost-${boost}`}
          data-boost={boost}
          style={{ '--boost-tint': BOOST_TINT[boost] } as React.CSSProperties}
          title={`${t(`boost.${boost}` as I18nKey)} · ${t('boost.remaining', {
            time: formatDuration(remaining),
          })}`}
        >
          <Glyph glyph={BOOST_GLYPH[boost]} size={16} color={BOOST_TINT[boost]} />
          <span className={`num ${styles.time}`}>{formatDuration(remaining)}</span>
        </span>
      ))}
    </span>
  );
}

/** Every boost id, so a screen that lists them all reads the same order the header does. */
export const ALL_BOOSTS = BOOST_IDS;
