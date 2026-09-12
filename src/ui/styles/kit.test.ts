import { describe, expect, it } from 'vitest';
import { KIT, cssVar, decoKey, kitBorder } from './kit';

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

  it('maps manifest keys to CSS custom properties and deco frame ids', () => {
    expect(cssVar('glyph.arcane_symbol')).toBe('var(--glyph-arcane-symbol)');
    expect(decoKey(7, 'solid')).toBe('deco.07.solid');
    expect(decoKey(99, 'soft')).toBe('deco.32.soft');
    expect(decoKey(0, 'scrim')).toBe('deco.01.scrim');
  });
});
