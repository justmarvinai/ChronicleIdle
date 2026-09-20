import { t } from '@i18n/index';
import { formatDuration } from '@engine/time/clock';
import { bossView } from '@state/bosses';
import { idleView } from '@state/idle';
import { missionsClaimable } from '@state/missions';
import { questsClaimable } from '@state/quests';
import { openChampionChoices } from '@state/summon';
import { selectActions, selectFeatureUnlocked, selectSave, selectUnseen } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { BottomBar } from '@ui/components/BottomBar/BottomBar';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
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
  const unseen = useGameStore(selectUnseen);
  const save = useGameStore(selectSave);
  // The chest accrues by the minute; the ring and its countdown follow at that pace.
  const now = useNow(30_000);
  useSceneAudio('hub', 'hub');

  // The Idle Chest wears its fill on the building itself (`UI_DESIGN.md` §5.2).
  const chest = save ? idleView(save, now) : null;
  // The bosses live behind Battle now, not in panels pasted over the town (the owner's third
  // batch). What the hub keeps of them is the one thing worth interrupting a player for: a chest
  // their damage has already earned (BOSSES.md §4).
  const bossChests = !save
    ? 0
    : (dailyBoss ? (bossView(save, 'boss.gravemaw', now)?.claimable ?? 0) : 0) +
      (weeklyBoss ? (bossView(save, 'boss.nyxara', now)?.claimable ?? 0) : 0);
  // The ledger's own badge: quests finished and chests earned, across both boards.
  const ledger = save ? questsClaimable(save, now) : 0;
  // The Path's: the mission it is on, if it is finished, and any chapter chest still waiting.
  const path = save ? missionsClaimable(save, now) : 0;

  // Dots on the buildings that owe the player something: copies not looked at yet, and a
  // champion choice the campaign still owes (CAMPAIGN.md §7).
  const notices: Record<string, boolean> = {
    champions: unseen.length > 0,
    portal: save ? openChampionChoices(save).length > 0 : false,
    idle: chest?.fill.full ?? false,
  };

  const open = (def: HubHotspotDef, unlocked: boolean): void => {
    if (unlocked && def.dialog) actions.openDialog(def.dialog);
    else if (unlocked && def.route) actions.push(def.route);
    else actions.push({ name: 'locked', feature: def.feature, titleKey: def.labelKey });
  };

  return (
    <div className={styles.root} data-testid="screen-hub">
      <Backdrop asset="bg.bg8" grade="rgba(20, 24, 60, 0.18)" parallax={10} />
      <AmbientLayer preset="hub" glows={HUB_GLOWS} />
      <TopBar />

      {HUB_HOTSPOTS.map((def) => (
        <HubHotspot
          key={def.id}
          def={def}
          onOpen={open}
          notify={notices[def.id] ?? false}
          {...(def.id === 'idle' && chest
            ? {
                progress: chest.fill.fraction,
                sublabel: chest.fill.full ? t('hub.idleChest.full') : formatDuration(chest.fill.msToFull),
              }
            : {})}
        />
      ))}

      <BottomBar
        left={
          <>
            <NavButton
              label={t('hub.missions')}
              glyph="glyph.spell_book"
              unlocked={missions}
              notify={path}
              onClick={() =>
                actions.push(
                  missions
                    ? { name: 'missions' }
                    : { name: 'locked', feature: 'missions', titleKey: 'hub.missions' },
                )
              }
              testId="nav-missions"
            />
            <NavButton
              label={t('hub.quests')}
              glyph="glyph.burning_scroll"
              unlocked={quests}
              notify={ledger}
              onClick={() =>
                actions.push(
                  quests
                    ? { name: 'quests' }
                    : { name: 'locked', feature: 'quests_daily', titleKey: 'hub.quests' },
                )
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
            {bossChests > 0 ? <NotificationDot count={bossChests} /> : null}
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
  notify = 0,
  onClick,
  testId,
}: {
  label: string;
  glyph: Parameters<typeof Glyph>[0]['glyph'];
  unlocked: boolean;
  /** How many things are waiting behind this button; 0 wears no badge. */
  notify?: number;
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
      {unlocked && notify > 0 ? <NotificationDot count={notify} /> : null}
    </Button>
  );
}
