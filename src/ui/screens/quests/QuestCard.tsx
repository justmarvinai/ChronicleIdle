import type { ReactNode } from 'react';
import type { QuestView } from '@engine/quests/board';
import { t, translate, type I18nKey } from '@i18n/index';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { GoButton } from '@ui/places/GoButton';
import type { Destination } from '@ui/places/places';
import { questState } from './quest-view';
import styles from './QuestCard.module.css';

export interface QuestCardProps {
  view: QuestView;
  /** Where the quest is played while it is still to do; null when it is nowhere in particular. */
  destination: Destination | null;
  /** The quest standing in for those not open yet: its points say whose they are. */
  standIn: boolean;
  onClaim: () => void;
  /** The press for a way that leads to this screen's other board. */
  onGo?: () => void;
}

/** The progress track under the count: a groove, not a labelled bar — the count beside it says it. */
const TRACK_HEIGHT = 10;

/**
 * One quest (docs/tech/UI_DESIGN.md §5.14): its emblem, what it asks and what it is worth to the
 * tally, how far along it is, what it pays, and the one press that means something now — **Claim**
 * once it is done, **Go** to where it is played while it is not. A finished quest glows until it is
 * taken; a taken one wears a seal and steps back.
 */
export function QuestCard({ view, destination, standIn, onClaim, onGo }: QuestCardProps) {
  const { quest, progress } = view;
  const state = questState(view);
  const count = translate('quests.progress', {
    progress: progress.progress.toLocaleString('en-US'),
    target: progress.target.toLocaleString('en-US'),
  });
  const points = (
    <span className={`num ${styles.points}`} data-stand-in={standIn}>
      <Glyph glyph="glyph.burning_scroll" size={16} className={styles.pointsGlyph ?? ''} />
      {translate('quests.questPoints', { points: quest.points })}
    </span>
  );
  return (
    <Panel
      kind="thin"
      padding={14}
      className={styles.card}
      contentClassName={styles.inner}
      data-state={state}
      data-testid={`quest-row-${quest.id}`}
    >
      <span className={styles.side}>
        <span className={styles.emblem} aria-hidden="true">
          <Glyph glyph={quest.icon} size={32} className={styles.emblemGlyph ?? ''} />
        </span>
        {standIn ? <Tooltip content={t('quests.hint.replacement')}>{points}</Tooltip> : points}
      </span>

      <div className={styles.body}>
        <span className={`display ${styles.name}`}>{t(quest.name as I18nKey)}</span>
        <div className={styles.progressRow}>
          <Bar
            value={progress.progress}
            max={progress.target}
            kind="stamina"
            height={TRACK_HEIGHT}
            label={count}
            className={styles.bar ?? ''}
          />
          <span className={`num ${styles.count}`} data-done={progress.done}>
            {count}
          </span>
        </div>
        <RewardSlots
          amounts={quest.rewards}
          size="sm"
          muted={state === 'claimed'}
          className={styles.rewards ?? ''}
        />
      </div>

      <div className={styles.action}>{questAction(view, destination, onClaim, onGo)}</div>
    </Panel>
  );
}

function questAction(
  view: QuestView,
  destination: Destination | null,
  onClaim: () => void,
  onGo: (() => void) | undefined,
): ReactNode {
  const { quest } = view;
  switch (questState(view)) {
    case 'claimed':
      return (
        <span className={`display ${styles.seal}`} data-testid={`quest-claimed-${quest.id}`}>
          {t('quests.claimed')}
        </span>
      );
    case 'claimable':
      return (
        <Button
          variant="primary"
          size="md"
          className={styles.press ?? ''}
          onClick={onClaim}
          data-testid={`quest-claim-${quest.id}`}
        >
          {t('quests.claim')}
        </Button>
      );
    case 'open':
      return destination ? (
        <>
          <GoButton
            destination={destination}
            size="sm"
            compact
            {...(onGo ? { onGo } : {})}
            className={styles.press ?? ''}
            testId={`quest-go-${quest.id}`}
          />
          <span className={styles.where}>{destination.name}</span>
        </>
      ) : (
        <span className={styles.where}>{t('quests.open')}</span>
      );
  }
}
