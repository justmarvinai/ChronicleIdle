import { CURRENCY_BY_ID } from '@content/currencies/index';
import { t, translate } from '@i18n/index';
import type { QuestBoardState } from '@state/quests';
import { Bar } from '@ui/components/Bar/Bar';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import styles from './PointsTrack.module.css';

export interface PointsTrackProps {
  view: QuestBoardState;
  onClaim: (points: number) => void;
}

/**
 * The points track (docs/design/QUESTS_MISSIONS.md §2, `UI_DESIGN.md` §5.14): one rail from zero
 * to the board's hundred with a chest standing at every threshold. Claiming a quest fills the
 * rail, so the chest a chronicle is walking towards is always the next one along it.
 */
export function PointsTrack({ view, onClaim }: PointsTrackProps) {
  return (
    <Panel kind="ember-wide" padding={18} className={styles.panel} contentClassName={styles.body}>
      <header className={styles.head}>
        <Glyph glyph="glyph.burning_scroll" size={26} color="var(--gold-2)" />
        <span className={`num ${styles.points}`} data-testid="quests-points">
          {translate('quests.points', { points: view.points, of: view.pointsPossible })}
        </span>
        {view.points >= view.pointsPossible ? (
          <span className={styles.done} data-testid="quests-board-done">
            {t('quests.boardDone')}
          </span>
        ) : null}
      </header>

      <div className={styles.rail}>
        <Bar value={view.points} max={view.pointsPossible} kind="stamina" height={22} />
        {view.chests.map((chest) => {
          const state = chest.claimed ? 'claimed' : chest.claimable ? 'claimable' : 'locked';
          const cycle = chest.chest.cycle;
          return (
            <div
              key={chest.chest.points}
              className={styles.node}
              style={{ left: `${(chest.chest.points / view.pointsPossible) * 100}%` }}
            >
              <Tooltip
                content={
                  <div className={styles.tip}>
                    <strong className={styles.tipTitle}>
                      {translate('quests.chestAt', { points: chest.chest.points })}
                    </strong>
                    <RewardList amounts={chest.chest.currencies} layout="column" size={22} />
                    {cycle ? (
                      <span className={styles.cycle}>
                        {translate('quests.chestCycle', {
                          every: cycle.every,
                          reward: cycle.instead
                            .map(
                              (entry) => `${translate(CURRENCY_BY_ID[entry.currency].name)} ×${entry.amount}`,
                            )
                            .join(', '),
                        })}
                      </span>
                    ) : null}
                  </div>
                }
              >
                <button
                  type="button"
                  className={[styles.chest, styles[state]].join(' ')}
                  disabled={!chest.claimable}
                  onClick={() => onClaim(chest.chest.points)}
                  aria-label={translate('quests.chestAt', { points: chest.chest.points })}
                  data-testid={`quest-chest-${view.period}-${chest.chest.points}`}
                >
                  <Glyph
                    glyph={chest.claimed ? 'glyph.trophy_cup' : 'glyph.burning_scroll'}
                    size={26}
                    color={chest.claimable ? 'var(--gold-2)' : 'var(--text-3)'}
                  />
                </button>
              </Tooltip>
              <span className={`num ${styles.threshold}`}>
                {chest.claimed ? t('quests.chestClaimed') : chest.chest.points}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
