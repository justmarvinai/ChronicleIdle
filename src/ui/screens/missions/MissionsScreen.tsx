import { useCallback, useEffect, useRef, useState } from 'react';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import { t, translate, type I18nKey } from '@i18n/index';
import { missionsState } from '@state/missions';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { AssetImage } from '@ui/components/AssetImage/AssetImage';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Panel } from '@ui/components/Frame/Panel';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import { goalDestination } from '@ui/places/places';
import type { ScreenProps } from '@ui/router/screens';
import { ChapterTabs } from './ChapterTabs';
import { ChapterTrack, ELDRIC_PORTRAIT } from './ChapterTrack';
import { MissionCard } from './MissionCard';
import styles from './MissionsScreen.module.css';

type MissionsRoute = Extract<Route, { name: 'missions' }>;

/** Lamplight over the chronicler's table. */
const DESK_GLOWS = [
  { x: 360, y: 760, size: 240, color: 0xffb257, flicker: 0.5 },
  { x: 1560, y: 300, size: 200, color: 0x9f8fff, flicker: 0.2 },
];

/** How far one press of the rail's arrows moves it: a card and the gap its chevron stands in. */
const CARD_STEP = 346;
/** Scroll left within this many pixels of an end counts as being at it. */
const END_SLACK = 4;

/**
 * The Chronicler's Path (docs/design/QUESTS_MISSIONS.md §4, `UI_DESIGN.md` §5.15): the ten chapters
 * across the top, each saying how far it is walked; the chapter's twelve missions as a rail of
 * cards joined by chevrons, opening on the one being walked; and along the bottom Eldric with his
 * line for the chapter, beside the chapter's chest and what it holds.
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
  const rail = useRef<HTMLOListElement>(null);
  const [ends, setEnds] = useState({ start: true, end: false });

  // The tab follows the Path until the player picks one themselves.
  const shown = chapter ?? view?.activeChapter ?? 1;
  const current = view?.chapters.find((entry) => entry.chapter.index === shown) ?? null;

  // The first card not yet taken; the rail opens on it rather than at the start of its chapter.
  const walked = current?.missions.findIndex((mission) => mission.status !== 'claimed') ?? -1;

  const measure = useCallback((): void => {
    const node = rail.current;
    if (!node) return;
    const start = node.scrollLeft <= END_SLACK;
    const end = node.scrollLeft + node.clientWidth >= node.scrollWidth - END_SLACK;
    // The view is rebuilt every render; only a change at either end is worth another one.
    setEnds((was) => (was.start === start && was.end === end ? was : { start, end }));
  }, []);

  useEffect(() => {
    const node = rail.current;
    if (node) node.scrollLeft = walked > 0 ? (walked - 1) * CARD_STEP : 0;
    measure();
  }, [shown, walked, measure]);

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
          <ChapterTabs chapters={view.chapters} value={shown} onChange={(index) => setChapter(index)} />
          <div className={styles.total}>
            <span className={`num ${styles.totalCount}`} data-testid="missions-progress">
              {translate('missions.progress', { claimed: view.claimed, total: view.total })}
            </span>
            <span className={styles.totalBar} aria-hidden="true">
              <span className={styles.totalFill} style={{ width: `${(view.claimed / view.total) * 100}%` }} />
            </span>
          </div>
        </header>

        <div className={styles.carousel}>
          <button
            type="button"
            className={styles.arrow}
            data-direction="back"
            disabled={ends.start}
            onClick={() => scroll(-1)}
            aria-label={t('missions.earlier')}
            data-testid="missions-prev"
          />
          <ol className={styles.rail} ref={rail} onScroll={measure} data-testid="missions-rail">
            {current.missions.map((mission) => (
              <li key={mission.mission.id} className={styles.cell} data-status={mission.status}>
                <MissionCard
                  view={mission}
                  destination={mission.status === 'open' ? goalDestination(mission.mission.goal, save) : null}
                  onClaim={() => claim(mission.mission.id)}
                />
              </li>
            ))}
          </ol>
          <button
            type="button"
            className={styles.arrow}
            data-direction="forward"
            disabled={ends.end}
            onClick={() => scroll(1)}
            aria-label={t('missions.later')}
            data-testid="missions-next"
          />
        </div>

        <div className={styles.foot}>
          <Panel kind="thin" padding={14} className={styles.eldric} contentClassName={styles.eldricRow}>
            <span className={styles.portrait}>
              <AssetImage asset={ELDRIC_PORTRAIT} size={256} alt="" />
            </span>
            <div className={styles.speech}>
              <span className={`num ${styles.chapterNo}`}>
                {translate('missions.chapter', { index: current.chapter.index })}
              </span>
              <span className={`display ${styles.chapterName}`}>{t(current.chapter.name as I18nKey)}</span>
              <p className={styles.line} data-testid="missions-eldric">
                {translate('missions.quote', {
                  line: view.finished ? t('missions.finished') : t(current.chapter.eldric as I18nKey),
                })}
              </p>
              {eldric ? (
                <span className={styles.speaker}>
                  {translate('missions.speaker', { name: t(eldric.name as I18nKey) })}
                </span>
              ) : null}
            </div>
          </Panel>

          <ChapterTrack view={current} onClaimChest={() => claimChest(current.chapter.index)} />
        </div>
      </div>
    </div>
  );
}
