import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { content } from '@content/registry';
import type { Goal } from '@content/quests/types';
import type { PlaceId } from '@content/places/types';
import { t, translate, type I18nKey } from '@i18n/index';
import { deedsState } from '@state/deeds';
import { selectActions, selectSave, selectWornFrame } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { DeedsTab, Route } from '@state/ui-types';
import type { SaveGame } from '@engine/schema/save';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { NotificationDot } from '@ui/components/NotificationDot/NotificationDot';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import { goalDestination, placeDestination, placeOpen, type Destination } from '@ui/places/places';
import type { ScreenProps } from '@ui/router/screens';
import { AchievementCard } from './AchievementCard';
import { ChallengeCard } from './ChallengeCard';
import { ledgerName, tierNumeral } from './deed-text';
import {
  LEDGER_FILTERS,
  ledgerOwed,
  orderAchievements,
  orderChallenges,
  type LedgerFilter,
} from './deed-view';
import { HallStanding } from './HallStanding';
import styles from './DeedsScreen.module.css';

type DeedsRoute = Extract<Route, { name: 'deeds' }>;

/** Torchlight on the long road: the standing column warm, the ledgers cooler. */
const HALL_GLOWS = [
  { x: 260, y: 360, size: 240, color: 0xffc46b, flicker: 0.35 },
  { x: 1500, y: 260, size: 200, color: 0xfff1c2, flicker: 0.2 },
];

/**
 * Where "Go" sends a deed still being worked at: the place its goal names (a settlement, a Tavern
 * tab, a boss's tier), else the place the deed itself names — and only a place that is open.
 */
function wayTo(goal: Goal, place: PlaceId | null, save: SaveGame): Destination | null {
  const way = goalDestination(goal, save) ?? (place ? placeDestination(place) : null);
  return way && placeOpen(save, way.place) ? way : null;
}

/**
 * The Hall of Deeds (docs/design/ACHIEVEMENTS.md, `UI_DESIGN.md` §5.31): the chronicle's standing
 * on the left — its portrait in the frame it wears, its renown and its rank, and the ten ranks — and
 * the two ledgers on the right behind their tabs, each deed a card with the one press that means
 * something now. Everything is derived from the save on every render, so a tier lights the moment
 * the play that meets it lands; there is nothing here to refresh.
 */
export default function DeedsScreen({ route }: ScreenProps) {
  const params = route as DeedsRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const frame = useGameStore(selectWornFrame);
  // Nothing in the Hall runs on a clock; the minute only keeps a boss's period honest.
  const now = useNow(60_000);
  useSceneAudio('hub', 'interior');
  const [tab, setTab] = useState<DeedsTab>(params.tab ?? 'achievements');
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const view = useMemo(() => (save ? deedsState(save, now) : null), [save, now]);

  if (!save || !view) return null;
  const owed = ledgerOwed(view.achievements);
  const challengesOwed = view.challenges.filter((c) => c.status === 'claimable').length;
  const tiersClaimed = view.achievements.reduce((sum, a) => sum + a.claimed, 0);
  const tiersTotal = view.achievements.reduce((sum, a) => sum + a.def.tiers.length, 0);
  const finished = view.achievements.filter((a) => a.status === 'done').length;
  const challengesDone = view.challenges.filter((c) => c.status === 'done').length;
  const titleDef = save.profile.title ? content.titleById(save.profile.title) : null;

  const switchTo = (next: DeedsTab): void => {
    setTab(next);
    playSfx('ui.tab');
  };

  const claimTier = (id: string): void => {
    const result = actions.claimAchievement(id);
    if (!result.ok) return void playSfx('ui.error');
    const def = content.achievementById(id);
    playSfx('reward.small');
    actions.toast(
      'reward',
      'deeds.tierToast',
      { name: def ? t(def.name as I18nKey) : id, tier: tierNumeral(result.value.step ?? 1) },
      result.value.currencies,
    );
  };

  const claimChallenge = (id: string): void => {
    const result = actions.claimChallenge(id);
    if (!result.ok) return void playSfx('ui.error');
    const def = content.challengeById(id);
    playSfx('reward.medium');
    actions.toast(
      'reward',
      'deeds.challengeToast',
      { name: def ? t(def.name as I18nKey) : id },
      result.value.currencies,
    );
  };

  const claimRank = (): void => {
    const result = actions.claimHallRank();
    if (!result.ok) return void playSfx('ui.error');
    const rank = content.hallRanks.find((def) => def.rank === result.value.step);
    playSfx('reward.large');
    actions.toast(
      'reward',
      'deeds.rankToast',
      { name: rank ? translate(rank.name) : '' },
      result.value.currencies,
    );
  };

  const claimAll = (): void => {
    const result = actions.claimAllDeeds();
    if (!result.ok) return void playSfx('ui.error');
    playSfx('reward.large');
    actions.toast('reward', 'deeds.allToast', { count: result.value.claims.length }, result.value.currencies);
  };

  return (
    <div className={styles.root} data-testid="screen-deeds">
      <Backdrop asset="bg.bg2" grade="rgba(16, 13, 20, 0.66)" parallax={8} />
      <AmbientLayer preset="interior" glows={HALL_GLOWS} />
      <TopBar title={t('deeds.title')} onBack={() => actions.pop()} />

      <div className={styles.body}>
        <header className={styles.head}>
          <Tabs
            items={[
              {
                key: 'achievements' as const,
                label: t('deeds.tab.achievements'),
                badge: view.unlocked ? owed.all : 0,
                testId: 'deeds-tab-achievements',
              },
              {
                key: 'challenges' as const,
                label: t('deeds.tab.challenges'),
                badge: view.unlocked ? challengesOwed : 0,
                testId: 'deeds-tab-challenges',
              },
            ]}
            value={tab}
            onChange={switchTo}
          />
          <span className={styles.summary} data-testid="deeds-summary">
            {tab === 'achievements'
              ? `${t('deeds.summary.achievements', { done: finished, total: view.achievements.length })} · ${t(
                  'deeds.summary.tiers',
                  { done: tiersClaimed, total: tiersTotal },
                )}`
              : t('deeds.summary.challenges', { done: challengesDone, total: view.challenges.length })}
          </span>
          <Button
            variant="primary"
            size="md"
            disabled={!view.unlocked || view.claimable === 0}
            icon={<Glyph glyph="glyph.trophy_cup" size={22} color="var(--gold-3)" />}
            onClick={claimAll}
            className={styles.claimAll ?? ''}
            data-testid="deeds-claim-all"
          >
            {view.claimable > 0 ? t('deeds.claimAll', { count: view.claimable }) : t('deeds.nothingToClaim')}
          </Button>
        </header>

        {view.unlocked ? (
          <div className={styles.pages}>
            <HallStanding
              view={view}
              name={save.profile.name}
              title={titleDef ? translate(titleDef.name) : null}
              avatarChampionId={save.profile.avatarChampionId}
              frameId={frame}
              onClaimRank={claimRank}
            />
            <div className={styles.ledger}>
              {tab === 'achievements' ? (
                <>
                  <nav className={styles.filters} aria-label={t('deeds.tab.achievements')}>
                    {LEDGER_FILTERS.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={styles.filter}
                        aria-pressed={filter === key}
                        data-testid={`deeds-filter-${key}`}
                        onMouseEnter={() => playSfx('ui.hover')}
                        onClick={() => (setFilter(key), playSfx('ui.tab'))}
                      >
                        {ledgerName(key)}
                        {owed[key] > 0 ? (
                          <NotificationDot count={owed[key]} className={styles.dot ?? ''} />
                        ) : null}
                      </button>
                    ))}
                  </nav>
                  <ScrollArea
                    height="100%"
                    fade
                    className={styles.list ?? ''}
                    data-testid="deeds-achievements"
                  >
                    <ol className={styles.grid}>
                      {orderAchievements(view.achievements, filter).map((row) => (
                        <li key={row.def.id} className={styles.cell}>
                          <AchievementCard
                            view={row}
                            destination={
                              row.status === 'open' && row.tier
                                ? wayTo(row.tier.goal, row.def.place, save)
                                : null
                            }
                            onClaim={() => claimTier(row.def.id)}
                          />
                        </li>
                      ))}
                    </ol>
                  </ScrollArea>
                </>
              ) : (
                <ScrollArea height="100%" fade className={styles.list ?? ''} data-testid="deeds-challenges">
                  <ol className={styles.grid}>
                    {orderChallenges(view.challenges).map((row) => (
                      <li key={row.def.id} className={styles.cell}>
                        <ChallengeCard
                          view={row}
                          destination={
                            row.status === 'open' ? wayTo(row.def.goal, row.def.place, save) : null
                          }
                          onClaim={() => claimChallenge(row.def.id)}
                        />
                      </li>
                    ))}
                  </ol>
                </ScrollArea>
              )}
            </div>
          </div>
        ) : (
          <Panel kind="ember-wide" padding={28} className={styles.locked}>
            <Glyph glyph="glyph.broken_shackle" size={44} color="var(--text-3)" />
            <p className={styles.lockedText} data-testid="deeds-locked">
              {t('deeds.locked', { level: view.unlockLevel })}
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
