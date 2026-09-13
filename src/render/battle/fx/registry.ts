/**
 * Effect keys → flipbook sheets and presentation parameters (docs/tech/UI_DESIGN.md §6.3).
 * Sheets come from the owner's two packs; tints and scales adapt one sheet to several uses.
 */
import type { FxKey } from '@assets/manifest.generated';
import type { Element } from '@content/champions/types';

export interface FxDef {
  sheet: FxKey;
  /** Sprite scale relative to the sheet's frame size. */
  scale: number;
  /** Playback speed multiplier over the sheet's fps. */
  speed: number;
  tint: number | null;
  blend: 'add' | 'screen' | 'normal';
  /** 0..1 anchor inside the frame (feet-based sprites want 0.5/0.8). */
  anchorY: number;
  /** Ambient alpha (projectiles fade in/out on their own). */
  alpha: number;
}

const def = (sheet: FxKey, extra: Partial<FxDef> = {}): FxDef => ({
  sheet,
  scale: 2,
  speed: 1.6,
  tint: null,
  blend: 'add',
  anchorY: 0.5,
  alpha: 1,
  ...extra,
});

export const ELEMENT_TINT: Record<Element, number> = {
  justice: 0xffd766,
  valor: 0xff6a3d,
  faith: 0x5fb8ff,
  eclipse: 0xb56cff,
};

export const FX = {
  'cast.justice': def('fx.gamefx.light_cast', { scale: 2.6, speed: 2 }),
  'cast.valor': def('fx.gamefx.fire_cast', { scale: 2.6, speed: 2 }),
  'cast.faith': def('fx.gamefx.ice_cast', { scale: 2.6, speed: 2 }),
  'cast.eclipse': def('fx.pixel.midnight', { scale: 2.4, speed: 2.4 }),
  'projectile.justice': def('fx.gamefx.medium_star', { scale: 2, speed: 2.5 }),
  'projectile.valor': def('fx.gamefx.fire_ball', { scale: 2.2, speed: 2.5 }),
  'projectile.faith': def('fx.gamefx.ice_pick', { scale: 2.2, speed: 2.5 }),
  'projectile.eclipse': def('fx.pixel.phantom', { scale: 1.8, speed: 3 }),
  'hit.justice': def('fx.gamefx.holy_explosion', { scale: 2.6, speed: 2.2 }),
  'hit.valor': def('fx.gamefx.fire_burst', { scale: 3, speed: 2.2 }),
  'hit.faith': def('fx.gamefx.ice_shatter', { scale: 2.6, speed: 2.2 }),
  'hit.eclipse': def('fx.pixel.vortex', { scale: 2.2, speed: 3 }),
  'hit.physical': def('fx.pixel.weaponhit', { scale: 2.4, speed: 2.6, blend: 'screen' }),
  'hit.crit': def('fx.pixel.magickahit', { scale: 2.8, speed: 2.6 }),
  heal: def('fx.pixel.magicbubbles', { scale: 2.4, speed: 2.4, tint: 0x7dff9a }),
  revive: def('fx.pixel.magicspell', { scale: 3, speed: 2, tint: 0xffe08a }),
  buff: def('fx.pixel.casting', { scale: 2.4, speed: 2.8, tint: 0x9dffb0 }),
  debuff: def('fx.gamefx.poison_cast', { scale: 2.4, speed: 2.6, tint: 0xff6d8a }),
  shield: def('fx.gamefx.magic_barrier', { scale: 3.2, speed: 2, tint: 0x8fd0ff }),
  cleanse: def('fx.pixel.brightfire', { scale: 2.2, speed: 3, tint: 0xfff2c0 }),
  'dot.poison': def('fx.gamefx.poison_claw', { scale: 1.8, speed: 2.8 }),
  'dot.burn': def('fx.pixel.fire', { scale: 1.6, speed: 3, tint: 0xff8a3d }),
  'dot.bleed': def('fx.pixel.weaponhit', { scale: 1.6, speed: 3, tint: 0xff3b4b, blend: 'normal' }),
  explosion: def('fx.gamefx.explosion', { scale: 3, speed: 2 }),
  ultimate: def('fx.gamefx.explosion_3', { scale: 3.2, speed: 1.8 }),
  tm: def('fx.gamefx.tornado_static', { scale: 2, speed: 3, tint: 0xcfe8ff }),
  stun: def('fx.gamefx.small_star', { scale: 1.6, speed: 3, tint: 0xfff4a0 }),
  death: def('fx.pixel.nebula', { scale: 2.6, speed: 2.4, tint: 0x8a7a9a, blend: 'screen' }),
} as const satisfies Record<string, FxDef>;

export type FxId = keyof typeof FX;

export function castFx(element: Element): FxId {
  return `cast.${element}`;
}
export function projectileFx(element: Element): FxId {
  return `projectile.${element}`;
}
export function hitFx(element: Element): FxId {
  return `hit.${element}`;
}
