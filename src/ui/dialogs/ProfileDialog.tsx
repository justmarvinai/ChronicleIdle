import { useState } from 'react';
import { energyCap } from '@engine/economy/energy';
import { xpToNextLevel } from '@engine/progression/player-level';
import { formatDuration } from '@engine/time/clock';
import { t } from '@i18n/index';
import { selectActions, selectProfile } from '@state/selectors';
import { useGameStore } from '@state/store';
import { profileAvatar } from '@ui/champions/art';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import styles from './dialogs.module.css';

export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const profile = useGameStore(selectProfile);
  const createdAt = useGameStore((s) => s.save?.createdAt ?? 0);
  const hasRoster = useGameStore((s) => Object.keys(s.save?.roster ?? {}).length > 0);
  const avatar = profileAvatar(profile?.avatarChampionId ?? null, 128);
  const playtime = useGameStore((s) => s.save?.stats['playtime_ms'] ?? 0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  if (!profile) return null;

  const submit = (): void => {
    const result = actions.rename(name);
    if (!result.ok) {
      const key = result.error.message as 'tooShort' | 'tooLong' | 'invalid';
      setError(
        key === 'tooShort'
          ? t('newGame.error.tooShort', { min: 2 })
          : key === 'tooLong'
            ? t('newGame.error.tooLong', { max: 18 })
            : t('newGame.error.invalid'),
      );
      return;
    }
    setError(null);
    setEditing(false);
  };

  return (
    <Dialog title={t('profile.title')} onClose={onClose} width={720} testId="dialog-profile">
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('profile.name')}</span>
        {editing ? (
          <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <input
              className={styles.input}
              style={{ width: 300, height: 48, fontSize: 20 }}
              value={name}
              maxLength={18}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              aria-label={t('profile.name')}
              data-testid="rename-input"
            />
            <Button size="sm" variant="primary" onClick={submit} data-testid="rename-confirm">
              {t('common.confirm')}
            </Button>
            <Button size="sm" variant="ghost" sound="ui.cancel" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          </span>
        ) : (
          <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className={`display ${styles.rowValue}`} data-testid="profile-name">
              {profile.name}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)} data-testid="rename">
              {t('profile.rename')}
            </Button>
          </span>
        )}
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('profile.level')}</span>
        <span className={`num ${styles.rowValue}`}>{profile.level}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('profile.xp')}</span>
        <Bar
          value={profile.xp}
          max={xpToNextLevel(profile.level)}
          kind="xp"
          width={320}
          height={22}
          showNumbers
        />
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('profile.energyCap')}</span>
        <span className={`num ${styles.rowValue}`}>{energyCap(profile.level)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('profile.created')}</span>
        <span className={`num ${styles.rowValue}`}>{new Date(createdAt).toLocaleDateString()}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('profile.playtime')}</span>
        <span className={`num ${styles.rowValue}`}>{formatDuration(playtime)}</span>
      </div>
      <div className={styles.section}>
        <h3 className={`display ${styles.sectionTitle}`}>{t('profile.titles')}</h3>
        <p className={styles.hint}>
          {profile.titles.length ? profile.titles.join(', ') : t('profile.noTitles')}
        </p>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>{t('profile.avatar.choose')}</span>
        <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span
            className={styles.avatarPreview}
            style={{ backgroundImage: `url("${avatar.url}")` }}
            aria-hidden="true"
          >
            {avatar.tint ? (
              <span
                className={styles.avatarTint}
                style={{
                  backgroundColor: avatar.tint,
                  WebkitMaskImage: `url("${avatar.url}")`,
                  maskImage: `url("${avatar.url}")`,
                }}
              />
            ) : null}
          </span>
          {hasRoster ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => actions.openDialog({ name: 'avatar-picker' })}
              data-testid="choose-avatar"
            >
              {t('profile.avatar.choose')}
            </Button>
          ) : (
            <span className={styles.hint}>{t('profile.avatar.none')}</span>
          )}
        </span>
      </div>
    </Dialog>
  );
}
