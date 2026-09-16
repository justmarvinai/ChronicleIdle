/**
 * `pnpm sim:economy` — the economy sanity report (ROADMAP.md Phase 15, ECONOMY.md §7–§8).
 *
 *   pnpm sim:economy                 the ledger for every script, then the band check
 *   pnpm sim:economy --days 30       length of the script (default 28 = four whole weeks)
 *   pnpm sim:economy --strict        exit 1 when a band in economy-script.ts breaks
 *   pnpm sim:economy --runs 12       RNG samples per script (drops are rolled; default 8)
 *   pnpm sim:economy --script casual only one player
 *
 * What it does *not* do is fight: whether a team can clear the stand it farms is `sim:balance`'s
 * question. This tool assumes the script's stand is farmable and asks the other one — whether a
 * day of that farming pays for a day of that spending.
 *
 * Every figure comes from the content and the balance tables through the same functions the game
 * uses, so the report follows a tuning change without being told. The only numbers written down
 * here are the design's own, in `ECONOMY_BANDS`.
 */
import type { CurrencyId } from '@content/currencies/types';
import { energyCap } from '@engine/economy/energy';
import { ECONOMY_BANDS, SCRIPTS, SCRIPT_BY_ID, type EconomyScript } from './economy-script';
import { DAYS_PER_WEEK, simulate, tierOf } from './economy-run';

const argv = process.argv.slice(2);
const flag = (name: string): boolean => argv.includes(`--${name}`);
const option = (name: string): string | undefined => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 ? argv[at + 1] : undefined;
};

/** Four whole weeks by default, so the per-day and per-week figures are both exact. */
const DAYS = Number(option('days') ?? 28);
const SAMPLES = Number(option('runs') ?? 8);

const PLAYERS: readonly EconomyScript[] = ((): readonly EconomyScript[] => {
  const only = option('script');
  if (!only) return SCRIPTS;
  const script = SCRIPT_BY_ID[only];
  if (!script) throw new Error(`unknown script ${only}; try ${SCRIPTS.map((s) => s.id).join(', ')}`);
  return [script];
})();

const money = (value: number): string => {
  const rounded = Math.round(value);
  if (Math.abs(rounded) >= 100_000) return `${(rounded / 1_000).toFixed(0)}k`;
  if (Math.abs(rounded) >= 10_000) return `${(rounded / 1_000).toFixed(1)}k`;
  return String(rounded);
};

/** The mean ledger over the samples, as per-day and per-week rates. */
interface Rates {
  perDay: Map<CurrencyId, { income: number; spend: number }>;
  lines: { line: string; side: 'income' | 'spend'; amounts: Map<CurrencyId, number> }[];
}

function rates(script: EconomyScript): Rates {
  const books = Array.from({ length: SAMPLES }, (_, sample) => simulate(script, sample, DAYS));
  const first = books[0];
  if (!first) throw new Error('no samples');
  const perDay = new Map<CurrencyId, { income: number; spend: number }>();
  for (const currency of first.currencies()) {
    const income = books.reduce((sum, book) => sum + book.totalIncome(currency), 0) / books.length / DAYS;
    const spend = books.reduce((sum, book) => sum + book.totalSpend(currency), 0) / books.length / DAYS;
    perDay.set(currency, { income, spend });
  }
  const lines: Rates['lines'] = [];
  for (const side of ['income', 'spend'] as const)
    for (const line of first[side].keys()) {
      const amounts = new Map<CurrencyId, number>();
      for (const currency of first.currencies()) {
        const mean =
          books.reduce((sum, book) => sum + (book[side].get(line)?.get(currency) ?? 0), 0) /
          books.length /
          DAYS;
        if (mean > 0) amounts.set(currency, mean);
      }
      lines.push({ line, side, amounts });
    }
  return { perDay, lines };
}

function report(script: EconomyScript, computed: Rates): void {
  console.log(`\n${script.id} — ${script.label}`);
  console.log(
    `  ${DAYS} days, ${SAMPLES} samples, farm tier ${tierOf(script)}, energy bar ${energyCap(script.playerLevel)}`,
  );
  const headline: CurrencyId[] = ['gold', 'gems', 'energy'];
  console.log('\n  per day                        ' + headline.map((c) => c.padStart(10)).join(''));
  for (const side of ['income', 'spend'] as const) {
    for (const row of computed.lines.filter((one) => one.side === side)) {
      const cells = headline.map((currency) => money(row.amounts.get(currency) ?? 0).padStart(10));
      console.log(`  ${side === 'income' ? '+' : '−'} ${row.line.padEnd(28)}${cells.join('')}`);
    }
  }
  console.log('  ' + '─'.repeat(60));
  for (const currency of headline) {
    const { income = 0, spend = 0 } = computed.perDay.get(currency) ?? {};
    const net = income - spend;
    console.log(
      `  ${currency.padEnd(8)} day: ${money(income).padStart(8)} in ${money(spend).padStart(8)} out ` +
        `${money(net).padStart(9)} net   week: ${money(income * DAYS_PER_WEEK).padStart(8)} in ` +
        `${money(net * DAYS_PER_WEEK).padStart(9)} net`,
    );
  }
  const others = [...computed.perDay.keys()].filter((currency) => !headline.includes(currency));
  if (others.length > 0) {
    console.log('\n  materials, shards and brews per day');
    for (const currency of others) {
      const { income = 0, spend = 0 } = computed.perDay.get(currency) ?? {};
      console.log(
        `    ${currency.padEnd(22)} ${income.toFixed(1).padStart(8)} in ${spend.toFixed(1).padStart(8)} out ${(income - spend).toFixed(1).padStart(9)} net`,
      );
    }
  }
}

function checkBands(all: Map<string, Rates>): boolean {
  console.log('\nBands (ECONOMY.md §7–§8)');
  let ok = true;
  for (const band of ECONOMY_BANDS) {
    const computed = all.get(band.script);
    if (!computed) continue;
    const { income = 0, spend = 0 } = computed.perDay.get(band.currency) ?? {};
    const perDay = band.side === 'income' ? income : band.side === 'spend' ? spend : income - spend;
    const value = perDay * (band.per === 'week' ? DAYS_PER_WEEK : 1);
    const low = band.min !== undefined && value < band.min;
    const high = band.max !== undefined && value > band.max;
    const pass = !low && !high;
    ok = ok && pass;
    const want = [
      band.min !== undefined ? `≥ ${money(band.min)}` : '',
      band.max !== undefined ? `≤ ${money(band.max)}` : '',
    ]
      .filter(Boolean)
      .join(' and ');
    console.log(
      `  ${pass ? '✓' : '✗'} ${band.script.padEnd(11)} ${band.currency.padEnd(6)} ${band.side.padEnd(7)} ` +
        `per ${band.per.padEnd(5)} ${money(value).padStart(8)} (want ${want})  — ${band.why}`,
    );
  }
  return ok;
}

function main(): void {
  console.log(`\nEconomy ledger — ${DAYS} days (${(DAYS / DAYS_PER_WEEK).toFixed(2)} weeks) per script`);
  const all = new Map<string, Rates>();
  for (const script of PLAYERS) {
    const computed = rates(script);
    all.set(script.id, computed);
    report(script, computed);
  }
  const ok = checkBands(all);
  if (flag('strict') && !ok) {
    console.error('\nA band in tools/sim/economy-script.ts broke.');
    process.exit(1);
  }
}

main();
