/**
 * Battle perf bench (CLAUDE.md §5.6): drives `/?screen=perf` in a headless Chromium against a
 * running preview (`pnpm build && pnpm preview`, or BENCH_URL) and prints the frame statistics the
 * stage measured over the ×4 Stress Bench fight (4 v 4, two waves, four maxed legendaries).
 *
 *   pnpm perf:battle              report only
 *   pnpm perf:battle --boss       the daily boss's race instead of the stress fight (a washed 2×
 *                                 sprite, the boss HUD, and a race that runs to the turn limit)
 *   pnpm perf:battle --weekly     the weekly boss's race (a ×2.4 sprite, two adds beside it, the
 *                                 phase beats) — the heaviest stage the game draws
 *   pnpm perf:battle --strict     exit 1 when p95 exceeds the 16 ms budget
 *   pnpm perf:battle --software   force SwiftShader (CI runners without a GPU; numbers are not
 *                                 comparable with the iGPU budget, only with earlier runs)
 *
 * Attach the printed table to the CHANGELOG entry whenever battle rendering changes (AGENTS.md §3).
 */
import { existsSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';

const BASE = process.env['BENCH_URL'] ?? 'http://localhost:4173';

/**
 * Presses Continue on whatever tutorial lesson is speaking, and on any that hands straight over to
 * the next one. The check is a `count()` on a selector that carries the phase, which is a snapshot
 * rather than a wait: a lesson ends the moment its action lands, so asking an element that may
 * already be gone for an attribute would race its own removal.
 */
async function readLesson(page: Page, tries = 4): Promise<void> {
  const speaking = page.locator('[data-testid="tutorial-overlay"][data-phase="dialogue"]');
  for (let attempt = 0; attempt < tries; attempt += 1) {
    if ((await speaking.count()) === 0) return;
    await page.getByTestId('tutorial-continue').click({ timeout: 15_000 });
    await page.waitForTimeout(300);
  }
}
const BUDGET_MS = 16;
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const strict = process.argv.includes('--strict');
const software = process.argv.includes('--software');
const boss = process.argv.includes('--boss');
const weekly = process.argv.includes('--weekly');

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
  // Every new chronicle is taught chapter 1, and Eldric's panel holds the screen while it speaks
  // (`TUTORIAL.md`), so each step of the walk reads his line first.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('screen-title').waitFor({ timeout: 60_000 });
  await page.getByTestId('btn-new-chronicle').click();
  await readLesson(page);
  await page.getByTestId('name-input').fill('Bench');
  await page.getByTestId('begin-chronicle').click();
  await page.getByTestId('screen-starter').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(500);
  await readLesson(page);
  await page.getByTestId('bind-ser_corvin').click();
  await page.getByTestId('screen-hub').waitFor({ timeout: 30_000 });
  await readLesson(page);
  await page.waitForTimeout(2_500); // let the autosave land before the reload

  await page.goto(`${BASE}/?screen=perf`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('screen-perf').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(500);
  const started = Date.now();
  await page.getByTestId(weekly ? 'perf-run-weekly' : boss ? 'perf-run-boss' : 'perf-run').click();
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
  console.log(
    weekly
      ? 'Battle perf bench — Titan Normal, 4 v 3 weekly race, ×4, auto'
      : boss
        ? 'Battle perf bench — Gargoyle Easy, 4 v 1 boss race, ×4, auto'
        : 'Battle perf bench — Stress Bench, 4 v 4 × 2 waves, ×4, auto',
  );
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
