import { describe, expect, it } from 'vitest';
import { SETTLEMENT_COUNT } from '@content/balance/campaign';
import { CURRENCY_IDS } from '@content/currencies/types';
import { ECONOMY_BANDS, SCRIPTS, SCRIPT_BY_ID } from './economy-script';
import { DAYS_PER_WEEK, Ledger, simulate, tierOf } from './economy-run';

const DAYS = DAYS_PER_WEEK * 2;

describe('the economy ledger', () => {
  it('keeps income and spend apart, per line and per currency', () => {
    const ledger = new Ledger();
    ledger.earn('campaign', 'gold', 1_000);
    ledger.earn('campaign', 'gold', 500);
    ledger.earn('boss', 'gems', 60);
    ledger.pay('gear levels', 'gold', 400);
    // A zero or negative entry is not a line: a chest that paid nothing did not pay.
    ledger.earn('nothing', 'gold', 0);

    expect(ledger.totalIncome('gold')).toBe(1_500);
    expect(ledger.totalSpend('gold')).toBe(400);
    expect(ledger.totalIncome('gems')).toBe(60);
    expect(ledger.totalSpend('gems')).toBe(0);
    expect([...ledger.income.keys()]).toEqual(['campaign', 'boss']);
    expect(ledger.currencies()).toEqual(['gold', 'gems']);
  });
});

describe('the economy simulation', () => {
  it('plays the same month twice for the same script and sample', () => {
    const script = SCRIPT_BY_ID['mid_active'];
    if (!script) throw new Error('mid_active');
    const first = simulate(script, 0, DAYS);
    const again = simulate(script, 0, DAYS);
    for (const currency of first.currencies()) {
      expect(again.totalIncome(currency), currency).toBe(first.totalIncome(currency));
      expect(again.totalSpend(currency), currency).toBe(first.totalSpend(currency));
    }
  });

  it('pays more to a player who sits down more often, through the campaign alone', () => {
    const casual = SCRIPT_BY_ID['casual'];
    const dedicated = SCRIPT_BY_ID['dedicated'];
    if (!casual || !dedicated) throw new Error('scripts');
    const quiet = simulate(casual, 0, DAYS);
    const busy = simulate(dedicated, 0, DAYS);
    expect(busy.totalIncome('gold')).toBeGreaterThan(quiet.totalIncome('gold'));
    // The boss and the chest do not care how long you play, so the ceiling is not a multiple of
    // the floor — the property ECONOMY.md §8 leans on and Q45 records.
    expect(busy.totalIncome('gold')).toBeLessThan(quiet.totalIncome('gold') * 4);
  });

  it('never ends a scripted month in the red on gold or gems', () => {
    for (const script of SCRIPTS) {
      const ledger = simulate(script, 0, DAYS);
      for (const currency of ['gold', 'gems'] as const)
        expect(
          ledger.totalIncome(currency) - ledger.totalSpend(currency),
          `${script.id}/${currency}`,
        ).toBeGreaterThanOrEqual(0);
    }
  });

  it('earns every script its energy back in campaign gold', () => {
    for (const script of SCRIPTS) {
      const ledger = simulate(script, 0, DAYS);
      expect(ledger.income.get('campaign farming')?.get('gold') ?? 0, script.id).toBeGreaterThan(0);
      expect(ledger.income.get('idle chest')?.get('gold') ?? 0, script.id).toBeGreaterThan(0);
    }
  });
});

describe('the economy scripts', () => {
  it('farm a settlement that exists, at a tier the chest knows', () => {
    for (const script of SCRIPTS) {
      expect(script.settlement, script.id).toBeGreaterThanOrEqual(1);
      expect(script.settlement, script.id).toBeLessThanOrEqual(SETTLEMENT_COUNT);
      expect(tierOf(script), script.id).toBeGreaterThan(0);
      expect(script.logins, script.id).toBeGreaterThan(0);
    }
  });

  it('write every band against a script and a real currency', () => {
    for (const band of ECONOMY_BANDS) {
      expect(SCRIPT_BY_ID[band.script], band.script).toBeDefined();
      expect(CURRENCY_IDS, band.currency).toContain(band.currency);
      expect(band.min ?? band.max, `${band.script} ${band.currency}`).toBeDefined();
      expect(band.why.length).toBeGreaterThan(8);
    }
  });
});
