import type { ReactNode } from 'react';
import { t } from '@i18n/index';
import { selectActions, selectProfile, TOP_BAR_CURRENCIES, energyView } from '@state/selectors';
import { useGameStore } from '@state/store';
import { useShallow } from 'zustand/react/shallow';
import { IconButton } from '@ui/components/Button/IconButton';
import { CurrencyPill } from '@ui/components/CurrencyPill/CurrencyPill';
import { IdleChestButton } from '@ui/components/TopBar/IdleChestButton';
import { BoostPills } from './BoostPills';
import { ProfileChip } from '@ui/components/TopBar/ProfileChip';
import { useNow } from '@ui/hooks/useNow';
import { kitBorder } from '@ui/styles/kit';
import styles from './TopBar.module.css';

export interface TopBarProps {
  title?: string;
  /** Show the back button instead of the profile chip (sub-screens). */
  onBack?: () => void;
  onClose?: () => void;
  children?: ReactNode;
}

/** Screen chrome: title/profile on the left, currencies centre-right, settings/close on the right. */
export function TopBar({ title, onBack, onClose, children }: TopBarProps) {
  const now = useNow(1000);
  const profile = useGameStore(selectProfile);
  const actions = useGameStore(selectActions);
  const wallet = useGameStore((s) => s.save?.wallet ?? null);
  const energy = useGameStore(useShallow((s) => energyView(s, now)));
  return (
    <header className={styles.bar} style={kitBorder('ui.dark_ember.bg_wide', 0.5)} data-testid="topbar">
      <div className={styles.left}>
        {onBack ? (
          <IconButton kind="back" label={t('common.back')} onClick={onBack} sound="ui.cancel" />
        ) : null}
        {title ? <h1 className={`display ${styles.title}`}>{title}</h1> : null}
        {!onBack && profile ? <ProfileChip onClick={() => actions.openDialog({ name: 'profile' })} /> : null}
        {/* The live boosts ride beside the chip, so they are on every screen (MARKET.md §4). */}
        {profile ? <BoostPills /> : null}
      </div>
      <div className={styles.center}>{children}</div>
      <div className={styles.right}>
        {wallet
          ? TOP_BAR_CURRENCIES.map((def) =>
              def.id === 'energy' && energy ? (
                <CurrencyPill
                  key={def.id}
                  currency="energy"
                  amount={energy.value}
                  cap={energy.cap}
                  highlight={energy.overCap ? 'over' : energy.value < 10 ? 'low' : null}
                  onAdd={() => actions.openDialog({ name: 'wallet' })}
                />
              ) : (
                <CurrencyPill
                  key={def.id}
                  currency={def.id}
                  amount={wallet[def.id]}
                  onAdd={() => actions.openDialog({ name: 'wallet' })}
                />
              ),
            )
          : null}
        <IdleChestButton />
        <IconButton
          kind="settings"
          label={t('topbar.settings')}
          onClick={() => actions.openDialog({ name: 'settings' })}
          data-testid="topbar-settings"
        />
        {onClose ? (
          <IconButton kind="close" label={t('common.close')} onClick={onClose} sound="ui.cancel" />
        ) : null}
      </div>
    </header>
  );
}
