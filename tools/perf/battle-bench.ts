/**
 * Battle perf bench (CLAUDE.md §5.6): drives `/?screen=perf` in a headless Chromium against a
 * running preview (`pnpm build && pnpm preview`, or BENCH_URL) and prints the frame statistics the
 * stage measured over the ×4 Stress Bench fight (4 v 4, two waves, four maxed legendaries).
 *
 *   pnpm perf:battle              report only
 *   pnpm perf:battle --strict     exit 1 when p95 exceeds the 16 ms budget
 *   pnpm perf:battle --software   force SwiftShader (CI runners without a GPU; numbers are not
 *                                 comparable with the iGPU budget, only with earlier runs)
 *
 * Attach the printed table to the CHANGELOG entry whenever battle rendering changes (AGENTS.md §3).
 */
import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';

const BASE = process.env['BENCH_URL'] ?? 'http://localhost:4173';
const BUDGET_MS = 16;
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const strict = process.argv.includes('--strict');
const software = process.argv.includes('--software');

const executablePath =
  process.env['PW_CHROMIUM_PATH'] ?? (existsSync(PRESET_CHROMIUM) ? PRESET_CHROMIUM : undefined);

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: [
    '--ignore-gpu-blocklist',
    ...(software ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] : ['--use-angle=default']),
  ],
});

try {
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && !/GPU stall|WebGL-/.test(message.text())) problems.push(message.text());
  });

  // The bench fights on the real battle screen, which needs a chronicle: create a throwaway one.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('screen-title').waitFor({ timeout: 60_000 });
  await page.getByTestId('btn-new-chronicle').click();
  await page.getByTestId('name-input').fill('Bench');
  await page.getByTestId('begin-chronicle').click();
  await page.getByTestId('screen-starter').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.getByTestId('bind-ser_corvin').click();
  await page.getByTestId('screen-hub').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2_500); // let the autosave land before the reload

  await page.goto(`${BASE}/?screen=perf`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('screen-perf').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(500);
  const started = Date.now();
  await page.getByTestId('perf-run').click();
  await page.getByTestId('screen-battle').waitFor({ timeout: 60_000 });
  const report = page.getByTestId('perf-report');
  await report.waitFor({ timeout: 600_000 });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  const read = async (name: string): Promise<string> => (await report.getAttribute(`data-${name}`)) ?? '';
  const p50 = Number(await read('p50'));
  const p95 = Number(await read('p95'));
  const max = Number(await read('max'));
  const samples = Number(await read('samples'));
  const outcome = await read('outcome');
  const renderer = software ? 'SwiftShader (software)' : 'GPU (ANGLE default)';

  console.log('');
  console.log('Battle perf bench — Stress Bench, 4 v 4 × 2 waves, ×4, auto');
  console.log(`renderer: ${renderer}   fight: ${seconds} s, outcome ${outcome}`);
  console.log('| p50 | p95 | max | frames | budget (p95) |');
  console.log('| --- | --- | --- | --- | --- |');
  console.log(
    `| ${p50.toFixed(1)} ms | ${p95.toFixed(1)} ms | ${max.toFixed(1)} ms | ${samples} | ${p95 <= BUDGET_MS ? 'within' : 'over'} ${BUDGET_MS} ms |`,
  );
  if (problems.length) {
    console.log('');
    console.log('Console problems during the fight:');
    for (const problem of problems) console.log(`  - ${problem}`);
  }
  if (strict && (p95 > BUDGET_MS || problems.length)) {
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
