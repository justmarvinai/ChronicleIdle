import type { CSSProperties } from 'react';
import { playSfx } from '@audio/index';
import type { CurrencyAmount } from '@content/currencies/types';
import { t, type I18nKey } from '@i18n/index';
import { CurrencyLabel } from '@ui/components/CurrencyLabel/CurrencyLabel';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { CARD_TINT, RARITY_HEX } from '@ui/styles/display-maps';
import { poolLabel, tierBody, tierLabel, tierOdds, type CraftTier } from './forge-view';
import styles from './TierCard.module.css';

export interface TierCardProps {
  tier: CraftTier;
  selected: boolean;
  /** The recipe without a Sigil, as the card quotes it. */
  price: readonly CurrencyAmount[];
  held: (currency: string) => number;
  /** How many strikes the wallet covers at this tier. */
  strikes: number;
  onSelect: () => void;
}

/**
 * One craft tier as a card (docs/tech/UI_DESIGN.md §5.11): its name and band, what it may roll —
 * the rarities as a bar in their own colours and the stars beside it, both from the engine's
 * tables — which sets it draws from, the recipe with each line held against the wallet, and how
 * many strikes the wallet covers.
 */
export function TierCard({ tier, selected, price, held, strikes, onSelect }: TierCardProps) {
  const odds = tierOdds(tier);
  const pick = (): void => {
    playSfx('ui.tab');
    onSelect();
  };
  return (
    <DecoFrame
      frame={selected ? 13 : 16}
      tint={selected ? CARD_TINT.unlocked : CARD_TINT.locked}
      thickness={12}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={[styles.card, selected ? styles.on : ''].join(' ')}
      data-testid={`craft-tier-${tier}`}
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick();
        }
      }}
    >
      <div className={styles.head}>
        <span className={`display ${styles.name}`}>{tierLabel(tier)}</span>
        <span className={styles.pool}>{poolLabel(tier)}</span>
      </div>
      <p className={styles.body}>{tierBody(tier)}</p>

      <div className={styles.odds} aria-label={t('forge.craft.odds')}>
        <div className={styles.bar}>
          {odds.rarity.map((entry) => (
            <span
              key={entry.rarity}
              className={styles.segment}
              style={{ width: `${entry.percent}%`, '--rarity': RARITY_HEX[entry.rarity] } as CSSProperties}
              title={`${t(`rarity.${entry.rarity}` as I18nKey)} ${entry.percent}%`}
            />
          ))}
        </div>
        <ul className={styles.legend}>
          {odds.rarity.map((entry) => (
            <li key={entry.rarity} style={{ color: RARITY_HEX[entry.rarity] }}>
              <span className={styles.name2}>{t(`rarity.${entry.rarity}` as I18nKey)}</span>
              <span className="num">{entry.percent}%</span>
            </li>
          ))}
        </ul>
        <ul className={styles.stars}>
          {odds.stars.map((entry) => (
            <li key={entry.stars}>
              <span className={`num ${styles.star}`}>{entry.stars}★</span>
              <span className="num">{entry.percent}%</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className={styles.cost}>
        {price.map((entry) => (
          <li
            key={entry.currency}
            className={['num', held(entry.currency) < entry.amount ? styles.short : ''].join(' ')}
          >
            <CurrencyLabel currency={entry.currency} amount={entry.amount} size={22} />
          </li>
        ))}
      </ul>
      <p className={`num ${strikes > 0 ? styles.strikes : styles.none}`}>
        {strikes > 0 ? t('forge.craft.strikes', { count: strikes }) : t('forge.craft.noStrikes')}
      </p>
    </DecoFrame>
  );
}
