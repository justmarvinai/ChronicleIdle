import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { atlas } from '@assets/manifest';
import type { ModelKey } from '@assets/manifest.generated';
import styles from './SpriteView.module.css';

export interface SpriteViewProps {
  model: ModelKey;
  animation?: string;
  /** On-screen scale of the source pixels (2 = each texel is 2 virtual px). */
  scale?: number;
  /** Which way the sprite should face on screen. */
  facing?: 'left' | 'right';
  /** CSS colour multiplied onto the sprite (placeholder tinting, docs/tech/ASSETS.md §3). */
  tint?: string | null;
  playing?: boolean;
  className?: string;
}

/**
 * DOM sprite from a model atlas for menus (idle loops in every champion slot). Frames advance in
 * a rAF loop that mutates the style directly, so React never re-renders per frame.
 */
export function SpriteView({
  model,
  animation = 'idle',
  scale = 2,
  facing = 'right',
  tint = null,
  playing = true,
  className,
}: SpriteViewProps) {
  const entry = atlas(model);
  const anim = entry.animations[animation] ?? entry.animations['idle'];
  const frames = useMemo(
    () =>
      anim
        ? anim.frames.map((f) => entry.frames[f]).filter((f): f is NonNullable<typeof f> => !!f)
        : [entry.frames['still']].filter((f): f is NonNullable<typeof f> => !!f),
    [anim, entry],
  );
  const first = frames[0];
  const el = useRef<HTMLDivElement>(null);
  const flip = facing !== entry.facing;

  useEffect(() => {
    const node = el.current;
    if (!node || !anim || frames.length <= 1 || !playing) return;
    if (document.documentElement.dataset['reducedMotion'] === 'true') return;
    let index = 0;
    let last = performance.now();
    let raf = 0;
    const step = 1000 / anim.fps;
    const tick = (now: number): void => {
      if (now - last >= step) {
        last = now;
        index = (index + 1) % frames.length;
        const f = frames[index];
        if (f) {
          node.style.backgroundPosition = `${-f.x * scale}px ${-f.y * scale}px`;
          node.style.width = `${f.w * scale}px`;
          node.style.height = `${f.h * scale}px`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim, frames, scale, playing]);

  if (!first) return null;
  const style: CSSProperties = {
    width: first.w * scale,
    height: first.h * scale,
    backgroundImage: `url("${entry.url}")`,
    backgroundPosition: `${-first.x * scale}px ${-first.y * scale}px`,
    backgroundSize: `${entry.w * scale}px ${entry.h * scale}px`,
    transform: flip ? 'scaleX(-1)' : undefined,
  };
  const tintStyle: CSSProperties | undefined = tint
    ? {
        backgroundColor: tint,
        WebkitMaskImage: `url("${entry.url}")`,
        maskImage: `url("${entry.url}")`,
        WebkitMaskPosition: style.backgroundPosition,
        maskPosition: style.backgroundPosition,
        WebkitMaskSize: style.backgroundSize,
        maskSize: style.backgroundSize,
      }
    : undefined;
  return (
    <div
      ref={el}
      className={[styles.sprite, 'pixel', className ?? ''].join(' ')}
      style={style}
      data-testid="sprite"
    >
      {tintStyle ? <div className={styles.tint} style={tintStyle} aria-hidden="true" /> : null}
    </div>
  );
}
