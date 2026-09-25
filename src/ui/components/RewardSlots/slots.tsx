import type { ReactNode } from 'react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount } from '@content/currencies/types';
import { formatAmount } from '@engine/economy/wallet';
import { translate } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';

export type RewardSlotSize = 'sm' | 'md' | 'lg';

/** The painted icon inside a slot, in stage pixels. */
export const SLOT_ICON: Readonly<Record<RewardSlotSize, number>> = { sm: 34, md: 44, lg: 54 };

/** Anything a slot can hold: a currency, or an item drawn by whoever holds its definition. */
export interface RewardSlotItem {
  id: string;
  icon: ReactNode;
  /** The count in the corner, already formatted. */
  amount: string;
  /** Named on hover and for a screen reader: "Gold ×6,000". */
  label: string;
  /** A rarity or tier colour for the slot's edge; the gold hairline otherwise. */
  edge?: string;
}

/** A currency as a slot. */
export function currencySlot(entry: CurrencyAmount, size: RewardSlotSize): RewardSlotItem {
  const def = CURRENCY_BY_ID[entry.currency];
  const name = translate(def.name);
  return {
    id: entry.currency,
    icon: <TintedIcon asset={def.icon} tint={def.tint} size={SLOT_ICON[size]} />,
    amount: formatAmount(entry.amount),
    label: translate('common.amountOf', { name, amount: formatAmount(entry.amount) }),
  };
}
