import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { imageUrl } from '@assets/manifest';
import { playSfx } from '@audio/index';
import { PALACE_TREE_COST } from '@content/balance/palace';
import { ELEMENTS, STAT_IDS, type Element } from '@content/champions/types';
import { content } from '@content/registry';
import { t, type I18nKey } from '@i18n/index';
import type { PalaceBonus } from '@engine/palace/index';
import { palaceBonusOf, selectActions, selectPalaceSave } from '@state/selectors';
import { useGameStore } from '@state/store';
import { AmbientLayer } from '@render/ambient/AmbientLayer';
import { Backdrop } from '@ui/components/Backdrop/Backdrop';
import { Bar } from '@ui/components/Bar/Bar';
import { Button } from '@ui/components/Button/Button';
import { Panel } from '@ui/components/Frame/Panel';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { ScrollArea } from '@ui/components/ScrollArea/ScrollArea';
import { TopBar } from '@ui/components/TopBar/TopBar';
import { Tooltip } from '@ui/components/Tooltip/Tooltip';
import { useAnimatedNumber } from '@ui/hooks/useAnimatedNumber';
import { useSceneAudio } from '@ui/hooks/useSceneAudio';
import { useViewport } from '@ui/viewport/viewport';
import { formatStat, statLabel } from '@ui/gear/gear-view';
import { ELEMENT_COLOR, ELEMENT_GLYPH } from '@ui/styles/display-maps';
import type { ScreenProps } from '@ui/router/screens';
import { PalaceNode } from './PalaceNode';
import { canvasPoint, palaceView, type PalaceBranchView, type PalaceNodeView } from './palace-view';
import styles from './PalaceScreen.module.css';

/** How far in and out the tree may be taken, and how much one press of the zoom moves it. */
const MIN_SCALE = 0.45;
const MAX_SCALE = 1.7;
const ZOOM_STEP = 0.16;
/** Below this the cost numerals are noise, so they are left off until the tree is worked closely. */
const COST_VISIBLE_SCALE = 0.85;
/** How long a freshly bought node keeps its flare. */
const FLARE_MS = 900;
/** Where the points come from, in the order the ledger lists them. */
const SOURCES: readonly { key: I18nKey; glyph: Parameters<typeof Glyph>[0]['glyph'] }[] = [
  { key: 'palace.earned.settlement', glyph: 'glyph.crossed_swords' },
  { key: 'palace.earned.tower', glyph: 'glyph.broken_shackle' },
  { key: 'palace.earned.dailyBoss', glyph: 'glyph.skull_wreath' },
  { key: 'palace.earned.weeklyBoss', glyph: 'glyph.flaming_skull' },
];

/**
 * The Glorious Palace (docs/tech/UI_DESIGN.md §5.22): one core and four petals on a scrollable,
 * zoomable field, with the ledger floating over it.
 *
 * The field is an ordinary scroll container, so dragging it works through the game's own
 * drag-to-scroll (`app/dragScroll.ts`) and needs nothing of its own; zoom is the one thing this
 * screen adds, and it keeps whatever is under the cursor under the cursor.
 */
export default function PalaceScreen(_props: ScreenProps) {
  const actions = useGameStore(selectActions);
  const palace = useGameStore(selectPalaceSave);
  const viewport = useViewport();
  useSceneAudio('hub', 'interior');

  const field = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  /**
   * The zoom the field is actually drawn at. The wheel listener is installed once and would close
   * over a stale value, and a ref may not be written during render — so the layout effect that
   * finishes a zoom writes it, which is exactly when it becomes true.
   */
  const live = useRef(scale);
  const [fresh, setFresh] = useState<string | null>(null);
  /** A point of the canvas, 0..1 of its box, to keep under a given place in the window. */
  const hold = useRef<{ fx: number; fy: number; clientX: number; clientY: number } | null>(null);
  const fitted = useRef(false);

  const view = useMemo(
    () => (palace ? palaceView(content.palace, palace.nodes, palace.earned) : null),
    [palace],
  );
  // What the tree is already worth, which is the question the ledger exists to answer.
  const bonus = useMemo(() => palaceBonusOf(palace?.nodes ?? []), [palace?.nodes]);
  const size = view?.size ?? 0;

  /** The zoom at which the whole mandala is on screen — where the screen opens. */
  const fit = useCallback((): number => {
    const el = field.current;
    if (!el || size === 0) return 1;
    const style = getComputedStyle(el);
    const width = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = el.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    return clamp(Math.min(width / size, height / size));
  }, [size]);

  // Open on the whole tree, centred. Once only: a zoom the player chose is theirs to keep.
  useLayoutEffect(() => {
    if (fitted.current || !field.current || size === 0) return;
    fitted.current = true;
    setScale(fit());
  }, [fit, size]);

  // Whatever the zoom was anchored to goes back where it was, now that the box has resized.
  useLayoutEffect(() => {
    const el = field.current;
    const box = canvas.current;
    const anchor = hold.current;
    hold.current = null;
    if (!el || !box || !anchor) return;
    const rect = box.getBoundingClientRect();
    el.scrollLeft += (rect.left + anchor.fx * rect.width - anchor.clientX) / viewport.scale;
    el.scrollTop += (rect.top + anchor.fy * rect.height - anchor.clientY) / viewport.scale;
  }, [scale, viewport.scale]);

  useLayoutEffect(() => {
    live.current = scale;
  }, [scale]);

  useEffect(() => {
    if (fresh === null) return;
    const timer = window.setTimeout(() => setFresh(null), FLARE_MS);
    return () => window.clearTimeout(timer);
  }, [fresh]);

  /** Zooms, holding the canvas point under `at` (a window position) where it is. */
  const zoom = useCallback((next: number, at?: { clientX: number; clientY: number }): void => {
    const wanted = clamp(next);
    if (wanted === live.current) return;
    const box = canvas.current;
    if (box) {
      const rect = box.getBoundingClientRect();
      const point = at ?? { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
      hold.current = {
        fx: rect.width > 0 ? (point.clientX - rect.left) / rect.width : 0.5,
        fy: rect.height > 0 ? (point.clientY - rect.top) / rect.height : 0.5,
        clientX: point.clientX,
        clientY: point.clientY,
      };
    }
    setScale(wanted);
  }, []);

  // The wheel zooms rather than scrolls, which needs a listener React cannot give us: React's own
  // are passive, and a passive listener may not call preventDefault.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const step = event.deltaY < 0 ? 1 + ZOOM_STEP : 1 - ZOOM_STEP;
      zoom(live.current * step, { clientX: event.clientX, clientY: event.clientY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom]);

  const buy = (target: PalaceNodeView): void => {
    const result = actions.unlockPalaceNode(target.node.id);
    if (!result.ok) {
      playSfx(target.state === 'owned' ? 'ui.cancel' : 'ui.error');
      return;
    }
    playSfx(target.node.cost >= 4 ? 'reward.medium' : 'torch.light');
    setFresh(target.node.id);
  };

  const shown = Math.round(useAnimatedNumber(view?.ledger.available ?? 0));

  if (!palace || !view) return null;
  const { ledger } = view;
  const lit = view.nodes.filter((node) => node.state === 'owned').length;

  return (
    <div className={styles.root} data-testid="screen-palace">
      <Backdrop asset="bg.bg4" grade="rgba(20, 12, 34, 0.68)" parallax={8} />
      <AmbientLayer preset="interior" />
      <TopBar title={t('palace.title')} onBack={() => actions.pop()} />

      <div
        ref={field}
        className={styles.field}
        role="group"
        aria-label={t('palace.tree')}
        data-testid="palace-field"
      >
        <div className={styles.canvasBox} style={{ width: size * scale, height: size * scale }}>
          <div
            ref={canvas}
            className={styles.canvas}
            style={{
              width: size,
              height: size,
              transform: `scale(${scale})`,
              /* The kit's round frame, handed to every node at once rather than 133 times. */
              ['--ring' as string]: `url("${imageUrl('ui.dark_ember.frame_round_sm')}")`,
            }}
            data-close={scale >= COST_VISIBLE_SCALE}
          >
            <svg
              className={styles.links}
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              aria-hidden="true"
            >
              {view.links.map((link) => {
                const from = canvasPoint(view, link.from);
                const to = canvasPoint(view, link.to);
                return (
                  <line
                    key={link.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    className={styles.link}
                    data-state={link.state}
                    style={link.element ? { ['--el' as string]: ELEMENT_COLOR[link.element] } : undefined}
                  />
                );
              })}
            </svg>
            <div className={styles.halo} aria-hidden="true" />
            {view.branches.map((branch) => (
              <BranchLabel key={branch.element} branch={branch} at={canvasPoint(view, branch)} />
            ))}
            {view.nodes.map((node) => (
              <PalaceNode
                key={node.node.id}
                view={node}
                at={canvasPoint(view, node)}
                fresh={fresh === node.node.id}
                onBuy={buy}
              />
            ))}
          </div>
        </div>
      </div>

      <aside className={styles.ledger} data-testid="palace-ledger">
        <Panel kind="ember-tall" padding={20} className={styles.panel} contentClassName={styles.panelBody}>
          <div className={styles.points}>
            <Glyph glyph="glyph.arcane_symbol" size={26} color="var(--r-epic)" />
            <span className={`display ${styles.pointsLabel}`}>{t('palace.points')}</span>
            <span className={`num ${styles.pointsValue}`} data-testid="palace-available">
              {shown}
            </span>
          </div>
          <p className={styles.blurb}>{t('palace.subtitle')}</p>
          <p className={styles.pointsNote} data-testid="palace-spent">
            {ledger.available > 0
              ? t('palace.pointsAvailable', { count: ledger.available })
              : t('palace.pointsNone')}
            {' · '}
            {t('palace.spent', { spent: ledger.spent, total: PALACE_TREE_COST })}
          </p>

          <ScrollArea className={styles.scroller} height="100%">
            <div className={styles.branches}>
              {view.branches.map((branch) => (
                <div
                  key={branch.element}
                  className={styles.branchRow}
                  data-testid={`palace-branch-${branch.element}`}
                >
                  <Glyph
                    glyph={ELEMENT_GLYPH[branch.element]}
                    size={20}
                    color={ELEMENT_COLOR[branch.element]}
                  />
                  <span className={styles.branchName}>{t(`element.${branch.element}` as I18nKey)}</span>
                  <span className={`num ${styles.branchSpent}`}>
                    {t('palace.branchSpent', { spent: branch.spent, total: branch.total })}
                  </span>
                  <Bar
                    value={branch.spent}
                    max={branch.total}
                    kind="ember"
                    height={12}
                    width="100%"
                    className={styles.branchBar ?? ''}
                  />
                </div>
              ))}
            </div>

            <h3 className={`display ${styles.sourcesTitle}`}>{t('palace.gains.title')}</h3>
            <Gains bonus={bonus} />

            <h3 className={`display ${styles.sourcesTitle}`}>{t('palace.earned.title')}</h3>
            <ul className={styles.sources}>
              {SOURCES.map((source) => (
                <li key={source.key}>
                  <Glyph glyph={source.glyph} size={18} color="var(--gold-2)" />
                  <span>{t(source.key)}</span>
                </li>
              ))}
            </ul>
          </ScrollArea>

          <p className={styles.nodesLit} data-testid="palace-nodes-lit">
            {t('palace.nodes', { owned: lit, total: view.nodes.length })}
          </p>
          <Button
            variant="secondary"
            size="sm"
            disabled={ledger.spent === 0}
            onClick={() => actions.openDialog({ name: 'palace-reset' })}
            data-testid="palace-reset"
          >
            {t('palace.reset')}
          </Button>
        </Panel>
      </aside>

      <div className={styles.zoomBar}>
        <span className={styles.hint}>{t('palace.hint')}</span>
        <ZoomButton
          label={t('palace.zoom.out')}
          onClick={() => zoom(scale - ZOOM_STEP)}
          testId="palace-zoom-out"
        >
          <span className="num" aria-hidden="true">
            &minus;
          </span>
        </ZoomButton>
        <ZoomButton label={t('palace.zoom.fit')} onClick={() => zoom(fit())} testId="palace-zoom-fit">
          <Glyph glyph="glyph.celestial_body" size={18} color="var(--gold-3)" />
        </ZoomButton>
        <ZoomButton
          label={t('palace.zoom.in')}
          onClick={() => zoom(scale + ZOOM_STEP)}
          testId="palace-zoom-in"
        >
          <span className="num" aria-hidden="true">
            +
          </span>
        </ZoomButton>
      </div>
    </div>
  );
}

const clamp = (value: number): number => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

/** The sum of what is bought, per element — the Palace's own stat sheet. */
function Gains({ bonus }: { bonus: PalaceBonus }) {
  const lines = ELEMENTS.map((element) => ({ element, text: gainLine(bonus, element) })).filter(
    (line) => line.text !== '',
  );
  if (bonus.hpPct === 0 && lines.length === 0)
    return <p className={styles.gainsNone}>{t('palace.gains.none')}</p>;
  return (
    <div className={styles.gains} data-testid="palace-gains">
      {bonus.hpPct > 0 ? (
        <p className={styles.gainsCore}>{t('palace.gains.core', { pct: bonus.hpPct })}</p>
      ) : null}
      {lines.map((line) => (
        <div key={line.element} className={styles.gainRow} data-testid={`palace-gain-${line.element}`}>
          <Glyph glyph={ELEMENT_GLYPH[line.element]} size={16} color={ELEMENT_COLOR[line.element]} />
          <span className={styles.gainName}>{t(`element.${line.element}` as I18nKey)}</span>
          <span className={`num ${styles.gainStats}`}>{line.text}</span>
        </div>
      ))}
    </div>
  );
}

/** `+150 HP · +8 ATK` — one element's whole branch in a line. */
function gainLine(bonus: PalaceBonus, element: Element): string {
  const granted = bonus.flat[element];
  return STAT_IDS.filter((stat) => (granted[stat] ?? 0) > 0)
    .map((stat) => `+${formatStat(stat, granted[stat] ?? 0)} ${statLabel(stat)}`)
    .join(' · ');
}

/** A branch's name and its spend, written just past its outermost ring. */
function BranchLabel({ branch, at }: { branch: PalaceBranchView; at: { x: number; y: number } }) {
  return (
    <div
      className={styles.branchLabel}
      style={{ left: at.x, top: at.y, ['--el' as string]: ELEMENT_COLOR[branch.element] }}
      data-testid={`palace-label-${branch.element}`}
    >
      <Glyph glyph={ELEMENT_GLYPH[branch.element]} size={22} />
      <span className={`display ${styles.branchLabelName}`}>{t(`element.${branch.element}` as I18nKey)}</span>
      <span className={`num ${styles.branchLabelSpent}`}>
        {t('palace.branchSpent', { spent: branch.spent, total: branch.total })}
      </span>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  testId,
  children,
}: {
  label: string;
  onClick: () => void;
  testId: string;
  children: ReactNode;
}) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        className={styles.zoomButton}
        aria-label={label}
        data-testid={testId}
        onClick={() => {
          playSfx('ui.tab');
          onClick();
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}
