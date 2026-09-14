import { useMemo, useState } from 'react';
import { FEATURE_IDS, PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import type { FeatureId } from '@content/balance/unlocks';
import type { Difficulty } from '@content/balance/battle';
import { content } from '@content/registry';
import { difficultyStars, clearedStages } from '@engine/campaign/progress';
import { power, baseStats } from '@engine/champions/stats';
import { energyCap } from '@engine/economy/energy';
import { xpToNextLevel } from '@engine/progression/player-level';
import { unlockLevel } from '@engine/progression/unlocks';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { progressOf } from '@state/campaign';
import { titlesOf } from '@state/progression';
import { selectActions, selectProfile, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { profileAvatar } from '@ui/champions/art';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import styles from './dialogs.module.css';
import profileStyles from './ProfileDialog.module.css';

const DIFFICULTIES: readonly Difficulty[] = ['intro', 'normal', 'hard'];

/**
 * The chronicle's own page (docs/tech/UI_DESIGN.md §5.4): who you are, how far you have come and
 * what the next levels open. Every number here is derived from the save, never stored.
 */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const profile = useGameStore(selectProfile);
  const save = useGameStore(selectSave);
  const createdAt = useGameStore((s) => s.save?.createdAt ?? 0);
  const hasRoster = useGameStore((s) => Object.keys(s.save?.roster ?? {}).length > 0);
  const avatar = profileAvatar(profile?.avatarChampionId ?? null, 128);
  const playtime = useGameStore((s) => s.save?.stats['playtime_ms'] ?? 0);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [error, setError] = useState<string | null>(null);

  const earned = useMemo(() => (save ? titlesOf(save) : []), [save]);
  const stars = useMemo(
    () => (save ? DIFFICULTIES.map((d) => ({ d, ...difficultyStars(progressOf(save), d) })) : []),
    [save],
  );
  const cleared = useMemo(
    () => (save ? DIFFICULTIES.reduce((sum, d) => sum + clearedStages(progressOf(save), d), 0) : 0),
    [save],
  );
  const bestPower = useMemo(() => {
    if (!save) return 0;
    let best = 0;
    for (const instance of Object.values(save.roster)) {
      const def = content.championById(instance.defId);
      if (!def) continue;
      best = Math.max(best, power(baseStats(def.stats, instance.stars, instance.level)));
    }
    return best;
  }, [save]);
  /** The next three gates, so the player always knows what the level is for. */
  const upcoming = useMemo(() => {
    const level = profile?.level ?? 1;
    return (FEATURE_IDS as readonly FeatureId[])
      .filter((id) => unlockLevel(id) > level)
      .sort((a, b) => unlockLevel(a) - unlockLevel(b))
      .slice(0, 3);
  }, [profile?.level]);

  if (!profile || !save) return null;
  const wornDef = profile.title ? content.titleById(profile.title) : null;
  const championsOwned = Object.keys(save.roster).length;

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

  const stat = (label: string, value: string, testId?: string) => (
    <div className={profileStyles.stat} key={label}>
      <dt>{label}</dt>
      <dd className="num" data-testid={testId}>
        {value}
      </dd>
    </div>
  );

  return (
    <Dialog title={t('profile.title')} onClose={onClose} width={840} testId="dialog-profile">
      <div className={profileStyles.header}>
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
        <div className={profileStyles.identity}>
          {editing ? (
            <span className={profileStyles.nameRow}>
              <input
                className={styles.input}
                style={{ width: 280, height: 44, fontSize: 20 }}
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
            <span className={profileStyles.nameRow}>
              <span className={`display ${profileStyles.name}`} data-testid="profile-name">
                {profile.name}
              </span>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)} data-testid="rename">
                {t('profile.rename')}
              </Button>
            </span>
          )}
          <span className={profileStyles.worn} data-testid="profile-worn-title">
            {wornDef ? translate(wornDef.name) : t('profile.worn.none')}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => actions.openDialog({ name: 'title-picker' })}
              data-testid="choose-title"
            >
              {t('profile.worn.choose')}
            </Button>
          </span>
          <span className={profileStyles.levelRow}>
            <span className={`num ${profileStyles.level}`} data-testid="profile-level">
              {t('profile.level')} {profile.level}
            </span>
            <Bar
              value={profile.level >= PLAYER_MAX_LEVEL ? 1 : profile.xp}
              max={profile.level >= PLAYER_MAX_LEVEL ? 1 : xpToNextLevel(profile.level)}
              kind="xp"
              width={340}
              height={20}
              showNumbers
            />
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
        </div>
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}

      <ScrollArea height={470} className={profileStyles.scroll}>
        <section className={styles.section}>
          <h3 className={`display ${styles.sectionTitle}`}>{t('profile.stats')}</h3>
          <dl className={profileStyles.stats} data-testid="profile-stats">
            {stat(t('profile.energyCap'), energyCap(profile.level).toLocaleString('en-US'))}
            {stat(t('profile.standsCleared'), cleared.toLocaleString('en-US'), 'stat-cleared')}
            {stat(t('profile.championsOwned'), championsOwned.toLocaleString('en-US'), 'stat-champions')}
            {stat(t('profile.bestPower'), bestPower.toLocaleString('en-US'), 'stat-power')}
            {stat(
              t('profile.battles'),
              (save.stats['battles.fought'] ?? 0).toLocaleString('en-US'),
              'stat-battles',
            )}
            {stat(
              t('profile.victories'),
              (save.stats['battles.victory'] ?? 0).toLocaleString('en-US'),
              'stat-victories',
            )}
            {stat(t('profile.created'), new Date(createdAt).toLocaleDateString())}
            {stat(t('profile.playtime'), formatDuration(playtime))}
          </dl>
        </section>

        <section className={styles.section}>
          <h3 className={`display ${styles.sectionTitle}`}>{t('profile.stars')}</h3>
          <ul className={profileStyles.starRows} data-testid="profile-stars">
            {stars.map((row) => (
              <li key={row.d}>
                <span className={profileStyles.difficulty}>{t(`campaign.difficulty.${row.d}`)}</span>
                <Bar value={row.stars} max={row.max} kind="xp" width={260} height={16} />
                <span className="num">
                  {row.stars.toLocaleString('en-US')} / {row.max.toLocaleString('en-US')}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={`display ${styles.sectionTitle}`}>{t('profile.titles')}</h3>
          <p className={styles.hint} data-testid="profile-titles">
            {earned.length
              ? earned
                  .map((id) => {
                    const def = content.titleById(id);
                    return def ? translate(def.name) : id;
                  })
                  .join(' · ')
              : t('profile.noTitles')}
          </p>
          <p className={profileStyles.count}>
            {t('profile.titles.earnedCount', { earned: earned.length, total: content.titles.length })}
          </p>
        </section>

        {upcoming.length ? (
          <section className={styles.section}>
            <h3 className={`display ${styles.sectionTitle}`}>{t('profile.nextUnlocks')}</h3>
            <ul className={profileStyles.unlocks} data-testid="profile-next-unlocks">
              {upcoming.map((feature) => (
                <li key={feature}>
                  <span className={`num ${profileStyles.unlockLevel}`}>{unlockLevel(feature)}</span>
                  <span>
                    <strong className="display">{t(`feature.${feature}.name` as I18nKey)}</strong>
                    <em>{t(`feature.${feature}.hint` as I18nKey)}</em>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </ScrollArea>
    </Dialog>
  );
}
