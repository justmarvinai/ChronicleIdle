import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import { content } from '@content/registry';
import { accountPower } from '@engine/champions/query';
import { xpToNextLevel } from '@engine/progression/player-level';
import { t, translate } from '@i18n/index';
import { selectInventory, selectProfile, selectRoster } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Bar } from '@ui/components/Bar/Bar';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { entriesOf } from '@ui/screens/champions/roster-view';
import { profileAvatar } from '@ui/champions/art';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { imageUrl } from '@assets/manifest';
import styles from './ProfileChip.module.css';

/** Avatar ring, name, worn title, level and XP bar (clones the reference profile chip). */
export function ProfileChip({ onClick }: { onClick: () => void }) {
  const profile = useGameStore(selectProfile);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  // Every champion's power, gear and sets included. Memoised on the two slices it reads, because
  // the chip is on every screen and a full roster is two hundred stat blocks.
  const power = useMemo(() => accountPower(entriesOf(roster, inventory)), [roster, inventory]);
  const level = profile?.level ?? 0;
  // The ring flares each time the level climbs; the first render is not a level-up.
  const seen = useRef(level);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (level > seen.current) setFlash((n) => n + 1);
    seen.current = level;
  }, [level]);

  if (!profile) return null;
  const avatar = profileAvatar(profile.avatarChampionId, 128);
  const titleDef = profile.title ? content.titleById(profile.title) : null;
  const maxed = profile.level >= PLAYER_MAX_LEVEL;
  return (
    <button
      type="button"
      className={styles.chip}
      aria-label={t('topbar.profile')}
      data-testid="profile-chip"
      data-avatar={profile.avatarChampionId ?? 'chronicler'}
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={() => (playSfx('ui.tab'), onClick())}
    >
      <span className={styles.avatar} style={{ backgroundImage: `url("${avatar.url}")` }}>
        {avatar.tint ? (
          <span
            className={styles.tint}
            style={{
              backgroundColor: avatar.tint,
              WebkitMaskImage: `url("${avatar.url}")`,
              maskImage: `url("${avatar.url}")`,
            }}
            aria-hidden="true"
          />
        ) : null}
        <span
          className={styles.ring}
          style={{ backgroundImage: `url("${imageUrl('ui.dark_ember.frame_round_sm')}")` }}
          aria-hidden="true"
        />
        {flash > 0 && !prefersReducedMotion() ? (
          <motion.span
            key={flash}
            className={styles.flash}
            aria-hidden="true"
            data-testid="profile-chip-flash"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.95, 0], scale: [0.8, 1.45, 1.7] }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        ) : null}
        <motion.span
          className={`num ${styles.level}`}
          data-testid="profile-chip-level"
          animate={flash > 0 ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          {profile.level}
        </motion.span>
      </span>
      <span className={styles.text}>
        <span className={`display ${styles.name}`}>{profile.name}</span>
        {titleDef ? (
          <span className={styles.title} data-testid="profile-chip-title">
            {translate(titleDef.name)}
          </span>
        ) : null}
        <Bar
          value={maxed ? 1 : profile.xp}
          max={maxed ? 1 : xpToNextLevel(profile.level)}
          kind="xp"
          height={16}
          width={190}
        />
        <span className={styles.power} title={t('topbar.accountPower')} data-testid="account-power">
          <Glyph glyph="glyph.crossed_swords" size={13} color="var(--gold-2)" />
          <span className={styles.powerLabel}>{t('topbar.accountPower')}</span>
          <span className={`num ${styles.powerValue}`}>{power.toLocaleString('en-US')}</span>
        </span>
      </span>
    </button>
  );
}
