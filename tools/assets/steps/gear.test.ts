import { describe, expect, it } from 'vitest';
import { keyBlack, slotOf } from './gear.ts';

/** One RGB pixel per entry, as the emblem sources are read. */
const rgb = (...pixels: Array<[number, number, number]>): Uint8Array => new Uint8Array(pixels.flat());
const pixel = (rgba: Uint8Array, index: number): number[] => [...rgba.subarray(index * 4, index * 4 + 4)];

describe('the gear art pipeline', () => {
  it('reads every spelling of a slot the owner’s folders use, and guesses at none', () => {
    expect(slotOf('ember_guard', 'ember_guard_helmet.png')).toBe('helmet');
    expect(slotOf('keen_eye', 'keen_eye_chestplate.png')).toBe('chestplate');
    // The four variants that occur in /game, which is read-only.
    expect(slotOf('lifedrinker', 'lifedrinker_boot.png')).toBe('boots');
    expect(slotOf('swiftfoot', 'swiftfoot_gauntlet.png')).toBe('gauntlets');
    expect(slotOf('relentless', 'relentless_gauntlents.png')).toBe('gauntlets');
    expect(slotOf('stunlock', 'stunlock_sword.png')).toBe('weapon');
    // A file that does not carry its folder's name is read by its last word.
    expect(slotOf('warcry', 'Warcry_Shield.PNG')).toBe('shield');
    // A word that is no slot is left for the build to warn about.
    expect(slotOf('warcry', 'warcry_gloves.png')).toBeNull();
    expect(slotOf('warcry', 'warcry.png')).toBeNull();
  });

  it('keys an emblem’s black away and keeps its colour at the rim', () => {
    // A red emblem at full fill, black ground, and a rim pixel at half coverage.
    const fill: [number, number, number] = [240, 20, 20];
    const source = rgb(fill, fill, fill, fill, [0, 0, 0], [3, 1, 0], [120, 10, 10]);
    const keyed = keyBlack(source, 7);
    expect(pixel(keyed, 0)).toEqual([240, 20, 20, 255]);
    // Black and the sources' faint noise both come out clear.
    expect(pixel(keyed, 4)[3]).toBe(0);
    expect(pixel(keyed, 5)[3]).toBe(0);
    // The rim is half there, in the fill's colour rather than a darker red: no black fringe.
    const [r, g, b, a] = pixel(keyed, 6);
    expect(a).toBeGreaterThan(110);
    expect(a).toBeLessThan(140);
    expect([r, g, b]).toEqual([240, 20, 20]);
  });

  it('measures each emblem against its own fill, so a dark one keys solid too', () => {
    // Executioner's red peaks at 157, not 253: keyed against white it would be two-thirds clear.
    const blood: [number, number, number] = [157, 8, 8];
    const keyed = keyBlack(rgb(blood, blood, blood, blood, [0, 0, 0]), 5);
    expect(pixel(keyed, 0)).toEqual([157, 8, 8, 255]);
    expect(pixel(keyed, 4)[3]).toBe(0);
  });
});
