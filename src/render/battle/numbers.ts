/**
 * Floating combat numbers (docs/tech/UI_DESIGN.md §6): Rajdhani, crit = gold and larger, heal =
 * green, shield = azure. Text objects are pooled so ×4 battles never allocate per hit.
 */
import { Container, Text, TextStyle } from 'pixi.js';
import { gsap } from 'gsap';
import { createRng } from '@engine/rng/rng';

/** Presentation-only jitter so stacked numbers do not overlap; seeded to keep runs reproducible. */
const jitter = createRng('battle:numbers');

export type NumberKind = 'damage' | 'crit' | 'heal' | 'shield' | 'dot' | 'miss' | 'status';

const STYLE: Record<NumberKind, { fill: number; size: number; stroke: number }> = {
  damage: { fill: 0xffffff, size: 44, stroke: 0x1a0d0d },
  crit: { fill: 0xffd766, size: 62, stroke: 0x3a1c00 },
  heal: { fill: 0x7dff9a, size: 44, stroke: 0x0c2a12 },
  shield: { fill: 0x8fd0ff, size: 40, stroke: 0x0b1f33 },
  dot: { fill: 0xff8a8a, size: 34, stroke: 0x2a0b0b },
  miss: { fill: 0xd8d2c4, size: 34, stroke: 0x1a1a1a },
  status: { fill: 0xf0d57a, size: 30, stroke: 0x2a1c00 },
};

export class NumberLayer {
  readonly container = new Container();
  private pool: Text[] = [];
  /**
   * Every timeline still in the air. A number lives for about a second after the hit that made it,
   * which is longer than a battle screen sometimes does: retreat during a fight and the stage is
   * torn down under it. GSAP does not know that, and a tween that keeps writing `y` into a
   * destroyed `Text` throws on every frame it has left.
   */
  private live = new Set<gsap.core.Timeline>();

  private acquire(kind: NumberKind): Text {
    const text = this.pool.pop() ?? new Text({ text: '' });
    const style = STYLE[kind];
    text.style = new TextStyle({
      fontFamily: 'Rajdhani, "Nunito Sans", sans-serif',
      fontWeight: '700',
      fontSize: style.size,
      fill: style.fill,
      stroke: { color: style.stroke, width: 6, join: 'round' },
      letterSpacing: 1,
    });
    text.anchor.set(0.5, 1);
    text.alpha = 1;
    text.scale.set(1);
    text.visible = true;
    this.container.addChild(text);
    return text;
  }

  private release(text: Text): void {
    text.visible = false;
    this.container.removeChild(text);
    this.pool.push(text);
  }

  /** Spawns a number that pops, rises and fades; `speed` compresses the timeline. */
  show(kind: NumberKind, value: string, x: number, y: number, speed = 1): void {
    const text = this.acquire(kind);
    text.text = value;
    text.position.set(x + (jitter.next() - 0.5) * 40, y);
    const hold = kind === 'crit' ? 0.9 : 0.7;
    const tl = gsap.timeline({
      onComplete: () => {
        this.live.delete(tl);
        this.release(text);
      },
    });
    this.live.add(tl);
    tl.fromTo(
      text.scale,
      { x: 0.4, y: 0.4 },
      { x: kind === 'crit' ? 1.4 : 1, y: kind === 'crit' ? 1.4 : 1, duration: 0.16, ease: 'back.out(2.5)' },
    )
      .to(text, { y: y - 90, duration: hold + 0.4, ease: 'power1.out' }, 0)
      .to(text, { alpha: 0, duration: 0.35, ease: 'power1.in' }, hold);
    // Numbers stay readable at ×4: they compress only to ~0.6 s (UI_DESIGN §6.8).
    tl.timeScale(Math.min(speed, 1.8));
  }

  destroy(): void {
    // Kill what is still rising before the text under it goes away.
    for (const tl of this.live) tl.kill();
    this.live.clear();
    this.container.destroy({ children: true });
    this.pool = [];
  }
}
