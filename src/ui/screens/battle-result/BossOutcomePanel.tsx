import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { BossFightSummary } from '@state/bosses';
import { Bar } from '@ui/components/Bar/Bar';
import styles from './BossOutcomePanel.module.css';

const count = (value: number): string => Math.round(value).toLocaleString('en-US');

/**
 * What a key bought (docs/design/BOSSES.md §1): the damage this fight did, the period's pool after
 * it, and the chests that damage has just earned. A boss fight has no stars and no spoils of its
 * own — the chests at the gate are the spoils.
 */
export function BossOutcomePanel({ summary }: { summary: BossFightSummary }) {
  const tier = content.bossTier(summary.bossId, summary.tierId);
  if (!tier) return null;
  return (
    <div className={styles.panel} data-testid="result-boss">
      <h3 className={`display ${styles.title}`}>{t('bosses.result.damage')}</h3>
      <p className={`num ${styles.damage}`} data-testid="result-boss-damage">
        {count(summary.damage)}
      </p>

      <Bar
        value={summary.total}
        max={tier.stats.hp}
        kind="ember"
        height={24}
        label={translate('bosses.damageOf', {
          damage: count(summary.total),
          pool: count(tier.stats.hp),
        })}
      />
      <p className={styles.total} data-testid="result-boss-total">
        {translate('bosses.result.total', {
          damage: count(summary.total),
          pct: Math.floor(summary.percent),
        })}
      </p>

      {summary.newRecord ? (
        <p className={styles.record} data-testid="result-boss-record">
          {t('bosses.result.record')}
        </p>
      ) : null}
      {summary.unlocked.length ? (
        <p className={styles.unlocked} data-testid="result-boss-chests">
          {translate('bosses.result.unlocked', {
            list: summary.unlocked.map((pct) => `${pct} %`).join(', '),
          })}
        </p>
      ) : null}
      <p className={styles.xp}>
        {t('battleResult.playerXpLabel')} +{count(summary.playerXp)}
      </p>
    </div>
  );
}
