import { t } from '@i18n/index';
import type { BattleOutcome } from '@engine/battle/index';
import styles from './ResultStats.module.css';

/**
 * The fight in three numbers (docs/tech/UI_DESIGN.md §5.10) — ally turns, all turns, waves cleared
 * — set as one line at the end of the team's heading, over the last card.
 */
export function ResultStats({ outcome }: { outcome: BattleOutcome }) {
  return (
    <dl className={styles.stats}>
      <div>
        <dt>{t('battleResult.turns')}</dt>
        <dd className="num" data-testid="result-turns">
          {outcome.allyTurns}
        </dd>
      </div>
      <div>
        <dt>{t('battleResult.totalTurns')}</dt>
        <dd className="num">{outcome.turns}</dd>
      </div>
      <div>
        <dt>{t('battleResult.waves')}</dt>
        <dd className="num">
          {outcome.wavesCleared} / {outcome.waveCount}
        </dd>
      </div>
    </dl>
  );
}
