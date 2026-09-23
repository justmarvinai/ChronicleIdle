/**
 * The shard in the gate (docs/design/SUMMONING.md §5): a faceted crystal drawn in Pixi rather than a
 * painted icon, because the ritual needs to light it from within, crack it and shatter it into its
 * own facets — things a square of paint cannot do.
 *
 * Six facets around a front ridge. The ridge drifts from side to side and the facets are redrawn
 * with it, so the crystal seems to turn slowly in the ring; the light falls from the upper left, so
 * a facet's shade follows which way it faces. The stone has a colour of its own and the light inside
 * it another — the Ancient Shard is sapphire lit amber, as its icon is — and the ritual recolours
 * only the light. Presentation only.
 */
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import type { ShardId } from '@content/balance/summon';
import type { Rng } from '@engine/rng/rng';
import { mixColor } from './color';

/** The silhouette a shard's crystal is cut to, in stage pixels at scale 1. */
export interface CrystalShape {
  /** Half-width at the shoulders. */
  width: number;
  /** Apex above the centre. */
  top: number;
  /** Shoulders above the centre. */
  shoulder: number;
  /** Waist below the centre. */
  waist: number;
  /** Lower apex below the centre. */
  bottom: number;
  /** A lean, in radians: a rough shard is not cut true. */
  tilt: number;
  /** Smaller crystals grown beside the main one (the Primordial is a cluster). */
  satellites: readonly { x: number; y: number; scale: number; tilt: number }[];
}

/** A shard as the gate draws it: its cut, its stone, and the light inside. */
export interface ShardCrystal {
  shape: CrystalShape;
  /** The stone's own colour. */
  body: number;
  /** The light inside it at rest; the ritual recolours this as it tells. */
  light: number;
}

export interface Facet {
  points: number[];
  color: number;
}

/** How far the front ridge drifts either side of centre, as a share of the half-width. */
const RIDGE_SWAY = 0.55;
/** Seconds for one turn of the drift. */
const TURN_PERIOD = 7;
/** Crack lines grown in the crystal, revealed a few at a time as the ritual strains it. */
const CRACKS = 9;
/** The veins a crystal shows at rest: its icon is a lit stone, not a clean gem. */
const RESTING_VEINS = 0.25;
/** The sheen's bands, widest and faintest first: a soft edge without a blur pass. */
const SHEEN_BANDS: readonly (readonly [number, number])[] = [
  [30, 0.05],
  [18, 0.07],
  [8, 0.1],
];
/** How the light from the upper left shades each facet, in facet order (+ toward white). */
const FACET_SHADE = [0.3, 0.1, 0.16, -0.4, -0.08, -0.6] as const;

const shade = (color: number, amount: number): number =>
  amount >= 0 ? mixColor(color, 0xffffff, amount) : mixColor(color, 0x000000, -amount);

/** What a gem is painted with this frame. */
interface Paint {
  /** The stone, already lit from within and flashed. */
  stone: number;
  /** The light, for the edges and the veins. */
  light: number;
}

/** One crystal: its facets, its cracks, and where they are in stage space for the shatter. */
class Gem {
  readonly root = new Container();
  private readonly body = new Graphics();
  private readonly edges = new Graphics();
  private readonly cracks = new Graphics();
  private readonly crackPaths: number[][] = [];
  private facets: Facet[] = [];
  private crackShare = -1;
  private crackColor = -1;

  constructor(
    private readonly shape: CrystalShape,
    rng: Rng,
  ) {
    this.cracks.blendMode = 'add';
    this.root.addChild(this.body, this.cracks, this.edges);
    this.root.rotation = shape.tilt;
    for (let i = 0; i < CRACKS; i += 1) this.crackPaths.push(this.crackPath(rng, i));
  }

  /** A jagged line from near the core towards an edge, inside the silhouette. */
  private crackPath(rng: Rng, index: number): number[] {
    const { width, top, bottom } = this.shape;
    const angle = (index / CRACKS) * Math.PI * 2 + rng.next() * 0.6;
    const reach = 0.55 + rng.next() * 0.35;
    const path = [(rng.next() - 0.5) * 8, (rng.next() - 0.5) * 12];
    for (let step = 1; step <= 4; step += 1) {
      const wobble = (rng.next() - 0.5) * 0.8;
      const x = Math.cos(angle + wobble) * width * reach * (step / 4);
      const y = Math.sin(angle + wobble) * (Math.sin(angle) < 0 ? top : bottom) * reach * (step / 4);
      path.push(x, y);
    }
    return path;
  }

  /** Redraws the facets for the ridge's place at `time`. */
  draw(paint: Paint, time: number): void {
    const { width, top, shoulder, waist, bottom } = this.shape;
    const r = Math.sin((time / TURN_PERIOD) * Math.PI * 2) * width * RIDGE_SWAY;
    const T = [r * 0.25, -top];
    const L1 = [-width, -shoulder];
    const R1 = [width, -shoulder];
    const L2 = [-width * 0.9, waist];
    const R2 = [width * 0.9, waist];
    const B = [r * 0.2, bottom];
    const M1 = [r, -shoulder + 10];
    const M2 = [r * 0.92, waist + 12];
    const flat = (...pts: number[][]): number[] => pts.flatMap((p) => p);
    const outlines = [
      flat(T, L1, M1),
      flat(T, M1, R1),
      flat(L1, L2, M2, M1),
      flat(M1, M2, R2, R1),
      flat(L2, B, M2),
      flat(M2, B, R2),
    ];
    this.facets = outlines.map((points, i) => ({ points, color: shade(paint.stone, FACET_SHADE[i] ?? 0) }));
    this.body.clear();
    for (const facet of this.facets) this.body.poly(facet.points).fill({ color: facet.color, alpha: 0.97 });
    const at = (p: number[]): [number, number] => [p[0] ?? 0, p[1] ?? 0];
    this.edges.clear();
    this.edges
      .poly(flat(T, R1, R2, B, L2, L1))
      .stroke({ color: mixColor(paint.light, 0xffffff, 0.55), width: 3, alpha: 0.9 })
      .moveTo(...at(T))
      .lineTo(...at(M1))
      .lineTo(...at(M2))
      .lineTo(...at(B))
      .moveTo(...at(L1))
      .lineTo(...at(M1))
      .lineTo(...at(R1))
      .moveTo(...at(L2))
      .lineTo(...at(M2))
      .lineTo(...at(R2))
      .stroke({ color: 0xffffff, width: 1.5, alpha: 0.38 });
  }

  /** Shows the first `share` of the cracks, glowing in `color`; redrawn only when either changes. */
  crack(share: number, color: number): void {
    const count = Math.round(Math.max(0, Math.min(1, share)) * CRACKS);
    if (count === this.crackShare && color === this.crackColor) return;
    this.crackShare = count;
    this.crackColor = color;
    this.cracks.clear();
    for (let i = 0; i < count; i += 1) {
      const path = this.crackPaths[i];
      if (!path) continue;
      this.cracks.poly(path, false).stroke({ color, width: 8, alpha: 0.3, join: 'round', cap: 'round' });
      this.cracks.poly(path, false).stroke({ color: mixColor(color, 0xffffff, 0.65), width: 2.5, alpha: 1 });
    }
  }

  /** The facets in the stage's own space, for the shatter to throw. */
  facetsIn(space: Container): Facet[] {
    return this.facets.map((facet) => {
      const out: number[] = [];
      for (let i = 0; i < facet.points.length; i += 2) {
        const point = space.toLocal({ x: facet.points[i] ?? 0, y: facet.points[i + 1] ?? 0 }, this.root);
        out.push(point.x, point.y);
      }
      return { points: out, color: facet.color };
    });
  }
}

/**
 * The shard as the gate shows it: one gem (or a cluster), a soft glow behind it, a brighter core
 * light over it, and a sheen that passes across it now and then.
 */
export class Crystal {
  readonly container = new Container();
  private readonly glow: Sprite;
  private readonly core: Sprite;
  private readonly gems: Gem[] = [];
  private readonly sheen = new Graphics();
  private readonly sheenMask = new Graphics();
  private body: number;
  private light: number;
  private charge = 0;
  private flash = 0;
  private cracks = RESTING_VEINS;
  private time = 0;

  constructor(
    readonly look: ShardCrystal,
    glowTexture: Texture,
    rng: Rng,
  ) {
    const { shape } = look;
    this.body = look.body;
    this.light = look.light;
    this.glow = new Sprite(glowTexture);
    this.glow.anchor.set(0.5);
    this.glow.blendMode = 'add';
    this.container.addChild(this.glow);
    for (const satellite of shape.satellites) {
      const gem = new Gem({ ...shape, satellites: [], tilt: satellite.tilt }, rng);
      gem.root.position.set(satellite.x, satellite.y);
      gem.root.scale.set(satellite.scale);
      this.gems.push(gem);
      this.container.addChild(gem.root);
    }
    const main = new Gem(shape, rng);
    this.gems.push(main);
    this.container.addChild(main.root);
    this.core = new Sprite(glowTexture);
    this.core.anchor.set(0.5);
    this.core.blendMode = 'add';
    this.core.scale.set(0.9, 1.4);
    this.container.addChild(this.core);
    // The sheen: a pale band, soft at its edges, that sweeps the main gem's silhouette.
    for (const [half, alpha] of SHEEN_BANDS)
      this.sheen.rect(-half, -260, half * 2, 520).fill({ color: 0xffffff, alpha });
    this.sheen.rotation = 0.5;
    this.sheen.blendMode = 'add';
    this.sheenMask
      .poly([
        0,
        -shape.top,
        shape.width,
        -shape.shoulder,
        shape.width * 0.9,
        shape.waist,
        0,
        shape.bottom,
        -shape.width * 0.9,
        shape.waist,
        -shape.width,
        -shape.shoulder,
      ])
      .fill({ color: 0xffffff });
    this.sheenMask.rotation = shape.tilt;
    this.sheen.mask = this.sheenMask;
    this.container.addChild(this.sheen, this.sheenMask);
    this.update(0, () => 0);
  }

  /** The light inside the stone; the tells recolour it. */
  setLight(color: number): void {
    this.light = color;
  }

  /** 0 at rest, 1 about to burst: the crystal brightens and trembles with it. */
  setCharge(charge: number): void {
    this.charge = Math.max(0, Math.min(1, charge));
  }

  /** A flare of white through the stone, 0–1; the scene lets it decay. */
  setFlash(amount: number): void {
    this.flash = Math.max(0, Math.min(1, amount));
  }

  /** How far the cracks have spread, 0–1. At rest a crystal shows a few veins. */
  setCracks(share: number): void {
    this.cracks = share;
  }

  /** Back to the stone's own light, veins and calm: the ritual is over or never began. */
  reset(): void {
    this.light = this.look.light;
    this.charge = 0;
    this.flash = 0;
    this.cracks = RESTING_VEINS;
  }

  /** Every gem's facets in `space`'s coordinates, for the shatter. */
  facetsIn(space: Container): Facet[] {
    return this.gems.flatMap((gem) => gem.facetsIn(space));
  }

  update(dt: number, jitter: () => number): void {
    this.time += dt;
    const lit = mixColor(this.body, this.light, 0.05 + this.charge * 0.5);
    const paint: Paint = { stone: mixColor(lit, 0xffffff, this.flash * 0.75), light: this.light };
    const veins = mixColor(this.light, 0xffffff, this.flash * 0.5);
    for (const gem of this.gems) {
      gem.draw(paint, this.time);
      gem.crack(this.cracks, veins);
    }
    this.glow.tint = this.light;
    this.core.tint = mixColor(this.light, 0xffffff, 0.35);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * (2 + this.charge * 10));
    this.glow.alpha = Math.min(1, 0.42 + this.charge * 0.45 + pulse * 0.1 + this.flash * 0.3);
    this.glow.scale.set(2.6 + this.charge * 1.4 + pulse * 0.08 + this.flash * 0.6);
    this.core.alpha = Math.min(1, 0.28 + this.charge * 0.6 + pulse * 0.08 + this.flash * 0.5);
    const tremble = this.charge * this.charge * 5;
    for (const gem of this.gems) gem.root.pivot.set(jitter() * tremble, jitter() * tremble);
    // The sheen crosses every few seconds, faster as the crystal strains.
    const sweep = (this.time * (0.35 + this.charge * 1.2)) % 1;
    this.sheen.x = -160 + sweep * 320;
    this.sheen.alpha = sweep < 0.5 ? 1 : 0;
  }
}

/**
 * The four shards as the gate cuts them, each after its icon: the Faded a rough mossy stone lit
 * green, the Ancient a tall sapphire lit amber, the Sacred a broad citrine lit gold, and the
 * Primordial a garnet cluster with teal fire in its veins.
 */
export const SHARD_CRYSTALS: Readonly<Record<ShardId, ShardCrystal>> = {
  faded: {
    shape: { width: 50, top: 104, shoulder: 34, waist: 58, bottom: 118, tilt: 0.12, satellites: [] },
    body: 0x56644a,
    light: 0x7fe05a,
  },
  ancient: {
    shape: { width: 56, top: 128, shoulder: 44, waist: 64, bottom: 124, tilt: 0, satellites: [] },
    body: 0x3a44a6,
    light: 0xffb640,
  },
  sacred: {
    shape: { width: 66, top: 118, shoulder: 38, waist: 70, bottom: 128, tilt: -0.04, satellites: [] },
    body: 0xd9a032,
    light: 0xffe27a,
  },
  primordial: {
    shape: {
      width: 54,
      top: 124,
      shoulder: 42,
      waist: 62,
      bottom: 118,
      tilt: 0.05,
      satellites: [
        { x: -74, y: 44, scale: 0.56, tilt: -0.42 },
        { x: 70, y: 52, scale: 0.5, tilt: 0.38 },
      ],
    },
    body: 0x7d2a52,
    light: 0x4ff0c0,
  },
};
