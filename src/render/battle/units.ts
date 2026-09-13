/**
 * Unit sprites on the battle stage: idle loop from the model atlas, multiply tint for
 * placeholders, drop shadow, highlight ring and the state changes the presenter animates.
 */
import { AnimatedSprite, Assets, Container, Graphics, type Spritesheet, type Texture } from 'pixi.js';
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
  const promise = Assets.load<Spritesheet>(entry.json);
  sheetCache.set(model, promise);
  return promise;
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
    const sheet = await loadSheet(model);
    if (this.disposed) return;
    const frames: Texture[] = [];
    for (let i = 0; i < 9; i++) {
      const t = sheet.textures[`idle_${i}`];
      if (t) frames.push(t);
    }
    if (!frames.length) {
      const still = sheet.textures['still'];
      if (still) frames.push(still);
    }
    if (!frames.length) return;
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
