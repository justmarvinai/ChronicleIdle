/** What the Wallet says about a holding beyond its number (docs/tech/UI_DESIGN.md §5.26). */
import { formatAmount } from '@engine/economy/wallet';
import { formatDuration } from '@engine/time/clock';
import { t, translate } from '@i18n/index';
import type { Holding } from '@state/wallet';

/** "1,240" or, for a pool, "40 / 150". */
export function heldLine(held: Holding): string {
  return held.cap === null
    ? formatAmount(held.amount)
    : translate('wallet.ofCap', { amount: formatAmount(held.amount), cap: formatAmount(held.cap) });
}

/**
 * How a pool stands against its refill, or null for a plain currency: the next point's countdown
 * for the two that regenerate (the description says how fast), the reset for a boss's keys.
 */
export function poolLine(held: Holding): string | null {
  if (held.regenerates)
    return held.msToNext === null
      ? t('wallet.full')
      : translate('wallet.next', { time: formatDuration(held.msToNext) });
  if (held.msToReset !== null && held.cap !== null)
    return translate('wallet.resets', { cap: held.cap, time: formatDuration(held.msToReset) });
  return null;
}
