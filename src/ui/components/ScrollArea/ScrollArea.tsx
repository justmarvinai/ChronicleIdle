import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import styles from './ScrollArea.module.css';

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Height of the viewport (virtual px or CSS value). */
  height?: number | string;
  /**
   * Fade the content out at an edge that has more past it, instead of cutting it off there — a
   * card half under the edge reads as "there is more" rather than as a layout that broke.
   */
  fade?: boolean;
}

/** How far a faded edge reaches into the viewport, in stage pixels. */
const FADE = 28;

/** Overflow below this is rounding noise, not a scrollable list. */
const MIN_OVERFLOW = 8;

/** Scroll container with a custom stone track and ember thumb (native scrollbars are hidden globally). */
export function ScrollArea({
  children,
  height = '100%',
  fade = false,
  className,
  style,
  ...rest
}: ScrollAreaProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ size: 0, offset: 0, visible: false });
  /** Whether the content runs on past the top and past the bottom — where the fades go. */
  const [more, setMore] = useState({ above: false, below: false });
  const dragging = useRef<{ startY: number; startTop: number } | null>(null);

  const measure = useCallback(() => {
    const el = viewport.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    const overflow = scrollHeight - clientHeight;
    const above = overflow > MIN_OVERFLOW && scrollTop > 1;
    const below = overflow > MIN_OVERFLOW && scrollTop < overflow - 1;
    setMore((last) => (last.above === above && last.below === below ? last : { above, below }));
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
    <div
      className={[styles.root, fade ? styles.fade : '', className ?? ''].join(' ')}
      style={{
        height,
        ...(fade
          ? ({
              '--fade-top': `${more.above ? FADE : 0}px`,
              '--fade-bottom': `${more.below ? FADE : 0}px`,
            } as CSSProperties)
          : {}),
        ...style,
      }}
      {...rest}
    >
      <div ref={viewport} className={styles.viewport} onScroll={measure}>
        <div className={styles.inner}>{children}</div>
      </div>
      {thumb.visible ? (
        <div ref={track} className={styles.track} aria-hidden="true">
          <div
            className={styles.thumb}
            style={{ height: thumb.size, transform: `translateY(${thumb.offset}px)` }}
            data-no-drag-scroll
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerUp}
          />
        </div>
      ) : null}
    </div>
  );
}
