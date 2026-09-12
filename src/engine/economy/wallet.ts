import type { CurrencyAmount, CurrencyId } from '@content/currencies/types';
import { CURRENCY_IDS } from '@content/currencies/types';
import { fail, ok, type Result } from '@engine/errors';

export type Wallet = Record<CurrencyId, number>;

export interface CurrencyChange {
  currency: CurrencyId;
  delta: number;
  total: number;
}

export function emptyWallet(): Wallet {
  return Object.fromEntries(CURRENCY_IDS.map((id) => [id, 0])) as Wallet;
}

export function walletWith(amounts: readonly CurrencyAmount[]): Wallet {
  const wallet = emptyWallet();
  for (const { currency, amount } of amounts) wallet[currency] += amount;
  return wallet;
}

export function canAfford(wallet: Wallet, cost: readonly CurrencyAmount[]): boolean {
  const needed = new Map<CurrencyId, number>();
  for (const { currency, amount } of cost) needed.set(currency, (needed.get(currency) ?? 0) + amount);
  for (const [currency, amount] of needed) if ((wallet[currency] ?? 0) < amount) return false;
  return true;
}

/** Adds amounts (negative amounts are not allowed; use `spend`). Returns the new wallet and per-currency changes. */
export function grant(wallet: Wallet, amounts: readonly CurrencyAmount[]): { wallet: Wallet; changes: CurrencyChange[] } {
  const next: Wallet = { ...wallet };
  const changes: CurrencyChange[] = [];
  for (const { currency, amount } of amounts) {
    if (amount < 0) throw new RangeError(`grant: negative amount for ${currency}`);
    if (amount === 0) continue;
    next[currency] = (next[currency] ?? 0) + amount;
    changes.push({ currency, delta: amount, total: next[currency] });
  }
  return { wallet: next, changes };
}

/** Removes `cost`; fails without mutating if any currency is short. */
export function spend(wallet: Wallet, cost: readonly CurrencyAmount[]): Result<{ wallet: Wallet; changes: CurrencyChange[] }> {
  if (!canAfford(wallet, cost)) {
    const missing = cost.filter(({ currency, amount }) => (wallet[currency] ?? 0) < amount).map(({ currency }) => currency);
    return fail('insufficient_currency', `Not enough ${missing.join(', ')}`, { missing });
  }
  const next: Wallet = { ...wallet };
  const changes: CurrencyChange[] = [];
  for (const { currency, amount } of cost) {
    if (amount === 0) continue;
    next[currency] -= amount;
    changes.push({ currency, delta: -amount, total: next[currency] });
  }
  return ok({ wallet: next, changes });
}

export function formatAmount(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (abs >= 100_000) return `${(amount / 1_000).toFixed(1).replace(/\.?0+$/, '')}K`;
  return Math.floor(amount).toLocaleString('en-US');
}
