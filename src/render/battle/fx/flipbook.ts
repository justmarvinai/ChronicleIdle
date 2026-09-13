/**
 * Flipbook playback for the fx sheets (strips and grids of square frames). Textures are cut
 * once per sheet and cached; each play is an `AnimatedSprite` that removes itself when done.
 */
import { AnimatedSprite, Assets, Rectangle, Texture, type Container } from 'pixi.js';
import { fx as fxEntry } from '@assets/manifest';
import type { FxKey } from '@assets/manifest.generated';
import { FX, type FxDef, type FxId } from './registry';

const frameCache = new Map<FxKey, Texture[]>();
const loading = new Map<FxKey, Promise<Texture[]>>();

export async function loadFxSheet(key: FxKey): Promise<Texture[]> {
  const cached = frameCache.get(key);
  if (cached) return cached;
  const pending = loading.get(key);
  if (pending) return pending;
  const entry = fxEntry(key);
  const promise = Assets.load<Texture>(entry.url).then((base) => {
    const frames: Texture[] = [];
    for (let i = 0; i < entry.frames; i++) {
      const col = i % entry.cols;
      const row = Math.floor(i / entry.cols);
      frames.push(
        new Texture({
          source: base.source,
          frame: new Rectangle(col * entry.frameW, row * entry.frameH, entry.frameW, entry.frameH),
        }),
      );
    }
    frameCache.set(key, frames);
    loading.delete(key);
    return frames;
  });
  loading.set(key, promise);
  return promise;
}

/** Warms every sheet the registry references (called once when the stage mounts). */
export async function preloadFx(ids: readonly FxId[] = Object.keys(FX) as FxId[]): Promise<void> {
  const sheets = new Set(ids.map((id) => FX[id].sheet));
  await Promise.all([...sheets].map((sheet) => loadFxSheet(sheet).catch(() => [])));
}

export interface PlayFxOptions {
  x: number;
  y: number;
  /** Extra scale on top of the registry value. */
  scale?: number;
  tint?: number | null;
  flipX?: boolean;
  /** Playback speed multiplier (battle speed). */
  speed?: number;
  rotation?: number;
  /** Loop for `loopMs` milliseconds instead of playing once. */
  loopMs?: number;
}

/** Plays an effect at a stage position; resolves when it finishes (never rejects). */
export function playFx(layer: Container, id: FxId, options: PlayFxOptions): Promise<AnimatedSprite | null> {
  const def: FxDef = FX[id];
  const frames = frameCache.get(def.sheet);
  if (!frames || !frames.length) {
    // Not loaded yet (first battle frame): warm it for next time, skip this one.
    void loadFxSheet(def.sheet);
    return Promise.resolve(null);
  }
  const sprite = new AnimatedSprite({ textures: frames, autoUpdate: true });
  const entry = fxEntry(def.sheet);
  sprite.animationSpeed = ((entry.fps * def.speed * (options.speed ?? 1)) / 60) * 1;
  sprite.loop = options.loopMs !== undefined;
  sprite.anchor.set(0.5, def.anchorY);
  sprite.position.set(options.x, options.y);
  const scale = def.scale * (options.scale ?? 1);
  sprite.scale.set(options.flipX ? -scale : scale, scale);
  sprite.rotation = options.rotation ?? 0;
  sprite.alpha = def.alpha;
  const tint = options.tint === undefined ? def.tint : options.tint;
  if (tint !== null) sprite.tint = tint;
  sprite.blendMode = def.blend;
  layer.addChild(sprite);
  return new Promise((resolve) => {
    const finish = (): void => {
      if (!sprite.destroyed) sprite.destroy();
      resolve(sprite);
    };
    if (options.loopMs !== undefined) {
      setTimeout(finish, options.loopMs);
    } else {
      sprite.onComplete = finish;
    }
    sprite.play();
  });
}
