import { CURRENCIES } from '@content/currencies/index';
import type { CurrencyCategory } from '@content/currencies/types';
import { formatAmount } from '@engine/economy/wallet';
import { t, translate } from '@i18n/index';
import { selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import styles from './dialogs.module.css';

const ORDER: CurrencyCategory[] = ['core', 'keys', 'shards', 'brews', 'tomes', 'materials'];

/** Every currency the chronicle owns, grouped by category. */
export function WalletDialog({ onClose }: { onClose: () => void }) {
  const wallet = useGameStore(selectWallet);
  if (!wallet) return null;
  return (
    <Dialog title={t('wallet.title')} onClose={onClose} width={900} testId="dialog-wallet">
      <ScrollArea height={560}>
        {ORDER.map((category) => (
          <section key={category} className={styles.section}>
            <h3 className={`display ${styles.sectionTitle}`}>{t(`wallet.category.${category}`)}</h3>
            <div className={styles.grid}>
              {CURRENCIES.filter((c) => c.category === category).map((def) => (
                <Tooltip key={def.id} content={translate(def.description)}>
                  <div className={styles.walletItem} data-testid={`wallet-${def.id}`}>
                    <TintedIcon asset={def.icon} tint={def.tint} size={34} />
                    <span className={styles.walletName}>{translate(def.name)}</span>
                    <span className={`num ${styles.walletAmount}`}>{formatAmount(wallet[def.id])}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </section>
        ))}
      </ScrollArea>
    </Dialog>
  );
}
