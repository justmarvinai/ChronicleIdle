/**
 * The Pixi battle stage and its presenter (docs/tech/ARCHITECTURE.md §3.4, UI_DESIGN.md §6):
 * backdrop with parallax and grading, ambient embers, unit sprites, flipbook FX, floating
 * numbers, a camera for shakes and pushes, and GSAP timelines that play `BattleEvent[]` at
 * the selected speed. Nothing here reads game state; the controller feeds it events.
 */
import { gsap } from 'gsap';
import { Application, Assets, Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { backdrop as backdropEntry } from '@assets/manifest';
import type { BackdropKey, ModelKey } from '@assets/manifest.generated';
import type { Element } from '@content/champions/types';
import type { BattleEvent, BattleView, UnitView } from '@engine/battle/index';
import { createRng } from '@engine/rng/rng';
import { ParticleField, makeGlowTexture } from '@render/ambient/particles';
import type { BattlePresenter } from '@state/battle/index';
import { castFx, hitFx, projectileFx, type FxId } from './fx/registry';
import { playFx, preloadFx } from './fx/flipbook';
import { STAGE_H, STAGE_W, bodyCentre, slotFor } from './layout';
import { NumberLayer } from './numbers';
import { UnitSprite, preloadModels } from './units';

export type BattleSound =
  | 'attack.melee'
  | 'attack.ranged'
  | `cast.${Element}`
  | 'hit.light'
  | 'hit.heavy'
  | 'hit.crit'
  | 'block'
  | 'heal'
  | 'buff'
  | 'debuff'
  | 'death'
  | 'revive'
  | 'wave'
  | 'victory'
  | 'defeat'
  | 'ultimate';

export interface StageHooks {
  sound(key: BattleSound): void;
  /** An A4 is about to be cast: show the cut-in for `ms` (already divided for speed). */
  cutIn(unitId: string, abilityId: string, ms: number): void;
}

export interface BattleStageHandle {
  presenter: BattlePresenter;
  setPaused(paused: boolean): void;
  /** Frame times of the last N frames for the perf bench. */
  frameStats(): { p50: number; p95: number; max: number; samples: number };
  destroy(): void;
}

export interface StageOptions {
  backdrop: BackdropKey;
  view: BattleView;
  hooks: StageHooks;
  /** Ambient ember count (0 under reduced motion). */
  embers?: number;
}

/** Timings at ×1 in seconds (UI_DESIGN.md §6 "battle choreography"). */
const T = {
  anticipation: 0.08,
  lunge: 0.14,
  recover: 0.2,
  raise: 0.12,
  projectile: 0.22,
  hitStop: 0.06,
  shake: 0.2,
  death: 0.5,
  revive: 0.6,
  wave: 0.7,
  cutIn: 0.5,
  turn: 0.12,
} as const;

export async function createBattleStage(
  host: HTMLElement,
  options: StageOptions,
): Promise<BattleStageHandle> {
  const app = new Application();
  await app.init({
    width: STAGE_W,
    height: STAGE_H,
    backgroundAlpha: 1,
    background: 0x0b0a0d,
    antialias: false,
    resolution: 1,
    autoDensity: false,
    preference: 'webgl',
    powerPreference: 'high-performance',
  });
  host.appendChild(app.canvas);
  app.canvas.style.width = '100%';
  app.canvas.style.height = '100%';
  app.canvas.style.display = 'block';

  const rng = createRng(`battle-stage:${options.view.encounterId}`);
  const camera = new Container();
  const world = new Container();
  const backdropLayer = new Container();
  const floor = new Graphics();
  const unitLayer = new Container();
  unitLayer.sortableChildren = true;
  const fxLayer = new Container();
  const fxBack = new Container();
  const numbers = new NumberLayer();
  const flash = new Graphics();
  flash.rect(0, 0, STAGE_W, STAGE_H).fill({ color: 0xffffff, alpha: 1 });
  flash.alpha = 0;
  const vignette = new Graphics();
  vignette.rect(0, 0, STAGE_W, STAGE_H).fill({ color: 0x000000, alpha: 0 });

  // Backdrop: cover-fit sprite, colour-graded by a dark multiply tint, parallax on camera moves.
  const bd = backdropEntry(options.backdrop);
  try {
    const texture = await Assets.load<Texture>(bd.url);
    const backdropSprite = new Sprite(texture);
    const scale = Math.max(STAGE_W / texture.width, STAGE_H / texture.height) * 1.06;
    backdropSprite.scale.set(scale);
    backdropSprite.anchor.set(0.5);
    backdropSprite.position.set(STAGE_W / 2, STAGE_H / 2);
    backdropSprite.tint = 0x9a8fa8;
    backdropLayer.addChild(backdropSprite);
  } catch {
    // The stage still works over the app background when the backdrop fails to decode.
  }
  // Floor plane: a soft dark ellipse gradient the units stand on (¾ perspective read).
  floor.ellipse(STAGE_W / 2, 820, 1100, 260).fill({ color: 0x000000, alpha: 0.35 });
  floor.ellipse(STAGE_W / 2, 840, 800, 160).fill({ color: 0x000000, alpha: 0.25 });

  world.addChild(backdropLayer, floor, fxBack, unitLayer, fxLayer, numbers.container);
  camera.addChild(world);
  app.stage.addChild(camera, vignette, flash);

  // Ambient embers drifting over the field.
  const glow = makeGlowTexture(app.renderer, 64);
  const embers =
    (options.embers ?? 40) > 0
      ? new ParticleField({
          rng: rng.fork('embers'),
          count: options.embers ?? 40,
          texture: glow,
          blend: 'add',
          tint: [0xffb36b, 0xff8a3d, 0xffd08a],
          area: { x: 0, y: 380, w: STAGE_W, h: 700 },
          size: [3, 8],
          alpha: [0.25, 0.8],
          vx: [-10, 10],
          vy: [-40, -12],
          life: [4, 9],
          wobble: { amp: 24, rate: 1.3 },
          flicker: 0.5,
        })
      : null;
  if (embers) fxBack.addChild(embers.container);

  const units = new Map<string, UnitSprite>();
  const addUnit = async (view: UnitView): Promise<void> => {
    if (units.has(view.id)) return;
    const unit = new UnitSprite(view);
    units.set(view.id, unit);
    unitLayer.addChild(unit.root);
    await unit.load();
  };
  const models = [...new Set(options.view.units.map((u) => u.art.model as ModelKey))];
  await Promise.all([preloadModels(models), preloadFx()]);
  await Promise.all(options.view.units.map(addUnit));
  const latestView = { current: options.view };

  // Frame statistics for the perf bench (UI_DESIGN.md §5.6 budget).
  const frames: number[] = [];
  let paused = false;
  let time = 0;
  app.ticker.add((ticker) => {
    if (paused) return;
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    time += dt;
    embers?.update(dt, time);
    frames.push(ticker.deltaMS);
    if (frames.length > 600) frames.shift();
  });

  const unitOf = (id: string): UnitSprite | undefined => units.get(id);
  const viewUnit = (id: string): UnitView | undefined => latestView.current.units.find((u) => u.id === id);
  const centreOf = (id: string): { x: number; y: number } => {
    const v = viewUnit(id);
    if (!v) return { x: STAGE_W / 2, y: STAGE_H / 2 };
    return bodyCentre(v.side, v.slot, v.art.scale);
  };

  const shake = (
    tl: gsap.core.Timeline,
    strength: number,
    duration: number,
    at: string | number = '>',
  ): void => {
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const k = 1 - i / steps;
      tl.to(
        camera,
        {
          x: (rng.next() - 0.5) * 2 * strength * k,
          y: (rng.next() - 0.5) * 2 * strength * k,
          duration: duration / steps,
        },
        i === 0 ? at : '>',
      );
    }
    tl.to(camera, { x: 0, y: 0, duration: 0.04 });
  };

  const whiteFlash = (tl: gsap.core.Timeline, alpha: number, at: string | number = '>'): void => {
    tl.to(flash, { alpha, duration: 0.03 }, at).to(flash, { alpha: 0, duration: 0.14 });
  };

  /** Builds and plays a timeline for one batch of events. */
  const play = (
    events: readonly BattleEvent[],
    speed: number,
    onEvent: (e: BattleEvent) => void,
  ): Promise<void> => {
    const tl = gsap.timeline({ paused: true });
    const fast = speed >= 4;
    const land = (e: BattleEvent, at: string | number = '>'): void => {
      tl.call(
        () => {
          latestView.current = { ...latestView.current };
          onEvent(e);
        },
        [],
        at,
      );
    };
    let caster: UnitSprite | null = null;
    let casterElement: Element = 'valor';
    let melee = false;
    let castSlot = 'a1';

    for (const e of events) {
      switch (e.type) {
        case 'battle.started':
        case 'turn.ended':
        case 'tm.changed':
        case 'passive.triggered':
        case 'status.failed':
          land(e);
          break;
        case 'wave.started': {
          land(e);
          const ids = e.enemyIds;
          tl.call(() => {
            for (const id of ids) {
              const v = viewUnit(id);
              if (v)
                void addUnit(v).then(() => {
                  const u = unitOf(id);
                  if (!u) return;
                  u.root.x = u.home.x + 260;
                  u.root.alpha = 0;
                  gsap.to(u.root, {
                    x: u.home.x,
                    alpha: 1,
                    duration: T.wave / Math.max(1, speed),
                    ease: 'power2.out',
                  });
                });
            }
          });
          if (e.wave > 1) {
            tl.to(camera, { x: -40, duration: T.wave * 0.5, ease: 'power2.out' }).to(camera, {
              x: 0,
              duration: T.wave * 0.5,
              ease: 'power2.inOut',
            });
            tl.call(() => options.hooks.sound('wave'));
          } else tl.to({}, { duration: 0.3 });
          break;
        }
        case 'turn.started': {
          land(e);
          const id = e.unitId;
          tl.call(() => {
            for (const [uid, u] of units) u.setActive(uid === id);
          });
          tl.to({}, { duration: T.turn });
          break;
        }
        case 'turn.skipped':
          land(e);
          tl.call(() => {
            const c = centreOf(e.unitId);
            numbers.show('status', e.reason.toUpperCase(), c.x, c.y - 40, speed);
          });
          tl.to({}, { duration: 0.25 });
          break;
        case 'dot.tick': {
          land(e);
          tl.call(() => {
            const c = centreOf(e.unitId);
            const fx: FxId =
              e.status === 'poison' ? 'dot.poison' : e.status === 'burn' ? 'dot.burn' : 'dot.bleed';
            void playFx(fxLayer, fx, { x: c.x, y: c.y, speed });
            numbers.show('dot', String(e.amount), c.x, c.y - 30, speed);
          });
          tl.to({}, { duration: 0.18 });
          break;
        }
        case 'ability.cast': {
          land(e);
          const u = unitOf(e.unitId);
          const v = viewUnit(e.unitId);
          caster = u ?? null;
          casterElement = v?.element ?? 'valor';
          castSlot = e.slot;
          if (!u) break;
          const target = e.targetId ? unitOf(e.targetId) : null;
          const supportRole = v?.role === 'support';
          melee = e.slot === 'a1' && !supportRole && !!target && !e.counter;
          if (e.slot === 'a4' && !e.counter) {
            const ms = (T.cutIn * 1000) / Math.min(speed, 2);
            tl.call(() => {
              options.hooks.cutIn(e.unitId, e.abilityId, ms);
              options.hooks.sound('ultimate');
            });
            tl.to({}, { duration: (T.cutIn * speed) / Math.min(speed, 2) });
            whiteFlash(tl, 0.35);
          }
          // Anticipation squash.
          tl.to(u.body.scale, { x: 1.12, y: 0.88, duration: T.anticipation, ease: 'power1.in' });
          if (melee && target) {
            const dx = (target.home.x - u.home.x) * 0.6;
            const dy = (target.home.y - u.home.y) * 0.6;
            tl.call(() => options.hooks.sound('attack.melee'));
            tl.to(u.body.scale, { x: 0.94, y: 1.08, duration: T.lunge * 0.5, ease: 'power2.out' }, '<');
            tl.to(u.root, { x: u.home.x + dx, y: u.home.y + dy, duration: T.lunge, ease: 'power2.in' }, '<');
          } else {
            tl.call(() =>
              options.hooks.sound(e.slot === 'a1' && !target ? 'attack.ranged' : `cast.${casterElement}`),
            );
            tl.to(u.body.scale, { x: 0.96, y: 1.1, duration: T.raise, ease: 'power2.out' }, '<');
            tl.to(u.body, { y: -18, duration: T.raise, ease: 'power2.out' }, '<');
            tl.call(() => {
              const c = centreOf(e.unitId);
              void playFx(fxLayer, castFx(casterElement), {
                x: c.x,
                y: c.y,
                speed,
                tint: e.counter ? 0xffffff : null,
              });
            });
            if (target && e.slot !== 'a1') {
              const from = centreOf(e.unitId);
              const to = centreOf(target.view.id);
              tl.call(() => {
                const angle = Math.atan2(to.y - from.y, to.x - from.x);
                void (async () => {
                  const proj = await playFx(fxLayer, projectileFx(casterElement), {
                    x: from.x,
                    y: from.y,
                    speed,
                    rotation: angle,
                    loopMs: (T.projectile * 1000) / speed,
                  });
                  void proj;
                })();
                const dummy = { t: 0 };
                gsap.to(dummy, { t: 1, duration: T.projectile / speed });
              });
              tl.to({}, { duration: T.projectile });
            } else tl.to({}, { duration: 0.06 });
          }
          break;
        }
        case 'hit': {
          const target = unitOf(e.targetId);
          const c = centreOf(e.targetId);
          const heavy = e.crit || e.damage > 0.25 * (viewUnit(e.targetId)?.maxHp ?? Infinity);
          tl.call(() => {
            const fx: FxId = e.crit ? 'hit.crit' : melee ? 'hit.physical' : hitFx(casterElement);
            void playFx(fxLayer, fx, { x: c.x, y: c.y, speed, flipX: viewUnit(e.targetId)?.side === 'ally' });
            if (e.absorbed > 0) numbers.show('shield', `-${e.absorbed}`, c.x + 30, c.y - 20, speed);
            if (e.damage > 0 || e.absorbed === 0)
              numbers.show(e.crit ? 'crit' : 'damage', String(e.damage), c.x, c.y - 10, speed);
            options.hooks.sound(
              e.absorbed > 0 && e.damage === 0
                ? 'block'
                : e.crit
                  ? 'hit.crit'
                  : heavy
                    ? 'hit.heavy'
                    : 'hit.light',
            );
          });
          land(e, '>');
          if (!fast) tl.to({}, { duration: T.hitStop });
          if (target) {
            tl.call(() => target.setTint(0xffffff));
            tl.to(
              target.body,
              { x: 10, duration: T.shake / 4, yoyo: true, repeat: 3, ease: 'power1.inOut' },
              '<',
            );
            tl.call(() => target.setTint(null));
            tl.set(target.body, { x: 0 });
          }
          if (e.crit || heavy) shake(tl, e.crit ? 14 : 8, T.shake, '<');
          if (e.crit) whiteFlash(tl, 0.18, '<');
          break;
        }
        case 'heal': {
          if (e.reason === 'regen' || e.reason === 'leech' || e.reason === 'survive') {
            land(e);
            tl.call(() => {
              const c = centreOf(e.targetId);
              numbers.show('heal', `+${e.amount}`, c.x, c.y - 10, speed);
            });
            tl.to({}, { duration: 0.12 });
            break;
          }
          land(e);
          tl.call(() => {
            const c = centreOf(e.targetId);
            void playFx(fxLayer, 'heal', { x: c.x, y: c.y + 20, speed });
            numbers.show('heal', `+${e.amount}`, c.x, c.y - 10, speed);
            options.hooks.sound('heal');
          });
          tl.to({}, { duration: 0.28 });
          break;
        }
        case 'status.applied': {
          land(e);
          tl.call(() => {
            const c = centreOf(e.targetId);
            const buff = ![
              'atk_down',
              'def_down',
              'spd_down',
              'weaken',
              'poison',
              'burn',
              'bleed',
              'stun',
              'freeze',
              'sleep',
              'provoke',
              'heal_reduction',
              'block_buffs',
              'fear',
            ].includes(e.status);
            const fx: FxId =
              e.status === 'shield'
                ? 'shield'
                : e.status === 'stun' || e.status === 'freeze' || e.status === 'sleep'
                  ? 'stun'
                  : buff
                    ? 'buff'
                    : 'debuff';
            void playFx(fxLayer, fx, { x: c.x, y: c.y + 10, speed });
            options.hooks.sound(buff ? 'buff' : 'debuff');
          });
          tl.to({}, { duration: 0.14 });
          break;
        }
        case 'status.removed': {
          land(e);
          if (e.reason === 'cleansed' || e.reason === 'stripped') {
            tl.call(() => {
              const c = centreOf(e.targetId);
              void playFx(fxLayer, 'cleanse', { x: c.x, y: c.y, speed });
            });
            tl.to({}, { duration: 0.1 });
          }
          break;
        }
        case 'unit.died': {
          const u = unitOf(e.unitId);
          land(e);
          tl.call(() => {
            const c = centreOf(e.unitId);
            void playFx(fxLayer, 'death', { x: c.x, y: c.y, speed });
            options.hooks.sound('death');
          });
          if (u) {
            tl.to(u.body, { alpha: 0, y: -50, duration: T.death, ease: 'power1.in' }, '<');
            tl.to(u.shadow, { alpha: 0, duration: T.death }, '<');
            tl.call(() => u.setDead(true));
          } else tl.to({}, { duration: T.death });
          break;
        }
        case 'unit.revived': {
          const u = unitOf(e.unitId);
          land(e);
          tl.call(() => {
            const c = centreOf(e.unitId);
            void playFx(fxLayer, 'revive', { x: c.x, y: c.y + 20, speed });
            options.hooks.sound('revive');
            u?.setDead(false);
            if (u) {
              u.body.alpha = 0;
              u.body.y = -50;
            }
          });
          if (u) {
            tl.to(u.body, { alpha: 1, y: 0, duration: T.revive, ease: 'power2.out' });
            tl.to(u.shadow, { alpha: 1, duration: T.revive }, '<');
          } else tl.to({}, { duration: T.revive });
          break;
        }
        case 'extra_turn':
          land(e);
          tl.call(() => {
            const c = centreOf(e.unitId);
            numbers.show('status', 'EXTRA TURN', c.x, c.y - 60, speed);
            void playFx(fxLayer, 'tm', { x: c.x, y: c.y + 30, speed });
          });
          tl.to({}, { duration: 0.2 });
          break;
        case 'enraged':
          land(e);
          tl.call(() => {
            const c = centreOf(e.unitId);
            numbers.show('crit', 'ENRAGED', c.x, c.y - 60, speed);
          });
          whiteFlash(tl, 0.12);
          shake(tl, 10, 0.25, '<');
          break;
        case 'wave.cleared':
          land(e);
          tl.to(camera.scale, { x: 1.03, y: 1.03, duration: 0.25, ease: 'power2.out' }).to(camera.scale, {
            x: 1,
            y: 1,
            duration: 0.35,
            ease: 'power2.inOut',
          });
          break;
        case 'battle.ended': {
          if (e.outcome.kind === 'victory') {
            tl.call(() => options.hooks.sound('victory'));
            tl.to(camera.scale, { x: 1.06, y: 1.06, duration: 0.6, ease: 'power2.out' });
            tl.call(() => gsap.globalTimeline.timeScale(0.4));
            tl.to({}, { duration: 0.6 });
            tl.call(() => gsap.globalTimeline.timeScale(1));
          } else if (e.outcome.kind !== 'retreat') {
            tl.call(() => options.hooks.sound('defeat'));
            tl.to(vignette, { alpha: 0.55, duration: 0.6 });
          }
          land(e);
          break;
        }
        default:
          land(e);
      }
      // Return the caster home after its action wraps (recover).
      if (e.type === 'turn.ended' && caster) {
        const u = caster;
        tl.to(u.root, { x: u.home.x, y: u.home.y, duration: T.recover, ease: 'power2.out' }, '<');
        tl.to(u.body, { y: 0, duration: T.recover, ease: 'power2.out' }, '<');
        tl.to(u.body.scale, { x: 1, y: 1, duration: T.recover, ease: 'back.out(1.6)' }, '<');
        caster = null;
        void castSlot;
      }
    }
    tl.timeScale(speed);
    return new Promise((resolve) => {
      tl.eventCallback('onComplete', () => resolve());
      if (tl.duration() === 0) resolve();
      else tl.play();
    });
  };

  const presenter: BattlePresenter = {
    play,
    mount(view) {
      latestView.current = view;
    },
  };

  return {
    presenter,
    setPaused(next) {
      paused = next;
      if (next) gsap.globalTimeline.pause();
      else gsap.globalTimeline.play();
    },
    frameStats() {
      const s = [...frames].sort((a, b) => a - b);
      const q = (p: number): number => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
      return { p50: q(0.5), p95: q(0.95), max: s[s.length - 1] ?? 0, samples: s.length };
    },
    destroy() {
      gsap.globalTimeline.timeScale(1);
      gsap.globalTimeline.play();
      for (const u of units.values()) u.destroy();
      units.clear();
      numbers.destroy();
      app.destroy(true, { children: true });
      host.replaceChildren();
    },
  };
}

export { slotFor };
