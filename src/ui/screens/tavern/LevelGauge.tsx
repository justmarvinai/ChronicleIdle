import { levelCap } from '@engine/champions/stats';
import { championXpToNext } from '@engine/champions/xp';
import { t } from '@i18n/index';
import { kitBorder } from '@ui/styles/kit';
import styles from './LevelGauge.module.css';

export interface LevelGaugeProps {
  level: number;
  xp: number;
  stars: number;
  /** Where the champion stands now and where the table would take it, in levels (`levelPosition`). */
  now: number;
  after: number;
  /** XP the table carries past the cap. */
  wasted: number;
}

/** Every tenth level carries a taller notch, so a 60-level road still reads at a glance. */
const MAJOR_NOTCH = 10;

/**
 * The road from level 1 to the star tier's cap (docs/tech/UI_DESIGN.md §5.5): the notches are
 * levels, the ember fill is where the champion stands, and the brighter run beyond it is where
 * the table would take it — so a brew poured or a companion seated moves the preview at once.
 */
export function LevelGauge({ level, xp, stars, now, after, wasted }: LevelGaugeProps) {
  const cap = levelCap(stars);
  const span = Math.max(1, cap - 1);
  const at = (position: number): number => Math.max(0, Math.min(100, ((position - 1) / span) * 100));
  const reach = Math.max(now, after);
  const capped = level >= cap;
  const afterLevel = Math.floor(reach);
  return (
    <div className={styles.gauge} data-testid="tavern-gauge" aria-label={t('tavern.gauge.label')}>
      <div className={styles.ends}>
        <span className={`display ${styles.caption}`}>{t('tavern.gauge.label')}</span>
        <span className={`num ${styles.cap}`}>{t('tavern.gauge.cap', { cap })}</span>
      </div>
      <div
        className={styles.track}
        style={kitBorder('ui.dark_ember.bar_track_ember', 0.6)}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={cap}
        aria-valuenow={Math.floor(now)}
      >
        <div className={styles.groove}>
          {reach > now ? (
            <div
              className={styles.preview}
              style={{ left: `${at(now)}%`, width: `${at(reach) - at(now)}%` }}
              data-testid="tavern-gauge-preview"
            />
          ) : null}
          <div className={styles.fill} style={{ width: `${at(now)}%` }} />
          {Array.from({ length: Math.max(0, cap - 2) }, (_, index) => {
            const notch = index + 2;
            return (
              <span
                key={notch}
                className={notch % MAJOR_NOTCH === 0 ? styles.major : styles.notch}
                style={{ left: `${at(notch)}%` }}
              />
            );
          })}
        </div>
        {reach > now ? (
          <span
            className={`num ${styles.flag}`}
            style={{ left: `clamp(20px, ${at(reach)}%, calc(100% - 20px))` }}
          >
            {afterLevel}
          </span>
        ) : null}
      </div>
      <div className={styles.foot}>
        <span className={`num ${styles.next}`}>
          {capped
            ? t('tavern.gauge.capped')
            : t('tavern.gauge.next', {
                xp: xp.toLocaleString('en-US'),
                need: championXpToNext(level).toLocaleString('en-US'),
                next: level + 1,
              })}
        </span>
        {wasted > 0 ? (
          <span className={`num ${styles.spill}`} data-testid="tavern-spill">
            {t('tavern.gauge.spill', { xp: wasted.toLocaleString('en-US') })}
          </span>
        ) : null}
      </div>
    </div>
  );
}
