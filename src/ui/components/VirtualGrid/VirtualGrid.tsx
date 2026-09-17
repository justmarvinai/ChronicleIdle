import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import styles from './VirtualGrid.module.css';

/** A run of items under one heading row. */
export interface GridSection<T> {
  /** Stable key, and the handle `renderHeader` draws from. */
  id: string;
  items: readonly T[];
}

interface VirtualGridCommon<T> {
  columns: number;
  cellWidth: number;
  cellHeight: number;
  gap?: number;
  /** Viewport height in virtual px. */
  height: number;
  /** Rows rendered above and below the viewport. */
  overscan?: number;
  keyOf: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  emptyLabel?: string;
  className?: string;
}

/** One flat list, or sections that each open with a heading row — never both. */
export type VirtualGridProps<T> = VirtualGridCommon<T> &
  (
    | {
        items: readonly T[];
        sections?: undefined;
        renderHeader?: undefined;
        headerHeight?: undefined;
      }
    | {
        items?: undefined;
        sections: readonly GridSection<T>[];
        renderHeader: (section: GridSection<T>) => ReactNode;
        /** Heading row height in virtual px; the window is measured in pixels, so it may differ. */
        headerHeight: number;
      }
  );

/** A laid-out row: one heading, or the cells of one line of the grid. */
type GridRow<T> =
  | { kind: 'head'; key: string; top: number; height: number; section: GridSection<T> }
  | { kind: 'cells'; key: string; top: number; height: number; cells: readonly T[]; from: number };

/**
 * Windowed grid for long rosters (docs/tech/UI_DESIGN.md §5.3): only the rows near the viewport
 * exist in the DOM, the rest is a spacer, so 200+ cards scroll at 60 fps. The scrollbar is the
 * same stone track and ember thumb as `ScrollArea`.
 *
 * Rows are placed at measured offsets rather than counted off a fixed row height, which is what
 * lets a grid carry heading rows (the Armoury's sets) without giving up the window.
 */
export function VirtualGrid<T>({
  items,
  sections,
  renderHeader,
  headerHeight,
  columns,
  cellWidth,
  cellHeight,
  gap = 12,
  height,
  overscan = 2,
  keyOf,
  renderItem,
  emptyLabel,
  className,
}: VirtualGridProps<T>) {
  const viewport = useRef<HTMLDivElement>(null);
  const thumbEl = useRef<HTMLDivElement>(null);
  // Only the scroll band is React state: a scroll re-renders the cards solely when the window
  // moves a row's worth, and the thumb is positioned straight on the DOM node on every scroll event.
  const [band, setBand] = useState(0);
  const [thumbVisible, setThumbVisible] = useState(false);
  const thumbSize = useRef(0);
  const dragging = useRef<{ startY: number; startTop: number } | null>(null);

  const rowHeight = cellHeight + gap;
  const { rows, contentHeight, count } = useMemo(
    () =>
      layOut(
        sections ?? [{ id: '', items: items ?? [] }],
        columns,
        cellHeight,
        gap,
        sections ? headerHeight : 0,
      ),
    [sections, items, columns, cellHeight, gap, headerHeight],
  );

  const measure = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    setBand(Math.floor(el.scrollTop / rowHeight));
    const { scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight > clientHeight + 1;
    setThumbVisible(scrollable);
    if (!scrollable) return;
    const size = Math.max(32, (clientHeight / scrollHeight) * clientHeight);
    const offset = (el.scrollTop / (scrollHeight - clientHeight)) * (clientHeight - size);
    thumbSize.current = size;
    const thumb = thumbEl.current;
    if (thumb) {
      thumb.style.height = `${size}px`;
      thumb.style.transform = `translateY(${offset}px)`;
    }
  }, [rowHeight]);

  useEffect(() => {
    measure();
  }, [measure, count, height, thumbVisible]);

  // Keep the scroll position valid when the list shrinks (filters).
  useEffect(() => {
    const el = viewport.current;
    if (el && el.scrollTop > Math.max(0, contentHeight - height)) {
      el.scrollTop = Math.max(0, contentHeight - height);
      measure();
    }
  }, [contentHeight, height, measure]);

  const onThumbPointerDown = (e: React.PointerEvent): void => {
    const el = viewport.current;
    if (!el) return;
    dragging.current = { startY: e.clientY, startTop: el.scrollTop };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onThumbPointerMove = (e: React.PointerEvent): void => {
    const el = viewport.current;
    if (!el || !dragging.current) return;
    const scale = Number(getComputedStyle(document.documentElement).getPropertyValue('--vp-scale')) || 1;
    const ratio = (el.scrollHeight - el.clientHeight) / (el.clientHeight - thumbSize.current);
    el.scrollTop = dragging.current.startTop + ((e.clientY - dragging.current.startY) / scale) * ratio;
  };
  const onThumbPointerUp = (): void => {
    dragging.current = null;
  };

  const width = columns * (cellWidth + gap) - gap;
  const windowTop = Math.max(0, band - overscan) * rowHeight;
  const windowBottom = (band + Math.ceil(height / rowHeight) + overscan) * rowHeight;

  const visible: ReactNode[] = [];
  for (const row of rows) {
    if (row.top > windowBottom || row.top + row.height < windowTop) continue;
    if (row.kind === 'head') {
      visible.push(
        <div
          key={row.key}
          className={styles.header}
          style={{ transform: `translateY(${row.top}px)`, width, height: row.height }}
        >
          {renderHeader?.(row.section)}
        </div>,
      );
      continue;
    }
    row.cells.forEach((item, col) => {
      visible.push(
        <div
          key={keyOf(item)}
          className={styles.cell}
          style={{
            transform: `translate(${col * (cellWidth + gap)}px, ${row.top}px)`,
            width: cellWidth,
            height: cellHeight,
          }}
        >
          {renderItem(item, row.from + col)}
        </div>,
      );
    });
  }

  return (
    <div className={[styles.root, className ?? ''].join(' ')} style={{ height }}>
      <div ref={viewport} className={styles.viewport} onScroll={measure} data-testid="virtual-grid">
        <div className={styles.spacer} style={{ height: contentHeight, width }}>
          {visible}
        </div>
        {count === 0 && emptyLabel ? <div className={styles.empty}>{emptyLabel}</div> : null}
      </div>
      {thumbVisible ? (
        <div className={styles.track} aria-hidden="true">
          <div
            ref={thumbEl}
            className={styles.thumb}
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerUp}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Stacks the sections into rows and records where each one sits, so the window is a pixel range
 * rather than a row count. A headless single section lays out exactly like a flat grid: heading
 * rows are the only thing that can shift a line off the `cellHeight + gap` lattice.
 */
function layOut<T>(
  sections: readonly GridSection<T>[],
  columns: number,
  cellHeight: number,
  gap: number,
  headerHeight: number,
): { rows: GridRow<T>[]; contentHeight: number; count: number } {
  const rows: GridRow<T>[] = [];
  let top = 0;
  let count = 0;
  for (const section of sections) {
    if (headerHeight > 0) {
      rows.push({ kind: 'head', key: `head:${section.id}`, top, height: headerHeight, section });
      top += headerHeight + gap;
    }
    for (let i = 0; i < section.items.length; i += columns) {
      rows.push({
        kind: 'cells',
        key: `row:${section.id}:${i}`,
        top,
        height: cellHeight,
        cells: section.items.slice(i, i + columns),
        from: count + i,
      });
      top += cellHeight + gap;
    }
    count += section.items.length;
  }
  return { rows, contentHeight: Math.max(0, top - gap), count };
}
