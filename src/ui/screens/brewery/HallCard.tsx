import type { CSSProperties } from 'react';
import { imageUrl } from '@assets/manifest';
import { playSfx } from '@audio/index';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import type { BreweryHallView } from '@state/brewery';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import { hallBackdrop } from './brewery-view';
import styles from './HallCard.module.css';

/** The card cut of a backdrop (`tools/assets/steps/backdrops.ts`): a hall card is never wider. */
const CARD_ART = 640;

export interface HallCardProps {
  hall: BreweryHallView;
  selected: boolean;
  /** How many of the hall's own brew the purse holds — the reason to pick a hall today. */
  held: number;
  /** "Wednesday", for a hall barred today; null when it is open. */
  opensOn: string | null;
  onPick: () => void;
}

/**
 * One of the four halls on the rail (docs/tech/UI_DESIGN.md §5.23): its place as art, its element
 * as a medallion, whether its doors are open, how deep it has been taken, and how many of its brew
 * the player already holds — everything a day's choice of hall turns on, before it is opened.
 */
export function HallCard({ hall, selected, held, opensOn, onPick }: HallCardProps) {
  const { def, cleared, open } = hall;
  const brew = CURRENCY_BY_ID[def.brew];
  const tone = {
    '--el': ELEMENT_COLOR[def.element],
    '--art': `url("${imageUrl(hallBackdrop(def), CARD_ART)}")`,
  } as CSSProperties;
  return (
    <button
      type="button"
      className={styles.card}
      style={tone}
      data-selected={selected}
      data-open={open}
      aria-pressed={selected}
      data-testid={`brewery-tab-${def.element}`}
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={onPick}
    >
      <span className={styles.art} aria-hidden="true" />
      <span className={styles.medallion} aria-hidden="true">
        <Glyph glyph={ELEMENT_GLYPH[def.element]} size={30} color="var(--el)" />
      </span>
      <span className={styles.body}>
        <span className={`display ${styles.name}`}>{translate(def.name)}</span>
        <span className={styles.doors} data-open={open}>
          {open ? (
            t('brewery.open')
          ) : (
            <>
              <Glyph glyph="glyph.broken_shackle" size={14} color="var(--warn)" />
              {opensOn ? t('brewery.opens', { day: opensOn }) : t('brewery.closed')}
            </>
          )}
        </span>
        <span className={styles.foot}>
          <span className={styles.depth}>
            <span className={styles.pips} aria-hidden="true">
              {def.stages.map((stage) => (
                <span key={stage.number} className={styles.pip} data-on={stage.number <= cleared} />
              ))}
            </span>
            <span className={`num ${styles.progress}`} data-testid={`brewery-progress-${def.element}`}>
              {cleared}/{def.stages.length}
            </span>
          </span>
          <span className={styles.held} data-testid={`brewery-held-${def.element}`}>
            <TintedIcon asset={brew.icon} tint={brew.tint} size={22} label={translate(brew.name)} />
            <span className="num">{t('brewery.hallBrew', { count: formatAmount(held) })}</span>
          </span>
        </span>
      </span>
    </button>
  );
}
