import {
  cloneElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, toStageCoords, useViewport } from '@ui/viewport/viewport';
import { kitBorder } from '@ui/styles/kit';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  content: ReactNode;
  /** The trigger element; receives aria-describedby while the tooltip is open. */
  children: ReactElement<{ 'aria-describedby'?: string | undefined }>;
  delayMs?: number;
  maxWidth?: number;
}

/** Hover/focus tooltip rendered into the stage's tooltip layer so it scales with the game. */
export function Tooltip({ content, children, delayMs = 200, maxWidth = 360 }: TooltipProps) {
  const id = useId();
  const viewport = useViewport();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLDivElement>(null);
  /** Where the pointer last was, so the box can be placed again once it has a size. */
  const pointer = useRef({ x: 0, y: 0 });

  const move = useCallback(
    (clientX: number, clientY: number) => {
      pointer.current = { x: clientX, y: clientY };
      const stage = toStageCoords(viewport, clientX, clientY);
      const w = box.current?.offsetWidth ?? maxWidth;
      const h = box.current?.offsetHeight ?? 80;
      let x = stage.x + 18;
      let y = stage.y + 22;
      if (x + w > VIRTUAL_WIDTH - 16) x = stage.x - w - 18;
      if (y + h > VIRTUAL_HEIGHT - 16) y = stage.y - h - 12;
      setPos({ x: Math.max(8, x), y: Math.max(8, y) });
    },
    [viewport, maxWidth],
  );

  const show = (clientX: number, clientY: number): void => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      move(clientX, clientY);
      setOpen(true);
    }, delayMs);
  };
  const hide = (): void => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  };
  /*
   * The first placement guesses the box's size, because the box does not exist until it opens;
   * a tall one near the foot of the stage — a gear piece's full sheet, an ability's rules — then
   * ran off the bottom. Once it is in the layer it is measured and placed again, before paint.
   */
  useLayoutEffect(() => {
    if (open) move(pointer.current.x, pointer.current.y);
  }, [open, move]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const layer = typeof document !== 'undefined' ? document.getElementById('tooltip-layer') : null;
  const trigger = cloneElement(children, { 'aria-describedby': open ? id : undefined });

  return (
    <>
      <span
        className={styles.trigger}
        onPointerEnter={(e) => show(e.clientX, e.clientY)}
        onPointerMove={(e) => open && move(e.clientX, e.clientY)}
        onPointerLeave={hide}
        onFocus={(e) => {
          const r = (e.target as HTMLElement).getBoundingClientRect();
          show(r.left + r.width / 2, r.bottom);
        }}
        onBlur={hide}
      >
        {trigger}
      </span>
      {open && layer
        ? createPortal(
            <div
              ref={box}
              id={id}
              role="tooltip"
              className={styles.tooltip}
              style={{ left: pos.x, top: pos.y, maxWidth, ...kitBorder('ui.dark_ember.frame_sm_thin', 0.35) }}
            >
              <div
                className={styles.fill}
                style={kitBorder('ui.dark_ember.bg_tile_sm', 0.5)}
                aria-hidden="true"
              />
              <div className={styles.content}>{content}</div>
            </div>,
            layer,
          )
        : null}
    </>
  );
}
