import { useMemo, useState, type ReactNode } from 'react';
import { imageUrl } from '@assets/manifest';
import type { GlyphKey } from '@assets/manifest.generated';
import type { Difficulty } from '@content/balance/battle';
import { FEATURE_IDS, PLAYER_MAX_LEVEL } from '@content/balance/unlocks';
import type { FeatureId } from '@content/balance/unlocks';
import { content } from '@content/registry';
import { clearedStages, difficultyStars } from '@engine/campaign/progress';
import { accountPower } from '@engine/champions/query';
import { baseStats, power } from '@engine/champions/stats';
import { energyCap } from '@engine/economy/energy';
import { xpToNextLevel } from '@engine/progression/player-level';
import { unlockLevel } from '@engine/progression/unlocks';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { progressOf } from '@state/campaign';
import { titlesOf } from '@state/progression';
import { selectActions, selectInventory, selectProfile, selectRoster, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { profileAvatar } from '@ui/champions/art';
import { Button } from '@ui/components/Button/Button';
import { Dialog } from '@ui/components/Dialog/Dialog';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { entriesOf } from '@ui/screens/champions/roster-view';
import styles from './dialogs.module.css';
import profileStyles from './ProfileDialog.module.css';

const DIFFICULTIES: readonly Difficulty[] = ['intro', 'normal', 'hard'];
/** The portrait's frame: the ornate deco frame in the chronicle's gold. */
const PORTRAIT_FRAME = 13;
const PORTRAIT_TINT = '#d9a53c';
/** How far the details scroll inside the dialog, in stage pixels. */
const DETAILS_HEIGHT = 720;

/**
 * The chronicle's own page (docs/tech/UI_DESIGN.md §5.17). It has two columns:
 *
 * - on the left, the chronicler as a card: the portrait in a gold frame with the level on a gem, the
 *   name and the worn title (each a press to change), the XP to the next level, the whole roster's
 *   power, and the avatar;
 * - on the right, the standing as tiles, the campaign's stars per difficulty, every title (earned
 *   lit, the rest dark with what earns them), and what the next levels open.
 *
 * Every number is derived from the save, never stored.
 */
export function ProfileDialog({ onClose }: { onClose: () => void }) {
  const actions = useGameStore(selectActions);
  const profile = useGameStore(selectProfile);
  const save = useGameStore(selectSave);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  const createdAt = useGameStore((s) => s.save?.createdAt ?? 0);
  const hasRoster = useGameStore((s) => Object.keys(s.save?.roster ?? {}).length > 0);
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
  const rosterPower = useMemo(() => accountPower(entriesOf(roster, inventory)), [roster, inventory]);
  /** The next three gates, so the player always knows what the level is for. */
  const upcoming = useMemo(() => {
    const level = profile?.level ?? 1;
    return (FEATURE_IDS as readonly FeatureId[])
      .filter((id) => unlockLevel(id) > level)
      .sort((a, b) => unlockLevel(a) - unlockLevel(b))
      .slice(0, 3);
  }, [profile?.level]);

  if (!profile || !save) return null;
  const avatar = profileAvatar(profile.avatarChampionId ?? null, 512);
  const wornDef = profile.title ? content.titleById(profile.title) : null;
  const championsOwned = Object.keys(save.roster).length;
  const maxed = profile.level >= PLAYER_MAX_LEVEL;
  const toNext = xpToNextLevel(profile.level);
  const progress = maxed ? 1 : Math.min(1, profile.xp / Math.max(1, toNext));
  const earnedSet = new Set(earned);
  const starUrl = imageUrl('ui.stone_vine.icon_star');

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
    <Dialog title={t('profile.title')} onClose={onClose} width={1120} testId="dialog-profile">
      <div className={profileStyles.layout}>
        <aside className={profileStyles.card}>
          <DecoFrame
            frame={PORTRAIT_FRAME}
            tint={PORTRAIT_TINT}
            thickness={14}
            className={profileStyles.portrait}
          >
            <span
              className={profileStyles.art}
              style={{ backgroundImage: `url("${avatar.url}")` }}
              aria-hidden="true"
            >
              {avatar.tint ? (
                <span
                  className={profileStyles.artTint}
                  style={{
                    backgroundColor: avatar.tint,
                    WebkitMaskImage: `url("${avatar.url}")`,
                    maskImage: `url("${avatar.url}")`,
                  }}
                />
              ) : null}
            </span>
            <span className={profileStyles.shade} aria-hidden="true" />
          </DecoFrame>
          <span className={`num ${profileStyles.gem}`} data-testid="profile-level">
            <span className={profileStyles.gemLabel}>{t('profile.level')}</span> {profile.level}
          </span>

          {editing ? (
            <span className={profileStyles.renameRow}>
              <input
                className={styles.input}
                style={{ height: 44, fontSize: 20 }}
                value={name}
                maxLength={18}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                aria-label={t('profile.name')}
                data-testid="rename-input"
              />
              <span className={profileStyles.renameActions}>
                <Button size="sm" variant="primary" onClick={submit} data-testid="rename-confirm">
                  {t('common.confirm')}
                </Button>
                <Button size="sm" variant="ghost" sound="ui.cancel" onClick={() => setEditing(false)}>
                  {t('common.cancel')}
                </Button>
              </span>
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
          {error ? <div className={styles.error}>{error}</div> : null}

          <span className={profileStyles.worn} data-testid="profile-worn-title">
            <span className={`display ${wornDef ? profileStyles.wornName : profileStyles.wornNone}`}>
              {wornDef ? translate(wornDef.name) : t('profile.worn.none')}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => actions.openDialog({ name: 'title-picker' })}
              data-testid="choose-title"
            >
              {t('profile.worn.choose')}
            </Button>
          </span>

          <div className={profileStyles.xp}>
            <span className={profileStyles.xpHead}>
              <span>{t('profile.xp')}</span>
              <span className="num">
                {maxed
                  ? t('profile.xp.max')
                  : t('profile.xp.of', {
                      xp: profile.xp.toLocaleString('en-US'),
                      next: toNext.toLocaleString('en-US'),
                    })}
              </span>
            </span>
            <span className={profileStyles.xpBar} aria-hidden="true">
              <span style={{ width: `${progress * 100}%` }} />
            </span>
          </div>

          <div className={profileStyles.power}>
            <Glyph glyph="glyph.crossed_swords" size={22} color="var(--gold-2)" />
            <span className={profileStyles.powerLabel}>{t('topbar.accountPower')}</span>
            <span className={`num ${profileStyles.powerValue}`} data-testid="profile-power">
              {rosterPower.toLocaleString('en-US')}
            </span>
          </div>

          {hasRoster ? (
            <Button
              size="md"
              variant="secondary"
              onClick={() => actions.openDialog({ name: 'avatar-picker' })}
              data-testid="choose-avatar"
            >
              {t('profile.avatar.choose')}
            </Button>
          ) : (
            <span className={styles.hint}>{t('profile.avatar.none')}</span>
          )}
        </aside>

        <ScrollArea height={DETAILS_HEIGHT} className={profileStyles.scroll}>
          <section className={profileStyles.section}>
            <h3 className={`display ${profileStyles.heading}`}>{t('profile.stats')}</h3>
            <dl className={profileStyles.stats} data-testid="profile-stats">
              <Stat glyph="glyph.magic_flame" label={t('profile.energyCap')}>
                {energyCap(profile.level).toLocaleString('en-US')}
              </Stat>
              <Stat glyph="glyph.sword_clash" label={t('profile.standsCleared')} testId="stat-cleared">
                {cleared.toLocaleString('en-US')}
              </Stat>
              <Stat glyph="glyph.shield_block" label={t('profile.championsOwned')} testId="stat-champions">
                {championsOwned.toLocaleString('en-US')}
              </Stat>
              <Stat glyph="glyph.fist_punch" label={t('profile.bestPower')} testId="stat-power">
                {bestPower.toLocaleString('en-US')}
              </Stat>
              <Stat glyph="glyph.crossed_swords" label={t('profile.battles')} testId="stat-battles">
                {(save.stats['battles.fought'] ?? 0).toLocaleString('en-US')}
              </Stat>
              <Stat glyph="glyph.trophy_cup" label={t('profile.victories')} testId="stat-victories">
                {(save.stats['battles.victory'] ?? 0).toLocaleString('en-US')}
              </Stat>
              <Stat glyph="glyph.spell_book" label={t('profile.created')}>
                {new Date(createdAt).toLocaleDateString()}
              </Stat>
              <Stat glyph="glyph.hourglass" label={t('profile.playtime')}>
                {formatDuration(playtime)}
              </Stat>
            </dl>
          </section>

          <section className={profileStyles.section}>
            <h3 className={`display ${profileStyles.heading}`}>{t('profile.stars')}</h3>
            <ul className={profileStyles.starRows} data-testid="profile-stars">
              {stars.map((row) => (
                <li key={row.d} data-full={row.max > 0 && row.stars >= row.max}>
                  <span
                    className={profileStyles.starIcon}
                    style={{ backgroundImage: `url("${starUrl}")` }}
                    aria-hidden="true"
                  />
                  <span className={`display ${profileStyles.difficulty}`}>
                    {t(`campaign.difficulty.${row.d}`)}
                  </span>
                  <span className={profileStyles.starBar} aria-hidden="true">
                    <span style={{ width: `${row.max > 0 ? (row.stars / row.max) * 100 : 0}%` }} />
                  </span>
                  <span className={`num ${profileStyles.starCount}`}>
                    {row.stars.toLocaleString('en-US')} / {row.max.toLocaleString('en-US')}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className={profileStyles.section}>
            <h3 className={`display ${profileStyles.heading}`}>
              {t('profile.titles')}
              <span className={profileStyles.count}>
                {t('profile.titles.earnedCount', { earned: earned.length, total: content.titles.length })}
              </span>
            </h3>
            <ul className={profileStyles.titles} data-testid="profile-titles">
              {content.titles.map((title) => {
                const has = earnedSet.has(title.id);
                return (
                  <li
                    key={title.id}
                    className={[
                      profileStyles.titleChip,
                      has ? profileStyles.titleEarned : '',
                      profile.title === title.id ? profileStyles.titleWorn : '',
                    ].join(' ')}
                    title={translate(title.description)}
                    data-earned={has}
                    data-testid={`profile-title-${title.id}`}
                  >
                    <Glyph
                      glyph="glyph.trophy_cup"
                      size={14}
                      color={has ? 'var(--gold-3)' : 'var(--text-3)'}
                    />
                    <span className="display">{translate(title.name)}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {upcoming.length ? (
            <section className={profileStyles.section}>
              <h3 className={`display ${profileStyles.heading}`}>{t('profile.nextUnlocks')}</h3>
              <ul className={profileStyles.unlocks} data-testid="profile-next-unlocks">
                {upcoming.map((feature) => (
                  <li key={feature}>
                    <span className={`num ${profileStyles.unlockLevel}`}>{unlockLevel(feature)}</span>
                    <span className={profileStyles.unlockText}>
                      <strong className="display">{t(`feature.${feature}.name` as I18nKey)}</strong>
                      <em>{t(`feature.${feature}.hint` as I18nKey)}</em>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </ScrollArea>
      </div>
    </Dialog>
  );
}

/** One number of the standing: its glyph, what it counts, and the count. */
function Stat({
  glyph,
  label,
  testId,
  children,
}: {
  glyph: GlyphKey;
  label: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div className={profileStyles.stat}>
      <span className={profileStyles.statGlyph} aria-hidden="true">
        <Glyph glyph={glyph} size={22} color="var(--gold-2)" />
      </span>
      <span className={profileStyles.statText}>
        <dt>{label}</dt>
        <dd className="num" data-testid={testId}>
          {children}
        </dd>
      </span>
    </div>
  );
}
