import type { CSSProperties, ReactNode } from 'react';
import type { MissionView } from '@engine/missions/path';
import { t, translate, type I18nKey } from '@i18n/index';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import { GoButton } from '@ui/places/GoButton';
import { PLACES, type Destination } from '@ui/places/places';
import { CARD_FRAME, CARD_TINT } from '@ui/styles/display-maps';
import { FAMILY_TINT, missionFamily, progressLine } from './mission-view';
import styles from './MissionCard.module.css';

export interface MissionCardProps {
  view: MissionView;
  /** Where the mission is played, for the one being walked; null when it is nowhere in particular. */
  destination: Destination | null;
  onClaim: () => void;
}

/** The progress track under the count: a groove, not a labelled bar — the count above says it. */
const TRACK_HEIGHT = 10;

/** A stage reference ("4-10"): the line may wrap around it, never inside it. */
const STAGE_REF = /(\d+-\d+)/;

/** The mission's line with its stage references held whole; the text itself is unchanged. */
function keepRefsWhole(line: string): ReactNode {
  return line.split(STAGE_REF).map((part, index) =>
    STAGE_REF.test(part) ? (
      <span key={index} className={styles.ref}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

/**
 * One mission (docs/tech/UI_DESIGN.md §5.15, the reference's mission cards): a crest in the colour of
 * the kind of asking it is, its place on the Path and its line; in its middle what it is doing — the
 * place it is played at while it is being walked, a trophy once it is done, a seal once taken, a
 * shackle while it waits; then how far along it is and what it pays; and at its foot the one press
 * that means something now — **Claim**, or **Go** to where it is played. A card never offers a press
 * that does nothing: the old *In progress* button was one.
 */
export function MissionCard({ view, destination, onClaim }: MissionCardProps) {
  const { mission, progress, status } = view;
  const family = missionFamily(mission.goal.type);
  const lit = status === 'open' || status === 'claimable';
  const tone = { '--tone': FAMILY_TINT[family] } as CSSProperties;
  const foot = cardFoot(view, destination, onClaim);
  return (
    <DecoFrame
      frame={lit ? CARD_FRAME.unlocked : CARD_FRAME.locked}
      tint={lit ? CARD_TINT.unlocked : CARD_TINT.locked}
      thickness={12}
      className={styles.card}
      style={tone}
      data-status={status}
      data-testid={`mission-card-${mission.id}`}
    >
      <span className={styles.crest} aria-hidden="true">
        <Glyph glyph={mission.icon} size={40} className={styles.crestGlyph ?? ''} />
      </span>

      <span className={`num ${styles.step}`}>
        {translate('missions.step', { chapter: mission.chapter, index: mission.index })}
      </span>
      <span className={`display ${styles.family}`}>{t(`missions.family.${family}`)}</span>
      <p className={styles.name}>{keepRefsWhole(t(mission.name as I18nKey))}</p>

      <div className={styles.state}>{stateMark(view, destination)}</div>

      <div className={styles.progress}>
        <span className={styles.progressHead}>
          <span className={`display ${styles.caption}`}>{t('missions.progressLabel')}</span>
          <span className={`num ${styles.count}`} data-done={progress.progress >= progress.target}>
            {progressLine(progress)}
          </span>
        </span>
        <Bar
          value={progress.progress}
          max={progress.target}
          kind="stamina"
          height={TRACK_HEIGHT}
          label={progressLine(progress)}
        />
      </div>

      <span className={`display ${styles.divider}`}>{t('missions.reward')}</span>
      <RewardSlots
        amounts={mission.rewards}
        size="md"
        muted={status === 'claimed'}
        className={styles.rewards ?? ''}
      />

      {/* Always there, so every card's progress and reward sit level along the rail. */}
      <div className={styles.foot}>{foot}</div>
    </DecoFrame>
  );
}

/** The card's middle: what it is doing, big and quiet — or, while it is walked, where. */
function stateMark(view: MissionView, destination: Destination | null): ReactNode {
  const { mission, status } = view;
  switch (status) {
    case 'locked':
      return (
        <span className={styles.mark}>
          <Glyph glyph="glyph.broken_shackle" size={40} className={styles.markGlyph ?? ''} />
          <span className={`display ${styles.word}`}>{t('missions.locked')}</span>
        </span>
      );
    case 'claimed':
      return (
        <span className={`display ${styles.seal}`} data-testid={`mission-claimed-${mission.id}`}>
          {t('missions.claimed')}
        </span>
      );
    case 'claimable':
      return (
        <span className={styles.mark}>
          <Glyph glyph="glyph.trophy_cup" size={46} className={styles.markGlyph ?? ''} />
          <span className={`display ${styles.word}`}>{t('missions.complete')}</span>
        </span>
      );
    case 'open':
      return destination ? (
        <span className={styles.mark} data-testid={`mission-where-${mission.id}`}>
          <span className={styles.medallion}>
            <Glyph
              glyph={PLACES[destination.place].glyph}
              size={34}
              className={styles.medallionGlyph ?? ''}
            />
          </span>
          <span className={`display ${styles.placeName}`}>{destination.name}</span>
        </span>
      ) : (
        <span className={styles.mark}>
          <Glyph glyph="glyph.hourglass" size={40} className={styles.markGlyph ?? ''} />
          <span className={`display ${styles.word}`}>{t('missions.open')}</span>
        </span>
      );
  }
}

/** The one press that means something now, or what the card waits on. Null when there is neither. */
function cardFoot(view: MissionView, destination: Destination | null, onClaim: () => void): ReactNode {
  const { mission, status } = view;
  switch (status) {
    case 'claimed':
      return null;
    case 'claimable':
      return (
        <Button
          variant="primary"
          size="md"
          className={styles.press ?? ''}
          onClick={onClaim}
          data-testid={`mission-claim-${mission.id}`}
        >
          {t('missions.claim')}
        </Button>
      );
    case 'open':
      return destination ? (
        <GoButton
          destination={destination}
          size="md"
          compact
          className={styles.press ?? ''}
          testId={`mission-go-${mission.id}`}
        />
      ) : null;
    case 'locked':
      return (
        <span className={styles.waits}>
          {mission.index > 1
            ? translate('missions.after', { chapter: mission.chapter, index: mission.index - 1 })
            : translate('missions.afterChapter', { chapter: mission.chapter - 1 })}
        </span>
      );
  }
}
