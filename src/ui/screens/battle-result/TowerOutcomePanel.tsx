import { CURRENCY_BY_ID } from '@content/currencies/index';
import { t, translate } from '@i18n/index';
import type { TowerFloorSummary } from '@state/tower';
import styles from './TowerOutcomePanel.module.css';

/**
 * What a tower floor paid (docs/design/ETERNAL_TOWER.md §4). A floor is not a damage race, so this
 * reads like a spoils list: whether the climb advanced, and what the floor left behind. A boss
 * floor's shards get their own line, because they are the reason to fight one again.
 */
export function TowerOutcomePanel({ summary }: { summary: TowerFloorSummary }) {
  return (
    <div className={styles.panel} data-testid="tower-outcome">
      <h3 className={`display ${styles.title}`}>
        {summary.boss
          ? t('tower.result.bossFloor', { floor: summary.floor })
          : t('tower.result.floor', { floor: summary.floor })}
      </h3>
      <p className={styles.note} data-testid="tower-outcome-climb">
        {!summary.cleared
          ? t('tower.result.held')
          : summary.newBest
            ? t('tower.result.newBest', { floor: summary.highestFloor })
            : t('tower.result.cleared', { floor: summary.highestFloor })}
      </p>
      {summary.cleared ? (
        <ul className={styles.rows} data-testid="tower-outcome-rewards">
          {summary.changes.map((change) => (
            <li key={change.currency}>
              <span>{translate(CURRENCY_BY_ID[change.currency].name)}</span>
              <span className="num">+{change.delta.toLocaleString('en-US')}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {summary.shards.length ? (
        <p className={styles.gain} data-testid="tower-outcome-shards">
          {t('tower.result.shards', {
            shards: summary.shards.map((shard) => translate(CURRENCY_BY_ID[shard.currency].name)).join(' · '),
          })}
        </p>
      ) : null}
    </div>
  );
}
