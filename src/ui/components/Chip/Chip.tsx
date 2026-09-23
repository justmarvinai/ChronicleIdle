import type { ReactNode } from 'react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { CurrencyId } from '@content/currencies/types';
import { content } from '@content/registry';
import { translate } from '@i18n/index';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { SetEmblem } from '@ui/components/SetEmblem/SetEmblem';
import styles from './Chip.module.css';

export type ChipSize = 'sm' | 'md';

/** The mark's side per chip size, in stage pixels. */
const MARK: Record<ChipSize, number> = { sm: 20, md: 26 };

export interface ChipProps {
  /** The thing's mark: a set's emblem, a currency's icon. */
  icon: ReactNode;
  label: string;
  /** A count, a range or a chance after the name, in the numerals' face and in gold. */
  value?: string | undefined;
  size?: ChipSize;
  className?: string | undefined;
  testId?: string | undefined;
}

/**
 * Something worth noticing, named with its mark (docs/tech/UI_DESIGN.md §4) — what a settlement
 * drops, what a keep holds, what a chest pays. The mark is the part a player learns to spot; the
 * name beside it is there until they have.
 */
export function Chip({ icon, label, value, size = 'md', className, testId }: ChipProps) {
  return (
    <span className={[styles.chip, styles[size], className ?? ''].join(' ')} data-testid={testId}>
      <span className={styles.mark}>{icon}</span>
      <span className={styles.label}>{label}</span>
      {value ? <span className={`num ${styles.value}`}>{value}</span> : null}
    </span>
  );
}

export interface SetChipProps extends Omit<ChipProps, 'icon' | 'label'> {
  setId: string;
}

/** A gear set by its emblem and name (GEAR.md §5.1). */
export function SetChip({ setId, size = 'md', ...rest }: SetChipProps) {
  const set = content.gearSetById(setId);
  return (
    <Chip
      icon={set ? <SetEmblem emblem={set.emblem} size={MARK[size]} /> : null}
      label={set ? translate(set.name) : setId}
      size={size}
      {...rest}
    />
  );
}

export interface CurrencyChipProps extends Omit<ChipProps, 'icon' | 'label'> {
  currency: CurrencyId;
}

/** A currency — a material, a shard, a brew — by its icon and name. */
export function CurrencyChip({ currency, size = 'md', ...rest }: CurrencyChipProps) {
  const def = CURRENCY_BY_ID[currency];
  return (
    <Chip
      icon={<TintedIcon asset={def.icon} tint={def.tint} size={MARK[size]} />}
      label={translate(def.name)}
      size={size}
      {...rest}
    />
  );
}
