import { useEffect, useRef, useState } from 'react';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import { t, translate, type I18nKey } from '@i18n/index';
import { missionsState } from '@state/missions';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { SpriteView } from '@ui/components/SpriteView/SpriteView';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { ChapterTrack } from './ChapterTrack';
import { MissionCard } from './MissionCard';
import styles from './MissionsScreen.module.css';

type MissionsRoute = Extract<Route, { name: 'missions' }>;

/** Lamplight over the chronicler's table. */
const DESK_GLOWS = [
  { x: 360, y: 760, size: 240, color: 0xffb257, flicker: 0.5 },
  { x: 1560, y: 300, size: 200, color: 0x9f8fff, flicker: 0.2 },
];

/** How far one press of the carousel's arrows moves it: a card and its gap. */
const CARD_STEP = 336;

/**
 * The Chronicler's Path (docs/design/QUESTS_MISSIONS.md §4, `UI_DESIGN.md` §5.15): chapter tabs
 * across the top, a carousel of mission cards under them, the chapter's own track with its chest
 * along the bottom, and Eldric beside it with a line for the chapter that is open.
 *
 * The line is derived from the save on every render, so the card that is claimable is always the
 * one the chronicle is actually on.
 */
export default function MissionsScreen({ route }: ScreenProps) {
  const params = route as MissionsRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // Only the boss-period goals move on their own; a minute's resolution is plenty.
  const now = useNow(30_000);
  useSceneAudio('hub', 'interior');
  const view = save ? missionsState(save, now) : null;
  const [chapter, setChapter] = useState<number | null>(params.chapter ?? null);
  const rail = useRef<HTMLDivElement>(null);

  // The tab follows the Path until the player picks one themselves.
  const shown = chapter ?? view?.activeChapter ?? 1;
  const current = view?.chapters.find((entry) => entry.chapter.index === shown) ?? null;

  useEffect(() => {
    // Open on the mission being walked rather than at the start of its chapter.
    const open = current?.missions.findIndex((mission) => mission.status !== 'claimed') ?? -1;
    if (rail.current && open > 0) rail.current.scrollLeft = (open - 1) * CARD_STEP;
  }, [current]);

  if (!save || !view || !current) return null;
  const eldric = content.championById('champ.eldric_chronicler');

  const claim = (missionId: string): void => {
    const result = actions.claimMission(missionId);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.medium');
    actions.toast('reward', 'missions.claimedToast', {}, result.value.currencies);
  };

  const claimChest = (index: number): void => {
    const result = actions.claimChapterChest(index);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.large');
    const paid = result.value;
    actions.toast('reward', 'missions.chestToast', { index }, paid.currencies);
    if (paid.champion) actions.toast('reward', 'missions.eldricJoined');
    if (paid.gift) actions.openDialog({ name: 'mission-gift' });
  };

  const scroll = (direction: -1 | 1): void => {
    rail.current?.scrollBy({ left: direction * CARD_STEP, behavior: 'smooth' });
    playSfx('ui.tab');
  };

  return (
    <div className={styles.root} data-testid="screen-missions">
      <Backdrop asset="bg.bg6" grade="rgba(20, 16, 28, 0.55)" parallax={8} />
      <AmbientLayer preset="interior" glows={DESK_GLOWS} />
      <TopBar title={t('missions.title')} onBack={() => actions.pop()} />

      <div className={styles.body}>
        <header className={styles.head}>
          <Tabs
            /*
             * Every chapter can be read, not only the one being walked: the Path is a promise as
             * much as a task list, and a card still to come shows what it will ask for (and, for
             * a state predicate, whether the chronicle already satisfies it).
             */
            items={view.chapters.map((entry) => ({
              key: `${entry.chapter.index}`,
              label: translate('missions.chapter', { index: entry.chapter.index }),
              badge: entry.chestClaimable ? 1 : 0,
              testId: `missions-tab-${entry.chapter.index}`,
            }))}
            value={`${shown}`}
            onChange={(key) => {
              setChapter(Number(key));
              playSfx('ui.tab');
            }}
            className={styles.tabs ?? ''}
          />
          <span className={`num ${styles.total}`} data-testid="missions-progress">
            {translate('missions.progress', { claimed: view.claimed, total: view.total })}
          </span>
        </header>

        <div className={styles.carousel}>
          <Button
            variant="secondary"
            size="sm"
            className={styles.arrow ?? ''}
            onClick={() => scroll(-1)}
            aria-label={t('missions.earlier')}
            data-testid="missions-prev"
          >
            <Glyph glyph="glyph.magic_arrow" size={22} color="var(--gold-3)" className={styles.back ?? ''} />
          </Button>

          <div className={styles.rail} ref={rail} data-testid="missions-rail">
            {current.missions.map((mission) => (
              <MissionCard
                key={mission.mission.id}
                view={mission}
                onClaim={() => claim(mission.mission.id)}
              />
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            className={styles.arrow ?? ''}
            onClick={() => scroll(1)}
            aria-label={t('missions.later')}
            data-testid="missions-next"
          >
            <Glyph
              glyph="glyph.magic_arrow"
              size={22}
              color="var(--gold-3)"
              className={styles.forward ?? ''}
            />
          </Button>
        </div>

        <div className={styles.foot}>
          <Panel kind="thin" padding={14} className={styles.eldric} contentClassName={styles.eldricRow}>
            <div className={styles.portrait}>
              {eldric ? (
                <SpriteView
                  model={eldric.art.model}
                  scale={2.2}
                  facing="right"
                  tint={eldric.art.tint}
                  desaturate={eldric.art.placeholder}
                />
              ) : null}
            </div>
            <div className={styles.speech}>
              <span className={`display ${styles.speaker}`}>
                {t(current.chapter.name as I18nKey)}
                <span className={styles.speakerName}>{eldric ? t(eldric.name as I18nKey) : ''}</span>
              </span>
              <p className={styles.line} data-testid="missions-eldric">
                {view.finished ? t('missions.finished') : t(current.chapter.eldric as I18nKey)}
              </p>
            </div>
          </Panel>

          <ChapterTrack view={current} onClaimChest={() => claimChest(current.chapter.index)} />
        </div>
      </div>
    </div>
  );
}
