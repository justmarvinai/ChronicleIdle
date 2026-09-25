import { useState } from 'react';
import { playSfx } from '@audio/index';
import { CURRENCIES } from '@content/currencies/index';
import type { CurrencyCategory, CurrencyId } from '@content/currencies/types';
import { t, translate } from '@i18n/index';
import { selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { holdingOf } from '@state/wallet';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { useNow } from '@ui/hooks/useNow';
import { WalletDetail } from './WalletDetail';
import { heldLine } from './wallet-view';
import styles from './WalletDialog.module.css';

const ORDER: readonly CurrencyCategory[] = ['core', 'keys', 'shards', 'brews', 'tomes', 'materials'];

export interface WalletDialogProps {
  /** The currency to open on — the purse whose + was pressed. */
  currency?: CurrencyId | undefined;
  onClose: () => void;
}

/**
 * The Wallet (docs/tech/UI_DESIGN.md §5.26): everything the chronicle holds, grouped as tiles on the
 * left — energy and the three keys read from their own pools, so they show what can be spent, out
 * of their cap — and the chosen currency in full on the right, with where it comes from and what it
 * is for.
 */
export function WalletDialog({ currency, onClose }: WalletDialogProps) {
  const save = useGameStore(selectSave);
  // A countdown on the right ticks; a minute's resolution would leave "next in 0s" standing.
  const now = useNow(1000);
  const [chosen, setChosen] = useState<CurrencyId>(currency ?? 'gold');
  if (!save) return null;
  return (
    <Dialog title={t('wallet.title')} onClose={onClose} width={1640} testId="dialog-wallet">
      <div className={styles.layout}>
        <ScrollArea height={740} fade className={styles.holdings ?? ''} data-testid="wallet-holdings">
          {ORDER.map((category) => (
            <section key={category} className={styles.group}>
              <h3 className={`display ${styles.groupTitle}`}>{t(`wallet.category.${category}`)}</h3>
              <ul className={styles.tiles}>
                {CURRENCIES.filter((def) => def.category === category).map((def) => (
                  <li key={def.id}>
                    <button
                      type="button"
                      className={styles.tile}
                      aria-pressed={def.id === chosen}
                      onMouseEnter={() => playSfx('ui.hover')}
                      onClick={() => {
                        setChosen(def.id);
                        playSfx('ui.tab');
                      }}
                      data-testid={`wallet-${def.id}`}
                    >
                      <TintedIcon asset={def.icon} tint={def.tint} size={40} />
                      <span className={styles.tileText}>
                        <span className={styles.tileName}>{translate(def.name)}</span>
                        <span className={`num ${styles.tileAmount}`}>
                          {heldLine(holdingOf(save, def.id, now))}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </ScrollArea>
        <WalletDetail currency={chosen} save={save} now={now} />
      </div>
    </Dialog>
  );
}
