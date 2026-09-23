import type { CSSProperties } from 'react';
import { playSfx } from '@audio/index';
import type { Element } from '@content/champions/types';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import { BREW_OF_ELEMENT, brewXp } from '@engine/progression/tavern-level';
import { t, translate } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import styles from './BrewShelf.module.css';

export interface BrewShelfProps {
  /** The champion's own brew first, then the rest (`brewOrder`). */
  order: readonly CurrencyId[];
  element: Element;
  held: Readonly<Partial<Record<CurrencyId, number>>>;
  poured: Readonly<Partial<Record<CurrencyId, number>>>;
  /** The champion stands at its cap: nothing more can be poured until a star raises it. */
  closed: boolean;
  onChange: (currency: CurrencyId, amount: number) => void;
}

/**
 * The brew shelf under the champion (docs/tech/UI_DESIGN.md §5.5): one bottle per brew, each
 * saying what it pours for this champion — its own element half as much again, and marked so —
 * how many are held and how many are on the table. The bottle itself pours one.
 */
export function BrewShelf({ order, element, held, poured, closed, onChange }: BrewShelfProps) {
  const own = BREW_OF_ELEMENT[element];
  return (
    <div className={styles.shelf} data-testid="brew-row">
      {order.map((currency) => {
        const def = CURRENCY_BY_ID[currency];
        const name = translate(def.name);
        const have = held[currency] ?? 0;
        const count = poured[currency] ?? 0;
        const canPour = !closed && count < have;
        const tone = { '--brew': def.tint ?? 'var(--gold-3)' } as CSSProperties;
        return (
          <div
            key={currency}
            className={[
              styles.brew,
              currency === own ? styles.own : '',
              count > 0 ? styles.poured : '',
              have === 0 ? styles.none : '',
            ].join(' ')}
            style={tone}
            data-testid={`brew-${currency}`}
          >
            {currency === own ? (
              <span className={`display ${styles.ownTag}`}>{t('tavern.brew.own')}</span>
            ) : null}
            <button
              type="button"
              className={styles.bottle}
              aria-label={t('tavern.brew.pourOne', { name })}
              disabled={!canPour}
              onClick={() => (playSfx('ui.tab'), onChange(currency, count + 1))}
            >
              <span className={styles.glow} aria-hidden="true" />
              <TintedIcon asset={def.icon} tint={def.tint} size={64} />
            </button>
            <span className={`display ${styles.name}`}>{name}</span>
            <span className={`num ${styles.worth}`}>
              {t('tavern.brew.each', { xp: brewXp(currency, element).toLocaleString('en-US') })}
            </span>
            <span className={styles.held}>{t('tavern.brew.have', { count: have - count })}</span>
            <div className={styles.stepper}>
              <button
                type="button"
                className={styles.step}
                aria-label={`${name} −1`}
                data-testid={`brew-minus-${currency}`}
                disabled={count <= 0}
                onClick={() => (playSfx('ui.cancel'), onChange(currency, count - 1))}
              >
                −
              </button>
              <span className={`num ${styles.count}`} data-testid={`brew-count-${currency}`}>
                {count}
              </span>
              <button
                type="button"
                className={styles.step}
                aria-label={`${name} +1`}
                data-testid={`brew-plus-${currency}`}
                disabled={!canPour}
                onClick={() => (playSfx('ui.tab'), onChange(currency, count + 1))}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
