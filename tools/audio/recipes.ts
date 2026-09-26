/**
 * Generated sound recipes (docs/tech/UI_DESIGN.md §7 "generated"). Keys use the same scheme as
 * owner sounds so the runtime registry does not care where a sound came from. The interface's own
 * sounds, the rewards, the stingers and the ambience are here; the Portal's are in
 * `summon-recipes.ts`.
 */
import { chime, type Recipe } from './recipe.ts';
import { SUMMON_RECIPES } from './summon-recipes.ts';
import { UNWRITTEN_RECIPES } from './unwritten-recipes.ts';
import {
  SR,
  adsr,
  bandpass,
  burst,
  delay,
  expDecay,
  fade,
  gain,
  highpass,
  loopable,
  lowpass,
  mix,
  mul,
  noise,
  normalize,
  note,
  osc,
  reverb,
  softclip,
  stereo,
} from './synth.ts';

export const RECIPES: Recipe[] = [
  {
    key: 'sfx.ui.hover',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          mix([
            { sig: burst(0.05, 3200, 1.2, 11, 0.012), gain: 0.5 },
            { sig: mul(osc('sine', 1760, 0.05), expDecay(0.05, 0.012)), gain: 0.35 },
          ]),
          -9,
        ),
        0.1,
      ),
  },
  {
    key: 'sfx.ui.confirm',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: mul(osc('triangle', note(76), 0.35), expDecay(0.35, 0.09)), gain: 0.6 },
              { at: 0.07, sig: mul(osc('triangle', note(83), 0.4), expDecay(0.4, 0.11)), gain: 0.55 },
              { sig: burst(0.03, 4000, 1, 3, 0.008), gain: 0.25 },
            ]),
            0.3,
            0.18,
            0.5,
          ),
          -3,
        ),
        0.25,
      ),
  },
  {
    key: 'sfx.ui.cancel',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          mix([
            {
              sig: mul(
                osc('triangle', (t) => note(69) * Math.pow(2, -t * 1.2), 0.22),
                expDecay(0.22, 0.07),
              ),
              gain: 0.6,
            },
            { sig: burst(0.08, 1800, 0.8, 5, 0.02), gain: 0.3 },
          ]),
          -5,
        ),
        0.15,
      ),
  },
  {
    key: 'sfx.ui.tab',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          mix([
            { sig: burst(0.06, 1400, 1.5, 7, 0.01), gain: 0.7 },
            { sig: mul(osc('sine', 420, 0.06), expDecay(0.06, 0.015)), gain: 0.5 },
          ]),
          -7,
        ),
        0.1,
      ),
  },
  {
    key: 'sfx.ui.error',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          lowpass(
            mul(
              mix([
                { sig: osc('square', 110, 0.22), gain: 0.5 },
                { sig: osc('square', 116.5, 0.22), gain: 0.5 },
              ]),
              adsr(0.22, { a: 0.005, d: 0.05, s: 0.7, r: 0.08 }),
            ),
            900,
            0.9,
          ),
          -6,
        ),
        0.2,
      ),
  },
  {
    key: 'sfx.ui.open',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          mul(
            highpass(
              lowpass(noise(0.16, 21), (t) => 400 + t * 9000, 0.8),
              300,
            ),
            adsr(0.16, { a: 0.01, d: 0.05, s: 0.6, r: 0.08 }),
          ),
          -10,
        ),
        0.35,
      ),
  },
  {
    key: 'sfx.ui.close',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          mul(
            highpass(
              lowpass(noise(0.14, 22), (t) => 1800 - t * 9000, 0.8),
              250,
            ),
            adsr(0.14, { a: 0.005, d: 0.04, s: 0.5, r: 0.07 }),
          ),
          -11,
        ),
        0.35,
      ),
  },
  {
    key: 'sfx.reward.small',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: chime(84, 0.5), gain: 0.5 },
              { at: 0.08, sig: chime(88, 0.5), gain: 0.45 },
              { at: 0.16, sig: chime(91, 0.7), gain: 0.5 },
            ]),
            0.4,
            0.22,
            0.6,
          ),
          -4,
        ),
        0.3,
      ),
  },
  {
    key: 'sfx.reward.medium',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: chime(79, 0.6), gain: 0.45 },
              { at: 0.07, sig: chime(83, 0.6), gain: 0.45 },
              { at: 0.14, sig: chime(86, 0.6), gain: 0.45 },
              { at: 0.21, sig: chime(91, 0.8), gain: 0.5 },
              { at: 0.28, sig: chime(95, 1.0, 1.2), gain: 0.5 },
              { at: 0.1, sig: mul(lowpass(noise(0.6, 31), 6000, 0.7), expDecay(0.6, 0.2)), gain: 0.08 },
            ]),
            0.5,
            0.28,
            0.9,
          ),
          -3,
        ),
        0.35,
      ),
  },
  {
    key: 'sfx.reward.large',
    loop: false,
    quality: 0.5,
    render: () => {
      const pad = mul(
        mix([
          { sig: osc('saw', note(55), 1.6) },
          { sig: osc('saw', note(55) * 1.003, 1.6) },
          { sig: osc('saw', note(62), 1.6), gain: 0.7 },
          { sig: osc('saw', note(67), 1.6), gain: 0.6 },
        ]),
        adsr(1.6, { a: 0.15, d: 0.4, s: 0.5, r: 0.7 }),
      );
      const cascade = mix(
        [79, 83, 86, 91, 95, 98, 103].map((m, i) => ({
          at: 0.12 + i * 0.09,
          sig: chime(m, 1.2, 1.1),
          gain: 0.42,
        })),
      );
      return stereo(
        normalize(
          reverb(
            mix([
              { sig: lowpass(pad, (t) => 600 + t * 1800, 0.8), gain: 0.35 },
              { sig: cascade, gain: 0.7 },
            ]),
            0.7,
            0.32,
            1.4,
          ),
          -2.5,
        ),
        0.45,
      );
    },
  },
  {
    key: 'sfx.stinger.levelup',
    loop: false,
    quality: 0.5,
    render: () => {
      const brass = (midi: number, at: number, seconds: number, g: number) => ({
        at,
        gain: g,
        sig: lowpass(
          softclip(
            mul(
              mix([
                { sig: osc('saw', note(midi), seconds) },
                { sig: osc('saw', note(midi) * 1.004, seconds) },
                { sig: osc('pulse', note(midi) / 2, seconds), gain: 0.35 },
              ]),
              adsr(seconds, { a: 0.02, d: 0.15, s: 0.75, r: 0.25 }),
            ),
            1.8,
          ),
          (t) => 900 + t * 2200,
          0.9,
        ),
      });
      return stereo(
        normalize(
          reverb(
            mix([
              brass(60, 0, 0.32, 0.5),
              brass(64, 0.16, 0.32, 0.5),
              brass(67, 0.32, 0.9, 0.55),
              brass(72, 0.32, 0.9, 0.45),
              { at: 0.34, sig: chime(96, 1.1, 1.3), gain: 0.4 },
              { at: 0.5, sig: chime(103, 1.2, 1.2), gain: 0.35 },
              { at: 0.32, sig: mul(lowpass(noise(0.9, 41), 5000, 0.7), expDecay(0.9, 0.25)), gain: 0.1 },
            ]),
            0.6,
            0.3,
            1.2,
          ),
          -2,
        ),
        0.4,
      );
    },
  },
  {
    key: 'sfx.stinger.new_chronicle',
    loop: false,
    quality: 0.5,
    render: () => {
      const swell = mul(
        mix([
          { sig: osc('saw', note(43), 2.4) },
          { sig: osc('saw', note(43) * 1.005, 2.4) },
          { sig: osc('triangle', note(50), 2.4), gain: 0.6 },
          { sig: osc('triangle', note(55), 2.4), gain: 0.5 },
        ]),
        adsr(2.4, { a: 0.9, d: 0.3, s: 0.8, r: 0.9 }),
      );
      return stereo(
        normalize(
          reverb(
            mix([
              { sig: lowpass(swell, (t) => 250 + t * 1400, 1.1), gain: 0.5 },
              { at: 1.0, sig: chime(74, 1.6, 0.9), gain: 0.35 },
              { at: 1.25, sig: chime(81, 1.6, 1.0), gain: 0.35 },
              { at: 1.5, sig: chime(86, 1.8, 1.1), gain: 0.4 },
            ]),
            0.8,
            0.35,
            1.8,
          ),
          -2.5,
        ),
        0.5,
      );
    },
  },
  {
    // Victory: a rising brass triad with a bright bell tail (UI_DESIGN.md §7 "generated stingers").
    key: 'sfx.stinger.victory',
    loop: false,
    quality: 0.5,
    render: () => {
      const brass = (midi: number, at: number, seconds: number, g: number) => ({
        at,
        gain: g,
        sig: lowpass(
          softclip(
            mul(
              mix([
                { sig: osc('saw', note(midi), seconds) },
                { sig: osc('saw', note(midi) * 1.003, seconds) },
                { sig: osc('pulse', note(midi) / 2, seconds), gain: 0.3 },
              ]),
              adsr(seconds, { a: 0.02, d: 0.12, s: 0.8, r: 0.3 }),
            ),
            1.7,
          ),
          (t) => 800 + t * 2600,
          0.9,
        ),
      });
      return stereo(
        normalize(
          reverb(
            mix([
              brass(55, 0, 0.28, 0.45),
              brass(62, 0.14, 0.28, 0.45),
              brass(67, 0.28, 0.32, 0.5),
              brass(74, 0.44, 1.2, 0.55),
              brass(79, 0.44, 1.2, 0.4),
              { at: 0.46, sig: chime(98, 1.3, 1.3), gain: 0.4 },
              { at: 0.62, sig: chime(105, 1.4, 1.2), gain: 0.35 },
              { at: 0.44, sig: mul(lowpass(noise(1.1, 43), 6000, 0.7), expDecay(1.1, 0.3)), gain: 0.12 },
            ]),
            0.65,
            0.32,
            1.4,
          ),
          -2,
        ),
        0.45,
      );
    },
  },
  {
    // Defeat: a falling minor swell with a low thud and a long dark tail.
    key: 'sfx.stinger.defeat',
    loop: false,
    quality: 0.5,
    render: () => {
      const swell = (midi: number, at: number, seconds: number, g: number) => ({
        at,
        gain: g,
        sig: lowpass(
          mul(
            mix([
              { sig: osc('saw', note(midi), seconds) },
              { sig: osc('triangle', note(midi) * 0.5, seconds), gain: 0.7 },
            ]),
            adsr(seconds, { a: 0.05, d: 0.4, s: 0.5, r: 0.8 }),
          ),
          (t) => 1400 - t * 900,
          0.8,
        ),
      });
      const thud = mul(lowpass(noise(0.6, 47), 180, 0.9), expDecay(0.6, 0.12));
      return stereo(
        normalize(
          reverb(
            mix([
              swell(50, 0, 0.9, 0.5),
              swell(46, 0.35, 1.1, 0.5),
              swell(41, 0.7, 1.8, 0.55),
              { at: 0.7, sig: thud, gain: 0.8 },
              { at: 0.72, sig: mul(osc('sine', 55, 1.2), expDecay(1.2, 0.35)), gain: 0.5 },
            ]),
            0.85,
            0.4,
            2.2,
          ),
          -2.5,
        ),
        0.45,
      );
    },
  },
  {
    key: 'ambience.generated.void_drone',
    loop: true,
    quality: 0.35,
    render: () => {
      const seconds = 14;
      const lfo = (rate: number, depth: number, base: number) => (t: number) =>
        base + Math.sin(2 * Math.PI * rate * t) * depth;
      const layers = mix([
        { sig: osc('saw', lfo(0.07, 0.4, 55), seconds), gain: 0.5 },
        { sig: osc('saw', lfo(0.05, 0.5, 55.3), seconds), gain: 0.5 },
        { sig: osc('triangle', lfo(0.03, 0.6, 82.5), seconds), gain: 0.35 },
        { sig: osc('sine', lfo(0.11, 1.5, 110), seconds), gain: 0.25 },
        { sig: bandpass(noise(seconds, 77), lfo(0.09, 300, 900), 2), gain: 0.12 },
      ]);
      const shaped = lowpass(layers, lfo(0.043, 160, 420), 1.4);
      const wet = reverb(delay(shaped, 0.37, 0.35, 0.3, 0.2), 0.9, 0.4, 0.2);
      const trimmed = wet.subarray(0, seconds * SR);
      return stereo(normalize(fade(loopable(trimmed, 2.5), 0, 0), -6), 0.6);
    },
  },
  ...SUMMON_RECIPES,
  ...UNWRITTEN_RECIPES,
];

export const RECIPE_KEYS = RECIPES.map((r) => r.key);
export { gain };
