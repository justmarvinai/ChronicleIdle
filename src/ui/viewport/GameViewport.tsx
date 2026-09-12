/**
 * Fixed 1920×1080 virtual canvas scaled uniformly into the window (docs/tech/UI_DESIGN.md §2).
 * The letterbox is painted with the current screen's backdrop so no black bars ever show.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH, ViewportContext, type ViewportContextValue } from './viewport';
import styles from './GameViewport.module.css';

function measure(): { windowWidth: number; windowHeight: number } {
  return { windowWidth: window.innerWidth, windowHeight: window.innerHeight };
}

export function GameViewport({ children }: { children: ReactNode }) {
  const [size, setSize] = useState(measure);
  const [backdrop, setBackdrop] = useState<string | null>(null);

  useEffect(() => {
    let frame = 0;
    const onResize = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setSize(measure()));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const scale = Math.min(size.windowWidth / VIRTUAL_WIDTH, size.windowHeight / VIRTUAL_HEIGHT);
    document.documentElement.style.setProperty('--vp-scale', String(scale));
  }, [size]);

  const value = useMemo<ViewportContextValue>(() => {
    const scale = Math.min(size.windowWidth / VIRTUAL_WIDTH, size.windowHeight / VIRTUAL_HEIGHT);
    return {
      scale,
      windowWidth: size.windowWidth,
      windowHeight: size.windowHeight,
      offsetX: (size.windowWidth - VIRTUAL_WIDTH * scale) / 2,
      offsetY: (size.windowHeight - VIRTUAL_HEIGHT * scale) / 2,
      backdrop,
      setBackdrop,
    };
  }, [size, backdrop]);

  return (
    <ViewportContext.Provider value={value}>
      <div className={styles.window} data-testid="game-window">
        <div
          className={styles.letterbox}
          style={backdrop ? { backgroundImage: `url("${backdrop}")` } : undefined}
          aria-hidden="true"
        />
        <div
          className={styles.stage}
          data-testid="game-stage"
          style={{
            width: VIRTUAL_WIDTH,
            height: VIRTUAL_HEIGHT,
            transform: `translate(-50%, -50%) scale(${value.scale})`,
          }}
        >
          {children}
        </div>
      </div>
    </ViewportContext.Provider>
  );
}
