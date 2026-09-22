import { BOOST_IDS } from '@content/balance/boosts';
import { boostRemaining } from '@engine/boosts/index';
import { formatDuration } from '@engine/time/clock';
import { t, type I18nKey } from '@i18n/index';
import { selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { useNow } from '@ui/hooks/useNow';
import { BOOST_GLYPH, BOOST_TINT } from '@ui/styles/display-maps';
import styles from './BoostPills.module.css';

/**
 * The three boosts beside the profile chip (docs/tech/UI_DESIGN.md §5.26, the owner's brief).
 *
 * **All three are always drawn**, lit when running and grey when not. The first cut showed only
 * the live ones, which was wrong in the way that matters: an icon you see only once a boost is
 * already on can never tell you that one is *off*. A player wanting to know whether their XP is
 * doubled had to open the Bag to find out — and a slot that is empty is exactly the state worth
 * seeing, because it is the state you can do something about.
 *
 * Each carries its own tooltip either way, so a grey slot says what it would be and where to get
 * one rather than sitting there as an unexplained dead icon.
 *
 * The countdown ticks off `useNow`, not a timer of its own: the expiry is an instant in the save,
 * so this only has to re-read the clock (`MARKET.md` §4).
 */
export function BoostPills() {
  const save = useGameStore(selectSave);
  const now = useNow(1000);
  if (!save) return null;

  return (
    <span className={styles.pills} data-testid="boost-pills">
      {BOOST_IDS.map((boost) => {
        const left = boostRemaining(save.boosts, boost, now);
        const live = left > 0;
        const name = t(`boost.${boost}` as I18nKey);
        return (
          <Tooltip
            key={boost}
            content={
              <div>
                <div className={`display ${styles.tipTitle}`}>{name}</div>
                <div className={styles.tipBody}>
                  {live ? t('boost.remaining', { time: formatDuration(left) }) : t('boost.idle')}
                </div>
              </div>
            }
          >
            <span
              className={styles.pill}
              data-testid={`boost-${boost}`}
              data-boost={boost}
              data-active={live}
              style={{ '--boost-tint': BOOST_TINT[boost] } as React.CSSProperties}
            >
              <Glyph
                glyph={BOOST_GLYPH[boost]}
                size={16}
                color={live ? BOOST_TINT[boost] : 'var(--text-3)'}
              />
              {/* A grey slot says nothing rather than "0h 0m", which would read as a bug. */}
              {live ? <span className={`num ${styles.time}`}>{formatDuration(left)}</span> : null}
            </span>
          </Tooltip>
        );
      })}
    </span>
  );
}
