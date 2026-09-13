import { describe, expect, it } from 'vitest';
import { KIT, KIT_CORNER, cssVar, decoKey, kitBorder, kitFillInset, kitWidths } from './kit';

describe('kit slices', () => {
  it('declares sane 9-slice metadata for every kit texture', () => {
    for (const [key, meta] of Object.entries(KIT)) {
      const [top, right, bottom, left] = Array.isArray(meta.slice)
        ? meta.slice
        : [meta.slice, meta.slice, meta.slice, meta.slice];
      for (const s of [top, right, bottom, left]) expect(s, key).toBeGreaterThan(0);
      expect(top + bottom, `${key} vertical slices overlap`).toBeLessThanOrEqual(meta.h);
      expect(left + right, `${key} horizontal slices overlap`).toBeLessThanOrEqual(meta.w);
    }
  });

  it('scales border widths with the requested draw scale and keeps the source slice', () => {
    const style = kitBorder('ui.dark_ember.frame_wide', 0.5);
    expect(style.borderWidth).toBe('7px 7px 7px 7px');
    expect(style.borderImageSlice).toBe('13 13 13 13');
    expect(style.borderImageSource).toBe('var(--ui-dark-ember-frame-wide)');
    const filled = kitBorder('ui.dark_ember.btn_ember_wide', 1);
    expect(filled.borderImageSlice).toContain(' fill');
  });

  it('reports border widths and the fill inset a frame can hide', () => {
    expect(kitWidths('ui.stone_vine.panel_stone', 0.5)).toEqual([29, 27, 29, 27]);
    expect(kitWidths('ui.dark_ember.frame_wide', 0.7)).toEqual([9, 9, 9, 9]);
    // A fill bleeds under the ring up to the frame's transparent rounded corner, never past it.
    expect(kitFillInset('ui.stone_vine.panel_arch', 0.5)).toBe(16);
    expect(kitFillInset('ui.stone_vine.panel_stone', 0.5)).toBe(3);
    expect(kitFillInset('ui.dark_ember.frame_tall', 0.7)).toBe(0);
    for (const [key, corner] of Object.entries(KIT_CORNER)) {
      const meta = KIT[key as keyof typeof KIT];
      expect(corner, key).toBeGreaterThan(0);
      expect(corner, `${key} corner is wider than the texture`).toBeLessThan(Math.min(meta.w, meta.h) / 3);
    }
  });

  it('maps manifest keys to CSS custom properties and deco frame ids', () => {
    expect(cssVar('glyph.arcane_symbol')).toBe('var(--glyph-arcane-symbol)');
    expect(decoKey(7, 'solid')).toBe('deco.07.solid');
    expect(decoKey(99, 'soft')).toBe('deco.32.soft');
    expect(decoKey(0, 'scrim')).toBe('deco.01.scrim');
  });
});
