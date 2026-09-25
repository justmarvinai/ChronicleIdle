import type { CurrencyAmount } from '@content/currencies/types';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { currencySlot, type RewardSlotItem, type RewardSlotSize } from './slots';
import styles from './RewardSlots.module.css';

export interface RewardSlotsProps {
  amounts?: readonly CurrencyAmount[];
  /** Items beside (after) the currencies — a Bag item a calendar day pays. */
  items?: readonly RewardSlotItem[];
  size?: RewardSlotSize;
  /** A reward already taken, or one still far off, draws quieter. */
  muted?: boolean;
  className?: string;
  testId?: string;
}

/**
 * What something *will* pay, as the reference's reward squares: a framed slot a reward, its icon
 * large and its count in the corner (docs/tech/UI_DESIGN.md §4). `RewardTiles` is the same idea for
 * what a fight *did* pay; these do not land, because nothing has been paid yet.
 */
export function RewardSlots({
  amounts = [],
  items = [],
  size = 'md',
  muted = false,
  className,
  testId,
}: RewardSlotsProps) {
  const slots = [...amounts.map((entry) => currencySlot(entry, size)), ...items];
  return (
    <ul
      className={[styles.slots, styles[size], className ?? ''].join(' ')}
      data-muted={muted}
      data-testid={testId}
    >
      {slots.map((slot) => (
        <li key={slot.id}>
          <Tooltip content={slot.label}>
            <span
              className={styles.slot}
              style={slot.edge ? ({ '--edge': slot.edge } as React.CSSProperties) : undefined}
            >
              {slot.icon}
              <span className={`num ${styles.amount}`} aria-hidden="true">
                {slot.amount}
              </span>
              <span className="sr-only">{slot.label}</span>
            </span>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}
