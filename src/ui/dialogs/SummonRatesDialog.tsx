import { SHARD_IDS } from '@content/balance/summon';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import { mercyOf } from '@state/summon';
import { selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { useNow } from '@ui/hooks/useNow';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { mercySentences, rateRows } from '@ui/summon/portal-view';
import styles from './SummonRatesDialog.module.css';

export interface SummonRatesDialogProps {
  bannerId: string;
  onClose: () => void;
}

/** Every shard's table and what mercy owes on it — the "i" one tap away (SUMMONING.md §1–§2). */
export function SummonRatesDialog({ bannerId, onClose }: SummonRatesDialogProps) {
  const save = useGameStore(selectSave);
  const banner = content.bannerById(bannerId);
  // A Primordial Rotation hurries its own mercy, so the panel needs the clock too.
  const now = useNow(30_000);

  return (
    <Dialog title={t('portal.rates')} onClose={onClose} width={960} testId="dialog-summon-rates">
      <p className={styles.note}>{t('portal.rates.mercyNote')}</p>
      <div className={styles.grid}>
        {SHARD_IDS.map((shard) => {
          const mercy = save && banner ? mercyOf(save, banner, shard, now) : [];
          const sentences = mercySentences(mercy);
          return (
            <section key={shard} className={styles.card} data-testid={`rates-${shard}`}>
              <h3 className={`display ${styles.name}`}>
                {translate('portal.rates.title', { shard: t(`shard.${shard}`) })}
              </h3>
              <ul className={styles.rows}>
                {rateRows(shard).map((row) => (
                  <li key={row.rarity} className={styles.row}>
                    <span className={styles.rarity} style={{ color: RARITY_HEX[row.rarity] }}>
                      {t(`rarity.${row.rarity}`)}
                    </span>
                    <span className={`num ${styles.chance}`}>
                      {translate('portal.rates.chance', { chance: row.chance })}
                    </span>
                    <span className={styles.pool}>{translate('portal.rates.pool', { count: row.pool })}</span>
                  </li>
                ))}
              </ul>
              <h4 className={styles.mercyHead}>{t('portal.pity')}</h4>
              {sentences.length === 0 ? (
                <p className={styles.none}>{t('portal.pity.none')}</p>
              ) : (
                <ul className={styles.mercy}>
                  {sentences.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </Dialog>
  );
}
