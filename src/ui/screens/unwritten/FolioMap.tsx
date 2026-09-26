import { memo, type CSSProperties } from 'react';
import { playSfx } from '@audio/index';
import { Glyph } from '@ui/components/Glyph/Glyph';
import { PASSAGE_GLYPH, PASSAGE_NAME, PASSAGE_TINT } from './marks';
import { u } from './strings';
import type { PassageView, RoadView } from './unwritten-view';
import styles from './FolioMap.module.css';

const VIEW = 1000;

/** How a road is inked, by where it stands from the company. */
const ROAD_CLASS: Readonly<Record<RoadView['state'], string | undefined>> = {
  walked: styles.roadWalked,
  open: styles.roadOpen,
  ahead: styles.roadAhead,
  lost: styles.roadLost,
};

const NODE_CLASS: Readonly<Record<PassageView['state'], string | undefined>> = {
  walked: styles.nodeWalked,
  here: styles.nodeHere,
  open: styles.nodeOpen,
  ahead: styles.nodeAhead,
  lost: styles.nodeLost,
};

/** A road as an ink stroke: an S from one passage up to the next. */
function roadPath(road: RoadView): string {
  const x1 = road.from.x * VIEW;
  const y1 = road.from.y * VIEW;
  const x2 = road.to.x * VIEW;
  const y2 = road.to.y * VIEW;
  const bend = (y1 - y2) * 0.45;
  return `M ${x1} ${y1} C ${x1} ${y1 - bend}, ${x2} ${y2 + bend}, ${x2} ${y2}`;
}

export interface FolioMapProps {
  passages: readonly PassageView[];
  roads: readonly RoadView[];
  selected: string | null;
  /** A choice is waiting at a passage: nothing else may be entered until it is made. */
  busy: boolean;
  onSelect: (id: string) => void;
  onEnter: (id: string) => void;
}

/**
 * A folio's map (UNWRITTEN.md §5, UI_DESIGN.md §5.32): roads in ink on a darkened page, the route
 * walked in gold, the passages the company may take next breathing, the ones it can no longer reach
 * fading out. The Warden stands above the last row. A passage is chosen, then entered — or entered
 * at once with a double press.
 */
export const FolioMap = memo(function FolioMap({
  passages,
  roads,
  selected,
  busy,
  onSelect,
  onEnter,
}: FolioMapProps) {
  return (
    <div className={styles.map} data-testid="unwritten-map">
      <svg
        className={styles.roads}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="unwritten-ink-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {roads.map((road) => (
          <path
            key={`${road.from.passage.id}-${road.to.passage.id}`}
            d={roadPath(road)}
            className={ROAD_CLASS[road.state]}
            filter={road.state === 'walked' || road.state === 'open' ? 'url(#unwritten-ink-glow)' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {passages.map((view) => {
        const { passage, state } = view;
        const warden = passage.kind === 'warden';
        const enterable = state === 'open' && !busy;
        return (
          <button
            key={passage.id}
            type="button"
            className={[
              styles.node,
              NODE_CLASS[state],
              warden ? styles.warden : '',
              selected === passage.id ? styles.picked : '',
            ].join(' ')}
            style={
              {
                left: `${view.x * 100}%`,
                top: `${view.y * 100}%`,
                '--tint': PASSAGE_TINT[passage.kind],
              } as CSSProperties
            }
            aria-label={u('unwritten.ui.map.node', {
              kind: u(PASSAGE_NAME[passage.kind]),
              state: u(`unwritten.ui.map.state.${state}`),
            })}
            aria-pressed={selected === passage.id}
            disabled={state === 'lost'}
            onMouseEnter={() => enterable && playSfx('ui.hover')}
            onClick={() => {
              playSfx('ui.tab');
              onSelect(passage.id);
            }}
            onDoubleClick={() => enterable && onEnter(passage.id)}
            data-testid={`unwritten-passage-${passage.id}`}
            data-state={state}
            data-kind={passage.kind}
          >
            <span className={styles.diamond} aria-hidden="true" />
            <Glyph glyph={PASSAGE_GLYPH[passage.kind]} size={warden ? 46 : 30} color="var(--tint)" />
            {warden ? <span className={styles.wardenName}>{u('unwritten.ui.passage.warden')}</span> : null}
          </button>
        );
      })}
    </div>
  );
});
