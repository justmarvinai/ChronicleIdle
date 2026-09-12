/**
 * Seeded, forkable pseudo-random generator (xorshift128+). Every random decision in the engine
 * goes through an `Rng` so battles, drops and summons replay exactly from a seed (CLAUDE.md §5.2).
 */
export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** True with probability `p` (0..1). */
  chance(p: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Weighted choice; weights need not sum to 1. */
  weighted<T>(items: readonly { item: T; weight: number }[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** Independent stream derived from this one and a label (order-insensitive between labels). */
  fork(label: string): Rng;
  /** Serialisable state so a stream can be resumed. */
  state(): [number, number, number, number];
}

/** FNV-1a 32-bit hash used to turn arbitrary strings into seed material. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** SplitMix32 to expand a 32-bit seed into well-mixed state words. */
function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

class Xorshift128Plus implements Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(state: [number, number, number, number]) {
    [this.s0, this.s1, this.s2, this.s3] = state;
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 0x9e3779b9;
  }

  static fromSeed(seed: string | number): Xorshift128Plus {
    const base = typeof seed === 'number' ? seed >>> 0 : hashString(seed);
    const mix = splitmix32(base);
    return new Xorshift128Plus([mix(), mix(), mix(), mix()]);
  }

  /** xorshift128 on 32-bit lanes (two 64-bit words emulated as pairs). */
  private nextUint32(): number {
    let t = this.s3;
    const s = this.s0;
    this.s3 = this.s2;
    this.s2 = this.s1;
    this.s1 = s;
    t ^= t << 11;
    t ^= t >>> 8;
    this.s0 = (t ^ s ^ (s >>> 19)) >>> 0;
    return (this.s0 + this.s1) >>> 0;
  }

  next(): number {
    return this.nextUint32() / 4294967296;
  }

  int(min: number, max: number): number {
    if (max < min) throw new RangeError(`rng.int: max (${max}) < min (${min})`);
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p: number): boolean {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('rng.pick: empty list');
    return items[this.int(0, items.length - 1)] as T;
  }

  weighted<T>(items: readonly { item: T; weight: number }[]): T {
    let total = 0;
    for (const entry of items) total += Math.max(0, entry.weight);
    if (total <= 0) throw new RangeError('rng.weighted: total weight must be > 0');
    let roll = this.next() * total;
    for (const entry of items) {
      roll -= Math.max(0, entry.weight);
      if (roll < 0) return entry.item;
    }
    return (items[items.length - 1] as { item: T }).item;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i] as T;
      out[i] = out[j] as T;
      out[j] = tmp;
    }
    return out;
  }

  fork(label: string): Rng {
    return Xorshift128Plus.fromSeed(`${this.s0.toString(16)}:${this.s1.toString(16)}:${label}`);
  }

  state(): [number, number, number, number] {
    return [this.s0, this.s1, this.s2, this.s3];
  }
}

export function createRng(seed: string | number): Rng {
  return Xorshift128Plus.fromSeed(seed);
}

export function restoreRng(state: [number, number, number, number]): Rng {
  return new Xorshift128Plus(state);
}
