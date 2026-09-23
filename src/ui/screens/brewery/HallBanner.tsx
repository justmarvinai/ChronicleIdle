import type { CSSProperties } from 'react';
import { imageUrl } from '@assets/manifest';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import type { BreweryHallView } from '@state/brewery';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import { counterOf, hallBackdrop, openDaysLabel, type WeekDay } from './brewery-view';
import styles from './HallBanner.module.css';

export interface HallBannerProps {
  hall: BreweryHallView;
  week: readonly WeekDay[];
}

/**
 * The chosen hall's head (docs/tech/UI_DESIGN.md §5.23): its place as the art, its element as a
 * medallion and its name in that colour, its week as seven day-stones with today marked, its doors,
 * what it is, and the one piece of advice the element wheel gives about it.
 */
export function HallBanner({ hall, week }: HallBannerProps) {
  const { def, open } = hall;
  const counter = counterOf(def.element);
  const tone = {
    '--el': ELEMENT_COLOR[def.element],
    '--art': `url("${imageUrl(hallBackdrop(def))}")`,
  } as CSSProperties;
  return (
    <header className={styles.banner} style={tone} data-open={open}>
      <span className={styles.art} aria-hidden="true" />
      <div className={styles.top}>
        <span className={styles.medallion} aria-hidden="true">
          <Glyph glyph={ELEMENT_GLYPH[def.element]} size={46} color="var(--el)" />
        </span>
        <div className={styles.titles}>
          <h2 className={`display ${styles.name}`} data-testid="brewery-hall-name">
            {translate(def.name)}
          </h2>
          <p className={styles.days} data-testid="brewery-hall-days">
            {t('brewery.openDays', { days: openDaysLabel(def) })}
          </p>
        </div>
        <ol className={styles.week} aria-label={t('brewery.week')}>
          {week.map((day) => (
            <li
              key={day.weekday}
              className={styles.day}
              data-open={day.open}
              data-today={day.today}
              title={day.today ? t('brewery.today') : undefined}
            >
              {t(`brewery.dayShort.${day.weekday}` as I18nKey)}
            </li>
          ))}
        </ol>
        <span className={styles.doors} data-open={open} data-testid={`brewery-doors-${def.element}`}>
          {open ? t('brewery.open') : t('brewery.closed')}
        </span>
      </div>
      <p className={styles.blurb}>{translate(def.description)}</p>
      <p className={styles.bring} data-testid="brewery-bring">
        {counter ? (
          <Glyph glyph={ELEMENT_GLYPH[counter]} size={20} color={ELEMENT_COLOR[counter]} />
        ) : (
          <Glyph glyph={ELEMENT_GLYPH[def.element]} size={20} color="var(--text-2)" />
        )}
        {counter
          ? t('brewery.bring', { element: t(`element.${counter}` as I18nKey) })
          : t('brewery.bringNothing')}
      </p>
      {!open ? (
        <p className={styles.barred} data-testid="brewery-barred">
          <Glyph glyph="glyph.broken_shackle" size={20} color="var(--warn)" />
          {hall.msToOpen !== null && hall.msToOpen > 0 && hall.nextDay !== null
            ? t('brewery.closedBody', {
                day: t(`brewery.day.${hall.nextDay}` as I18nKey),
                time: formatDuration(hall.msToOpen),
              })
            : t('brewery.closedBodyNoDay')}
        </p>
      ) : null}
    </header>
  );
}
