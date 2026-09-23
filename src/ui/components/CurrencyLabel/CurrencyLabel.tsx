import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import { translate } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import styles from './CurrencyLabel.module.css';

export interface CurrencyLabelProps {
  currency: CurrencyId;
  /** The icon's side, in stage pixels; the name keeps the row's own type. */
  size?: number;
  /** A cost's amount, printed before the icon: "2,000 [coin] Gold". */
  amount?: number | undefined;
  className?: string | undefined;
}

/**
 * A currency's name with its icon in front, for the rows that list what was won, spent or paid —
 * a result's rewards, a dismantle's yield, a rank-up's cost — so gold reads as gold at a glance
 * rather than as a word to be read (docs/tech/UI_DESIGN.md §4).
 */
export function CurrencyLabel({ currency, size = 24, amount, className }: CurrencyLabelProps) {
  const def = CURRENCY_BY_ID[currency];
  return (
    <span className={[styles.label, className ?? ''].join(' ')}>
      {amount !== undefined ? <span className="num">{amount.toLocaleString('en-US')} </span> : null}
      <TintedIcon asset={def.icon} tint={def.tint} size={size} />
      <span>{translate(def.name)}</span>
    </span>
  );
}
