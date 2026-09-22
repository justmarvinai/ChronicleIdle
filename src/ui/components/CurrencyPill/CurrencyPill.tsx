import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import { playSfx } from '@audio/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { useAnimatedNumber } from '@ui/hooks/useAnimatedNumber';
import { kitBorder } from '@ui/styles/kit';
import styles from './CurrencyPill.module.css';

export interface CurrencyPillProps {
  currency: CurrencyId;
  amount: number;
  /** Shown as "value/cap" (energy). */
  cap?: number;
  onAdd?: () => void;
  size?: 'sm' | 'md';
  highlight?: 'over' | 'low' | null;
}

/** Top-bar currency chip: icon, animated amount, optional "+" (docs/tech/UI_DESIGN.md §4). */
export function CurrencyPill({
  currency,
  amount,
  cap,
  onAdd,
  size = 'md',
  highlight = null,
}: CurrencyPillProps) {
  const def = CURRENCY_BY_ID[currency];
  const shown = useAnimatedNumber(amount);
  return (
    <Tooltip
      content={
        <div>
          <div className={`display ${styles.tipTitle}`}>{translate(def.name)}</div>
          <div className={styles.tipBody}>{translate(def.description)}</div>
        </div>
      }
    >
      <div
        className={[styles.pill, styles[size], highlight ? styles[highlight] : ''].join(' ')}
        style={kitBorder('ui.dark_ember.frame_sm_thin', 0.3)}
        data-testid={`pill-${currency}`}
        /*
         * The exact figure, beside the abbreviated one. `formatAmount` prints 825,000 as "825K",
         * which is right for a header and useless to anything that has to read the number back —
         * and it carries the *target* rather than the tick-up's current value, so a reader sees the
         * wallet as it now stands rather than as it is still being drawn.
         */
        data-amount={amount}
      >
        <div className={styles.fill} style={kitBorder('ui.dark_ember.bg_tile_sm', 0.5)} aria-hidden="true" />
        <TintedIcon
          asset={def.icon}
          tint={def.tint}
          size={size === 'sm' ? 26 : 34}
          label={translate(def.name)}
          className={styles.icon}
        />
        <span className={`num ${styles.amount}`}>
          {formatAmount(Math.round(shown))}
          {cap !== undefined ? <span className={styles.cap}>/{formatAmount(cap)}</span> : null}
        </span>
        {onAdd ? (
          <button
            type="button"
            className={styles.add}
            aria-label={t('topbar.add', { currency: translate(def.name) })}
            onMouseEnter={() => playSfx('ui.hover')}
            onClick={() => (playSfx('ui.tab'), onAdd())}
          >
            +
          </button>
        ) : null}
      </div>
    </Tooltip>
  );
}
