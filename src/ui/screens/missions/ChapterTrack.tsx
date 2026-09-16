import { t, translate } from '@i18n/index';
import type { ChapterView } from '@engine/missions/path';
import { Bar } from '@ui/components/Bar/Bar';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import styles from './ChapterTrack.module.css';

export interface ChapterTrackProps {
  view: ChapterView;
  onClaimChest: () => void;
}

/**
 * The chapter's own progress and the chest at the end of it (docs/tech/UI_DESIGN.md §5.15): twelve
 * missions along a rail, and a node that lights when the last of them is claimed. The final
 * chapter's node is Eldric himself, so it says who it is holding.
 */
export function ChapterTrack({ view, onClaimChest }: ChapterTrackProps) {
  const chest = view.chapter.chest;
  const eldric = chest.champion !== undefined;
  const state = view.chestClaimed ? 'claimed' : view.chestClaimable ? 'claimable' : 'locked';
  return (
    <Panel kind="ember-wide" padding={16} className={styles.panel} contentClassName={styles.body}>
      <div className={styles.text}>
        <span className={`display ${styles.title}`}>{t('missions.chest')}</span>
        <span className={`num ${styles.count}`} data-testid="missions-chapter-progress">
          {translate('missions.chapterProgress', {
            claimed: view.claimed,
            total: view.chapter.missions.length,
          })}
        </span>
      </div>

      <Bar
        value={view.claimed}
        max={view.chapter.missions.length}
        kind="stamina"
        height={24}
        className={styles.rail ?? ''}
      />

      <Tooltip
        content={
          <div className={styles.tip}>
            <strong className={styles.tipTitle}>{t('missions.chest')}</strong>
            {chest.currencies.length ? (
              <RewardList amounts={chest.currencies} layout="column" size={22} />
            ) : null}
            {eldric ? <span>{t('missions.eldricJoined')}</span> : null}
            {chest.gearChoice ? <span>{t('missions.gearChoice.title')}</span> : null}
          </div>
        }
      >
        <button
          type="button"
          className={[styles.chest, styles[state]].join(' ')}
          disabled={!view.chestClaimable}
          onClick={onClaimChest}
          aria-label={t('missions.chest')}
          data-testid={`chapter-chest-${view.chapter.index}`}
        >
          <Glyph
            glyph={view.chestClaimed ? 'glyph.trophy_cup' : eldric ? 'glyph.owl' : 'glyph.burning_scroll'}
            size={30}
            color={view.chestClaimable ? 'var(--gold-2)' : 'var(--text-3)'}
          />
          <span className={styles.chestLabel}>
            {view.chestClaimed
              ? t('missions.chestTaken')
              : view.chestClaimable
                ? t('missions.claim')
                : t('missions.chestLocked')}
          </span>
        </button>
      </Tooltip>
    </Panel>
  );
}
