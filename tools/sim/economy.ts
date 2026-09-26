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
import {
  ECONOMY_BANDS,
  MINE_DIG_DAYS_MAX,
  SCRIPTS,
  SCRIPT_BY_ID,
  type EconomyBand,
  type EconomyScript,
} from './economy-script';
import { DAYS_PER_WEEK, mineAudit, refillAudit, shelfAudit, simulate, tierOf } from './economy-run';

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
    // A line that pays none of the three headline currencies (the Brewery pays brews and nothing
    // else) would be a row of zeroes here; it is reported under the brews block below instead.
    const rows = computed.lines.filter(
      (one) => one.side === side && headline.some((currency) => (one.amounts.get(currency) ?? 0) > 0),
    );
    for (const row of rows) {
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
  // Where the brews come from. The Brewery is meant to be their main source (the owner's brief),
  // and this is the line that says whether it is.
  const brews = others.filter((currency) => currency.startsWith('brew_'));
  const sources = computed.lines.filter(
    (row) => row.side === 'income' && brews.some((currency) => (row.amounts.get(currency) ?? 0) > 0),
  );
  if (sources.length > 0) {
    console.log('\n  brews per day, by source');
    for (const row of sources) {
      const cells = brews
        .filter((currency) => (row.amounts.get(currency) ?? 0) > 0)
        .map(
          (currency) => `${currency.slice('brew_'.length)} ${(row.amounts.get(currency) ?? 0).toFixed(1)}`,
        );
      console.log(`    ${row.line.padEnd(22)} ${cells.join('  ')}`);
    }
  }
}

/** A band over the script's whole book: everything that currency came in or went out as. */
function wholeBook(computed: Rates, band: EconomyBand): number {
  const { income = 0, spend = 0 } = computed.perDay.get(band.currency) ?? {};
  return band.side === 'income' ? income : band.side === 'spend' ? spend : income - spend;
}

/**
 * A band over one named ledger line. A line that paid nothing reads zero rather than being
 * skipped: "this source has gone quiet" is exactly the kind of regression a `min` is there to
 * catch, and skipping would hide it.
 */
function oneLine(computed: Rates, band: EconomyBand): number {
  const row = computed.lines.find((one) => one.line === band.line && one.side === band.side);
  return row?.amounts.get(band.currency) ?? 0;
}

function checkBands(all: Map<string, Rates>): boolean {
  console.log('\nBands (ECONOMY.md §7–§8)');
  let ok = true;
  for (const band of ECONOMY_BANDS) {
    const computed = all.get(band.script);
    if (!computed) continue;
    const perDay = band.line === undefined ? wholeBook(computed, band) : oneLine(computed, band);
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
      `  ${pass ? '✓' : '✗'} ${(band.line ?? band.script).padEnd(13)} ${band.currency.padEnd(6)} ${band.side.padEnd(7)} ` +
        `per ${band.per.padEnd(5)} ${money(value).padStart(8)} (want ${want})  — ${band.why}`,
    );
  }
  return ok;
}

/**
 * The Gem Market, entry by entry: its price against the most it could ever pay back in gems.
 *
 * This is not a band — it holds for every player at once, whatever they do with their day — so it
 * is checked against the content rather than against a ledger. A row that reaches its price is a
 * loop rather than a sink, and with infinite stock a loop is infinite gems (MARKET.md §2).
 */
function checkShelf(): boolean {
  console.log('\nGem Market — no entry may pay its own price back (MARKET.md §2)');
  let ok = true;
  const print = (row: { id: string; price: number; gemsBack: number; via: string }): void => {
    const pass = row.gemsBack < row.price;
    ok = ok && pass;
    const share = row.price > 0 ? Math.round((row.gemsBack / row.price) * 100) : 0;
    console.log(
      `  ${pass ? '✓' : '✗'} ${row.id.padEnd(28)} ${String(row.price).padStart(5)} gems out, ` +
        `${String(row.gemsBack).padStart(4)} back (${String(share).padStart(3)} %)  — ${row.via}`,
    );
  };
  for (const row of shelfAudit()) print(row);
  // The refills are the same rule on average: a key's shards are rolled, not certain (ECONOMY.md §5).
  console.log('\nGem refills — no refill may pay its own price back on average (ECONOMY.md §5, §5.2)');
  for (const row of refillAudit()) print(row);
  return ok;
}

/**
 * The Mine, script by script: the level its chronicle has dug, and what digging it there cost in
 * days of what the script has spare of each currency (MINE.md §4). A level priced past
 * `MINE_DIG_DAYS_MAX` days of a surplus is a wall rather than a goal.
 */
function checkMine(all: Map<string, Rates>): boolean {
  console.log(
    `\nThe Mine — digging each script's level, in days of its surplus (MINE.md §4, ≤ ${MINE_DIG_DAYS_MAX})`,
  );
  let ok = true;
  for (const script of PLAYERS) {
    const computed = all.get(script.id);
    if (!computed) continue;
    const spare = (currency: CurrencyId): number => {
      const { income = 0, spend = 0 } = computed.perDay.get(currency) ?? {};
      return Math.max(0, income - spend);
    };
    const audit = mineAudit(script, spare);
    const cells = audit.lines.map((line) => {
      const pass = line.days <= MINE_DIG_DAYS_MAX;
      ok = ok && pass;
      return `${pass ? '' : '✗ '}${line.currency.replace('mat_', '')} ${money(line.cost)} = ${line.days.toFixed(1)} d`;
    });
    const pass = audit.lines.every((line) => line.days <= MINE_DIG_DAYS_MAX);
    console.log(
      `  ${pass ? '✓' : '✗'} ${script.id.padEnd(12)} level ${String(audit.level).padStart(2)}  ${cells.join(' · ')}`,
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
  const bands = checkBands(all);
  const shelf = checkShelf();
  const mine = checkMine(all);
  if (flag('strict') && !(bands && shelf && mine)) {
    console.error(
      !bands
        ? '\nA band in tools/sim/economy-script.ts broke.'
        : !shelf
          ? '\nAn entry of the Gem Market pays back what it costs.'
          : `\nA level of the Mine costs more than ${MINE_DIG_DAYS_MAX} days of a script's surplus.`,
    );
    process.exit(1);
  }
}

main();
