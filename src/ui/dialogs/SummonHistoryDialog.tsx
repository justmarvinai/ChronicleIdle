import { HISTORY_LIMIT } from '@content/balance/summon';
import { t, translate } from '@i18n/index';
import { selectActions, selectSummon } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { RARITY_HEX } from '@ui/styles/display-maps';
import { historyRows } from '@ui/summon/portal-view';
import styles from './SummonHistoryDialog.module.css';

export interface SummonHistoryDialogProps {
  onClose: () => void;
}

/** Every pull the save still remembers, newest first (SUMMONING.md §5, ARCHITECTURE.md §4.1). */
export function SummonHistoryDialog({ onClose }: SummonHistoryDialogProps) {
  const actions = useGameStore(selectActions);
  const summon = useGameStore(selectSummon);
  const rows = historyRows(summon?.history ?? []);

  return (
    <Dialog title={t('portal.history')} onClose={onClose} width={760} testId="dialog-summon-history">
      {rows.length === 0 ? (
        <p className={styles.empty}>{t('portal.history.empty')}</p>
      ) : (
        <>
          <p className={styles.count}>
            {translate('portal.history.count', { count: rows.length, limit: HISTORY_LIMIT })}
          </p>
          <ScrollArea height={460}>
            <ul className={styles.list}>
              {rows.map((row) => (
                <li key={row.record.instanceId} className={styles.row}>
                  <button
                    type="button"
                    className={styles.entry}
                    data-testid={`history-${row.record.instanceId}`}
                    onClick={() => {
                      actions.markSeen([row.record.instanceId]);
                      onClose();
                      actions.push({ name: 'champions', instanceId: row.record.instanceId });
                    }}
                  >
                    <span className={styles.name} style={{ color: RARITY_HEX[row.record.rarity] }}>
                      {row.name}
                    </span>
                    <span className={styles.rarity}>{row.rarity}</span>
                    <span className={styles.shard}>{row.shard}</span>
                    <span className={styles.tags}>
                      {[
                        row.record.featured ? t('portal.featured.doubled') : '',
                        row.record.mercy ? t('portal.history.mercy') : '',
                        row.record.duplicate ? t('portal.history.duplicate') : t('summon.reveal.new'),
                      ]
                        .filter((tag) => tag !== '')
                        .join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </>
      )}
    </Dialog>
  );
}
