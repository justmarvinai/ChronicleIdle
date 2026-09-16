import { useState } from 'react';
import { playSfx } from '@audio/index';
import type { QuestPeriod } from '@content/quests/types';
import { t, translate } from '@i18n/index';
import { questBoardState } from '@state/quests';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { Panel } from '@ui/components/Frame/Panel';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { Tabs } from '@ui/components/Tab/Tabs';
import { Timer } from '@ui/components/Timer/Timer';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { PointsTrack } from './PointsTrack';
import { QuestRow } from './QuestRow';
import styles from './QuestsScreen.module.css';

type QuestsRoute = Extract<Route, { name: 'quests' }>;

/** Candlelight over the ledger. */
const LEDGER_GLOWS = [
  { x: 300, y: 300, size: 220, color: 0xffb257, flicker: 0.45 },
  { x: 1640, y: 380, size: 180, color: 0x8fb8ff, flicker: 0.25 },
];

/**
 * The Chronicler's Ledger (docs/design/QUESTS_MISSIONS.md §2–§3, `UI_DESIGN.md` §5.14): the two
 * boards behind their own tabs, the points track along the top and a row per quest under it. The
 * board is derived from the save on every render, so a quest ticks over the moment the play that
 * finishes it lands — there is nothing here to refresh.
 */
export default function QuestsScreen({ route }: ScreenProps) {
  const params = route as QuestsRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // The countdown in the header is the only thing that moves on its own; a minute is plenty.
  const now = useNow(30_000);
  useSceneAudio('hub', 'interior');
  const [period, setPeriod] = useState<QuestPeriod>(params.period ?? 'daily');

  if (!save) return null;
  const boards = {
    daily: questBoardState(save, 'daily', now),
    weekly: questBoardState(save, 'weekly', now),
  };
  const view = boards[period];

  const claim = (questId?: string): void => {
    const result = actions.claimQuest(period, questId);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    const paid = result.value;
    playSfx(paid.questIds.length > 1 ? 'reward.medium' : 'reward.small');
    if (paid.questIds.length > 1)
      actions.toast('reward', 'quests.allClaimedToast', { count: paid.questIds.length }, paid.currencies);
    else actions.toast('reward', 'quests.claimedToast', { points: paid.points }, paid.currencies);
  };

  const claimChest = (points: number): void => {
    const result = actions.claimQuestChest(period, points);
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    playSfx('reward.large');
    actions.toast('reward', 'quests.chestToast', { points }, result.value.currencies);
  };

  return (
    <div className={styles.root} data-testid="screen-quests">
      <Backdrop asset="bg.bg3" grade="rgba(22, 18, 28, 0.55)" parallax={8} />
      <AmbientLayer preset="interior" glows={LEDGER_GLOWS} />
      <TopBar title={t('quests.title')} onBack={() => actions.pop()} />

      <div className={styles.body}>
        <header className={styles.head}>
          <Tabs
            items={[
              {
                key: 'daily' as const,
                label: t('quests.tab.daily'),
                badge: boards.daily.unlocked
                  ? boards.daily.claimableQuests + boards.daily.claimableChests
                  : 0,
                testId: 'quests-tab-daily',
              },
              {
                key: 'weekly' as const,
                label: t('quests.tab.weekly'),
                badge: boards.weekly.unlocked
                  ? boards.weekly.claimableQuests + boards.weekly.claimableChests
                  : 0,
                testId: 'quests-tab-weekly',
              },
            ]}
            value={period}
            onChange={(key) => {
              setPeriod(key);
              playSfx('ui.tab');
            }}
          />
          <div className={styles.headRight}>
            <Timer
              remainingMs={view.msUntilReset}
              label={t('quests.resets')}
              className={styles.timer ?? ''}
            />
            <Button
              variant="primary"
              size="md"
              disabled={!view.unlocked || view.claimableQuests === 0}
              icon={<Glyph glyph="glyph.trophy_cup" size={22} color="var(--gold-3)" />}
              onClick={() => claim()}
              data-testid="quests-claim-all"
            >
              {view.claimableQuests > 0
                ? translate('quests.claimAll', { count: view.claimableQuests })
                : t('quests.nothingToClaim')}
            </Button>
          </div>
        </header>

        {view.unlocked ? (
          <>
            <PointsTrack view={view} onClaim={claimChest} />
            <ScrollArea height={560} className={styles.list} data-testid="quests-list">
              {view.quests.map((row) => (
                <QuestRow key={row.quest.id} view={row} onClaim={() => claim(row.quest.id)} />
              ))}
            </ScrollArea>
          </>
        ) : (
          <Panel kind="ember-wide" padding={28} className={styles.locked}>
            <Glyph glyph="glyph.broken_shackle" size={44} color="var(--text-3)" />
            <p className={styles.lockedText} data-testid="quests-locked">
              {translate('quests.locked', { level: view.unlockLevel })}
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
