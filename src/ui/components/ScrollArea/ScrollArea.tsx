import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import styles from './ScrollArea.module.css';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Height of the viewport (virtual px or CSS value). */
  height?: number | string;
}

/** Overflow below this is rounding noise, not a scrollable list. */
const MIN_OVERFLOW = 8;

/** Scroll container with a custom stone track and ember thumb (native scrollbars are hidden globally). */
export function ScrollArea({ children, height = '100%', className, style, ...rest }: ScrollAreaProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ size: 0, offset: 0, visible: false });
  const dragging = useRef<{ startY: number; startTop: number } | null>(null);

  const measure = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const overflow = scrollHeight - clientHeight;
    // A few pixels of overflow are rounding, not a scrollable list: a thumb the height of the
    // track reads as a bare line rather than a scrollbar.
    if (overflow <= MIN_OVERFLOW) {
      setThumb({ size: 0, offset: 0, visible: false });
      return;
    }
    const trackHeight = track.current?.clientHeight ?? clientHeight;
    const size = Math.max(40, Math.min(trackHeight - 24, (clientHeight / scrollHeight) * trackHeight));
    const offset = (scrollTop / overflow) * (trackHeight - size);
    setThumb({ size, offset, visible: true });
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [measure, children]);

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
    const trackHeight = track.current?.clientHeight ?? el.clientHeight;
    const ratio = (el.scrollHeight - el.clientHeight) / Math.max(1, trackHeight - thumb.size);
    el.scrollTop = dragging.current.startTop + ((e.clientY - dragging.current.startY) / scale) * ratio;
  };
  const onThumbPointerUp = (): void => {
    dragging.current = null;
  };

  return (
    <div className={[styles.root, className ?? ''].join(' ')} style={{ height, ...style }} {...rest}>
      <div ref={viewport} className={styles.viewport} onScroll={measure}>
        <div className={styles.inner}>{children}</div>
      </div>
      {thumb.visible ? (
        <div ref={track} className={styles.track} aria-hidden="true">
          <div
            className={styles.thumb}
            style={{ height: thumb.size, transform: `translateY(${thumb.offset}px)` }}
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerUp}
          />
        </div>
      ) : null}
    </div>
  );
}
