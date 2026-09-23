import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import type { ShardId } from '@content/balance/summon';
import type { Rarity } from '@content/champions/types';
import { createRitualScene, type RitualHandle, type RitualHooks } from './ritualScene';
import styles from './RitualLayer.module.css';

export interface RitualControl {
  /** Plays the ritual for a press; resolves when the burst has settled, or at the scene's cap. */
  reveal(rarity: Rarity, shard: ShardId): Promise<void>;
  /** The cards are put away: the gate lets its afterglow go and forms the next crystal. */
  rest(): void;
  /** Cuts a running ritual to its burst. */
  skip(): void;
  busy(): boolean;
}

export interface RitualLayerProps {
  hooks: RitualHooks;
  /** The shard whose crystal hangs in the ring. */
  shard: ShardId;
  /**
   * While a press plays out, the gate rises over the Portal's own panels (under the reveal's cards),
   * so a burst's rings, rays and pillar cross the whole screen rather than stopping at the rail.
   */
  active?: boolean;
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
export function RitualLayer({
  hooks,
  shard,
  active = false,
  particles,
  reducedMotion,
  ref,
}: RitualLayerProps) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<RitualHandle | null>(null);
  /** Resolves to the scene once it is ready, or to null if it could not be created. */
  const ready = useRef<Promise<RitualHandle | null> | null>(null);
  // The scene is built once; the latest hooks and shard are read when it needs them, so a
  // re-render never rebuilds the canvas (and never restarts the ritual).
  const hooksRef = useRef(hooks);
  const shardRef = useRef(shard);
  useEffect(() => {
    hooksRef.current = hooks;
  }, [hooks]);

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let live = true;
    ready.current = createRitualScene(node, {
      hooks: { cue: (cue, info) => hooksRef.current.cue(cue, info) },
      ...(particles !== undefined ? { particles } : {}),
      ...(reducedMotion !== undefined ? { reducedMotion } : {}),
    })
      .then((handle) => {
        if (!live) {
          handle.destroy();
          return null;
        }
        scene.current = handle;
        handle.setShard(shardRef.current);
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

  // A shard chosen before the scene is ready is hung when it is (above); after that, as chosen.
  useEffect(() => {
    shardRef.current = shard;
    scene.current?.setShard(shard);
  }, [shard]);

  useImperativeHandle(
    ref,
    () => ({
      reveal: async (rarity, pressed) => {
        const handle = scene.current ?? (await ready.current);
        await handle?.reveal(rarity, pressed);
      },
      rest: () => scene.current?.rest(),
      skip: () => scene.current?.skip(),
      busy: () => scene.current?.busy() ?? false,
    }),
    [],
  );

  return (
    <div
      ref={host}
      className={styles.layer}
      aria-hidden="true"
      data-active={active}
      data-testid="summon-ritual"
    />
  );
}
