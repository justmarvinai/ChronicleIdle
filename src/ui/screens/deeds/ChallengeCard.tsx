import type { ReactNode } from 'react';
import type { ChallengeView } from '@engine/deeds/hall';
import { t, translate, type I18nKey } from '@i18n/index';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { GoButton } from '@ui/places/GoButton';
import type { Destination } from '@ui/places/places';
import { Renown } from './AchievementCard';
import { deedLine } from './deed-text';
import { challengeExtras } from './deed-view';
import styles from './DeedCard.module.css';

export interface ChallengeCardProps {
  view: ChallengeView;
  destination: Destination | null;
  onClaim: () => void;
}

const TRACK_HEIGHT = 10;

/**
 * One challenge (docs/tech/UI_DESIGN.md §5.31): a one-off feat, what it asks, what it pays — the
 * frame or the title it hangs up besides, named on the card — and its press. A feat that is done
 * or not done shows no bar; a climb (a floor, a pool, every star) shows how far it has come.
 */
export function ChallengeCard({ view, destination, onClaim }: ChallengeCardProps) {
  const { def, progress, status } = view;
  const extras = challengeExtras(def.id);
  const count = t('deeds.progress', {
    progress: progress.progress.toLocaleString('en-US'),
    target: progress.target.toLocaleString('en-US'),
  });
  return (
    <Panel
      kind="thin"
      padding={14}
      className={styles.card}
      contentClassName={styles.inner}
      data-state={status}
      data-kind="challenge"
      data-testid={`challenge-${def.id}`}
    >
      <span className={styles.side}>
        <span className={styles.emblem} data-kind="challenge" aria-hidden="true">
          <Glyph glyph={def.icon} size={32} className={styles.emblemGlyph ?? ''} />
        </span>
        <Renown renown={def.renown} />
      </span>

      <div className={styles.body}>
        <span className={`display ${styles.name}`}>{t(def.name as I18nKey)}</span>
        <span className={styles.line}>{deedLine(def.line, def.goal)}</span>
        {progress.target > 1 && status !== 'done' ? (
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
        ) : null}
        <span className={styles.pays}>
          <RewardSlots amounts={def.rewards} size="sm" muted={status === 'done'} />
          {extras.frames.map((frame) => (
            <span key={frame.id} className={styles.extra} style={{ color: frame.tint }}>
              {t('deeds.rank.frame', { frame: translate(frame.name) })}
            </span>
          ))}
          {extras.titles.map((title) => (
            <span key={title.id} className={styles.extra}>
              {t('deeds.rank.title', { title: translate(title.name) })}
            </span>
          ))}
        </span>
      </div>

      <div className={styles.action}>{action(view, destination, onClaim)}</div>
    </Panel>
  );
}

function action(view: ChallengeView, destination: Destination | null, onClaim: () => void): ReactNode {
  const { def } = view;
  switch (view.status) {
    case 'done':
      return (
        <span className={`display ${styles.seal}`} data-testid={`challenge-done-${def.id}`}>
          {t('deeds.claimed')}
        </span>
      );
    case 'claimable':
      return (
        <Button
          variant="primary"
          size="md"
          className={styles.press ?? ''}
          onClick={onClaim}
          data-testid={`challenge-claim-${def.id}`}
        >
          {t('deeds.claim')}
        </Button>
      );
    case 'open':
      return destination ? (
        <>
          <GoButton
            destination={destination}
            size="sm"
            compact
            className={styles.press ?? ''}
            testId={`challenge-go-${def.id}`}
          />
          <span className={styles.where}>{destination.name}</span>
        </>
      ) : (
        <span className={styles.where}>{t('deeds.open')}</span>
      );
  }
}
