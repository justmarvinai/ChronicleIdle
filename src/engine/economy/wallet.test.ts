import { describe, expect, it } from 'vitest';
import { canAfford, emptyWallet, formatAmount, grant, spend, walletWith } from './wallet';

describe('wallet', () => {
  it('starts every currency at zero', () => {
    const w = emptyWallet();
    expect(Object.values(w).every((v) => v === 0)).toBe(true);
    expect(Object.keys(w)).toHaveLength(24);
  });

  it('grants and reports changes without mutating the input', () => {
    const w = walletWith([{ currency: 'gold', amount: 100 }]);
    const { wallet, changes } = grant(w, [{ currency: 'gold', amount: 50 }, { currency: 'gems', amount: 0 }]);
    expect(wallet.gold).toBe(150);
    expect(w.gold).toBe(100);
    expect(changes).toEqual([{ currency: 'gold', delta: 50, total: 150 }]);
    expect(() => grant(w, [{ currency: 'gold', amount: -1 }])).toThrow();
  });

  it('spends only when affordable', () => {
    const w = walletWith([{ currency: 'gold', amount: 100 }, { currency: 'gems', amount: 10 }]);
    const result = spend(w, [{ currency: 'gold', amount: 60 }, { currency: 'gold', amount: 50 }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('insufficient_currency');
    const okResult = spend(w, [{ currency: 'gold', amount: 60 }, { currency: 'gems', amount: 10 }]);
    expect(okResult.ok).toBe(true);
    if (okResult.ok) {
      expect(okResult.value.wallet.gold).toBe(40);
      expect(okResult.value.wallet.gems).toBe(0);
    }
    expect(canAfford(w, [{ currency: 'energy', amount: 1 }])).toBe(false);
  });

  it('formats amounts compactly', () => {
    expect(formatAmount(999)).toBe('999');
    expect(formatAmount(12_345)).toBe('12,345');
    expect(formatAmount(123_456)).toBe('123.5K');
    expect(formatAmount(12_020_000)).toBe('12.02M');
    expect(formatAmount(2_500_000_000)).toBe('2.5B');
  });
});
