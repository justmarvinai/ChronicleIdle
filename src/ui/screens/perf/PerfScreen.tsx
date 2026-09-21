/**
 * Battle perf bench (CLAUDE.md §5.6, AGENTS.md DoD "Performance"): `/?screen=perf` in every build,
 * never linked from the game. It fights one of three scenarios at ×4 with four maxed legendaries on
 * the real battle screen and shows the frame statistics the stage measured: the Stress Bench
 * (4 v 4, two waves, every cast and hit colour), the daily boss's race (one huge washed sprite, its
 * own HUD, a fight that runs to the turn limit) and the weekly boss's (a ×2.4 sprite, its escort
 * beside it and a fight that changes gear). `tools/perf/battle-bench.ts` drives all three.
 */
import { useMemo } from 'react';
import { useStore } from 'zustand';
import { content } from '@content/registry';
import { NO_PALACE } from '@engine/palace/index';
import { bossEncounterId } from '@engine/bosses/encounter';
import { createInstance, type Roster } from '@engine/champions/instance';
import { t } from '@i18n/index';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { battleController } from '@state/battle/index';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { TopBar } from '@ui/components/TopBar/TopBar';
import type { ScreenProps } from '@ui/router/screens';
import styles from './PerfScreen.module.css';

/** The fights the bench can run; `perf-run` stays the stress one. */
const SCENARIOS = [
  { id: 'stress', encounterId: 'encounter.bench.stress', testId: 'perf-run', label: 'perf.run' },
  {
    id: 'boss',
    encounterId: bossEncounterId('boss.gravemaw', 'easy'),
    testId: 'perf-run-boss',
    label: 'perf.runBoss',
  },
  {
    // The heaviest fight the game has: a ×2.4 washed sprite, its escort, and the phase beats.
    id: 'weekly',
    encounterId: bossEncounterId('boss.nyxara', 'normal'),
    testId: 'perf-run-weekly',
    label: 'perf.runWeekly',
  },
] as const;
/** Four maxed legendaries of four elements: every cast, projectile and hit colour fires. */
const BENCH_TEAM = [
  'champ.kaelith_stormcaller',
  'champ.aurelia_dawnwarden',
  'champ.morrigan_nightweaver',
  'champ.varkos_sundered_king',
] as const;
const BENCH_LEVEL = 60;
const BENCH_STARS = 6;
/** CLAUDE.md §5.6: p95 frame time at ×4 in the stress fight. */
const BUDGET_MS = 16;

function benchRoster(): Roster {
  const roster: Roster = {};
  BENCH_TEAM.forEach((id, i) => {
    const def = content.championById(id);
    if (!def) return;
    const instance = createInstance(def, { instanceId: `bench-${i + 1}`, now: 0, source: 'summon' });
    roster[instance.instanceId] = { ...instance, level: BENCH_LEVEL, stars: BENCH_STARS };
  });
  return roster;
}

export default function PerfScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  const stats = useStore(battleController.store, (s) => s.frameStats);
  const outcome = useStore(battleController.store, (s) => s.outcome);
  const roster = useMemo(() => benchRoster(), []);

  const run = (encounterId: string): void => {
    const started = battleController.start({
      encounterId,
      instanceIds: Object.keys(roster),
      roster,
      // The bench measures frames, not a chronicle: its champions fight without a Palace behind them.
      palace: NO_PALACE,
      control: 'auto',
      speed: 4,
      seed: 'bench',
      awaitPresenter: true,
    });
    if (started.ok) actions.push({ name: 'battle', bench: true });
    else actions.toast('error', 'perf.startFailed', { message: started.error.message });
  };
  const leave = (): void => {
    battleController.end();
    actions.resetStack({ name: save ? 'hub' : 'title' });
  };
  const withinBudget = stats ? stats.p95 <= BUDGET_MS : null;

  return (
    <div className={styles.root} data-testid="screen-perf">
      <Backdrop asset="bg.bg3" grade="rgba(12, 10, 16, 0.7)" parallax={4} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('perf.title')} onBack={leave} />
      <Panel kind="stone" className={styles.panel}>
        <p className={styles.body}>{t('perf.body')}</p>
        {!save ? <p className={styles.warning}>{t('perf.needSave')}</p> : null}
        <div className={styles.actions}>
          {SCENARIOS.map((scenario) => (
            <Button
              key={scenario.id}
              variant={scenario.id === 'stress' ? 'primary' : 'secondary'}
              size="lg"
              onClick={() => run(scenario.encounterId)}
              disabled={!save}
              data-testid={scenario.testId}
            >
              {t(scenario.label)}
            </Button>
          ))}
          <Button variant="secondary" size="md" onClick={leave}>
            {t('perf.back')}
          </Button>
        </div>
        <h2 className={`display ${styles.heading}`}>{t('perf.report')}</h2>
        {stats ? (
          <dl
            className={styles.report}
            data-testid="perf-report"
            data-p50={stats.p50.toFixed(2)}
            data-p95={stats.p95.toFixed(2)}
            data-max={stats.max.toFixed(2)}
            data-samples={stats.samples}
            data-outcome={outcome?.kind ?? ''}
            data-within-budget={withinBudget ? 'true' : 'false'}
          >
            <div className={styles.cell}>
              <dt>{t('perf.p50')}</dt>
              <dd className="num">{stats.p50.toFixed(1)} ms</dd>
            </div>
            <div className={[styles.cell, withinBudget ? styles.pass : styles.fail].join(' ')}>
              <dt>{t('perf.p95')}</dt>
              <dd className="num">{stats.p95.toFixed(1)} ms</dd>
            </div>
            <div className={styles.cell}>
              <dt>{t('perf.max')}</dt>
              <dd className="num">{stats.max.toFixed(1)} ms</dd>
            </div>
            <div className={styles.cell}>
              <dt>{t('perf.samples')}</dt>
              <dd className="num">{stats.samples}</dd>
            </div>
            <div className={styles.cell}>
              <dt>{t('perf.outcome')}</dt>
              <dd>{outcome?.kind ?? '—'}</dd>
            </div>
            <div className={[styles.cell, withinBudget ? styles.pass : styles.fail].join(' ')}>
              <dt>{`${BUDGET_MS} ms`}</dt>
              <dd>{withinBudget ? t('perf.pass') : t('perf.fail')}</dd>
            </div>
          </dl>
        ) : (
          <p className={styles.muted}>{t('perf.none')}</p>
        )}
      </Panel>
    </div>
  );
}
