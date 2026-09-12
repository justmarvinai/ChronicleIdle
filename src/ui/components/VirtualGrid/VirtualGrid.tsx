import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './VirtualGrid.module.css';

export interface VirtualGridProps<T> {
  items: readonly T[];
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

/**
 * Windowed grid for long rosters (docs/tech/UI_DESIGN.md §5.3): only the rows near the viewport
 * exist in the DOM, the rest is a spacer, so 200+ cards scroll at 60 fps. The scrollbar is the
 * same stone track and ember thumb as `ScrollArea`.
 */
export function VirtualGrid<T>({
  items,
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
  // Only the first visible row is React state: a scroll re-renders the cards solely when the row
  // window moves, and the thumb is positioned straight on the DOM node on every scroll event.
  const [topRow, setTopRow] = useState(0);
  const [thumbVisible, setThumbVisible] = useState(false);
  const thumbSize = useRef(0);
  const dragging = useRef<{ startY: number; startTop: number } | null>(null);

  const rowHeight = cellHeight + gap;
  const rows = Math.ceil(items.length / columns);
  const contentHeight = Math.max(0, rows * rowHeight - gap);
  const firstRow = Math.max(0, topRow - overscan);
  const lastRow = Math.min(rows - 1, topRow + Math.ceil(height / rowHeight) + overscan);

  const measure = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    setTopRow(Math.floor(el.scrollTop / rowHeight));
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
  }, [measure, items.length, height, thumbVisible]);

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

  const visible: ReactNode[] = [];
  if (rows > 0) {
    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = 0; col < columns; col++) {
        const index = row * columns + col;
        const item = items[index];
        if (item === undefined) break;
        visible.push(
          <div
            key={keyOf(item)}
            className={styles.cell}
            style={{
              transform: `translate(${col * (cellWidth + gap)}px, ${row * rowHeight}px)`,
              width: cellWidth,
              height: cellHeight,
            }}
          >
            {renderItem(item, index)}
          </div>,
        );
      }
    }
  }

  return (
    <div className={[styles.root, className ?? ''].join(' ')} style={{ height }}>
      <div ref={viewport} className={styles.viewport} onScroll={measure} data-testid="virtual-grid">
        <div
          className={styles.spacer}
          style={{ height: contentHeight, width: columns * (cellWidth + gap) - gap }}
        >
          {visible}
        </div>
        {items.length === 0 && emptyLabel ? <div className={styles.empty}>{emptyLabel}</div> : null}
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
