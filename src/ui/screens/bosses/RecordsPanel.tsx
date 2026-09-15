import { content } from '@content/registry';
import { t, translate, type I18nKey } from '@i18n/index';
import type { BossView } from '@state/bosses';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Panel } from '@ui/components/Frame/Panel';
import styles from './RecordsPanel.module.css';

/**
 * Personal records (docs/design/BOSSES.md §1): this is a single-player game, so the reference
 * screen's leaderboard is the chronicle's own best on each tier — and who did it.
 */
export function RecordsPanel({ view }: { view: BossView }) {
  return (
    <Panel
      kind="arch"
      padding={16}
      className={styles.panel}
      contentClassName={styles.body}
      aria-label={t('bosses.records')}
    >
      <h2 className={`display ${styles.title}`}>{t('bosses.records')}</h2>
      <ul className={styles.list} data-testid="boss-records">
        {view.tiers.map((entry) => (
          <li key={entry.tier.id} className={styles.row}>
            <div className={styles.rowHead}>
              <span className={styles.tier}>{t(entry.tier.name as I18nKey)}</span>
              <span className={`num ${styles.damage}`}>
                {entry.record ? Math.round(entry.record.damage).toLocaleString('en-US') : '—'}
              </span>
            </div>
            {entry.record ? (
              <div className={styles.team}>
                {entry.record.team.map((defId, index) => {
                  const def = content.championById(defId as 'champ.anuria');
                  return def ? (
                    <AssetImage
                      key={`${defId}-${index}`}
                      asset={def.art.avatar}
                      className={styles.face}
                      alt={t(def.name as I18nKey)}
                      title={t(def.name as I18nKey)}
                    />
                  ) : null;
                })}
                <span className={styles.when}>
                  {new Date(entry.record.at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            ) : (
              <p className={styles.empty}>{t('bosses.records.empty')}</p>
            )}
          </li>
        ))}
      </ul>
      <p className={styles.note}>{translate('bosses.records.note', { keys: view.boss.keysPerPeriod })}</p>
    </Panel>
  );
}
