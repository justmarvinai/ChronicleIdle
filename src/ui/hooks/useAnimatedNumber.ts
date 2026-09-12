import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@ui/hooks/reducedMotion';

/**
 * Eases a displayed number towards `target` (currency tick-up, docs/tech/UI_DESIGN.md §6).
 * Cubic ease-out over `durationMs`; returns `target` immediately under reduced motion.
 */
export function useAnimatedNumber(target: number, durationMs = 400): number {
  const animate = durationMs > 1 && !prefersReducedMotion();
  const [value, setValue] = useState(target);
  // Last value actually shown, so a retarget mid-tween starts from where the number is.
  const shown = useRef(target);
  useEffect(() => {
    if (!animate) {
      shown.current = target;
      return;
    }
    const from = shown.current;
    if (from === target) return;
    const startAt = performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const p = Math.min(1, (now - startAt) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = p >= 1 ? target : from + (target - from) * eased;
      shown.current = next;
      setValue(next);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs, animate]);
  return animate ? value : target;
}
