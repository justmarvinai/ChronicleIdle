import { backdrop } from '@assets/manifest';
import type { BackdropKey, GlyphKey } from '@assets/manifest.generated';
import type { FeatureId } from '@content/balance/unlocks';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { I18nKey } from '@i18n/index';
import { unlockLevel } from '@engine/progression/unlocks';
import { bossView } from '@state/bosses';
import { currentPointer } from '@state/campaign';
import { breweryView } from '@state/brewery';
import { isTowerUnlocked, towerView } from '@state/tower';
import { selectActions, selectFeatureUnlocked, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { DecoFrame } from '@ui/components/Frame/DecoFrame';
import { CARD_FRAME, CARD_TINT } from '@ui/styles/display-maps';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import type { Route } from '@state/ui-types';
import styles from './GameModesScreen.module.css';

interface ModeDef {
  id: string;
  feature: FeatureId;
  titleKey: I18nKey;
  bodyKey: I18nKey;
  art: BackdropKey;
  glyph: GlyphKey;
  /** Where "Enter" goes; locked-phase modes fall back to the Locked screen. */
  route?: Route;
  /**
   * `intro` gates on the whole Intro campaign instead of on a player level — the tower's own
   * condition (`ETERNAL_TOWER.md` §1), which no level can stand in for.
   */
  gate?: 'intro';
  /** What the locked button says when "Unlocks at level N" would be a lie. */
  gateKey?: I18nKey;
  /** What the Locked screen says instead of counting levels, for the same reason. */
  lockedKey?: I18nKey;
  /** A boss card reports the keys left this period, the way the campaign card reports the stand. */
  boss?: string;
}

const MODES: readonly ModeDef[] = [
  {
    id: 'campaign',
    feature: 'campaign',
    titleKey: 'gameModes.campaign',
    bodyKey: 'gameModes.campaign.body',
    art: 'bg.bg7',
    glyph: 'glyph.crossed_swords',
    route: { name: 'campaign' },
  },
  {
    id: 'daily',
    feature: 'daily_boss',
    titleKey: 'gameModes.dailyBoss',
    bodyKey: 'gameModes.dailyBoss.body',
    art: 'bg.bg3',
    glyph: 'glyph.flaming_skull',
    route: { name: 'bosses', boss: 'boss.gravemaw' },
    boss: 'boss.gravemaw',
  },
  {
    id: 'weekly',
    feature: 'weekly_boss',
    titleKey: 'gameModes.weeklyBoss',
    bodyKey: 'gameModes.weeklyBoss.body',
    art: 'bg.bg9',
    glyph: 'glyph.cursed_eye',
    route: { name: 'bosses', boss: 'boss.nyxara' },
    boss: 'boss.nyxara',
  },
  {
    id: 'brewery',
    feature: 'brewery',
    titleKey: 'gameModes.brewery',
    bodyKey: 'gameModes.brewery.body',
    art: 'bg.bg4',
    glyph: 'glyph.health_potion',
    route: { name: 'brewery' },
  },
  {
    id: 'tower',
    feature: 'eternal_tower',
    titleKey: 'gameModes.tower',
    bodyKey: 'gameModes.tower.body',
    art: 'bg.bg1',
    glyph: 'glyph.broken_shackle',
    route: { name: 'tower' },
    gate: 'intro',
    gateKey: 'gameModes.tower.gate',
    lockedKey: 'gameModes.tower.locked',
  },
];

/** Game Modes (clones `different_content_battles_screen.png`): tall illustrated cards. */
export default function GameModesScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const now = useNow(30_000);
  useSceneAudio('hub', 'hub');
  const here = save ? currentPointer(save) : null;
  const settlement = here ? content.settlementByIndex(here.settlement) : null;
  /**
   * What a card says under its blurb. The campaign names the stand the chronicle is on; a boss
   * names the keys left this period, which is the number the hub used to carry and the only one
   * worth knowing before walking in (BOSSES.md §4).
   */
  const noteFor = (mode: ModeDef): string | null => {
    if (mode.id === 'campaign' && here && settlement)
      return `${t('campaign.stageShort', { settlement: here.settlement, stage: here.stage })} · ${translate(settlement.name)} · ${t(`campaign.difficulty.${here.difficulty}`)}`;
    if (!save) return null;
    if (mode.boss) {
      const view = bossView(save, mode.boss, now);
      return view ? t('gameModes.keys', { left: view.keysLeft, total: view.boss.keysPerPeriod }) : null;
    }
    if (mode.id === 'brewery') {
      const view = breweryView(save, now);
      return t('gameModes.brewery.note', {
        left: view.runsLeft,
        total: view.runsTotal,
        halls: view.openHalls,
      });
    }
    if (mode.id === 'tower') {
      const view = towerView(save, now);
      // At the top of the tower there is no next floor, so the climb itself is the number.
      return t('gameModes.tower.note', {
        floor: view.next ?? view.highestFloor,
        keys: view.keys,
        cap: view.keyCap,
      });
    }
    return null;
  };
  return (
    <div className={styles.root} data-testid="screen-game-modes">
      <Backdrop asset="bg.bg6" grade="rgba(20, 18, 40, 0.45)" parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('gameModes.title')} onBack={() => actions.pop()} />
      <div className={styles.cards}>
        {MODES.map((mode, index) => {
          const note = noteFor(mode);
          return (
            <ModeCard
              key={mode.id}
              mode={mode}
              index={index}
              {...(note ? { note } : {})}
              // A card that is not open yet says so on the locked screen, route or no route.
              onOpen={(unlocked) =>
                actions.push(
                  unlocked && mode.route
                    ? mode.route
                    : {
                        name: 'locked',
                        feature: mode.feature,
                        titleKey: mode.titleKey,
                        ...(mode.lockedKey ? { reasonKey: mode.lockedKey } : {}),
                      },
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  index,
  note,
  onOpen,
}: {
  mode: ModeDef;
  index: number;
  /** Where the player stands in this mode (the campaign's current stand). */
  note?: string;
  onOpen: (unlocked: boolean) => void;
}) {
  const byLevel = useGameStore(selectFeatureUnlocked(mode.feature));
  const introDone = useGameStore((state) => (state.save ? isTowerUnlocked(state.save) : false));
  const unlocked = mode.gate === 'intro' ? introDone : byLevel;
  const art = backdrop(mode.art);
  return (
    <DecoFrame
      frame={unlocked ? CARD_FRAME.unlocked : CARD_FRAME.locked}
      tint={unlocked ? CARD_TINT.unlocked : CARD_TINT.locked}
      thickness={16}
      className={[styles.card, unlocked ? '' : styles.cardLocked].join(' ')}
      style={{ animationDelay: `${index * 80}ms` }}
      data-testid={`mode-${mode.id}`}
    >
      <div className={styles.art} style={{ backgroundImage: `url("${art.url}")` }} />
      <div className={styles.shade} />
      <div className={styles.head}>
        <h2 className={`display ${styles.title}`}>{t(mode.titleKey)}</h2>
      </div>
      <div className={styles.glyph}>
        <Glyph
          glyph={unlocked ? mode.glyph : 'glyph.broken_shackle'}
          size={120}
          color={unlocked ? 'rgba(243,236,220,0.9)' : 'rgba(141,133,119,0.8)'}
        />
      </div>
      <div className={styles.foot}>
        <p className={styles.body}>{t(mode.bodyKey)}</p>
        {/* A card that is still shut reports nothing live: the button says what it is waiting for. */}
        {unlocked && note ? (
          <p className={`num ${styles.note}`} data-testid={`note-${mode.id}`}>
            {note}
          </p>
        ) : null}
        {unlocked ? (
          <Button variant="primary" size="md" onClick={() => onOpen(true)} data-testid={`enter-${mode.id}`}>
            {t('gameModes.enter')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="md"
            sound="ui.cancel"
            onClick={() => (playSfx('ui.error'), onOpen(false))}
            data-testid={`enter-${mode.id}`}
          >
            {mode.gateKey
              ? t(mode.gateKey)
              : t('common.unlocksAtLevel', { level: unlockLevel(mode.feature) })}
          </Button>
        )}
      </div>
    </DecoFrame>
  );
}
