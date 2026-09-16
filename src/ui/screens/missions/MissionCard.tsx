import { t, translate, type I18nKey } from '@i18n/index';
import type { MissionView } from '@engine/missions/path';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { RewardList } from '@ui/components/RewardList/RewardList';
import styles from './MissionCard.module.css';

export interface MissionCardProps {
  view: MissionView;
  onClaim: () => void;
}

/**
 * One mission (docs/tech/UI_DESIGN.md §5.15, the reference's mission cards): its glyph on a
 * banner, the line it asks for, how far along it is, what it pays, and — on the one the Path is
 * on — the press that takes it. A mission still to come wears a shackle rather than a button, so
 * the card says *why* it cannot be claimed without a word of explanation.
 */
export function MissionCard({ view, onClaim }: MissionCardProps) {
  const { mission, progress, status } = view;
  const open = status === 'open' || status === 'claimable';
  return (
    <Panel
      kind={open ? 'ember-tall' : 'thin'}
      padding={16}
      className={[styles.card, styles[status]].join(' ')}
      contentClassName={styles.body}
      data-testid={`mission-card-${mission.id}`}
    >
      <div className={styles.crest}>
        <Glyph
          glyph={status === 'locked' ? 'glyph.broken_shackle' : mission.icon}
          size={44}
          color={open ? 'var(--gold-2)' : 'var(--text-3)'}
        />
      </div>

      <span className={`display ${styles.name}`}>{t(mission.name as I18nKey)}</span>

      <Bar
        value={progress.progress}
        max={progress.target}
        kind="stamina"
        height={22}
        label={translate('missions.progress.count', {
          progress: progress.progress,
          target: progress.target,
        })}
        className={styles.progress ?? ''}
      />

      <RewardList amounts={mission.rewards} layout="column" size={22} className={styles.rewards ?? ''} />

      <div className={styles.foot}>
        {status === 'claimed' ? (
          <span className={styles.taken} data-testid={`mission-claimed-${mission.id}`}>
            <Glyph glyph="glyph.trophy_cup" size={20} color="#9ec79b" />
            {t('missions.claimed')}
          </span>
        ) : status === 'locked' ? (
          <span className={styles.locked}>{t('missions.locked')}</span>
        ) : (
          <Button
            variant={status === 'claimable' ? 'primary' : 'secondary'}
            size="sm"
            disabled={status !== 'claimable'}
            onClick={onClaim}
            data-testid={`mission-claim-${mission.id}`}
          >
            {status === 'claimable' ? t('missions.claim') : t('missions.open')}
          </Button>
        )}
      </div>
    </Panel>
  );
}
