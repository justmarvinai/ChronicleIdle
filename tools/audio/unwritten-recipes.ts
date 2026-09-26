/**
 * The Unwritten's generated sounds (docs/design/UNWRITTEN.md §21): the quill that writes an
 * inscription, the chord an ink illuminates with, the blot that stains the page, and the page that
 * turns under the company's feet from one passage to the next. In-house, CC0 (docs/tech/CREDITS.md).
 */
import { chime, type Recipe } from './recipe.ts';
import {
  adsr,
  bandpass,
  burst,
  expDecay,
  lowpass,
  mix,
  mul,
  noise,
  normalize,
  note,
  osc,
  reverb,
  stereo,
} from './synth.ts';

/** One scratch of a quill: a narrow band of noise sweeping up the page. */
function scratch(seconds: number, seed: number, from: number, to: number) {
  return mul(
    bandpass(noise(seconds, seed), (t) => from + (to - from) * (t / seconds), 3.2),
    adsr(seconds, { a: 0.012, d: seconds * 0.4, s: 0.45, r: seconds * 0.3 }),
  );
}

export const UNWRITTEN_RECIPES: Recipe[] = [
  {
    // An inscription written: three quick strokes of a quill and the dot at the end of the line.
    key: 'sfx.unwritten.quill',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: scratch(0.13, 211, 2400, 5200), gain: 0.55 },
              { at: 0.12, sig: scratch(0.1, 223, 3000, 6100), gain: 0.5 },
              { at: 0.23, sig: scratch(0.16, 227, 2200, 4800), gain: 0.6 },
              { at: 0.42, sig: burst(0.03, 3600, 1.6, 229, 0.008), gain: 0.4 },
              { at: 0.42, sig: chime(88, 0.5, 0.8), gain: 0.12 },
            ]),
            0.25,
            0.2,
            0.6,
          ),
          -5,
        ),
        0.3,
      ),
  },
  {
    // An ink illuminated: a minor chord that blooms and rises a fifth, with a shimmer on top.
    key: 'sfx.unwritten.illuminate',
    loop: false,
    quality: 0.5,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: chime(57, 2.4, 0.6), gain: 0.35 },
              { at: 0.06, sig: chime(60, 2.3, 0.7), gain: 0.3 },
              { at: 0.12, sig: chime(64, 2.2, 0.8), gain: 0.3 },
              { at: 0.34, sig: chime(69, 2.0, 1.1), gain: 0.32 },
              { at: 0.46, sig: chime(76, 1.8, 1.4), gain: 0.22 },
              {
                at: 0.3,
                sig: mul(
                  osc('triangle', (t) => note(81) + t * 40, 1.6),
                  expDecay(1.6, 0.6, 0.35),
                ),
                gain: 0.12,
              },
            ]),
            0.7,
            0.45,
            2.2,
          ),
          -3,
        ),
        0.6,
      ),
  },
  {
    // A blot: a thick drop of ink landing, low and wet.
    key: 'sfx.unwritten.blot',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              {
                sig: mul(
                  osc('sine', (t) => 120 - t * 180, 0.4),
                  expDecay(0.4, 0.09),
                ),
                gain: 0.7,
              },
              { sig: mul(lowpass(noise(0.3, 239), 700, 0.9), expDecay(0.3, 0.05)), gain: 0.5 },
              { at: 0.02, sig: chime(46, 0.9, 0.4), gain: 0.14 },
            ]),
            0.45,
            0.3,
            1,
          ),
          -4,
        ),
        0.35,
      ),
  },
  {
    // The company steps onto the next passage: a heavy page turning over.
    key: 'sfx.unwritten.page',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          mix([
            {
              sig: mul(
                bandpass(noise(0.34, 241), (t) => 1400 + t * 5200, 0.9),
                adsr(0.34, { a: 0.09, d: 0.12, s: 0.35, r: 0.1 }),
              ),
              gain: 0.6,
            },
            { at: 0.28, sig: burst(0.05, 1800, 1.2, 251, 0.012), gain: 0.45 },
          ]),
          -8,
        ),
        0.35,
      ),
  },
];
