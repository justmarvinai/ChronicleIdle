import { t } from '@i18n/index';
import { unlockLevel } from '@engine/progression/unlocks';
import { selectActions, selectFeatureUnlocked } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { BottomBar } from '@ui/components/BottomBar/BottomBar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { HubHotspot } from './HubHotspot';
import { HUB_GLOWS, HUB_HOTSPOTS, type HubHotspotDef } from './hotspots';
import styles from './HubScreen.module.css';

const selectDailyBoss = selectFeatureUnlocked('daily_boss');
const selectWeeklyBoss = selectFeatureUnlocked('weekly_boss');
const selectMissions = selectFeatureUnlocked('missions');
const selectQuests = selectFeatureUnlocked('quests_daily');
const selectGear = selectFeatureUnlocked('gear');

/** Emberhold — the home screen (clones the reference hub: hotspots on the art, chrome around it). */
export default function HubScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const dailyBoss = useGameStore(selectDailyBoss);
  const weeklyBoss = useGameStore(selectWeeklyBoss);
  const missions = useGameStore(selectMissions);
  const quests = useGameStore(selectQuests);
  const gear = useGameStore(selectGear);
  useSceneAudio('hub', 'hub');

  const open = (def: HubHotspotDef, unlocked: boolean): void => {
    if (unlocked && def.route) actions.push(def.route);
    else actions.push({ name: 'locked', feature: def.feature, titleKey: def.labelKey });
  };

  return (
    <div className={styles.root} data-testid="screen-hub">
      <Backdrop asset="bg.bg8" grade="rgba(20, 24, 60, 0.18)" parallax={10} />
      <AmbientLayer preset="hub" glows={HUB_GLOWS} />
      <TopBar />

      {HUB_HOTSPOTS.map((def) => (
        <HubHotspot key={def.id} def={def} onOpen={open} />
      ))}

      <aside className={styles.bossColumn} aria-label={t('hub.bossGate')}>
        <BossCard
          title={t('hub.dailyBoss')}
          name={t('hub.bossCard.daily')}
          glyph="glyph.flaming_skull"
          unlocked={dailyBoss}
          level={unlockLevel('daily_boss')}
          onClick={() => actions.push({ name: 'locked', feature: 'daily_boss', titleKey: 'hub.dailyBoss' })}
          testId="boss-daily"
        />
        <BossCard
          title={t('hub.weeklyBoss')}
          name={t('hub.bossCard.weekly')}
          glyph="glyph.cursed_eye"
          unlocked={weeklyBoss}
          level={unlockLevel('weekly_boss')}
          onClick={() => actions.push({ name: 'locked', feature: 'weekly_boss', titleKey: 'hub.weeklyBoss' })}
          testId="boss-weekly"
        />
      </aside>

      <BottomBar
        left={
          <>
            <NavButton
              label={t('hub.missions')}
              glyph="glyph.spell_book"
              unlocked={missions}
              onClick={() => actions.push({ name: 'locked', feature: 'missions', titleKey: 'hub.missions' })}
              testId="nav-missions"
            />
            <NavButton
              label={t('hub.quests')}
              glyph="glyph.burning_scroll"
              unlocked={quests}
              onClick={() =>
                actions.push({ name: 'locked', feature: 'quests_daily', titleKey: 'hub.quests' })
              }
              testId="nav-quests"
            />
            <NavButton
              label={t('hub.armoury')}
              glyph="glyph.ribcage_armor"
              unlocked={gear}
              onClick={() =>
                actions.push(
                  gear ? { name: 'armoury' } : { name: 'locked', feature: 'gear', titleKey: 'hub.armoury' },
                )
              }
              testId="nav-armoury"
            />
          </>
        }
        center={
          <>
            <NavButton
              label={t('hub.index')}
              glyph="glyph.owl"
              unlocked
              onClick={() => actions.push({ name: 'locked', feature: 'champions', titleKey: 'hub.index' })}
              testId="nav-index"
            />
            <NavButton
              label={t('hub.champions')}
              glyph="glyph.cloaked_figure"
              unlocked
              onClick={() => actions.push({ name: 'champions' })}
              testId="nav-champions"
            />
          </>
        }
        right={
          <Button
            variant="primary"
            size="lg"
            icon={<Glyph glyph="glyph.sword_clash" size={30} color="var(--gold-3)" />}
            onClick={() => actions.push({ name: 'game-modes' })}
            data-testid="nav-battle"
          >
            {t('hub.battle')}
          </Button>
        }
      />
    </div>
  );
}

function NavButton({
  label,
  glyph,
  unlocked,
  onClick,
  testId,
}: {
  label: string;
  glyph: Parameters<typeof Glyph>[0]['glyph'];
  unlocked: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Button
      variant="secondary"
      size="md"
      className={[styles.nav, unlocked ? '' : styles.navLocked].join(' ')}
      icon={
        <Glyph
          glyph={unlocked ? glyph : 'glyph.broken_shackle'}
          size={26}
          color={unlocked ? 'var(--gold-3)' : 'var(--text-3)'}
        />
      }
      onClick={onClick}
      data-testid={testId}
    >
      {label}
    </Button>
  );
}

function BossCard({
  title,
  name,
  glyph,
  unlocked,
  level,
  onClick,
  testId,
}: {
  title: string;
  name: string;
  glyph: Parameters<typeof Glyph>[0]['glyph'];
  unlocked: boolean;
  level: number;
  onClick: () => void;
  testId: string;
}) {
  return (
    <Panel
      kind="thin"
      padding={14}
      className={[styles.bossCard, unlocked ? '' : styles.bossLocked].join(' ')}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      data-testid={testId}
      aria-label={title}
    >
      <div className={styles.bossHead}>
        <Glyph
          glyph={unlocked ? glyph : 'glyph.broken_shackle'}
          size={34}
          color={unlocked ? 'var(--ember-3)' : 'var(--text-3)'}
        />
        <div>
          <div className={`display ${styles.bossTitle}`}>{title}</div>
          <div className={styles.bossName}>{name}</div>
        </div>
      </div>
      <div className={styles.bossFoot}>
        {unlocked ? `${t('hub.bossCard.keys')} 0` : t('common.unlocksAtLevel', { level })}
      </div>
    </Panel>
  );
}
