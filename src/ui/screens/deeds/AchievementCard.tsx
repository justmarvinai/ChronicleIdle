import type { ReactNode } from 'react';
import type { AchievementView } from '@engine/deeds/hall';
import { t, translate, type I18nKey } from '@i18n/index';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { GoButton } from '@ui/places/GoButton';
import type { Destination } from '@ui/places/places';
import { deedLine, ledgerName, tierNumeral } from './deed-text';
import { TierPips } from './TierPips';
import styles from './DeedCard.module.css';

export interface AchievementCardProps {
  view: AchievementView;
  /** Where its goal is played while the tier in hand is still to do. */
  destination: Destination | null;
  onClaim: () => void;
}

/** The progress groove under the line; the count beside it says the number. */
const TRACK_HEIGHT = 10;

/**
 * One achievement (docs/tech/UI_DESIGN.md §5.31): its emblem and its five tiers as diamonds, the
 * tier in hand — its goal, how far along, what it pays and the renown it adds — and the one press
 * that means something now: **Claim** once the tier is met, **Go** while it is not. A finished
 * achievement wears a seal and steps back.
 */
export function AchievementCard({ view, destination, onClaim }: AchievementCardProps) {
  const { def, status } = view;
  // A finished achievement still reads its last tier, so the card says what was done.
  const tier = view.tier ?? def.tiers[def.tiers.length - 1];
  if (!tier) return null;
  const progress = view.progress;
  const count = progress
    ? t('deeds.progress', {
        progress: progress.progress.toLocaleString('en-US'),
        target: progress.target.toLocaleString('en-US'),
      })
    : '';
  return (
    <Panel
      kind="thin"
      padding={14}
      className={styles.card}
      contentClassName={styles.inner}
      data-state={status}
      data-testid={`achievement-${def.id}`}
    >
      <span className={styles.side}>
        <span className={styles.emblem} aria-hidden="true">
          <Glyph glyph={def.icon} size={32} className={styles.emblemGlyph ?? ''} />
        </span>
        <TierPips claimed={view.claimed} waiting={view.claimable} tiers={def.tiers.length} />
      </span>

      <div className={styles.body}>
        <span className={styles.head}>
          <span className={`display ${styles.name}`}>{t(def.name as I18nKey)}</span>
          <span className={styles.kicker}>
            {ledgerName(def.ledger)}
            <span className={`display ${styles.numeral}`} data-testid={`achievement-tier-${def.id}`}>
              {tierNumeral(tier.tier)}
            </span>
          </span>
        </span>
        <span className={styles.line}>{deedLine(def.line, tier.goal)}</span>
        {progress ? (
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
          <RewardSlots amounts={tier.rewards} size="sm" muted={status === 'done'} />
          <Renown renown={tier.renown} />
        </span>
      </div>

      <div className={styles.action}>{action(view, destination, onClaim)}</div>
    </Panel>
  );
}

/** The renown a deed adds, in the Hall's own mark. */
export function Renown({ renown }: { renown: number }) {
  return (
    <span className={`num ${styles.renown}`} title={t('deeds.renown')}>
      <Glyph glyph="glyph.trophy_cup" size={16} className={styles.renownGlyph ?? ''} />
      {translate('deeds.renownGain', { renown })}
    </span>
  );
}

function action(view: AchievementView, destination: Destination | null, onClaim: () => void): ReactNode {
  const { def } = view;
  switch (view.status) {
    case 'done':
      return (
        <span className={`display ${styles.seal}`} data-testid={`achievement-done-${def.id}`}>
          {t('deeds.complete')}
        </span>
      );
    case 'claimable':
      return (
        <Button
          variant="primary"
          size="md"
          className={styles.press ?? ''}
          onClick={onClaim}
          data-testid={`achievement-claim-${def.id}`}
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
            testId={`achievement-go-${def.id}`}
          />
          <span className={styles.where}>{destination.name}</span>
        </>
      ) : (
        <span className={styles.where}>{t('deeds.open')}</span>
      );
  }
}
