import { describe, expect, it } from 'vitest';
import { createRng, hashString, restoreRng } from './rng';

describe('rng', () => {
  it('is deterministic for the same seed', () => {
    const a = createRng('chronicle');
    const b = createRng('chronicle');
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs between seeds and forks', () => {
    const a = createRng('a').next();
    const b = createRng('b').next();
    expect(a).not.toBe(b);
    const root = createRng('root');
    expect(root.fork('x').next()).not.toBe(root.fork('y').next());
    expect(root.fork('x').next()).toBe(createRng('root').fork('x').next());
  });

  it('produces uniform-ish floats and inclusive ints', () => {
    const rng = createRng(42);
    let sum = 0;
    const counts = new Map<number, number>();
    for (let i = 0; i < 20000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
      const n = rng.int(1, 6);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    expect(sum / 20000).toBeCloseTo(0.5, 1);
    expect([...counts.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    for (const c of counts.values()) expect(c).toBeGreaterThan(2800);
  });

  it('weighted choice follows weights', () => {
    const rng = createRng('weights');
    let heavy = 0;
    for (let i = 0; i < 10000; i++) {
      if (rng.weighted([{ item: 'heavy', weight: 90 }, { item: 'light', weight: 10 }]) === 'heavy') heavy++;
    }
    expect(heavy / 10000).toBeCloseTo(0.9, 1);
  });

  it('restores state exactly', () => {
    const rng = createRng('state');
    rng.next();
    rng.next();
    const copy = restoreRng(rng.state());
    expect(copy.next()).toBe(rng.next());
  });

  it('hashes strings stably', () => {
    expect(hashString('anuria')).toBe(hashString('anuria'));
    expect(hashString('anuria')).not.toBe(hashString('anuriA'));
  });
});
