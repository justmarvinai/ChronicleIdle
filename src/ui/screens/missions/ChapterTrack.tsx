import { t, translate } from '@i18n/index';
import type { ChapterView } from '@engine/missions/path';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardSlots } from '@ui/components/RewardSlots/RewardSlots';
import type { RewardSlotItem } from '@ui/components/RewardSlots/slots';
import { RARITY_HEX } from '@ui/styles/display-maps';
import styles from './ChapterTrack.module.css';

/** The portrait the Path, the tutorial and the last chest all give Eldric. */
export const ELDRIC_PORTRAIT = 'avatar.tutorial_npc' as const;

export interface ChapterTrackProps {
  view: ChapterView;
  onClaimChest: () => void;
}

/**
 * The chapter's chest (docs/tech/UI_DESIGN.md §5.15): twelve pips, one a mission, lit as they are
 * claimed and burning on the one being walked; then what the chest holds, drawn as the rewards it
 * is rather than hidden in a tooltip; then the press that takes it. The tenth chapter's chest holds
 * Eldric himself and the Legendary piece of the player's choosing, so it shows both.
 */
export function ChapterTrack({ view, onClaimChest }: ChapterTrackProps) {
  const chest = view.chapter.chest;
  const extras: RewardSlotItem[] = [];
  if (chest.champion)
    extras.push({
      id: 'champion',
      icon: <AssetImage asset={ELDRIC_PORTRAIT} size={128} className={styles.portraitSlot} alt="" />,
      amount: '',
      label: t('missions.eldricJoined'),
      edge: RARITY_HEX.legendary,
    });
  if (chest.gearChoice)
    extras.push({
      id: 'gear',
      icon: <Glyph glyph="glyph.ribcage_armor" size={36} color={RARITY_HEX.legendary} />,
      amount: '6★',
      label: t('missions.gearChoice.title'),
      edge: RARITY_HEX.legendary,
    });

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

      <ol className={styles.pips} aria-hidden="true">
        {view.missions.map((mission) => (
          <li key={mission.mission.id} className={styles.pip} data-status={mission.status} />
        ))}
      </ol>

      <div className={styles.chest}>
        <RewardSlots
          amounts={chest.currencies}
          items={extras}
          size="md"
          muted={view.chestClaimed}
          testId={`chapter-chest-holds-${view.chapter.index}`}
        />
        <Button
          variant={view.chestClaimable ? 'primary' : 'secondary'}
          size="md"
          disabled={!view.chestClaimable}
          onClick={onClaimChest}
          className={styles.take ?? ''}
          data-state={view.chestClaimed ? 'claimed' : view.chestClaimable ? 'claimable' : 'locked'}
          data-testid={`chapter-chest-${view.chapter.index}`}
        >
          {view.chestClaimed
            ? t('missions.chestTaken')
            : view.chestClaimable
              ? t('missions.claim')
              : t('missions.chestLocked')}
        </Button>
      </div>
    </Panel>
  );
}
