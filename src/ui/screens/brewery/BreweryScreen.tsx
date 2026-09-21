import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { playSfx } from '@audio/index';
import { CURRENCY_BY_ID } from '@content/currencies/index';
import { ELEMENTS, type Element } from '@content/champions/types';
import { formatDuration } from '@engine/time/clock';
import { t, translate, type I18nKey } from '@i18n/index';
import { BREWERY_DAILY_RUNS } from '@content/balance/brewery';
import { formatAmount } from '@engine/economy/wallet';
import { breweryView, type BreweryHallView, type BreweryStageView } from '@state/brewery';
import { selectActions, selectSave, selectWallet } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route } from '@state/ui-types';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { TintedIcon } from '@ui/components/AssetImage/TintedIcon';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useAnimatedNumber } from '@ui/hooks/useAnimatedNumber';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import type { ScreenProps } from '@ui/router/screens';
import { counterOf, hallBackdrop, hallGrade, openDaysLabel, stageHolder, tierKey } from './brewery-view';
import styles from './BreweryScreen.module.css';

type BreweryRoute = Extract<Route, { name: 'brewery' }>;

/**
 * The Brewery (docs/tech/UI_DESIGN.md §5.23): four halls on the left, the chosen hall's five
 * stages on the right, and the one number that governs the whole mode — the runs left today —
 * over both of them.
 *
 * The screen wears the chosen hall's own art, so walking from the Ember Vats to the Waning Cellar
 * is walking somewhere else.
 */
export default function BreweryScreen({ route }: ScreenProps) {
  const params = route as BreweryRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const wallet = useGameStore(selectWallet);
  // The day's reset and a closed hall's doors are both countdowns, so the screen ticks each second.
  const now = useNow(1000);
  useSceneAudio('hub', 'interior');
  const view = useMemo(() => (save ? breweryView(save, now) : null), [save, now]);
  const [picked, setPicked] = useState<Element | null>(params.hall ?? null);
  const hall = view?.halls.find((entry) => entry.def.element === (picked ?? firstOpen(view))) ?? null;
  const runs = Math.round(useAnimatedNumber(view?.runsLeft ?? 0));

  if (!save || !view || !wallet || !hall) return null;

  const runsLine =
    view.runsLeft > 0
      ? t('brewery.runs', { left: view.runsLeft, total: view.runsTotal })
      : t('brewery.runsNone');

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
        <Panel kind="ember-tall" padding={18} className={styles.panel} contentClassName={styles.panelBody}>
          <div className={styles.runs} data-testid="brewery-runs">
            <Glyph glyph="glyph.health_potion" size={26} color="var(--gold-3)" />
            <span className={`display ${styles.runsLabel}`}>{t('brewery.title')}</span>
            <span className={`num ${styles.runsValue}`} data-testid="brewery-runs-left">
              {runs}
              <span className={styles.runsTotal}>/{view.runsTotal}</span>
            </span>
          </div>
          <Bar
            value={view.runsLeft}
            max={view.runsTotal}
            kind="stamina"
            height={18}
            width="100%"
            label={runsLine}
          />
          {/* The bar is too slim to carry its own label, and this is the line that explains why
              every Brew button is grey once the day is spent. */}
          <p className={styles.runsLine} data-empty={view.runsLeft === 0} data-testid="brewery-runs-line">
            {runsLine}
          </p>
          <p className={styles.resets} data-testid="brewery-resets">
            {t('brewery.resets', { time: formatDuration(view.msToReset) })} · {t('brewery.spent')}
          </p>

          <nav className={styles.halls} aria-label={t('brewery.title')}>
            {ELEMENTS.map((element) => {
              const entry = view.halls.find((candidate) => candidate.def.element === element);
              if (!entry) return null;
              return (
                <HallTab
                  key={element}
                  hall={entry}
                  selected={entry.def.element === hall.def.element}
                  onPick={() => {
                    playSfx('ui.tab');
                    setPicked(entry.def.element);
                  }}
                />
              );
            })}
          </nav>

          {/* What the player already has, which is the whole basis of choosing a hall today. */}
          <section className={styles.holdings} aria-label={t('brewery.holdings')}>
            <h3 className={`display ${styles.holdingsTitle}`}>{t('brewery.holdings')}</h3>
            <ul className={styles.holdingsList}>
              {view.halls.map((entry) => {
                const brew = CURRENCY_BY_ID[entry.def.brew];
                return (
                  <li key={entry.def.id} data-testid={`brewery-held-${entry.def.element}`}>
                    <TintedIcon asset={brew.icon} tint={brew.tint} size={22} />
                    <span className={styles.heldName}>{translate(brew.name)}</span>
                    <span className={`num ${styles.heldAmount}`}>{formatAmount(wallet[entry.def.brew])}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className={styles.blurb}>{t('brewery.subtitle')}</p>
        </Panel>
      </aside>

      <section className={styles.hall} aria-label={translate(hall.def.name)}>
        <Panel kind="stone" padding={24} className={styles.panel} contentClassName={styles.hallBody}>
          <header className={styles.hallHead} style={{ ['--el' as string]: ELEMENT_COLOR[hall.def.element] }}>
            <Glyph glyph={ELEMENT_GLYPH[hall.def.element]} size={34} color="var(--el)" />
            <div className={styles.hallTitles}>
              <h2 className={`display ${styles.hallName}`} data-testid="brewery-hall-name">
                {translate(hall.def.name)}
              </h2>
              <p className={styles.hallDays} data-testid="brewery-hall-days">
                {t('brewery.openDays', { days: openDaysLabel(hall.def) })}
              </p>
            </div>
            <span
              className={styles.doors}
              data-open={hall.open}
              data-testid={`brewery-doors-${hall.def.element}`}
            >
              {hall.open ? t('brewery.open') : t('brewery.closed')}
            </span>
          </header>

          <p className={styles.hallBlurb}>{translate(hall.def.description)}</p>
          <p className={styles.bring} data-testid="brewery-bring">
            {bringLine(hall.def.element)}
          </p>

          {!hall.open ? (
            <p className={styles.barred} data-testid="brewery-barred">
              {hall.msToOpen !== null && hall.msToOpen > 0 && hall.nextDay !== null
                ? t('brewery.closedBody', {
                    day: dayName(hall.nextDay),
                    time: formatDuration(hall.msToOpen),
                  })
                : t('brewery.closedBodyNoDay')}
            </p>
          ) : null}

          <ScrollArea className={styles.stages} height="100%">
            {hall.stages.map((stage, index) => (
              <StageRow
                key={stage.stage.number}
                hall={hall}
                stage={stage}
                index={index}
                runsLeft={view.runsLeft}
                onEnter={enter}
              />
            ))}
          </ScrollArea>

          {/* The planning line: twenty runs are a choice, and this is what this hall pays for them. */}
          <p className={styles.deepest} data-testid="brewery-deepest">
            {hall.cleared > 0
              ? t('brewery.deepest', {
                  stage: hall.cleared,
                  runs: BREWERY_DAILY_RUNS,
                  brews: BREWERY_DAILY_RUNS * (hall.stages[hall.cleared - 1]?.stage.brews ?? 0),
                })
              : t('brewery.deepestNone')}
          </p>
        </Panel>
      </section>
    </div>
  );
}

/** The hall the screen opens on: the first one brewing today, or the first of the four. */
function firstOpen(view: { halls: readonly BreweryHallView[] } | null): Element {
  return view?.halls.find((hall) => hall.open)?.def.element ?? 'justice';
}

const dayName = (weekday: number | null): string =>
  weekday === null ? t('brewery.closed') : t(`brewery.day.${weekday}` as I18nKey);

/** Who has the advantage in a hall, or that nobody does. */
function bringLine(element: Element): string {
  const counter = counterOf(element);
  return counter
    ? t('brewery.bring', { element: t(`element.${counter}` as I18nKey) })
    : t('brewery.bringNothing');
}

/** One of the four halls, in its own colour: its name, its doors and how deep it has been taken. */
function HallTab({
  hall,
  selected,
  onPick,
}: {
  hall: BreweryHallView;
  selected: boolean;
  onPick: () => void;
}) {
  const { def, cleared, open } = hall;
  return (
    <button
      type="button"
      className={styles.hallTab}
      style={{ ['--el' as string]: ELEMENT_COLOR[def.element] }}
      data-selected={selected}
      data-open={open}
      aria-pressed={selected}
      data-testid={`brewery-tab-${def.element}`}
      onMouseEnter={() => playSfx('ui.hover')}
      onClick={onPick}
    >
      <Glyph glyph={ELEMENT_GLYPH[def.element]} size={24} color="var(--el)" />
      <span className={styles.tabName}>{translate(def.name)}</span>
      <span className={`num ${styles.tabProgress}`} data-testid={`brewery-progress-${def.element}`}>
        {cleared}/{def.stages.length}
      </span>
      {!open ? <Glyph glyph="glyph.broken_shackle" size={18} color="var(--text-3)" /> : null}
    </button>
  );
}

/** One stage: what it fields, what it pays, and whether a run may be spent on it. */
function StageRow({
  hall,
  stage,
  index,
  runsLeft,
  onEnter,
}: {
  hall: BreweryHallView;
  stage: BreweryStageView;
  index: number;
  runsLeft: number;
  onEnter: (stage: BreweryStageView) => void;
}) {
  const { state } = stage;
  const def = stage.stage;
  const brew = CURRENCY_BY_ID[hall.def.brew];
  const locked = state === 'locked';
  const canRun = hall.open && !locked && runsLeft > 0;
  const holder = stageHolder(def);
  const reduced = prefersReducedMotion();
  return (
    <motion.div
      className={styles.stage}
      data-state={state}
      data-testid={`brewery-stage-${hall.def.element}-${def.number}`}
      style={{ ['--el' as string]: ELEMENT_COLOR[hall.def.element] }}
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.05, duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <span className={`num ${styles.stageNumber}`}>{def.number}</span>
      <div className={styles.stageWhat}>
        <span className={`display ${styles.stageTier}`}>{t(tierKey(def.number))}</span>
        <span className={styles.stageGuards}>
          {def.boss
            ? t('brewery.guardsBoss', { count: def.guards - 1, level: def.enemyLevel })
            : t('brewery.guards', { count: def.guards, level: def.enemyLevel })}
        </span>
        {holder ? (
          <span className={styles.stageHolder}>{t('brewery.heldBy', { faction: translate(holder) })}</span>
        ) : null}
      </div>
      <span className={styles.stagePay} data-testid={`brewery-pay-${hall.def.element}-${def.number}`}>
        <TintedIcon asset={brew.icon} tint={brew.tint} size={30} label={translate(brew.name)} />
        <span className={`num ${styles.stagePayAmount}`}>×{def.brews}</span>
      </span>
      <span className={styles.stageState}>
        {state === 'cleared'
          ? t('brewery.cleared')
          : state === 'next'
            ? t('brewery.next')
            : t('brewery.locked', { stage: def.number - 1 })}
      </span>
      {locked ? (
        <span className={styles.stageLocked} aria-hidden="true">
          <Glyph glyph="glyph.broken_shackle" size={22} color="var(--text-3)" />
        </span>
      ) : (
        <Button
          variant={state === 'next' ? 'primary' : 'secondary'}
          size="sm"
          disabled={!canRun}
          onClick={() => onEnter(stage)}
          data-testid={`brewery-enter-${hall.def.element}-${def.number}`}
        >
          <TintedIcon asset={brew.icon} tint={brew.tint} size={18} label={translate(brew.name)} />
          {t('brewery.enter')}
        </Button>
      )}
    </motion.div>
  );
}
