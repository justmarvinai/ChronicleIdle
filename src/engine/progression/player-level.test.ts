import { describe, expect, it } from 'vitest';
import { xpToNextLevel } from './player-level';

describe('xpToNextLevel', () => {
  it('follows the documented curve', () => {
    expect(xpToNextLevel(1)).toBe(100);
    expect(xpToNextLevel(10)).toBe(3981);
    expect(xpToNextLevel(100)).toBe(Infinity);
  });
});
