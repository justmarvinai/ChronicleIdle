import { t, translate, type I18nKey } from '@i18n/index';
import type { QuestView } from '@engine/quests/board';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardList } from '@ui/components/RewardList/RewardList';
import styles from './QuestRow.module.css';

export interface QuestRowProps {
  view: QuestView;
  onClaim: () => void;
}

/**
 * One quest (docs/tech/UI_DESIGN.md §5.14): what it asks for, how far along it is, what it pays
 * and the press that takes it. A finished quest wears the gold frame until it is claimed — the
 * row itself is the "something to do" marker.
 */
export function QuestRow({ view, onClaim }: QuestRowProps) {
  const { quest, progress } = view;
  const state = view.claimed ? 'claimed' : view.claimable ? 'claimable' : 'open';
  return (
    <Panel
      kind="thin"
      padding={14}
      className={[styles.row, styles[state]].join(' ')}
      contentClassName={styles.inner}
      data-testid={`quest-row-${quest.id}`}
    >
      <Glyph
        glyph={quest.icon}
        size={38}
        color={view.claimable ? 'var(--gold-2)' : 'var(--text-2)'}
        className={styles.icon ?? ''}
      />

      <div className={styles.text}>
        <span className={`display ${styles.name}`}>{t(quest.name as I18nKey)}</span>
        <Bar
          value={progress.progress}
          max={progress.target}
          kind="stamina"
          height={22}
          label={translate('quests.progress', { progress: progress.progress, target: progress.target })}
          className={styles.progress ?? ''}
        />
      </div>

      <span className={`num ${styles.points}`}>
        {translate('quests.questPoints', { points: quest.points })}
      </span>
      <RewardList amounts={quest.rewards} className={styles.rewards ?? ''} />

      {view.claimed ? (
        <span className={styles.taken} data-testid={`quest-claimed-${quest.id}`}>
          <Glyph glyph="glyph.trophy_cup" size={20} color="#9ec79b" />
          {t('quests.claimed')}
        </span>
      ) : (
        <Button
          variant={view.claimable ? 'primary' : 'secondary'}
          size="sm"
          disabled={!view.claimable}
          onClick={onClaim}
          data-testid={`quest-claim-${quest.id}`}
        >
          {t('quests.claim')}
        </Button>
      )}
    </Panel>
  );
}
