import { avatarUrl } from '@assets/manifest';
import type { AvatarKey } from '@assets/manifest.generated';
import { playSfx } from '@audio/index';
import { xpToNextLevel } from '@engine/progression/player-level';
import { t } from '@i18n/index';
import { selectProfile } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Bar } from '@ui/components/Bar/Bar';
import { imageUrl } from '@assets/manifest';
import styles from './ProfileChip.module.css';

/** Avatar ring, name, level and XP bar (clones the reference profile chip). */
export function ProfileChip({ onClick }: { onClick: () => void }) {
  const profile = useGameStore(selectProfile);
  if (!profile) return null;
  const avatar = (profile.avatarKey as AvatarKey | null) ?? 'avatar.tutorial_npc';
  return (
    <button
      type="button"
      className={styles.chip}
      aria-label={t('topbar.profile')}
      data-testid="profile-chip"
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={() => (playSfx('ui.tab'), onClick())}
    >
      <span className={styles.avatar} style={{ backgroundImage: `url("${avatarUrl(avatar, 128)}")` }}>
        <span
          className={styles.ring}
          style={{ backgroundImage: `url("${imageUrl('ui.dark_ember.frame_round_sm')}")` }}
          aria-hidden="true"
        />
        <span className={`num ${styles.level}`}>{profile.level}</span>
      </span>
      <span className={styles.text}>
        <span className={`display ${styles.name}`}>{profile.name}</span>
        <Bar value={profile.xp} max={xpToNextLevel(profile.level)} kind="xp" height={16} width={190} />
      </span>
    </button>
  );
}
