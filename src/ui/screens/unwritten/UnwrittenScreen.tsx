import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from 'zustand';
import { playSfx } from '@audio/index';
import { translate } from '@i18n/index';
import { INTERLUDE_HEAL } from '@content/balance/unwritten';
import { isFeatureUnlocked, unlockLevel } from '@engine/progression/unlocks';
import { bankedPages } from '@engine/unwritten/index';
import { selectActions, selectSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import type { Route, UnwrittenTab } from '@state/ui-types';
import { clearAftermath, noteAftermath, unwrittenAftermath } from '@state/unwritten/aftermath';
import { readCtx, unwrittenCommands } from '@state/unwritten/commands';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Button } from '@ui/components/Button/Button';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { RewardList } from '@ui/components/RewardList/RewardList';
import { Tabs } from '@ui/components/Tab/Tabs';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { useNow } from '@ui/hooks/useNow';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import type { ScreenProps } from '@ui/router/screens';
import type { Act } from './act';
import { Codex } from './Codex';
import { CompanyColumn } from './CompanyColumn';
import { FolioMap } from './FolioMap';
import { launchUnwrittenFight } from './launch';
import { INK_COLOUR, INK_NAME, PASSAGE_HINT, PASSAGE_NAME, numeral } from './marks';
import { PassagePanel } from './PassagePanel';
import { Records } from './Records';
import { Scriptorium } from './Scriptorium';
import { line, u } from './strings';
import { TalePanel } from './TalePanel';
import { Threshold } from './Threshold';
import {
  codexView,
  companyView,
  folioOf,
  mapView,
  scriptoriumView,
  thresholdView,
  type MemberView,
} from './unwritten-view';
import styles from './UnwrittenScreen.module.css';

type UnwrittenRoute = Extract<Route, { name: 'unwritten' }>;

/** The page the Unwritten is drawn on before an expedition: the Torn Page, violet and deep. */
const THRESHOLD_BACKDROP = { asset: 'bg.bg9', grade: 'rgba(24, 14, 42, 0.64)' } as const;

/** The members a fight would send in by default: the healthiest standing four. */
function defaultFielded(members: readonly MemberView[], party: number): string[] {
  return [...members]
    .filter((m) => !m.fallen)
    .sort((a, b) => b.hp - a.hp)
    .slice(0, party)
    .map((m) => m.id);
}

/**
 * The Unwritten (docs/design/UNWRITTEN.md, UI_DESIGN.md §5.32). Three pages behind their tabs:
 *
 * - **Expedition** — before one, the threshold (an Omen and a company); during one, the company on
 *   the left, the folio's map and the codex on the right, and whatever the passage in hand waits on
 *   laid over them as a leaf;
 * - **Scriptorium** — the folios Recovered Pages are written into;
 * - **Records** — the chronicle's standing and its last Tales.
 *
 * Every step is the engine's, committed through the store; this screen only asks and tells.
 */
export default function UnwrittenScreen({ route }: ScreenProps) {
  const params = route as UnwrittenRoute;
  const actions = useGameStore(selectActions);
  const save = useGameStore(selectSave);
  // The Tithe's week turns on the clock; a minute is fine enough for a weekly counter.
  const now = useNow(60_000);
  useSceneAudio('hub', 'unwritten');
  const aftermath = useStore(unwrittenAftermath);
  const [tab, setTab] = useState<UnwrittenTab>(params.tab ?? 'expedition');
  const [selected, setSelected] = useState<string | null>(null);
  // The picks for the fight in hand, kept against the passage (and attempt) they were made for.
  const [picks, setPicks] = useState<{ key: string; ids: string[] } | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [interlude, setInterlude] = useState<number | null>(null);

  const ctx = useMemo(() => (save ? readCtx(save, now) : null), [save, now]);
  const threshold = useMemo(() => (ctx ? thresholdView(ctx) : null), [ctx]);
  const run = save?.unwritten.run ?? null;
  const company = useMemo(() => (run && ctx ? companyView(run, ctx) : []), [run, ctx]);
  const pendingKey = run ? `${run.folio}:${run.at ?? ''}:${run.pending?.kind ?? ''}:${run.attempts}` : '';

  // A fight waiting starts with the healthiest four chosen; the player changes it from the column.
  // A new passage, or a new attempt at one, starts from the healthiest four again.
  const fielded =
    run?.pending?.kind !== 'fight'
      ? []
      : picks?.key === pendingKey
        ? picks.ids
        : defaultFielded(company, threshold?.party ?? 0);

  // A folio turned: the interlude is told once, as the next map is laid down.
  const folioSeen = useRef(run?.folio ?? null);
  useEffect(() => {
    const folio = run?.folio ?? null;
    if (folio !== null && folioSeen.current !== null && folio > folioSeen.current) {
      setInterlude(folio);
      playSfx('gate.open');
      const id = window.setTimeout(() => setInterlude(null), 3600);
      folioSeen.current = folio;
      return () => window.clearTimeout(id);
    }
    folioSeen.current = folio;
    return undefined;
  }, [run?.folio]);

  // An ink lit — by a step here, or by the fight just fought — rises over the map for a moment,
  // then the aftermath lets it go.
  const lit = aftermath.illuminated[aftermath.illuminated.length - 1] ?? null;
  useEffect(() => {
    if (!lit) return;
    playSfx('unwritten.illuminate');
    const id = window.setTimeout(() => unwrittenAftermath.setState({ illuminated: [] }), 3200);
    return () => window.clearTimeout(id);
  }, [lit]);

  if (!save || !ctx || !threshold) return null;
  const unlocked = isFeatureUnlocked('unwritten', save.profile.level);

  const act: Act = (step, sound) => {
    const fightTold = unwrittenAftermath.getState().fight !== null;
    const result = step();
    if (!result.ok) {
      playSfx('ui.error');
      return;
    }
    if (fightTold) unwrittenAftermath.setState({ fight: null, fell: [] });
    if (sound) playSfx(sound);
    const { receipt, changes } = result.value;
    noteAftermath({
      illuminated: receipt.illuminated,
      ...(receipt.ended ? { ended: receipt.ended } : {}),
      paid: changes,
    });
    setSelected(null);
  };

  const enter = (id: string): void => act(() => unwrittenCommands.enter(id), 'unwritten.page');
  const toggleFielded = (id: string): void => {
    if (fielded.includes(id)) {
      playSfx('ui.cancel');
      setPicks({ key: pendingKey, ids: fielded.filter((x) => x !== id) });
      return;
    }
    if (fielded.length >= threshold.party) {
      playSfx('ui.error');
      return;
    }
    playSfx('ui.confirm');
    setPicks({ key: pendingKey, ids: [...fielded, id] });
  };
  const fight = (): void => {
    const launched = launchUnwrittenFight(fielded);
    if (!launched.ok) playSfx('ui.error');
    else playSfx('battle.start');
  };

  const folio = run ? folioOf(run, ctx) : null;
  const backdrop = folio ? { asset: folio.backdrop, grade: folio.grade } : THRESHOLD_BACKDROP;
  const map = run ? mapView(run) : null;
  const codex = run ? codexView(run, ctx) : null;
  const selectedPassage = run && selected ? run.map.find((p) => p.id === selected) : null;
  const selectedState = map?.passages.find((p) => p.passage.id === selected)?.state ?? null;
  const fellBack =
    run?.pending?.kind === 'fight' && aftermath.fight !== null && aftermath.fight !== 'victory';

  return (
    <div className={styles.root} data-testid="screen-unwritten">
      <Backdrop asset={backdrop.asset} grade={backdrop.grade} parallax={8} />
      <AmbientLayer preset="unwritten" />
      <div className={styles.vignette} aria-hidden="true" />
      <TopBar title={u('unwritten.title')} onBack={() => actions.pop()} />

      <div className={styles.body}>
        <header className={styles.head}>
          <Tabs
            items={[
              {
                key: 'expedition' as const,
                label: u('unwritten.ui.tab.expedition'),
                testId: 'unwritten-tab-expedition',
              },
              {
                key: 'scriptorium' as const,
                label: u('unwritten.ui.tab.scriptorium'),
                testId: 'unwritten-tab-scriptorium',
              },
              {
                key: 'records' as const,
                label: u('unwritten.ui.tab.records'),
                testId: 'unwritten-tab-records',
              },
            ]}
            value={tab}
            onChange={(next) => {
              playSfx('ui.tab');
              setTab(next);
            }}
          />
          {run && folio ? (
            <span className={styles.where} data-testid="unwritten-where">
              <span className={styles.whereFolio}>
                {u('unwritten.ui.folio', { folio: numeral(run.folio) })}
              </span>
              <span className={`display ${styles.whereName}`}>{translate(folio.name)}</span>
            </span>
          ) : (
            <span className={styles.where}>
              <span className={styles.whereName}>{u('unwritten.subtitle')}</span>
            </span>
          )}
          <span className={styles.chips}>
            <span className={styles.chip} data-testid="unwritten-chip-pages">
              <Glyph glyph="glyph.burning_scroll" size={22} color="#cbb8ff" />
              <span className="num">{save.unwritten.pages}</span>
            </span>
            <span className={styles.chip} data-testid="unwritten-chip-tithe">
              <Glyph glyph="glyph.skull_wreath" size={22} color="#ff8b8b" />
              <span className="num">
                {threshold.titheLeft}/{threshold.tithePerWeek}
              </span>
            </span>
          </span>
        </header>

        {!unlocked ? (
          <p className={styles.locked} data-testid="unwritten-locked">
            {u('unwritten.ui.locked', { level: unlockLevel('unwritten') })}
          </p>
        ) : tab === 'scriptorium' ? (
          <Scriptorium
            shelves={scriptoriumView(ctx)}
            pages={save.unwritten.pages}
            closed={run !== null}
            onWrite={(id) => act(() => unwrittenCommands.writeFolio(id), 'unwritten.quill')}
          />
        ) : tab === 'records' ? (
          <Records unwritten={save.unwritten} />
        ) : run && map && codex ? (
          <div className={styles.expedition}>
            <CompanyColumn
              members={company}
              tokens={run.tokens}
              tokenShare={codex.tokenShare}
              onRekindle={(id) => act(() => unwrittenCommands.rekindle(id), 'battle.revive')}
              {...(run.pending?.kind === 'fight' ? { fielded, onToggle: toggleFielded } : {})}
            />
            <div className={styles.stage}>
              <div className={styles.page}>
                <FolioMap
                  passages={map.passages}
                  roads={map.roads}
                  selected={selected}
                  busy={run.pending !== null}
                  onSelect={setSelected}
                  onEnter={enter}
                />
                {selectedPassage && selectedState ? (
                  <div className={styles.preview} data-testid="unwritten-preview">
                    <span className={`display ${styles.previewName}`}>
                      {u(PASSAGE_NAME[selectedPassage.kind])}
                    </span>
                    <span className={styles.previewHint}>{u(PASSAGE_HINT[selectedPassage.kind])}</span>
                    {selectedState === 'open' && !run.pending ? (
                      <Button
                        variant="primary"
                        onClick={() => enter(selectedPassage.id)}
                        data-testid="unwritten-enter"
                      >
                        {u('unwritten.ui.map.enter')}
                      </Button>
                    ) : (
                      <span className={styles.previewState}>
                        {u(`unwritten.ui.map.state.${selectedState}`)}
                      </span>
                    )}
                  </div>
                ) : !run.pending ? (
                  <p className={styles.prompt}>
                    {u(run.walked.length ? 'unwritten.ui.map.next' : 'unwritten.ui.map.first')}
                  </p>
                ) : null}
              </div>
              <Codex
                codex={codex}
                gilt={run.gilt}
                pages={run.pages}
                omen={run.omen}
                rerolls={run.rerolls}
                onAbandon={() => {
                  playSfx('ui.open');
                  setConfirmAbandon(true);
                }}
              />
              <PassagePanel
                run={run}
                ctx={ctx}
                company={company}
                fielded={fielded}
                fellBack={fellBack}
                act={act}
                onFight={fight}
              />
              {lit ? (
                <div
                  className={styles.lit}
                  style={{ color: INK_COLOUR[lit.ink] }}
                  data-testid="unwritten-illuminated"
                >
                  <span className={`display ${styles.litTitle}`}>
                    {u(lit.tier > 1 ? 'unwritten.ui.lit.fully' : 'unwritten.ui.lit.once', {
                      ink: u(INK_NAME[lit.ink]),
                    })}
                  </span>
                  <span className={styles.litLine}>
                    {(() => {
                      const def = ctx.world.content.illuminations[lit.ink];
                      const tier = def.tiers[lit.tier - 1];
                      const text = def.text[lit.tier - 1];
                      return tier && text ? line(text, tier.show) : null;
                    })()}
                  </span>
                </div>
              ) : null}
              {interlude !== null && folio ? (
                <div className={styles.interlude} data-testid="unwritten-interlude">
                  <span className={styles.interludeKicker}>
                    {u('unwritten.ui.interlude.kicker', { folio: numeral(interlude) })}
                  </span>
                  <span className={`display ${styles.interludeTitle}`}>{translate(folio.name)}</span>
                  <span className={styles.interludeLine}>
                    {u('unwritten.ui.interlude.rest', { share: Math.round(INTERLUDE_HEAL * 100) })}
                  </span>
                </div>
              ) : null}
              {confirmAbandon ? (
                <div
                  className={styles.confirm}
                  role="dialog"
                  aria-modal="true"
                  data-testid="unwritten-confirm-abandon"
                >
                  <div className={styles.confirmLeaf}>
                    <h2 className={`display ${styles.confirmTitle}`}>{u('unwritten.ui.abandon.title')}</h2>
                    <p className={styles.confirmText}>
                      {u('unwritten.ui.abandon.text', {
                        pages: bankedPages(run.pages, run.omen, codex.rules, false),
                      })}
                    </p>
                    <div className={styles.confirmActions}>
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmAbandon(false)}
                        data-testid="unwritten-abandon-cancel"
                      >
                        {u('unwritten.ui.abandon.keep')}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          setConfirmAbandon(false);
                          act(() => unwrittenCommands.abandon(), 'unwritten.blot');
                        }}
                        data-testid="unwritten-abandon-confirm"
                      >
                        {u('unwritten.ui.abandon.go')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <Threshold
            save={save}
            view={threshold}
            omens={threshold.omens}
            onBegin={(omen, chosen) => act(() => unwrittenCommands.begin(omen, chosen), 'gate.open')}
          />
        )}

        {aftermath.ended ? (
          <div className={styles.ending} data-testid="unwritten-ending">
            <div className={styles.endingLeaf}>
              <TalePanel tale={aftermath.ended} testId="unwritten-ending-tale" />
              <footer className={styles.endingFoot}>
                {aftermath.paid.length ? (
                  <span className={styles.endingPaid}>
                    {u('unwritten.ui.ending.paid')}{' '}
                    <RewardList
                      amounts={aftermath.paid.map((c) => ({ currency: c.currency, amount: c.delta }))}
                      size={24}
                    />
                  </span>
                ) : (
                  <span />
                )}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    playSfx('ui.close');
                    clearAftermath();
                  }}
                  data-testid="unwritten-ending-close"
                >
                  {u('unwritten.ui.ending.close')}
                </Button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
