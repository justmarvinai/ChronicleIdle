/**
 * The ritual's moving light (docs/design/SUMMONING.md §5): motes the gate draws in along a spiral as
 * it charges, sparks thrown out at every tell and at the burst, and the crystal's own facets flung
 * away when it gives. Sprites are pooled and recycled, so a burst of two hundred sparks allocates
 * nothing; only the shatter builds shapes, once a press. Presentation only.
 */
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { Rng } from '@engine/rng/rng';
import { mixColor } from './color';
import type { Facet } from './crystal';

/** A streak is drawn out along its flight by this many seconds of travel. */
const STREAK_SECONDS = 0.045;

const between = (rng: Rng, [min, max]: readonly [number, number]): number => min + rng.next() * (max - min);

/**
 * Turns a pooled sprite to its flight and stretches it by its speed; a slow one shrinks to a dot as
 * long as it is thick.
 */
function orient(sprite: Sprite, vx: number, vy: number, thickness: number): void {
  const { width, height } = sprite.texture;
  const speed = Math.hypot(vx, vy);
  sprite.rotation = Math.atan2(vy, vx);
  sprite.scale.set(Math.max((thickness * height * 1.5) / width, (speed * STREAK_SECONDS) / width), thickness);
}

interface Mote {
  sprite: Sprite;
  live: boolean;
  angle: number;
  radius: number;
  spin: number;
  age: number;
}

/** Where the inflow starts, as a distance from the gate's centre. */
export interface InflowReach {
  from: number;
  to: number;
}

/**
 * Light drawn into the gate: motes start out past the ring and fall inwards along a clockwise spiral,
 * faster the closer they come, and go out at the crystal. The rate is the scene's to set each frame,
 * so the charge swells it and a held breath stops it dead.
 */
export class Inflow {
  readonly container = new Container();
  private readonly motes: Mote[] = [];
  /** Spawns owed from a fractional rate, carried to the next frame. */
  private owed = 0;

  constructor(
    texture: Texture,
    size: number,
    private readonly centre: { x: number; y: number },
    private readonly reach: InflowReach,
    private readonly rng: Rng,
  ) {
    this.container.blendMode = 'add';
    for (let i = 0; i < size; i += 1) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.75, 0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.motes.push({ sprite, live: false, angle: 0, radius: 0, spin: 0, age: 0 });
    }
  }

  private spawn(color: number): void {
    const mote = this.motes.find((one) => !one.live);
    if (!mote) return;
    mote.live = true;
    mote.age = 0;
    mote.angle = this.rng.next() * Math.PI * 2;
    mote.radius = between(this.rng, [this.reach.from, this.reach.to]);
    mote.spin = between(this.rng, [1.2, 2.2]);
    mote.sprite.tint = mixColor(color, 0xffffff, this.rng.next() * 0.45);
    mote.sprite.visible = true;
  }

  /** A sudden rush: `count` motes at once. */
  rush(count: number, color: number): void {
    for (let i = 0; i < count; i += 1) this.spawn(color);
  }

  /** Draws `rate` motes a second in, in `color`, and moves the ones already falling. */
  update(dt: number, rate: number, color: number): void {
    this.owed += rate * dt;
    while (this.owed >= 1) {
      this.spawn(color);
      this.owed -= 1;
    }
    for (const mote of this.motes) {
      if (!mote.live) continue;
      mote.age += dt;
      // The fall quickens as it nears the centre, and so does the turn: a whirlpool.
      const fall = 240 + 60_000 / (mote.radius + 60);
      const turn = mote.spin * (1 + 120 / (mote.radius + 40));
      mote.radius -= fall * dt;
      mote.angle += turn * dt;
      if (mote.radius <= 18) {
        mote.live = false;
        mote.sprite.visible = false;
        continue;
      }
      const cos = Math.cos(mote.angle);
      const sin = Math.sin(mote.angle);
      mote.sprite.position.set(this.centre.x + cos * mote.radius, this.centre.y + sin * mote.radius);
      const vx = -sin * mote.radius * turn - cos * fall;
      const vy = cos * mote.radius * turn - sin * fall;
      orient(mote.sprite, vx, vy, 0.55);
      const fadeIn = Math.min(1, mote.age / 0.15);
      const fadeOut = Math.min(1, (mote.radius - 18) / 60);
      mote.sprite.alpha = 0.85 * fadeIn * fadeOut;
    }
  }

  clear(): void {
    this.owed = 0;
    for (const mote of this.motes) {
      mote.live = false;
      mote.sprite.visible = false;
    }
  }
}

/** One throw of sparks. */
export interface SparkBurst {
  x: number;
  y: number;
  count: number;
  /** Launch speed, px/s. */
  speed: readonly [number, number];
  /** Seconds each spark lives. */
  life: readonly [number, number];
  colors: readonly number[];
  /** Thickness, as a share of the streak texture's own. */
  size?: readonly [number, number];
  /** Launched from anywhere inside this radius of the point. */
  scatter?: number;
  /** Pulled down, px/s²; sparks off a burst arc and fall like embers. */
  gravity?: number;
}

interface Spark {
  sprite: Sprite;
  live: boolean;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  gravity: number;
}

/** How quickly a spark sheds its speed, per second: a hard throw that slows into drifting embers. */
const DRAG = 2.4;

/** Thrown light: streaks that fly out, slow, arc and go out. The pool's oldest spark is reused when full. */
export class Sparks {
  readonly container = new Container();
  private readonly sparks: Spark[] = [];
  private cursor = 0;

  constructor(
    texture: Texture,
    size: number,
    private readonly rng: Rng,
  ) {
    this.container.blendMode = 'add';
    for (let i = 0; i < size; i += 1) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.75, 0.5);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.sparks.push({ sprite, live: false, vx: 0, vy: 0, age: 0, life: 1, size: 1, gravity: 0 });
    }
  }

  emit(burst: SparkBurst): void {
    for (let i = 0; i < burst.count; i += 1) {
      const spark = this.sparks[this.cursor];
      this.cursor = (this.cursor + 1) % this.sparks.length;
      if (!spark) continue;
      const angle = this.rng.next() * Math.PI * 2;
      const speed = between(this.rng, burst.speed);
      const scatter = (burst.scatter ?? 0) * this.rng.next();
      spark.live = true;
      spark.age = 0;
      spark.life = between(this.rng, burst.life);
      spark.size = between(this.rng, burst.size ?? [0.5, 1]);
      spark.gravity = burst.gravity ?? 0;
      spark.vx = Math.cos(angle) * speed;
      spark.vy = Math.sin(angle) * speed;
      spark.sprite.position.set(burst.x + Math.cos(angle) * scatter, burst.y + Math.sin(angle) * scatter);
      spark.sprite.tint = this.rng.pick(burst.colors);
      spark.sprite.visible = true;
    }
  }

  update(dt: number): void {
    const drag = Math.exp(-DRAG * dt);
    for (const spark of this.sparks) {
      if (!spark.live) continue;
      spark.age += dt;
      if (spark.age >= spark.life) {
        spark.live = false;
        spark.sprite.visible = false;
        continue;
      }
      spark.vx *= drag;
      spark.vy = spark.vy * drag + spark.gravity * dt;
      spark.sprite.x += spark.vx * dt;
      spark.sprite.y += spark.vy * dt;
      const left = 1 - spark.age / spark.life;
      orient(spark.sprite, spark.vx, spark.vy, spark.size * (0.4 + 0.6 * left));
      spark.sprite.alpha = Math.min(1, left * 1.6);
    }
  }

  clear(): void {
    for (const spark of this.sparks) {
      spark.live = false;
      spark.sprite.visible = false;
    }
  }
}

interface Fragment {
  shape: Graphics;
  vx: number;
  vy: number;
  spin: number;
  age: number;
  life: number;
}

/** Pieces split from one facet: a quad falls in two, a triangle in two along its longest side. */
function splitFacet(points: readonly number[]): number[][] {
  const p = (i: number): [number, number] => [points[i * 2] ?? 0, points[i * 2 + 1] ?? 0];
  if (points.length >= 8) {
    const [a, b, c, d] = [p(0), p(1), p(2), p(3)];
    return [
      [...a, ...b, ...c],
      [...a, ...c, ...d],
    ];
  }
  const [a, b, c] = [p(0), p(1), p(2)];
  const ab = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const bc = Math.hypot(b[0] - c[0], b[1] - c[1]);
  const ca = Math.hypot(c[0] - a[0], c[1] - a[1]);
  const mid = (u: [number, number], v: [number, number]): [number, number] => [
    (u[0] + v[0]) / 2,
    (u[1] + v[1]) / 2,
  ];
  if (ab >= bc && ab >= ca) {
    const m = mid(a, b);
    return [
      [...a, ...m, ...c],
      [...m, ...b, ...c],
    ];
  }
  if (bc >= ca) {
    const m = mid(b, c);
    return [
      [...a, ...b, ...m],
      [...a, ...m, ...c],
    ];
  }
  const m = mid(c, a);
  return [
    [...a, ...b, ...m],
    [...m, ...b, ...c],
  ];
}

/**
 * The crystal, broken: each facet in two, thrown out from the heart of the burst, spinning, falling,
 * going dark. The pieces keep the facet's own shade, so the shatter is the crystal that was there.
 */
export class Fragments {
  readonly container = new Container();
  private pieces: Fragment[] = [];

  constructor(private readonly rng: Rng) {}

  shatter(facets: readonly Facet[], origin: { x: number; y: number }, light: number, force: number): void {
    for (const facet of facets) {
      for (const points of splitFacet(facet.points)) {
        let cx = 0;
        let cy = 0;
        const n = points.length / 2;
        for (let i = 0; i < n; i += 1) {
          cx += (points[i * 2] ?? 0) / n;
          cy += (points[i * 2 + 1] ?? 0) / n;
        }
        const local = points.map((value, i) => (i % 2 === 0 ? value - cx : value - cy));
        const shape = new Graphics()
          .poly(local)
          .fill({ color: mixColor(facet.color, light, 0.45) })
          .stroke({ color: mixColor(light, 0xffffff, 0.5), width: 2, alpha: 0.9 });
        shape.position.set(cx, cy);
        this.container.addChild(shape);
        const away = Math.atan2(cy - origin.y, cx - origin.x) + (this.rng.next() - 0.5) * 0.5;
        const speed = (380 + this.rng.next() * 460) * force;
        this.pieces.push({
          shape,
          vx: Math.cos(away) * speed,
          vy: Math.sin(away) * speed - 160 * force,
          spin: (this.rng.next() - 0.5) * 16,
          age: 0,
          life: 0.8 + this.rng.next() * 0.5,
        });
      }
    }
  }

  update(dt: number): void {
    if (this.pieces.length === 0) return;
    const drag = Math.exp(-1.1 * dt);
    this.pieces = this.pieces.filter((piece) => {
      piece.age += dt;
      if (piece.age >= piece.life) {
        piece.shape.destroy();
        return false;
      }
      piece.vx *= drag;
      piece.vy = piece.vy * drag + 1100 * dt;
      piece.shape.x += piece.vx * dt;
      piece.shape.y += piece.vy * dt;
      piece.shape.rotation += piece.spin * dt;
      const t = piece.age / piece.life;
      piece.shape.alpha = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
      piece.shape.scale.set(1 - t * 0.35);
      return true;
    });
  }

  clear(): void {
    for (const piece of this.pieces) piece.shape.destroy();
    this.pieces = [];
  }
}

/** One ring of light spreading from the gate. */
export interface WaveSpec {
  color: number;
  /** Radius it starts and ends at, px. */
  from: number;
  to: number;
  /** Seconds it takes. */
  life: number;
  /** Its brightest alpha, at the start. */
  peak: number;
  /** Seconds before it sets out. */
  delay?: number;
}

interface Wave extends Required<WaveSpec> {
  sprite: Sprite;
  live: boolean;
  age: number;
}

/**
 * Rings of light: the pulse a tell sends through the gate, and the shockwaves of a burst. One
 * texture, scaled — its ring sits at `ringAt` of the texture's half-width.
 */
export class Waves {
  readonly container = new Container();
  private readonly waves: Wave[] = [];
  private cursor = 0;
  /** The ring's radius in the texture at scale 1, px. */
  private readonly radius: number;

  constructor(texture: Texture, size: number, centre: { x: number; y: number }, ringAt: number) {
    this.radius = (texture.width / 2) * ringAt;
    this.container.blendMode = 'add';
    for (let i = 0; i < size; i += 1) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(centre.x, centre.y);
      sprite.visible = false;
      this.container.addChild(sprite);
      this.waves.push({ sprite, live: false, age: 0, color: 0, from: 0, to: 0, life: 1, peak: 1, delay: 0 });
    }
  }

  emit(spec: WaveSpec): void {
    const wave = this.waves[this.cursor];
    this.cursor = (this.cursor + 1) % this.waves.length;
    if (!wave) return;
    Object.assign(wave, { delay: 0, ...spec, live: true, age: 0 });
    wave.sprite.tint = spec.color;
    wave.sprite.visible = false;
  }

  update(dt: number): void {
    for (const wave of this.waves) {
      if (!wave.live) continue;
      wave.age += dt;
      const t = (wave.age - wave.delay) / wave.life;
      if (t < 0) continue;
      if (t >= 1) {
        wave.live = false;
        wave.sprite.visible = false;
        continue;
      }
      const out = 1 - Math.pow(1 - t, 3);
      const at = wave.from + (wave.to - wave.from) * out;
      wave.sprite.visible = true;
      wave.sprite.scale.set(at / this.radius);
      wave.sprite.alpha = wave.peak * Math.pow(1 - t, 1.4);
    }
  }

  clear(): void {
    for (const wave of this.waves) {
      wave.live = false;
      wave.sprite.visible = false;
    }
  }
}
