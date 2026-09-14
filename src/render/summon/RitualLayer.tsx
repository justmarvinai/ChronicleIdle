import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { Rarity } from '@content/champions/types';
import { createRitualScene, type RitualHandle, type RitualHooks } from './ritualScene';
import styles from './RitualLayer.module.css';

export interface RitualControl {
  /** Plays the ritual for a press; resolves when the burst has finished. */
  reveal(rarity: Rarity, shardUrl: string): Promise<void>;
  /** Hangs a shard in the ring while the gate waits. */
  hover(shardUrl: string): void;
  /** Cuts a running ritual to its end. */
  skip(): void;
  busy(): boolean;
}

export interface RitualLayerProps {
  hooks: RitualHooks;
  /** Ember/mote count; the Portal passes 0 under reduced motion. */
  particles?: number;
  reducedMotion?: boolean;
  ref?: Ref<RitualControl>;
}

/**
 * Mounts the Pixi ritual scene behind the Portal's chrome. The scene is created once per mount and
 * the screen drives it through the imperative handle. A press that lands before the (async) scene
 * has finished initialising waits for it rather than skipping the ritual — on a slow machine that
 * is the difference between a ceremony and a card appearing out of nowhere.
 */
export function RitualLayer({ hooks, particles, reducedMotion, ref }: RitualLayerProps) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<RitualHandle | null>(null);
  /** Resolves to the scene once it is ready, or to null if it could not be created. */
  const ready = useRef<Promise<RitualHandle | null> | null>(null);
  // The scene is built once; the latest hooks are read at cue time, so a re-render never
  // rebuilds the canvas (and never restarts the ritual).
  const hooksRef = useRef(hooks);
  useEffect(() => {
    hooksRef.current = hooks;
  }, [hooks]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let live = true;
    ready.current = createRitualScene(node, {
      hooks: { cue: (cue, rarity) => hooksRef.current.cue(cue, rarity) },
      ...(particles !== undefined ? { particles } : {}),
      ...(reducedMotion !== undefined ? { reducedMotion } : {}),
    })
      .then((handle) => {
        if (!live) {
          handle.destroy();
          return null;
        }
        scene.current = handle;
        handle.setPaused(document.hidden);
        return handle;
      })
      .catch(() => null);
    const onVisibility = (): void => scene.current?.setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      live = false;
      document.removeEventListener('visibilitychange', onVisibility);
      scene.current?.destroy();
      scene.current = null;
      ready.current = null;
      node.replaceChildren();
    };
  }, [particles, reducedMotion]);

  useImperativeHandle(
    ref,
    () => ({
      reveal: async (rarity, shardUrl) => {
        const handle = scene.current ?? (await ready.current);
        await handle?.reveal(rarity, shardUrl);
      },
      hover: (shardUrl) => {
        void (scene.current
          ? scene.current.hover(shardUrl)
          : ready.current?.then((handle) => handle?.hover(shardUrl)));
      },
      skip: () => scene.current?.skip(),
      busy: () => scene.current?.busy() ?? false,
    }),
    [],
  );

  return <div ref={host} className={styles.layer} aria-hidden="true" data-testid="summon-ritual" />;
}
