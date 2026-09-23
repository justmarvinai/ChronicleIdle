/**
 * The Summoning Portal's generated sounds (docs/design/SUMMONING.md §5): the ritual's charge, its
 * tells, the held breath, the wind-up and the shatter; the cards' deal, stars and seal; and a
 * reveal sting for every rarity.
 */
import { chime, type Recipe } from './recipe.ts';
import {
  SR,
  adsr,
  bandpass,
  burst,
  expDecay,
  highpass,
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

export const SUMMON_RECIPES: Recipe[] = [
  {
    // The ritual charging: light spiralling into the gate, the runes kindling. A riser that swells
    // for as long as the charge lasts and stops short of a hit — the first tell is the hit
    // (SUMMONING.md §5.1).
    key: 'sfx.summon.charge',
    loop: false,
    quality: 0.5,
    render: () => {
      const seconds = 1.3;
      const rise = (t: number): number => Math.pow(Math.min(1, t / seconds), 1.6);
      const swell = mul(
        mix([
          { sig: osc('saw', (t) => 82 + rise(t) * 140, seconds) },
          { sig: osc('saw', (t) => 82.6 + rise(t) * 141, seconds), gain: 0.8 },
          { sig: osc('sine', (t) => 41 + rise(t) * 70, seconds), gain: 0.9 },
        ]),
        adsr(seconds, { a: 1.05, d: 0.05, s: 0.9, r: 0.2 }),
      );
      const air = mul(
        bandpass(noise(seconds, 71), (t) => 600 + rise(t) * 5200, 1.4),
        adsr(seconds, { a: 1.1, d: 0.02, s: 1, r: 0.18 }),
      );
      const shimmer = mul(
        mix([
          { sig: osc('sine', (t) => note(88) + rise(t) * 600, seconds) },
          { sig: osc('sine', (t) => note(95) + rise(t) * 900, seconds), gain: 0.6 },
        ]),
        mul(
          adsr(seconds, { a: 1, d: 0.05, s: 0.8, r: 0.25 }),
          osc('sine', (t) => 7 + rise(t) * 16, seconds).map((v) => 0.55 + 0.45 * v),
        ),
      );
      return stereo(
        normalize(
          reverb(
            mix([
              { sig: lowpass(swell, (t) => 220 + rise(t) * 3200, 1.3), gain: 0.45 },
              { sig: air, gain: 0.3 },
              { sig: shimmer, gain: 0.08 },
            ]),
            0.6,
            0.28,
            0.9,
          ),
          -4,
        ),
        0.4,
      );
    },
  },
  {
    // Cracks spreading over the shard: dry splinters over a low strain (SUMMONING.md §5.2).
    key: 'sfx.summon.crack',
    loop: false,
    quality: 0.45,
    render: () => {
      const splinter = (at: number, seed: number, g: number) => ({
        at,
        gain: g,
        sig: mul(burst(0.12, 4200, 2.4, seed, 0.012), expDecay(0.12, 0.02)),
      });
      return stereo(
        normalize(
          mix([
            splinter(0, 13, 0.55),
            splinter(0.07, 29, 0.4),
            splinter(0.16, 41, 0.5),
            splinter(0.27, 57, 0.35),
            {
              sig: mul(
                osc('sine', (t) => 90 - t * 30, 0.45),
                expDecay(0.45, 0.12),
              ),
              gain: 0.4,
            },
          ]),
          -5,
        ),
        0.3,
      );
    },
  },
  {
    // A tell: the gate shows one more rarity. A struck crystal over a soft thump; the Portal plays it
    // a whole tone higher for every rarity up the ladder, so gold always rings the same bright note
    // (SUMMONING.md §5.2).
    key: 'sfx.summon.tell',
    loop: false,
    quality: 0.5,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: chime(76, 0.9, 1.3), gain: 0.5 },
              { sig: chime(83, 0.8, 1.1), gain: 0.28 },
              {
                sig: mul(
                  osc('sine', (t) => 110 - t * 160, 0.22),
                  expDecay(0.22, 0.05),
                ),
                gain: 0.55,
              },
              { sig: burst(0.06, 6000, 1.1, 37, 0.01), gain: 0.2 },
            ]),
            0.55,
            0.3,
            1,
          ),
          -4,
        ),
        0.35,
      ),
  },
  {
    // The held breath before gold: two heartbeats under a dark hum, and nothing else. The thumps
    // land where the crystal's pulses do (0.1 s and 0.34 s into the stall).
    key: 'sfx.summon.stall',
    loop: false,
    quality: 0.5,
    render: () => {
      const beat = (at: number, g: number, pitch: number) => ({
        at,
        gain: g,
        sig: mul(
          mix([
            { sig: osc('sine', (t) => pitch - t * 90, 0.3) },
            { sig: lowpass(noise(0.3, 211), 180, 0.9), gain: 0.4 },
          ]),
          expDecay(0.3, 0.07),
        ),
      });
      const hum = mul(
        mix([{ sig: osc('saw', 55, 0.75) }, { sig: osc('saw', 55.4, 0.75), gain: 0.8 }]),
        adsr(0.75, { a: 0.08, d: 0.2, s: 0.6, r: 0.3 }),
      );
      return stereo(
        normalize(
          mix([beat(0.07, 1, 72), beat(0.31, 0.75, 64), { sig: lowpass(hum, 240, 1.1), gain: 0.16 }]),
          -3,
        ),
        0.15,
      );
    },
  },
  {
    // The wind-up: everything drawn back into the crystal in the last breath before it gives. A
    // reversed swell, cut off dead where the burst begins.
    key: 'sfx.summon.windup',
    loop: false,
    quality: 0.45,
    render: () => {
      const seconds = 0.32;
      const envelope = new Float32Array(Math.round(seconds * SR)).map((_, i) =>
        Math.pow(i / (seconds * SR), 2.6),
      );
      return stereo(
        normalize(
          mix([
            {
              sig: mul(
                bandpass(noise(seconds, 97), (t) => 900 + (t / seconds) * 6000, 1.6),
                envelope,
              ),
              gain: 0.6,
            },
            {
              sig: mul(
                osc('sine', (t) => 180 + Math.pow(t / seconds, 2) * 900, seconds),
                envelope,
              ),
              gain: 0.35,
            },
          ]),
          -5,
        ),
        0.45,
      );
    },
  },
  {
    // The crystal giving way: an impact, a spray of glass and the pieces ringing as they fall. It
    // plays under every burst, and the rarity's own reveal plays over it.
    key: 'sfx.summon.shatter',
    loop: false,
    quality: 0.5,
    render: () => {
      const shards = Array.from({ length: 14 }, (_, i) => ({
        at: 0.01 + ((i * 37) % 23) / 100,
        gain: 0.18 + ((i * 13) % 7) / 40,
        sig: mul(highpass(noise(0.14, 400 + i), 3800 + ((i * 53) % 9) * 600, 1.2), expDecay(0.14, 0.018)),
      }));
      const tinkles = [96, 101, 103, 108, 99, 105].map((midi, i) => ({
        at: 0.08 + i * 0.07,
        gain: 0.12 - i * 0.012,
        sig: chime(midi, 0.6, 1.5),
      }));
      const impact = mul(
        mix([
          { sig: osc('sine', (t) => 140 - t * 260, 0.35) },
          { sig: lowpass(noise(0.35, 5), 900, 0.8), gain: 0.5 },
        ]),
        expDecay(0.35, 0.08),
      );
      return stereo(
        normalize(reverb(mix([{ sig: impact, gain: 0.6 }, ...shards, ...tinkles]), 0.5, 0.26, 1), -3),
        0.6,
      );
    },
  },
  {
    // A card of the ten turning over: a short swish and a snap.
    key: 'sfx.summon.flip',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          mix([
            {
              sig: mul(
                bandpass(noise(0.16, 61), (t) => 3200 - t * 12_000, 1.4),
                adsr(0.16, { a: 0.05, d: 0.06, s: 0.3, r: 0.05 }),
              ),
              gain: 0.6,
            },
            { at: 0.11, sig: burst(0.04, 2600, 1.4, 67, 0.006), gain: 0.5 },
          ]),
          -6,
        ),
        0.2,
      ),
  },
  {
    // A star landing on a card: a small bright ping, climbing a step for each star after it.
    key: 'sfx.summon.star',
    loop: false,
    quality: 0.4,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: chime(93, 0.45, 1.6), gain: 0.5 },
              { sig: burst(0.03, 8000, 1, 43, 0.006), gain: 0.2 },
            ]),
            0.3,
            0.25,
            0.6,
          ),
          -7,
        ),
        0.3,
      ),
  },
  {
    // The rarity stamped under an Epic, a Legendary or a Mythic card: a heavy seal pressed down.
    key: 'sfx.summon.stamp',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              {
                sig: mul(
                  osc('sine', (t) => 95 - t * 110, 0.45),
                  expDecay(0.45, 0.11),
                ),
                gain: 0.7,
              },
              { sig: mul(lowpass(noise(0.2, 83), 1500, 0.9), expDecay(0.2, 0.03)), gain: 0.45 },
              { at: 0.01, sig: chime(62, 0.7, 0.7), gain: 0.18 },
            ]),
            0.45,
            0.22,
            0.8,
          ),
          -3,
        ),
        0.3,
      ),
  },
  {
    // Reveal, Common/Uncommon: a short two-note chime — the ritual answered, modestly.
    key: 'sfx.summon.reveal_common',
    loop: false,
    quality: 0.45,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: chime(74, 0.7, 0.8), gain: 0.5 },
              { at: 0.09, sig: chime(78, 0.8, 0.9), gain: 0.4 },
              { sig: mul(lowpass(noise(0.3, 7), 2600, 0.7), expDecay(0.3, 0.06)), gain: 0.14 },
            ]),
            0.5,
            0.25,
            0.9,
          ),
          -4,
        ),
        0.3,
      ),
  },
  {
    // Reveal, Rare: a brighter triad with a little air behind it.
    key: 'sfx.summon.reveal_rare',
    loop: false,
    quality: 0.5,
    render: () =>
      stereo(
        normalize(
          reverb(
            mix([
              { sig: chime(76, 0.9, 1), gain: 0.45 },
              { at: 0.08, sig: chime(83, 1, 1.1), gain: 0.4 },
              { at: 0.16, sig: chime(88, 1.1, 1.2), gain: 0.35 },
              { sig: mul(bandpass(noise(0.6, 19), 3200, 1.6), expDecay(0.6, 0.12)), gain: 0.16 },
            ]),
            0.6,
            0.3,
            1.2,
          ),
          -3.5,
        ),
        0.35,
      ),
  },
  {
    // Reveal, Epic: a violet swell under a bell pair — the purple light of the gate.
    key: 'sfx.summon.reveal_epic',
    loop: false,
    quality: 0.5,
    render: () => {
      const seconds = 1.6;
      const swell = mul(
        mix([
          { sig: osc('saw', note(45), seconds) },
          { sig: osc('saw', note(45) * 1.006, seconds), gain: 0.8 },
          { sig: osc('triangle', note(57), seconds), gain: 0.55 },
        ]),
        adsr(seconds, { a: 0.05, d: 0.35, s: 0.6, r: 0.7 }),
      );
      return stereo(
        normalize(
          reverb(
            mix([
              { sig: lowpass(swell, (t) => 500 + t * 2200, 1.1), gain: 0.4 },
              { at: 0.04, sig: chime(86, 1.3, 1.2), gain: 0.4 },
              { at: 0.2, sig: chime(93, 1.4, 1.3), gain: 0.32 },
              { sig: mul(lowpass(noise(0.8, 31), 3000, 0.8), expDecay(0.8, 0.18)), gain: 0.14 },
            ]),
            0.8,
            0.34,
            1.6,
          ),
          -3,
        ),
        0.4,
      );
    },
  },
  {
    // Reveal, Legendary: the gold pillar — a bass hit, brass over it, bells falling after
    // (SUMMONING.md §5.2 "gold pillar + screen flash + bass hit").
    key: 'sfx.summon.reveal_legendary',
    loop: false,
    quality: 0.55,
    render: () => {
      const boom = mul(
        mix([
          { sig: osc('sine', (t) => 120 - t * 75, 1.4) },
          { sig: osc('triangle', (t) => 60 - t * 32, 1.4), gain: 0.6 },
        ]),
        expDecay(1.4, 0.3),
      );
      const brass = (midi: number, at: number, seconds: number, g: number) => ({
        at,
        gain: g,
        sig: lowpass(
          softclip(
            mul(
              mix([
                { sig: osc('saw', note(midi), seconds) },
                { sig: osc('saw', note(midi) * 1.005, seconds) },
                { sig: osc('pulse', note(midi) / 2, seconds), gain: 0.4 },
              ]),
              adsr(seconds, { a: 0.03, d: 0.2, s: 0.7, r: 0.4 }),
            ),
            1.9,
          ),
          (t) => 800 + t * 2600,
          0.9,
        ),
      });
      return stereo(
        normalize(
          reverb(
            mix([
              { sig: boom, gain: 0.5 },
              brass(67, 0.02, 1.1, 0.4),
              brass(71, 0.02, 1.1, 0.3),
              brass(74, 0.14, 1.2, 0.34),
              { at: 0.3, sig: chime(96, 1.6, 1.4), gain: 0.34 },
              { at: 0.46, sig: chime(91, 1.5, 1.2), gain: 0.26 },
              { at: 0.62, sig: chime(103, 1.7, 1.3), gain: 0.24 },
            ]),
            0.85,
            0.34,
            2,
          ),
          -2,
        ),
        0.45,
      );
    },
  },
  {
    // Reveal, Mythic: the rose pillar — a deep detonation, a shockwave sweeping out, and a
    // crystalline sequence nothing else in the game plays (SUMMONING.md §5.2).
    key: 'sfx.summon.reveal_mythic',
    loop: false,
    quality: 0.6,
    render: () => {
      const detonation = mul(
        mix([
          { sig: osc('sine', (t) => 92 - t * 26, 2.2) },
          { sig: osc('sine', (t) => 46 - t * 12, 2.2), gain: 0.7 },
          { sig: lowpass(noise(2.2, 97), (t) => 1000 - t * 260, 0.9), gain: 0.35 },
        ]),
        expDecay(2.2, 0.55),
      );
      const shockwave = mul(
        bandpass(noise(1.2, 151), (t) => 400 + t * 5200, 1.8),
        adsr(1.2, { a: 0.06, d: 0.3, s: 0.35, r: 0.6 }),
      );
      return stereo(
        normalize(
          reverb(
            mix([
              { sig: detonation, gain: 0.5 },
              { at: 0.08, sig: shockwave, gain: 0.3 },
              { at: 0.24, sig: chime(88, 2, 1.5), gain: 0.32 },
              { at: 0.44, sig: chime(95, 2.1, 1.5), gain: 0.28 },
              { at: 0.64, sig: chime(100, 2.2, 1.6), gain: 0.26 },
              { at: 0.84, sig: chime(107, 2.4, 1.7), gain: 0.24 },
              { at: 1.1, sig: chime(112, 2.6, 1.8), gain: 0.2 },
            ]),
            1,
            0.38,
            2.6,
          ),
          -1.5,
        ),
        0.55,
      );
    },
  },
];
