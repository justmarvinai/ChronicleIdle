import { useMemo, useState } from 'react';
import { playSfx } from '@audio/index';
import { PARTY_SIZE_CAMPAIGN } from '@content/balance/battle';
import { BREWERY_DAILY_RUNS } from '@content/balance/brewery';
import { ELEMENTS, type Element } from '@content/champions/types';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { t, translate, type I18nKey } from '@i18n/index';
import { breweryView, type BreweryHallView, type BreweryStageView } from '@state/brewery';
import { selectActions, selectInventory, selectRoster, selectSave, selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import { entriesOf } from '@ui/screens/champions/roster-view';
import { bestTeamPower, hallBackdrop, hallGrade, hallGuards, weekStrip } from './brewery-view';
import { HallBanner } from './HallBanner';
import { HallCard } from './HallCard';
import { RunsCard } from './RunsCard';
import { StageCard } from './StageCard';
import styles from './BreweryScreen.module.css';

type BreweryRoute = Extract<Route, { name: 'brewery' }>;

/**
 * The Brewery (docs/tech/UI_DESIGN.md §5.23). The rail holds the day's runs — the one number the
 * whole mode is governed by — and the four halls as cards, each with its doors, its depth and the
 * brew it pays already in the purse. The chosen hall fills the rest: its banner, then its five
 * stages side by side as a descent, then what the day's runs would pour at its deepest cellar.
 *
 * The screen wears the chosen hall's own art, so walking from the Ember Vats to the Waning Cellar
 * is walking somewhere else.
 */
export default function BreweryScreen({ route }: ScreenProps) {
  const params = route as BreweryRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const wallet = useGameStore(selectWallet);
  const roster = useGameStore(selectRoster);
  const inventory = useGameStore(selectInventory);
  // The day's reset and a closed hall's doors are both countdowns, so the screen ticks each second.
  const now = useNow(1000);
  useSceneAudio('hub', 'interior');
  const view = useMemo(() => (save ? breweryView(save, now) : null), [save, now]);
  const [picked, setPicked] = useState<Element | null>(params.hall ?? null);
  const element = picked ?? firstOpen(view);
  const hall = view?.halls.find((entry) => entry.def.element === element) ?? null;
  // A stage's guards come from content alone, so a hall's five fights are built once per hall.
  const guards = useMemo(() => hallGuards(element), [element]);
  const teamPower = useMemo(
    () =>
      bestTeamPower(
        entriesOf(roster, inventory).map((entry) => entry.power),
        PARTY_SIZE_CAMPAIGN,
      ),
    [roster, inventory],
  );

  if (!save || !view || !wallet || !hall) return null;
  const brew = CURRENCY_BY_ID[hall.def.brew];
  const deepest = hall.cleared > 0 ? (hall.stages[hall.cleared - 1]?.stage.brews ?? 0) : 0;

  const enter = (stage: BreweryStageView): void => {
    playSfx('ui.open');
    actions.push({
      name: 'battle-setup',
      encounterId: `encounter.brewery.${hall.def.element}.${stage.stage.number}`,
    });
  };

  return (
    <div className={styles.root} data-testid="screen-brewery">
      <Backdrop asset={hallBackdrop(hall.def)} grade={hallGrade(hall.def.element)} parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('brewery.title')} onBack={() => actions.pop()} />

      <aside className={styles.side}>
        <Panel kind="ember-tall" padding={18} className={styles.panel} contentClassName={styles.sideBody}>
          <RunsCard left={view.runsLeft} total={view.runsTotal} msToReset={view.msToReset} />

          <nav className={styles.halls} aria-label={t('brewery.halls')}>
            <h3 className={`display ${styles.sectionTitle}`}>{t('brewery.halls')}</h3>
            {ELEMENTS.map((element) => {
              const entry = view.halls.find((candidate) => candidate.def.element === element);
              if (!entry) return null;
              return (
                <HallCard
                  key={element}
                  hall={entry}
                  selected={entry.def.element === hall.def.element}
                  held={wallet[entry.def.brew]}
                  opensOn={entry.open ? null : dayName(entry.nextDay)}
                  onPick={() => {
                    playSfx('ui.tab');
                    setPicked(entry.def.element);
                  }}
                />
              );
            })}
          </nav>

          {/* Where the brews go: the Brewery is half of a loop, and this is the other half. */}
          <div className={styles.tavern}>
            <p className={styles.tavernHint}>{t('brewery.tavernHint')}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => actions.push({ name: 'tavern' })}
              data-testid="brewery-tavern"
            >
              {t('brewery.tavern')}
            </Button>
          </div>
        </Panel>
      </aside>

      <section className={styles.hall} aria-label={translate(hall.def.name)}>
        <Panel kind="stone" padding={14} className={styles.panel} contentClassName={styles.hallBody}>
          <HallBanner hall={hall} week={weekStrip(hall.def, now)} />

          <div className={styles.descentHead}>
            <h3 className={`display ${styles.sectionTitle}`}>{t('brewery.descent')}</h3>
            <p className={styles.descentHint}>{t('brewery.descentHint')}</p>
          </div>
          <ol className={styles.stages}>
            {hall.stages.map((stage, index) => (
              <StageCard
                key={`${hall.def.element}-${stage.stage.number}`}
                hall={hall}
                stage={stage}
                index={index}
                guards={guards[index] ?? null}
                teamPower={teamPower}
                runsLeft={view.runsLeft}
                onEnter={enter}
              />
            ))}
          </ol>

          {/* The planning line: twenty runs are a choice, and this is what this hall pays for them. */}
          <footer className={styles.haul}>
            {/* What the runs still in hand would pour at the deepest cellar: the day as it stands. */}
            {deepest > 0 && view.runsLeft > 0 ? (
              <span className={styles.haulValue} data-testid="brewery-haul">
                <span className={styles.haulLabel}>{t('brewery.haul')}</span>
                <TintedIcon asset={brew.icon} tint={brew.tint} size={34} label={translate(brew.name)} />
                <span className={`num ${styles.haulAmount}`}>×{view.runsLeft * deepest}</span>
              </span>
            ) : null}
            <p className={styles.haulLine} data-testid="brewery-deepest">
              {hall.cleared > 0
                ? t('brewery.deepest', {
                    stage: hall.cleared,
                    runs: BREWERY_DAILY_RUNS,
                    brews: BREWERY_DAILY_RUNS * deepest,
                  })
                : t('brewery.deepestNone')}
            </p>
          </footer>
        </Panel>
      </section>
    </div>
  );
}

/** The hall the screen opens on: the first one brewing today, or the first of the four. */
function firstOpen(view: { halls: readonly BreweryHallView[] } | null): Element {
  return view?.halls.find((hall) => hall.open)?.def.element ?? 'justice';
}

const dayName = (weekday: number | null): string | null =>
  weekday === null ? null : t(`brewery.day.${weekday}` as I18nKey);
