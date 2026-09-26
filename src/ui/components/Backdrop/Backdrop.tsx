import { useEffect, useRef, useState, type ReactNode } from 'react';
import { backdrop } from '@assets/manifest';
import type { BackdropKey } from '@assets/manifest.generated';
import { useViewport } from '@ui/viewport/viewport';
import styles from './Backdrop.module.css';

export interface BackdropProps {
  asset: BackdropKey;
  /** Colour grade overlay, e.g. `rgba(40,20,80,0.35)` for a violet cast. */
  grade?: string;
  /** Parallax strength in virtual px at the screen edges (0 disables). */
  parallax?: number;
  vignette?: boolean;
  /**
   * How the painting is framed when a screen needs its subject somewhere other than the centre:
   * a CSS `background-size` and `background-position` pair (the title screen seats the Eclipse gate
   * between its two columns this way). Absent, the painting covers the stage, centred.
   */
  framing?: { size: string; position: string };
  children?: ReactNode;
}

/**
 * Full-bleed illustrated backdrop with blurred placeholder, pointer parallax, colour grade and
 * vignette. Also paints the viewport letterbox with the same image (docs/tech/UI_DESIGN.md §2).
 */
export function Backdrop({ asset, grade, parallax = 12, vignette = true, framing, children }: BackdropProps) {
  const { setBackdrop } = useViewport();
  const info = backdrop(asset);
  const [loaded, setLoaded] = useState(false);
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBackdrop(info.url);
    return () => setBackdrop(null);
  }, [info.url, setBackdrop]);

  useEffect(() => {
    let live = true;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => live && setLoaded(true);
    image.src = info.url;
    return () => {
      live = false;
    };
  }, [info.url]);

  useEffect(() => {
    if (!parallax || document.documentElement.dataset['reducedMotion'] === 'true') return;
    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent): void => {
      targetX = ((e.clientX / window.innerWidth) * 2 - 1) * -parallax;
      targetY = ((e.clientY / window.innerHeight) * 2 - 1) * -parallax;
    };
    const tick = (): void => {
      x += (targetX - x) * 0.06;
      y += (targetY - y) * 0.06;
      if (layer.current)
        layer.current.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(1.03)`;
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    frame = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [parallax]);

  return (
    <div className={styles.root} data-testid="backdrop">
      {info.placeholder ? (
        <div
          className={styles.placeholder}
          style={{
            backgroundImage: `url("${info.placeholder}")`,
            ...(framing ? { backgroundSize: framing.size, backgroundPosition: framing.position } : {}),
          }}
          aria-hidden="true"
        />
      ) : null}
      <div
        ref={layer}
        className={[styles.image, loaded ? styles.loaded : ''].join(' ')}
        style={{
          backgroundImage: `url("${info.url}")`,
          ...(framing ? { backgroundSize: framing.size, backgroundPosition: framing.position } : {}),
        }}
        aria-hidden="true"
      />
      {grade ? <div className={styles.grade} style={{ background: grade }} aria-hidden="true" /> : null}
      {vignette ? <div className={styles.vignette} aria-hidden="true" /> : null}
      {children}
    </div>
  );
}
