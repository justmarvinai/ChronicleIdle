import { useEffect, useRef, type CSSProperties } from 'react';
import { fx } from '@assets/manifest';
import type { FxKey } from '@assets/manifest.generated';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';
import styles from './FxSprite.module.css';

export interface FxSpriteProps {
  /** A flipbook from the fx packs (`docs/tech/ASSETS.md`): a strip or a grid of square frames. */
  effect: FxKey;
  /** The side of one drawn frame, in stage pixels. */
  size: number;
  /** Loop for as long as it is mounted; otherwise play once and hold nothing. */
  loop?: boolean;
  /** A one-shot plays again whenever this changes (a strike count, say). */
  playKey?: number;
  /** Playback speed against the sheet's own frame rate. */
  speed?: number;
  /** How the frame lies on what is behind it: `screen` for fire and light over dark art. */
  blend?: 'normal' | 'screen' | 'lighten';
  className?: string | undefined;
}

/**
 * A flipbook from the fx sheets outside the battle stage (docs/tech/UI_DESIGN.md §4): the Forge's
 * hearth, a strike's burst. The frame is moved on the element's own style from an animation frame
 * loop, so a playing flipbook never re-renders React; reduced motion shows one still frame of a
 * loop and skips a one-shot entirely.
 */
export function FxSprite({
  effect,
  size,
  loop = false,
  playKey = 0,
  speed = 1,
  blend = 'screen',
  className,
}: FxSpriteProps) {
  const node = useRef<HTMLSpanElement>(null);
  const sheet = fx(effect);
  const scale = size / sheet.frameW;
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const el = node.current;
    if (!el) return;
    const place = (frame: number): void => {
      const col = frame % sheet.cols;
      const row = Math.floor(frame / sheet.cols);
      el.style.backgroundPosition = `${-col * sheet.frameW * scale}px ${-row * sheet.frameH * scale}px`;
    };
    if (reduced || typeof requestAnimationFrame !== 'function') {
      place(Math.floor(sheet.frames / 2));
      el.style.opacity = loop ? '1' : '0';
      return;
    }
    el.style.opacity = '1';
    const start = performance.now();
    const fps = sheet.fps * speed;
    let handle = 0;
    const tick = (now: number): void => {
      const frame = Math.floor(((now - start) / 1000) * fps);
      if (!loop && frame >= sheet.frames) {
        el.style.opacity = '0';
        return;
      }
      place(frame % sheet.frames);
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [sheet, scale, loop, playKey, speed, reduced]);

  const style: CSSProperties = {
    width: sheet.frameW * scale,
    height: sheet.frameH * scale,
    backgroundImage: `url("${sheet.url}")`,
    backgroundSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
    mixBlendMode: blend,
  };
  return (
    <span
      ref={node}
      className={[styles.fx, 'pixel', className ?? ''].join(' ')}
      style={style}
      aria-hidden="true"
    />
  );
}
