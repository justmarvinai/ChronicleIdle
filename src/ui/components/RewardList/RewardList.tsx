import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount } from '@content/currencies/types';
import { formatAmount } from '@engine/economy/wallet';
import { translate } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import styles from './RewardList.module.css';

export interface RewardListProps {
  amounts: readonly CurrencyAmount[];
  /** Icon size; the label follows it. */
  size?: number;
  /** `row` for a quest row's reward strip, `column` for a tooltip's contents. */
  layout?: 'row' | 'column';
  className?: string;
}

/**
 * What something pays: an icon and an amount per currency. Used wherever a reward is *promised*
 * rather than reported — quest rows, chest tooltips, mission cards — so every promise reads the
 * same way (docs/tech/UI_DESIGN.md §4).
 */
export function RewardList({ amounts, size = 26, layout = 'row', className }: RewardListProps) {
  return (
    <ul className={[styles.list, styles[layout], className ?? ''].join(' ')}>
      {amounts.map((entry) => {
        const def = CURRENCY_BY_ID[entry.currency];
        const name = translate(def.name);
        return (
          <li key={entry.currency} className={styles.item}>
            <TintedIcon asset={def.icon} tint={def.tint} size={size} label={name} />
            <span className={`num ${styles.amount}`}>
              {layout === 'column' ? `${name} ×${formatAmount(entry.amount)}` : formatAmount(entry.amount)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
