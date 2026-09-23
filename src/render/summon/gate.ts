/**
 * The gate's furniture (docs/design/SUMMONING.md §5): the vortex that turns behind the shard, the
 * rays that stand up at the burst, the beam of a pillar, and the ring of runes that lights as the
 * gate charges. Textures are painted once on a canvas and tinted in Pixi, so one white swirl is the
 * Faded Shard's green and a Legendary's gold alike.
 */
import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Rng } from '@engine/rng/rng';

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  const context = element.getContext('2d');
  if (!context) throw new Error('2d canvas unavailable');
  return [element, context];
}

/**
 * A white spiral of `arms` arms, brightest at its eye, soft everywhere: drawn as overlapping discs
 * along each arm with additive compositing, so the arms glow where they cross.
 */
export function makeSwirlTexture(size: number, arms: number, twist: number): Texture {
  const [element, context] = canvas(size, size);
  const half = size / 2;
  context.translate(half, half);
  context.globalCompositeOperation = 'lighter';
  const steps = 90;
  for (let arm = 0; arm < arms; arm += 1) {
    const offset = (arm / arms) * Math.PI * 2;
    for (let i = 0; i < steps; i += 1) {
      const t = i / steps;
      const radius = half * (0.08 + t * 0.9);
      const angle = offset + t * twist;
      const width = half * (0.2 - t * 0.14);
      const alpha = Math.sin(t * Math.PI) * 0.09;
      const gradient = context.createRadialGradient(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        width,
      );
      gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, width, 0, Math.PI * 2);
      context.fill();
    }
  }
  const eye = context.createRadialGradient(0, 0, 0, 0, 0, half * 0.45);
  eye.addColorStop(0, 'rgba(255,255,255,0.55)');
  eye.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = eye;
  context.beginPath();
  context.arc(0, 0, half * 0.45, 0, Math.PI * 2);
  context.fill();
  return Texture.from(element);
}

/** Rays standing out of a point: thin wedges of uneven length, fading along their length. */
export function makeRaysTexture(size: number, rays: number, rng: Rng): Texture {
  const [element, context] = canvas(size, size);
  const half = size / 2;
  context.translate(half, half);
  context.globalCompositeOperation = 'lighter';
  for (let i = 0; i < rays; i += 1) {
    const angle = (i / rays) * Math.PI * 2 + rng.next() * 0.2;
    const spread = 0.02 + rng.next() * 0.05;
    const length = half * (0.6 + rng.next() * 0.4);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, length);
    gradient.addColorStop(0, 'rgba(255,255,255,0.75)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, length, angle - spread, angle + spread);
    context.closePath();
    context.fill();
  }
  return Texture.from(element);
}

/**
 * A beam: bright down its middle and soft to nothing at its edges, fading out at its top and, more
 * quickly, at its foot — light falling on the gate, not a slab stood on it.
 */
export function makeBeamTexture(width: number, height: number): Texture {
  const [element, context] = canvas(width, height);
  const across = context.createLinearGradient(0, 0, width, 0);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.2, 'rgba(255,255,255,0.12)');
  across.addColorStop(0.38, 'rgba(255,255,255,0.55)');
  across.addColorStop(0.5, 'rgba(255,255,255,1)');
  across.addColorStop(0.62, 'rgba(255,255,255,0.55)');
  across.addColorStop(0.8, 'rgba(255,255,255,0.12)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = across;
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = 'destination-in';
  const down = context.createLinearGradient(0, 0, 0, height);
  down.addColorStop(0, 'rgba(255,255,255,0)');
  down.addColorStop(0.3, 'rgba(255,255,255,0.7)');
  down.addColorStop(0.78, 'rgba(255,255,255,1)');
  down.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = down;
  context.fillRect(0, 0, width, height);
  return Texture.from(element);
}

/**
 * A streak of light, its head brightest: a mote or a spark drawn out along its flight. The head is
 * at the right, so a sprite turned to its velocity leads with it.
 */
export function makeStreakTexture(length: number, thickness: number): Texture {
  const [element, context] = canvas(length, thickness);
  const along = context.createLinearGradient(0, 0, length, 0);
  along.addColorStop(0, 'rgba(255,255,255,0)');
  along.addColorStop(0.72, 'rgba(255,255,255,0.9)');
  along.addColorStop(0.86, 'rgba(255,255,255,1)');
  along.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = along;
  context.fillRect(0, 0, length, thickness);
  context.globalCompositeOperation = 'destination-in';
  const across = context.createLinearGradient(0, 0, 0, thickness);
  across.addColorStop(0, 'rgba(255,255,255,0)');
  across.addColorStop(0.5, 'rgba(255,255,255,1)');
  across.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = across;
  context.fillRect(0, 0, length, thickness);
  return Texture.from(element);
}

/** A ring of light, soft either side of its line and faintly lit inside: a shockwave, scaled out. */
export function makeWaveTexture(size: number): Texture {
  const [element, context] = canvas(size, size);
  const half = size / 2;
  const ring = context.createRadialGradient(half, half, 0, half, half, half);
  ring.addColorStop(0, 'rgba(255,255,255,0)');
  ring.addColorStop(0.62, 'rgba(255,255,255,0.04)');
  ring.addColorStop(0.84, 'rgba(255,255,255,0.55)');
  ring.addColorStop(0.9, 'rgba(255,255,255,1)');
  ring.addColorStop(0.95, 'rgba(255,255,255,0.35)');
  ring.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = ring;
  context.fillRect(0, 0, size, size);
  return Texture.from(element);
}

/** Runes cut round the ring; each has a light that the charge kindles in turn. */
const RUNES = 24;

/**
 * The ring the shard hangs in: two stone circles with a gold hairline between, twenty-four runes cut
 * into it, and a light behind every rune. It turns slowly, and faster as the gate charges.
 */
export class RuneRing {
  readonly container = new Container();
  readonly lights: Sprite[] = [];
  private readonly stone = new Graphics();
  private readonly marks = new Graphics();
  private readonly lightLayer = new Container();

  constructor(
    readonly radius: number,
    glowTexture: Texture,
  ) {
    this.stone
      .circle(0, 0, radius + 10)
      .stroke({ color: 0x1a1420, width: 26, alpha: 0.72 })
      .circle(0, 0, radius + 22)
      .stroke({ color: 0xc9a24a, width: 2, alpha: 0.55 })
      .circle(0, 0, radius - 2)
      .stroke({ color: 0xc9a24a, width: 1.5, alpha: 0.4 })
      .circle(0, 0, radius - 30)
      .stroke({ color: 0xc9a24a, width: 1, alpha: 0.18 });
    for (let i = 0; i < RUNES; i += 1) {
      const angle = (i / RUNES) * Math.PI * 2;
      const x = Math.cos(angle) * (radius + 10);
      const y = Math.sin(angle) * (radius + 10);
      // Alternate a bar and a diamond, turned to face the centre.
      const along = { x: Math.cos(angle), y: Math.sin(angle) };
      const across = { x: -along.y, y: along.x };
      if (i % 2 === 0) {
        this.marks
          .moveTo(x - along.x * 8, y - along.y * 8)
          .lineTo(x + along.x * 8, y + along.y * 8)
          .stroke({ color: 0xe8cf8a, width: 2.5, alpha: 0.6 });
      } else {
        this.marks
          .poly([
            x - along.x * 6,
            y - along.y * 6,
            x + across.x * 4,
            y + across.y * 4,
            x + along.x * 6,
            y + along.y * 6,
            x - across.x * 4,
            y - across.y * 4,
          ])
          .stroke({ color: 0xe8cf8a, width: 1.5, alpha: 0.55 });
      }
      const light = new Sprite(glowTexture);
      light.anchor.set(0.5);
      light.position.set(x, y);
      light.scale.set(0.34);
      light.alpha = 0;
      this.lights.push(light);
      this.lightLayer.addChild(light);
    }
    this.lightLayer.blendMode = 'add';
    this.container.addChild(this.stone, this.marks, this.lightLayer);
  }

  /** Tints every rune light; the charge kindles them one after another from the top. */
  setLightColor(color: number): void {
    for (const light of this.lights) light.tint = color;
  }

  /** The lights in the order the charge kindles them: from the top, clockwise. */
  inOrder(): Sprite[] {
    const top = RUNES * 0.75;
    return this.lights
      .map((_, i) => this.lights[Math.round(top + i) % RUNES])
      .flatMap((light) => (light ? [light] : []));
  }
}
