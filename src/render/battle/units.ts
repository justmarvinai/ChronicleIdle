/**
 * Unit sprites on the battle stage: idle loop from the model atlas, multiply tint for placeholders
 * (washed to luminance first when the art asks for a pale one), drop shadow, highlight ring and
 * the state changes the presenter animates.
 */
import { AnimatedSprite, Assets, Container, Graphics, Rectangle, Texture, type Spritesheet } from 'pixi.js';
import { atlas } from '@assets/manifest';
import type { ModelKey } from '@assets/manifest.generated';
import type { UnitView } from '@engine/battle/index';
import { slotFor, unitScale } from './layout';

const IDLE_FPS = 5;

const sheetCache = new Map<string, Promise<Spritesheet>>();

async function loadSheet(model: ModelKey): Promise<Spritesheet> {
  const cached = sheetCache.get(model);
  if (cached) return cached;
  const entry = atlas(model);
  // Every model names its frames `idle_0…`, so each sheet needs its own cache namespace or Pixi
  // warns about the collision on the second model it loads (the sheet's own keys stay bare).
  const promise = Assets.load<Spritesheet>({ src: entry.json, data: { cachePrefix: `${model}/` } });
  sheetCache.set(model, promise);
  return promise;
}

/**
 * Greyscale copies of an atlas, one per model, so placeholder art that has to read pale can be
 * *tinted* pale (docs/tech/ASSETS.md §3): a multiply tint only darkens, and the luminance has to
 * come from somewhere. Baked once at load rather than filtered every frame — the stage keeps its
 * frame budget (CLAUDE.md §5.6) and the renderer keeps no filter bind groups.
 */
const washCache = new Map<ModelKey, Promise<Texture[]>>();

/** Rec. 601 luma, the same weights `filter: grayscale(1)` uses in the DOM sprites. */
function drainColour(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const luma = Math.round(
      0.299 * (pixels[i] ?? 0) + 0.587 * (pixels[i + 1] ?? 0) + 0.114 * (pixels[i + 2] ?? 0),
    );
    pixels[i] = luma;
    pixels[i + 1] = luma;
    pixels[i + 2] = luma;
  }
}

async function loadWashedFrames(model: ModelKey): Promise<Texture[]> {
  const cached = washCache.get(model);
  if (cached) return cached;
  const entry = atlas(model);
  const promise = (async (): Promise<Texture[]> => {
    const response = await fetch(entry.url);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context for the wash');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    drainColour(image.data);
    ctx.putImageData(image, 0, 0);
    const source = Texture.from(canvas).source;
    source.scaleMode = 'nearest';
    // The atlas manifest is the frame layout the DOM sprites already use, so both paths agree.
    const names = entry.animations['idle']?.frames ?? ['still'];
    return names
      .map((name) => entry.frames[name])
      .filter((frame): frame is NonNullable<typeof frame> => !!frame)
      .map((frame) => new Texture({ source, frame: new Rectangle(frame.x, frame.y, frame.w, frame.h) }));
  })().catch((error: unknown) => {
    // A failed wash must not stick: the next fight tries again rather than inheriting the failure.
    washCache.delete(model);
    throw error;
  });
  washCache.set(model, promise);
  return promise;
}

/** The model's idle loop, in order; the still frame when it has no animation. */
async function sheetFrames(model: ModelKey): Promise<Texture[]> {
  const sheet = await loadSheet(model);
  const frames: Texture[] = [];
  for (let i = 0; i < 9; i += 1) {
    const texture = sheet.textures[`idle_${i}`];
    if (texture) frames.push(texture);
  }
  if (!frames.length) {
    const still = sheet.textures['still'];
    if (still) frames.push(still);
  }
  return frames;
}

export async function preloadModels(models: readonly ModelKey[]): Promise<void> {
  await Promise.all(models.map((m) => loadSheet(m).catch(() => null)));
}

export class UnitSprite {
  readonly root = new Container();
  readonly shadow = new Graphics();
  readonly ring = new Graphics();
  /** Body container: everything that flashes, shakes and dissolves. */
  readonly body = new Container();
  sprite: AnimatedSprite | null = null;
  readonly home: { x: number; y: number };
  readonly scale: number;
  readonly facing: 1 | -1;
  private baseTint: number | string = 0xffffff;
  private disposed = false;

  constructor(readonly view: UnitView) {
    const anchor = slotFor(view.side, view.slot);
    this.home = { x: anchor.x, y: anchor.y };
    this.scale = unitScale(view.side, view.slot, view.art.scale);
    // Allies face right, enemies face left; the atlas says which way the art is drawn.
    const wants = view.side === 'ally' ? 'right' : 'left';
    this.facing = wants === view.art.facing ? 1 : -1;
    this.root.position.set(anchor.x, anchor.y);
    this.root.zIndex = anchor.y;
    const w = 46 * this.scale;
    this.shadow.ellipse(0, 0, w, w * 0.32).fill({ color: 0x000000, alpha: 0.42 });
    this.ring.ellipse(0, 0, w * 1.05, w * 0.36).stroke({ color: 0xf0d57a, width: 4, alpha: 0.9 });
    this.ring.visible = false;
    this.root.addChild(this.shadow, this.ring, this.body);
  }

  async load(): Promise<void> {
    const model = this.view.art.model as ModelKey;
    // A boss that cannot be washed is still a boss: the plain atlas is the fallback, never a gap.
    const frames: Texture[] = this.view.art.desaturate
      ? await loadWashedFrames(model).catch(() => sheetFrames(model))
      : await sheetFrames(model);
    if (this.disposed || !frames.length) return;
    const sprite = new AnimatedSprite({ textures: frames, autoUpdate: true });
    sprite.animationSpeed = IDLE_FPS / 60;
    sprite.loop = true;
    sprite.anchor.set(0.5, 1);
    sprite.scale.set(this.scale * this.facing, this.scale);
    sprite.texture.source.scaleMode = 'nearest';
    for (const f of frames) f.source.scaleMode = 'nearest';
    if (this.view.art.tint) {
      this.baseTint = this.view.art.tint;
      sprite.tint = this.view.art.tint;
    }
    sprite.play();
    this.sprite = sprite;
    this.body.addChild(sprite);
    if (!this.view.alive) this.setDead(true);
  }

  setActive(active: boolean): void {
    this.ring.visible = active;
  }

  setTint(tint: number | string | null): void {
    if (this.sprite) this.sprite.tint = tint ?? this.baseTint;
  }

  setDead(dead: boolean): void {
    this.body.alpha = dead ? 0 : 1;
    this.shadow.alpha = dead ? 0 : 1;
    this.ring.visible = false;
    if (this.sprite) {
      if (dead) this.sprite.stop();
      else this.sprite.play();
    }
  }

  destroy(): void {
    this.disposed = true;
    this.root.destroy({ children: true });
  }
}
