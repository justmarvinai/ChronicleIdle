/**
 * Tiny deterministic offline DSP toolkit used by the audio recipes. Everything is a Float32Array
 * of mono samples at SR; nothing here depends on the platform, so renders are reproducible.
 */
export const SR = 44100;
export type Mono = Float32Array;
export type Stereo = [Mono, Mono];

export const samples = (seconds: number): number => Math.max(1, Math.round(seconds * SR));
export const note = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export type FreqFn = number | ((t: number) => number);
const freqAt = (f: FreqFn, t: number): number => (typeof f === 'number' ? f : f(t));

export type Shape = 'sine' | 'triangle' | 'saw' | 'square' | 'pulse';

export function osc(shape: Shape, freq: FreqFn, seconds: number, phase = 0, pulseWidth = 0.3): Mono {
  const n = samples(seconds);
  const out = new Float32Array(n);
  let ph = phase;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += freqAt(freq, t) / SR;
    const p = ph - Math.floor(ph);
    let v: number;
    switch (shape) {
      case 'sine': v = Math.sin(2 * Math.PI * p); break;
      case 'triangle': v = 1 - 4 * Math.abs(p - 0.5); break;
      case 'saw': v = 2 * p - 1; break;
      case 'square': v = p < 0.5 ? 1 : -1; break;
      case 'pulse': v = p < pulseWidth ? 1 : -1; break;
    }
    out[i] = v;
  }
  return out;
}

/** Seeded xorshift32 noise so every render is byte-identical. */
export function noise(seconds: number, seed = 1): Mono {
  const n = samples(seconds);
  const out = new Float32Array(n);
  let s = seed >>> 0 || 1;
  for (let i = 0; i < n; i++) {
    s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
    out[i] = (s / 0xffffffff) * 2 - 1;
  }
  return out;
}

export interface Adsr { a: number; d: number; s: number; r: number }

/** Linear attack, exponential-ish decay to sustain, release at the end of the buffer. */
export function adsr(seconds: number, { a, d, s, r }: Adsr): Mono {
  const n = samples(seconds);
  const out = new Float32Array(n);
  const A = samples(a), D = samples(d), R = samples(r);
  for (let i = 0; i < n; i++) {
    let v: number;
    if (i < A) v = i / A;
    else if (i < A + D) v = 1 - (1 - s) * ((i - A) / D);
    else v = s;
    const left = n - i;
    if (left < R) v *= left / R;
    out[i] = v;
  }
  return out;
}

export function expDecay(seconds: number, tau: number, start = 1): Mono {
  const n = samples(seconds);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = start * Math.exp(-(i / SR) / tau);
  return out;
}

export function mul(a: Mono, b: Mono): Mono {
  const n = Math.min(a.length, b.length);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (a[i] as number) * (b[i] as number);
  return out;
}

export function gain(a: Mono, g: number): Mono {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = (a[i] as number) * g;
  return out;
}

/** Mixes signals placed at offsets (seconds); output length fits the latest tail. */
export function mix(parts: Array<{ at?: number; sig: Mono; gain?: number }>): Mono {
  let length = 0;
  for (const p of parts) length = Math.max(length, samples(p.at ?? 0) + p.sig.length);
  const out = new Float32Array(length);
  for (const p of parts) {
    const start = samples(p.at ?? 0);
    const g = p.gain ?? 1;
    for (let i = 0; i < p.sig.length; i++) out[start + i] = (out[start + i] as number) + (p.sig[i] as number) * g;
  }
  return out;
}

/** RBJ biquad; cutoff may sweep over time. */
function biquad(sig: Mono, type: 'lowpass' | 'highpass' | 'bandpass', cutoff: FreqFn, q: number): Mono {
  const out = new Float32Array(sig.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0 = 0, b1 = 0, b2 = 0, a1 = 0, a2 = 0;
  let lastFc = -1;
  const recompute = (fc: number): void => {
    const w0 = (2 * Math.PI * Math.min(fc, SR * 0.45)) / SR;
    const cos = Math.cos(w0), sin = Math.sin(w0);
    const alpha = sin / (2 * q);
    if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2; }
    else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2; }
    else { b0 = alpha; b1 = 0; b2 = -alpha; }
    const a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  };
  for (let i = 0; i < sig.length; i++) {
    const fc = freqAt(cutoff, i / SR);
    if (typeof cutoff !== 'number' ? i % 32 === 0 : lastFc < 0) { recompute(fc); lastFc = fc; }
    const x0 = sig[i] as number;
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
  return out;
}
export const lowpass = (sig: Mono, cutoff: FreqFn, q = 0.707): Mono => biquad(sig, 'lowpass', cutoff, q);
export const highpass = (sig: Mono, cutoff: FreqFn, q = 0.707): Mono => biquad(sig, 'highpass', cutoff, q);
export const bandpass = (sig: Mono, cutoff: FreqFn, q = 1): Mono => biquad(sig, 'bandpass', cutoff, q);

export function delay(sig: Mono, seconds: number, feedback: number, wet: number, tailSeconds = seconds * 6): Mono {
  const d = samples(seconds);
  const n = sig.length + samples(tailSeconds);
  const out = new Float32Array(n);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const dry = i < sig.length ? (sig[i] as number) : 0;
    const echo = i >= d ? (buf[i - d] as number) : 0;
    buf[i] = dry + echo * feedback;
    out[i] = dry + echo * wet;
  }
  return out;
}

/** Schroeder reverb (4 parallel combs + 2 series all-passes). `size` 0..1, `wet` 0..1. */
export function reverb(sig: Mono, size: number, wet: number, tailSeconds = 1.5): Mono {
  const n = sig.length + samples(tailSeconds);
  const input = new Float32Array(n);
  input.set(sig);
  const combDelays = [1116, 1188, 1277, 1356].map((d) => Math.round(d * (0.6 + size)));
  const fb = 0.75 + 0.2 * size;
  const combSum = new Float32Array(n);
  for (const cd of combDelays) {
    const buf = new Float32Array(n);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const delayed = i >= cd ? (buf[i - cd] as number) : 0;
      lp = lp * 0.3 + delayed * 0.7; // damping
      buf[i] = (input[i] as number) + lp * fb;
      combSum[i] = (combSum[i] as number) + delayed;
    }
  }
  let sigAp = combSum;
  for (const ad of [556, 441]) {
    const out = new Float32Array(n);
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const delayed = i >= ad ? (buf[i - ad] as number) : 0;
      const x = sigAp[i] as number;
      buf[i] = x + delayed * 0.5;
      out[i] = delayed - x * 0.5;
    }
    sigAp = out;
  }
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (input[i] as number) * (1 - wet) + (sigAp[i] as number) * wet * 0.25;
  return out;
}

export function softclip(sig: Mono, drive = 1.5): Mono {
  const out = new Float32Array(sig.length);
  for (let i = 0; i < sig.length; i++) out[i] = Math.tanh((sig[i] as number) * drive) / Math.tanh(drive);
  return out;
}

export function fade(sig: Mono, inSeconds: number, outSeconds: number): Mono {
  const out = new Float32Array(sig);
  const fi = samples(inSeconds), fo = samples(outSeconds);
  for (let i = 0; i < Math.min(fi, out.length); i++) out[i] = (out[i] as number) * (i / fi);
  for (let i = 0; i < Math.min(fo, out.length); i++) out[out.length - 1 - i] = (out[out.length - 1 - i] as number) * (i / fo);
  return out;
}

/** Makes a seamless loop by cross-fading the last `overlap` seconds into the start. */
export function loopable(sig: Mono, overlap: number): Mono {
  const o = samples(overlap);
  const n = sig.length - o;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = sig[i] as number;
    if (i < o) {
      const w = i / o;
      out[i] = v * w + (sig[n + i] as number) * (1 - w);
    } else out[i] = v;
  }
  return out;
}

export function normalize(sig: Mono, peakDb = -1): Mono {
  let p = 0;
  for (let i = 0; i < sig.length; i++) p = Math.max(p, Math.abs(sig[i] as number));
  if (p === 0) return sig;
  return gain(sig, Math.pow(10, peakDb / 20) / p);
}

/** Widens a mono signal into stereo with a short Haas offset and gentle L/R detune of the wet part. */
export function stereo(sig: Mono, width = 0.2): Stereo {
  const off = samples(0.0006 + 0.004 * width);
  const l = new Float32Array(sig.length + off);
  const r = new Float32Array(sig.length + off);
  for (let i = 0; i < sig.length; i++) {
    const v = sig[i] as number;
    l[i] = (l[i] as number) + v;
    r[i + off] = (r[i + off] as number) + v * (1 - width * 0.25);
    r[i] = (r[i] as number) + v * width * 0.25;
  }
  return [l, r];
}

/** Bell-like tone: inharmonic partials with independent decays. */
export function bell(freq: number, seconds: number, brightness = 1): Mono {
  const partials: Array<[number, number, number]> = [
    [1, 1, 0.9], [2.0, 0.5, 0.6], [2.76, 0.35 * brightness, 0.45], [4.07, 0.2 * brightness, 0.3], [5.4, 0.1 * brightness, 0.2],
  ];
  const parts = partials.map(([ratio, amp, tau]) => ({ sig: mul(osc('sine', freq * ratio, seconds), expDecay(seconds, tau * seconds * 0.6)), gain: amp }));
  return mix(parts);
}

/** Short filtered noise burst — the basis of clicks, ticks and impacts. */
export function burst(seconds: number, cutoff: FreqFn, q: number, seed: number, tau: number): Mono {
  return mul(lowpass(noise(seconds, seed), cutoff, q), expDecay(seconds, tau));
}
