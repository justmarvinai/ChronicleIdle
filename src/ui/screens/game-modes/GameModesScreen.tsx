import type { BackdropKey, GlyphKey } from '@assets/manifest.generated';
import type { FeatureId } from '@content/balance/unlocks';
import { content } from '@content/registry';
import { t, translate } from '@i18n/index';
import type { I18nKey } from '@i18n/index';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import { currentPointer } from '@state/campaign';
import { bossKeysNote } from '@ui/screens/bosses/boss-view';
import { breweryView } from '@state/brewery';
import { dungeonsNote } from '@ui/screens/dungeons/dungeons-view';
import { isTowerUnlocked, towerView } from '@state/tower';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { ModeCard } from '@ui/components/ModeCard/ModeCard';
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
    id: 'dungeons',
    // Open from the first hour: what stops a new chronicle is the ladder, not a gate.
    feature: 'dungeons',
    titleKey: 'gameModes.dungeons',
    bodyKey: 'gameModes.dungeons.body',
    art: 'bg.bg9',
    glyph: 'glyph.hammer_hit',
    route: { name: 'dungeons' },
  },
  {
    id: 'bosses',
    // The first of the two to open. The Titan's own gate is on its card in the menu behind this.
    feature: 'daily_boss',
    titleKey: 'gameModes.bosses',
    bodyKey: 'gameModes.bosses.body',
    art: 'bg.bg3',
    glyph: 'glyph.flaming_skull',
    route: { name: 'boss-menu' },
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
  // The tower asks for a cleared Intro rather than a level, which no level can stand in for.
  const introDone = save ? isTowerUnlocked(save) : false;
  const unlockedFor = (mode: ModeDef): boolean =>
    mode.gate === 'intro' ? introDone : isFeatureUnlocked(mode.feature, save?.profile.level ?? 0);
  /**
   * What a card says under its blurb. The campaign names the stand the chronicle is on; a boss
   * names the keys left this period, which is the number the hub used to carry and the only one
   * worth knowing before walking in (BOSSES.md §4).
   */
  const noteFor = (mode: ModeDef): string | null => {
    if (mode.id === 'campaign' && here && settlement)
      return `${t('campaign.stageShort', { settlement: here.settlement, stage: here.stage })} · ${translate(settlement.name)} · ${t(`campaign.difficulty.${here.difficulty}`)}`;
    if (!save) return null;
    // The Bosses card carries both gates' keys, because the menu behind it holds both bosses.
    if (mode.id === 'bosses') return bossKeysNote(save, now);
    // The Dungeons card carries how many keeps are open and the deepest any of them has been taken.
    if (mode.id === 'dungeons') return dungeonsNote(save);
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
              title={t(mode.titleKey)}
              body={t(mode.bodyKey)}
              art={mode.art}
              glyph={mode.glyph}
              unlocked={unlockedFor(mode)}
              lockedLabel={
                mode.gateKey
                  ? t(mode.gateKey)
                  : t('common.unlocksAtLevel', { level: unlockLevel(mode.feature) })
              }
              index={index}
              testId={`mode-${mode.id}`}
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
