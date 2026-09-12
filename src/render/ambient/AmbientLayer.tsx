import { useEffect, useRef } from 'react';
import { createAmbientScene, type AmbientHandle } from './ambientScene';
import type { AMBIENT_PRESETS, GlowPoint } from './presets';
import styles from './AmbientLayer.module.css';

export interface AmbientLayerProps {
  preset: keyof typeof AMBIENT_PRESETS;
  glows?: GlowPoint[];
}

/**
 * Mounts the Pixi ambient scene behind the screen's chrome. Pauses when the tab is hidden and
 * skips entirely under reduced motion (the backdrop still shows).
 */
export function AmbientLayer({ preset, glows }: AmbientLayerProps) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<AmbientHandle | null>(null);
  // Latest glow list, read when the (async) scene finishes initialising.
  const glowsRef = useRef(glows);

  useEffect(() => {
    const node = host.current;
    if (!node || document.documentElement.dataset['reducedMotion'] === 'true') return;
    let live = true;
    void createAmbientScene(node, preset, glowsRef.current ?? []).then((h) => {
      if (!live) {
        h.destroy();
        return;
      }
      handle.current = h;
      h.setGlows(glowsRef.current ?? []);
      h.setPaused(document.hidden);
    });
    const onVisibility = (): void => handle.current?.setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', onVisibility);
      handle.current?.destroy();
      handle.current = null;
      node.replaceChildren();
    };
  }, [preset]);

  useEffect(() => {
    glowsRef.current = glows;
    if (glows) handle.current?.setGlows(glows);
  }, [glows]);

  return <div ref={host} className={styles.layer} aria-hidden="true" data-testid="ambient" />;
}
