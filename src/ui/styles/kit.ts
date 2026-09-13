/**
 * 9-slice metadata for the UI kits (docs/tech/UI_DESIGN.md §4). Insets were measured from the
 * source PNGs (alpha edge scan); `fill` textures are buttons/panels whose middle is opaque.
 * Usage: `style={kitBorder('ui.dark_ember.frame_wide', 0.5)}` or the `KitFrame` component.
 */
import type { DecoKey, GlyphKey, UiKey } from '@assets/manifest.generated';

/**
 * Concrete border-image style. Declared without `undefined` members so it is assignable to both
 * React's `CSSProperties` and Motion's `MotionStyle` under `exactOptionalPropertyTypes`.
 */
export interface KitStyle {
  borderStyle: 'solid';
  borderWidth: string;
  borderImageSource: string;
  borderImageSlice: string;
  borderImageWidth: string;
  borderImageRepeat: 'stretch' | 'repeat' | 'round';
}

export interface KitSlice {
  /** Slice distance in source pixels (uniform or [top, right, bottom, left]). */
  slice: number | [number, number, number, number];
  fill: boolean;
  repeat: 'stretch' | 'repeat' | 'round';
  /** Source image size (for aspect-aware layouts). */
  w: number;
  h: number;
}

const s = (
  slice: KitSlice['slice'],
  w: number,
  h: number,
  fill = false,
  repeat: KitSlice['repeat'] = 'stretch',
): KitSlice => ({ slice, fill, repeat, w, h });

export const KIT = {
  // dark-ember — hollow frames
  'ui.dark_ember.frame_wide': s(13, 1024, 512),
  'ui.dark_ember.frame_wide_alt': s(13, 1024, 512),
  'ui.dark_ember.frame_tall': s(17, 800, 1200),
  'ui.dark_ember.frame_sm_thin': s(13, 256, 256),
  'ui.dark_ember.frame_sm_bevel': s(22, 256, 256),
  'ui.dark_ember.frame_sm_double': s(22, 256, 256),
  'ui.dark_ember.frame_round_lg': s(37, 512, 512),
  'ui.dark_ember.frame_round_sm': s(8, 64, 64),
  'ui.dark_ember.btn_ember_frame': s(22, 512, 256),
  'ui.dark_ember.bar_track_ember': s(15, 1024, 64),
  'ui.dark_ember.bar_fill_ember': s(15, 1024, 64, true),
  // dark-ember — filled textures
  'ui.dark_ember.btn_ember_wide': s(60, 512, 256, true),
  'ui.dark_ember.btn_ember_wide_on': s(60, 512, 256, true),
  'ui.dark_ember.btn_ember_wide_off': s(60, 512, 256, true),
  'ui.dark_ember.btn_ember_square': s(60, 256, 256, true),
  'ui.dark_ember.btn_ember_square_on': s(60, 256, 256, true),
  'ui.dark_ember.btn_ember_square_off': s(60, 256, 256, true),
  'ui.dark_ember.banner_plain': s([40, 60, 40, 60], 1024, 256, true),
  'ui.dark_ember.banner_dark': s([40, 60, 40, 60], 1024, 256, true),
  'ui.dark_ember.banner_arrow': s([40, 220, 40, 60], 1024, 256, true),
  'ui.dark_ember.bg_wide': s(24, 1024, 512, true),
  'ui.dark_ember.bg_tall': s(24, 800, 1200, true),
  'ui.dark_ember.bg_tile_sm': s(16, 256, 256, true, 'repeat'),
  'ui.dark_ember.panel_wide_ornate': s(72, 1024, 512, true),
  'ui.dark_ember.panel_tall_ornate': s(72, 1024, 1536, true),
  // stone-vine
  'ui.stone_vine.panel_stone': s([57, 54, 58, 54], 747, 642),
  'ui.stone_vine.panel_stone_fill': s(40, 683, 574, true),
  'ui.stone_vine.panel_arch': s([90, 87, 64, 86], 804, 804),
  'ui.stone_vine.panel_arch_fill': s(40, 686, 744, true),
  'ui.stone_vine.slot_stone_sm': s(20, 188, 198),
  'ui.stone_vine.slot_stone_md': s(25, 229, 235),
  'ui.stone_vine.slot_stone_lg': s(18, 274, 296),
  'ui.stone_vine.slot_stone_long': s(30, 733, 124, true),
  'ui.stone_vine.slot_stone_sm_fill': s(20, 153, 163, true),
  'ui.stone_vine.slot_stone_md_fill': s(24, 188, 199, true),
  'ui.stone_vine.slot_stone_lg_fill': s(24, 271, 294, true),
  'ui.stone_vine.btn_stone_wide': s(40, 461, 151, true),
  'ui.stone_vine.btn_stone_med': s(40, 272, 150, true),
  'ui.stone_vine.btn_stone_long': s(44, 674, 176, true),
  'ui.stone_vine.bar_track_stone': s([30, 40, 30, 40], 627, 103, true),
  'ui.stone_vine.bar_track_stone_1': s([30, 40, 30, 40], 627, 103, true),
  'ui.stone_vine.bar_track_stone_2': s([30, 40, 30, 40], 598, 103, true),
  'ui.stone_vine.bar_track_stone_3': s([30, 40, 30, 40], 627, 103, true),
  'ui.stone_vine.bar_fill_health': s([14, 20, 14, 20], 532, 56, true),
  'ui.stone_vine.bar_fill_mana': s([14, 20, 14, 20], 536, 56, true),
  'ui.stone_vine.bar_fill_stamina': s([14, 20, 14, 20], 533, 55, true),
} satisfies Partial<Record<UiKey, KitSlice>>;

/** Kit textures with slice metadata — the only keys `kitBorder` accepts, so a typo is a type error. */
export type KitKey = keyof typeof KIT;

/**
 * Transparent rounded-corner inset of each texture, in source pixels (measured by an alpha scan:
 * the smallest inset at which all four corners are opaque). A fill layer may bleed under a frame's
 * ring up to this inset without poking out past the artwork's silhouette, which is how a panel's
 * texture reaches the frame instead of leaving a ring of backdrop. Keys not listed have square,
 * opaque corners (inset 0).
 */
export const KIT_CORNER: Partial<Record<KitKey, number>> = {
  'ui.dark_ember.frame_wide': 1,
  'ui.dark_ember.frame_wide_alt': 1,
  'ui.dark_ember.frame_sm_bevel': 1,
  'ui.dark_ember.frame_sm_double': 1,
  'ui.dark_ember.frame_round_lg': 60,
  'ui.dark_ember.frame_round_sm': 9,
  'ui.dark_ember.btn_ember_frame': 1,
  'ui.dark_ember.bar_track_ember': 4,
  'ui.stone_vine.panel_stone': 6,
  // The arch's top band is a real arch: its inner edge sits 53 px down at the centre and 114 px at
  // the corners, so the ring is part transparent and the fill has to bleed under it.
  'ui.stone_vine.panel_arch': 31,
  'ui.stone_vine.slot_stone_sm': 4,
  'ui.stone_vine.slot_stone_md': 9,
  'ui.stone_vine.slot_stone_lg': 18,
};

/** Pixel deco frames: 96 px sheets with 32 px corners. */
export const DECO_SLICE = 32;

/**
 * `line` is the bare ivory outline with ornate corners; `solid` adds an opaque inner band (the
 * frame's fill starts inside the 32 px slice, so it reads as a thick rarity border); `soft` and
 * `scrim` are the 50 % alpha versions of the outline and of the fill respectively.
 */
export type DecoVariant = 'line' | 'solid' | 'soft' | 'scrim';

/** Manifest key of pixel deco frame 1–32 in the given variant. */
export function decoKey(frame: number, variant: DecoVariant): DecoKey {
  return `deco.${String(Math.min(32, Math.max(1, Math.round(frame)))).padStart(2, '0')}.${variant}` as DecoKey;
}

export function cssVar(key: UiKey | GlyphKey): string {
  return `var(--${key.replace(/[._]/g, '-')})`;
}

/**
 * Inline style for a 9-sliced kit texture. `scale` maps source pixels to on-screen pixels
 * (0.5 = kit drawn at half its source size, which keeps the ember frames crisp at 1080p).
 */
/** Border widths of a 9-sliced texture in screen px, `[top, right, bottom, left]`. */
export function kitWidths(key: KitKey, scale = 0.5): [number, number, number, number] {
  const meta: KitSlice = KIT[key];
  const slice = Array.isArray(meta.slice) ? meta.slice : [meta.slice, meta.slice, meta.slice, meta.slice];
  return slice.map((v) => Math.round(v * scale)) as [number, number, number, number];
}

/**
 * How far inside a frame's outer edge its fill layer starts, in screen px. Zero for square-cornered
 * frames (the fill then bleeds under the whole ring); a few px for rounded or ornate ones.
 */
export function kitFillInset(key: KitKey, scale = 0.5): number {
  return Math.round((KIT_CORNER[key] ?? 0) * scale);
}

export function kitBorder(key: KitKey, scale = 0.5): KitStyle {
  const meta: KitSlice = KIT[key];
  const slice = Array.isArray(meta.slice) ? meta.slice : [meta.slice, meta.slice, meta.slice, meta.slice];
  const widths = slice.map((v) => `${Math.round(v * scale)}px`).join(' ');
  return {
    borderStyle: 'solid',
    borderWidth: widths,
    borderImageSource: cssVar(key),
    borderImageSlice: `${slice.join(' ')}${meta.fill ? ' fill' : ''}`,
    borderImageWidth: widths,
    borderImageRepeat: meta.repeat,
  };
}
