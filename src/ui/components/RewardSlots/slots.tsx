import type { ReactNode } from 'react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyAmount } from '@content/currencies/types';
import type { Grant } from '@content/grants';
import { content } from '@content/registry';
import { formatAmount } from '@engine/economy/wallet';
import { translate } from '@i18n/index';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { RARITY_COLOR } from '@ui/styles/display-maps';

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

/** A Bag item as a slot: its own art, framed in its rarity (`@content/consumables`). */
export function itemSlot(item: string, count: number, size: RewardSlotSize): RewardSlotItem {
  const def = content.consumableById(item);
  return {
    id: item,
    icon: def ? (
      <AssetImage asset={def.icon} width={SLOT_ICON[size]} height={SLOT_ICON[size]} alt="" />
    ) : null,
    amount: formatAmount(count),
    label: itemLabel(item, count),
    ...(def ? { edge: RARITY_COLOR[def.rarity] } : {}),
  };
}

/** Anything a grant hands over (`@content/grants`) — a currency or a Bag item — as a slot. */
export function grantSlot(grant: Grant, size: RewardSlotSize): RewardSlotItem {
  return grant.kind === 'currency'
    ? currencySlot({ currency: grant.currency, amount: grant.amount }, size)
    : itemSlot(grant.item, grant.count, size);
}

/** "Brewery Token ×1": a Bag item in words. */
function itemLabel(item: string, count: number): string {
  const def = content.consumableById(item);
  return translate('common.amountOf', {
    name: def ? translate(def.name) : item,
    amount: formatAmount(count),
  });
}

/** "Gold ×25,000", "Brewery Token ×1": what a slot says on hover, for a list that says it aloud. */
export function grantLabel(grant: Grant): string {
  if (grant.kind === 'consumable') return itemLabel(grant.item, grant.count);
  return translate('common.amountOf', {
    name: translate(CURRENCY_BY_ID[grant.currency].name),
    amount: formatAmount(grant.amount),
  });
}
