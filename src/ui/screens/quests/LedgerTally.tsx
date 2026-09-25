import type { CSSProperties } from 'react';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import type { QuestChestView } from '@engine/quests/board';
import { t, translate } from '@i18n/index';
import type { QuestBoardState } from '@state/quests';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { chestState, pointsToGo, railShare } from './quest-view';
import styles from './LedgerTally.module.css';

export interface LedgerTallyProps {
  view: QuestBoardState;
  onClaim: (points: number) => void;
}

/**
 * The tally (docs/design/QUESTS_MISSIONS.md §2, `UI_DESIGN.md` §5.14): the board's points, and its
 * chests down a rail that fills from the top as quests are claimed — each chest standing where its
 * threshold falls, with what it holds beside it and how far off it still is. A chest the points
 * have reached glows until it is opened.
 */
export function LedgerTally({ view, onClaim }: LedgerTallyProps) {
  const done = view.points >= view.pointsPossible;
  const ladder = { '--fill': railShare(view.points, view.pointsPossible) } as CSSProperties;
  return (
    <Panel kind="ember-wide" padding={22} className={styles.panel} contentClassName={styles.body}>
      <header className={styles.head}>
        <span className={`display ${styles.title}`}>{t(`quests.tally.${view.period}`)}</span>
        <span className={`num ${styles.points}`} data-testid="quests-points">
          {translate('quests.points', { points: view.points, of: view.pointsPossible })}
        </span>
        {done ? (
          <span className={styles.done} data-testid="quests-board-done">
            {t('quests.boardDone')}
          </span>
        ) : (
          <span className={styles.hint}>{t('quests.tallyHint')}</span>
        )}
      </header>

      <ol className={styles.ladder} style={ladder}>
        <li className={styles.rail} aria-hidden="true">
          <span className={styles.railFill} />
        </li>
        {view.chests.map((chest) => (
          <ChestRow
            key={chest.chest.points}
            chest={chest}
            period={view.period}
            points={view.points}
            share={railShare(chest.chest.points, view.pointsPossible)}
            onClaim={() => onClaim(chest.chest.points)}
          />
        ))}
      </ol>
    </Panel>
  );
}

interface ChestRowProps {
  chest: QuestChestView;
  period: QuestBoardState['period'];
  points: number;
  share: number;
  onClaim: () => void;
}

function ChestRow({ chest, period, points, share, onClaim }: ChestRowProps) {
  const state = chestState(chest);
  const cycle = chest.chest.cycle;
  return (
    <li className={styles.row} data-state={state} style={{ '--at': share } as CSSProperties}>
      <span className={styles.node} aria-hidden="true" />
      <button
        type="button"
        className={styles.chest}
        disabled={!chest.claimable}
        onClick={onClaim}
        aria-label={translate('quests.chestAt', { points: chest.chest.points })}
        data-testid={`quest-chest-${period}-${chest.chest.points}`}
      >
        <AssetImage asset="ui.stone_vine.icon_chest" alt="" className={styles.chestArt ?? ''} />
        <span className={`num ${styles.threshold}`}>{chest.chest.points}</span>
        {state === 'claimed' ? (
          <span className={styles.check} aria-hidden="true">
            <Glyph glyph="glyph.trophy_cup" size={18} />
          </span>
        ) : null}
      </button>
      <div className={styles.holds}>
        <RewardSlots amounts={chest.chest.currencies} size="sm" muted={state === 'claimed'} />
        <span className={styles.state}>
          {state === 'claimed'
            ? t('quests.chestClaimed')
            : state === 'claimable'
              ? t('quests.chestReady')
              : translate('quests.chestToGo', { points: pointsToGo(chest, points) })}
        </span>
        {cycle ? (
          <span className={styles.cycle}>
            {translate('quests.chestCycle', {
              every: cycle.every,
              reward: cycle.instead
                .map((entry) =>
                  translate('common.amountOf', {
                    name: translate(CURRENCY_BY_ID[entry.currency].name),
                    amount: entry.amount.toLocaleString('en-US'),
                  }),
                )
                .join(t('common.listSeparator')),
            })}
          </span>
        ) : null}
      </div>
    </li>
  );
}
