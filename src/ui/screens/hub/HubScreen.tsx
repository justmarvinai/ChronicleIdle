import { playSfx } from '@audio/index';
import { t } from '@i18n/index';
import { bossView } from '@state/bosses';
import { deedsClaimable } from '@state/deeds';
import { idleView } from '@state/idle';
import { mineView } from '@state/mine';
import { missionsClaimable } from '@state/missions';
import { loginView } from '@state/login';
import { isPalaceUnlocked } from '@state/palace';
import { questsClaimable } from '@state/quests';
import { selectActions, selectFeatureUnlocked, selectSave, selectUnseen } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
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
import { hubStatuses } from './hub-status';
import { HUB_GLOWS, HUB_HOTSPOTS, type HubHotspotDef } from './hotspots';
import styles from './HubScreen.module.css';

const selectDailyBoss = selectFeatureUnlocked('daily_boss');
const selectWeeklyBoss = selectFeatureUnlocked('weekly_boss');
const selectMissions = selectFeatureUnlocked('missions');
const selectQuests = selectFeatureUnlocked('quests_daily');
const selectGear = selectFeatureUnlocked('gear');
const selectDeeds = selectFeatureUnlocked('deeds');

/** Emberhold — the home screen (clones the reference hub: hotspots on the art, chrome around it). */
export default function HubScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const dailyBoss = useGameStore(selectDailyBoss);
  const weeklyBoss = useGameStore(selectWeeklyBoss);
  const missions = useGameStore(selectMissions);
  const quests = useGameStore(selectQuests);
  const gear = useGameStore(selectGear);
  const deedsOpen = useGameStore(selectDeeds);
  const unseen = useGameStore(selectUnseen);
  const save = useGameStore(selectSave);
  // The Palace waits on the first settlement falling rather than on a level (owner's answer).
  const palace = useGameStore((state) => (state.save ? isPalaceUnlocked(state.save) : false));
  // The chest accrues by the minute; the ring and its countdown follow at that pace.
  const now = useNow(30_000);
  useSceneAudio('hub', 'hub');

  // The Idle Chest wears its fill on the building itself (`UI_DESIGN.md` §5.2), and so does the Mine.
  const chest = save ? idleView(save, now) : null;
  const mine = save ? mineView(save, now) : null;
  // The bosses live behind Battle now, not in panels pasted over the town (the owner's third
  // batch). What the hub keeps of them is the one thing worth interrupting a player for: a chest
  // their damage has already earned (BOSSES.md §4).
  const bossChests = !save
    ? 0
    : (dailyBoss ? (bossView(save, 'boss.gargoyle', now)?.claimable ?? 0) : 0) +
      (weeklyBoss ? (bossView(save, 'boss.titan', now)?.claimable ?? 0) : 0);
  // The ledger's own badge: quests finished and chests earned, across both boards.
  const ledger = save ? questsClaimable(save, now) : 0;
  // The Path's: the mission it is on, if it is finished, and any chapter chest still waiting.
  const path = save ? missionsClaimable(save, now) : 0;
  // The Hall's: every tier, challenge and rank waiting to be claimed.
  const deeds = save ? deedsClaimable(save, now) : 0;
  // One dot when today's tile is still there — a day owed is the calendar's only live state.
  const rewards = save && loginView(save, now).claimable ? 1 : 0;

  // What each building says about itself: the next stage, a countdown, what is owed inside.
  const statuses = save
    ? hubStatuses(save, now, { unseen: unseen.length, chest, mine, palaceOpen: palace })
    : {};

  const open = (def: HubHotspotDef, unlocked: boolean): void => {
    if (unlocked && def.dialog) actions.openDialog(def.dialog);
    else if (unlocked && def.route) actions.push(def.route);
    else
      actions.push({
        name: 'locked',
        feature: def.feature,
        titleKey: def.labelKey,
        ...(def.reasonKey ? { reasonKey: def.reasonKey } : {}),
      });
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
          status={statuses[def.id]}
          {...(def.id === 'palace' ? { gate: palace } : {})}
          {...(def.id === 'idle' && chest ? { progress: chest.fill.fraction } : {})}
          {...(def.id === 'mine' && mine ? { progress: mine.store.fraction } : {})}
        />
      ))}

      <BottomBar
        /*
         * Three weights, left to right: the day's free thing, the places you go, the fight.
         * Before this the bar was seven identical slabs and the eye had to read all seven to find
         * one, which is the complaint the owner made of it.
         */
        left={<RewardsButton owed={rewards > 0} onClick={() => actions.openDialog({ name: 'login' })} />}
        center={
          <nav className={styles.rail} aria-label={t('hub.navigation')} data-testid="hub-rail">
            <NavTile
              label={t('hub.champions')}
              glyph="glyph.cloaked_figure"
              tint="#c9a24a"
              unlocked
              onClick={() => actions.push({ name: 'champions' })}
              testId="nav-champions"
            />
            <NavTile
              label={t('hub.armoury')}
              glyph="glyph.ribcage_armor"
              tint="#9fb4c9"
              unlocked={gear}
              onClick={() =>
                actions.push(
                  gear ? { name: 'armoury' } : { name: 'locked', feature: 'gear', titleKey: 'hub.armoury' },
                )
              }
              testId="nav-armoury"
            />
            <NavTile
              label={t('hub.missions')}
              glyph="glyph.spell_book"
              tint="#b48ad4"
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
            <NavTile
              label={t('hub.quests')}
              glyph="glyph.burning_scroll"
              tint="#d4a06a"
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
            <NavTile
              label={t('hub.deeds')}
              glyph="glyph.trophy_cup"
              tint="#e0b04a"
              unlocked={deedsOpen}
              notify={deeds}
              onClick={() =>
                actions.push(
                  deedsOpen ? { name: 'deeds' } : { name: 'locked', feature: 'deeds', titleKey: 'hub.deeds' },
                )
              }
              testId="nav-deeds"
            />
            <NavTile
              label={t('hub.index')}
              glyph="glyph.owl"
              tint="#8fb98a"
              unlocked
              onClick={() => actions.push({ name: 'index' })}
              testId="nav-index"
            />
          </nav>
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

/**
 * One destination on the hub's rail.
 *
 * Icon **above** the word rather than beside it, and tinted per destination: six tiles that differ
 * in colour and silhouette are told apart at a glance, where six identical slabs have to be read.
 * The tile itself carries no frame until it is hovered — the rail behind them is the frame, so the
 * bar reads as one navigation strip rather than as six competing buttons.
 */
function NavTile({
  label,
  glyph,
  tint,
  unlocked,
  notify = 0,
  onClick,
  testId,
}: {
  label: string;
  glyph: Parameters<typeof Glyph>[0]['glyph'];
  /** The destination's own colour, so the rail is read by hue before it is read by word. */
  tint: string;
  unlocked: boolean;
  /** How many things are waiting behind this tile; 0 wears no badge. */
  notify?: number;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      className={styles.tile}
      data-locked={!unlocked}
      style={{ '--tile-tint': tint } as React.CSSProperties}
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={() => {
        playSfx(unlocked ? 'ui.open' : 'ui.error');
        onClick();
      }}
      data-testid={testId}
    >
      <Glyph
        glyph={unlocked ? glyph : 'glyph.broken_shackle'}
        size={30}
        color={unlocked ? tint : 'var(--text-3)'}
      />
      <span className={`display ${styles.tileLabel}`}>{label}</span>
      {unlocked && notify > 0 ? <NotificationDot count={notify} /> : null}
    </button>
  );
}

/**
 * The day's tile, at the far left of the bar (the owner's instruction).
 *
 * It is the one thing down here that *gives* rather than leads, so it is drawn as its own gold
 * plate rather than as a sixth destination on the rail — the bar then reads left to right as take,
 * go, fight. Gold and not the ember red on purpose: the red frame is Battle's, and a second button
 * wearing it would make the two look like a pair and cost the fight its place as the one primary
 * action on the screen. It wears a dot the moment a day is owed and goes quiet once it is taken, which is the
 * whole reminder the calendar gets: it never opens itself over the hub (`LOGIN.md` §4).
 */
function RewardsButton({ owed, onClick }: { owed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={styles.rewards}
      data-owed={owed}
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={() => {
        playSfx('ui.open');
        onClick();
      }}
      data-testid="nav-login"
    >
      <AssetImage asset="ui.stone_vine.icon_star" className={styles.rewardsIcon} alt="" />
      <span className={`display ${styles.rewardsLabel}`}>{t('login.open')}</span>
      {owed ? <NotificationDot /> : null}
    </button>
  );
}
