import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The weekly boss (docs/design/BOSSES.md §3). The fixture is a level-30 chronicle with four 6★
 * champions in full Legendary gear (`tools/fixtures/weekly-chronicle.ts`) — the roster the fight is
 * written for, and the one that makes its mechanics visible in a production build: a chorus that
 * takes half of every hit meant for Titan, and a fight that changes gear as her health falls.
 *
 * The race itself is a hundred turns; what this spec proves is the wiring around it (the gate, the
 * arena's chips, the damage that banks and the chest it earns), so it banks the first chest's worth
 * of damage and retreats. The turn loop and every phase transition are the engine suite's
 * (`boss-phases.test.ts`) and the content suite's (`bosses.test.ts`).
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'weekly-boss.chronicle');
const POOL = 5_000_000;
/** The 2 % chest wants 100,000; bank a little past it so the claim is never a rounding call. */
const FIRST_CHEST = 110_000;

/** The pool's remaining HP on the arena's boss bar — the race's progress, mid-fight. */
async function bossHpLeft(page: Page): Promise<number> {
  const text = (await page.getByTestId('boss-bar').textContent()) ?? '';
  const match = /([\d,]+)\s*\/\s*5000000/.exec(text);
  return match?.[1] ? Number(match[1].replaceAll(',', '')) : POOL;
}

/** The banked damage the tier card prints, as a number. */
async function bankedDamage(page: Page): Promise<number> {
  const text = (await page.getByTestId('boss-tier-normal').textContent()) ?? '';
  const match = /([\d,]+) of 5,000,000/.exec(text);
  if (!match?.[1]) throw new Error(`no damage in tier card: ${text}`);
  return Number(match[1].replaceAll(',', ''));
}

/**
 * The bosses live behind Battle, and behind a Bosses menu of their own since 0.7.1: one card on
 * Game Modes cannot carry two gates that open on different clocks.
 */
async function openBossGate(page: Page, mode: 'daily' | 'weekly'): Promise<void> {
  await page.getByTestId('nav-battle').click();
  await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  await page.getByTestId('enter-bosses').click();
  await expect(page.getByTestId('screen-boss-menu')).toBeVisible({ timeout: 20_000 });
  await settle(page);
  await page.getByTestId(`enter-${mode}`).click();
  await expect(page.getByTestId('screen-bosses')).toBeVisible({ timeout: 20_000 });
  await settle(page);
}

test.describe('the weekly boss', () => {
  // A race with seven units on a software-rendered stage; a shared runner needs the room.
  test.setTimeout(600_000);

  test('spends a key on Titan, past her chorus, and takes the chest it earns', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // Battle leads to the Bosses menu, and that to the Titan's own card: three keys this week,
    // unspent.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await page.getByTestId('enter-bosses').click();
    await expect(page.getByTestId('screen-boss-menu')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('mode-weekly')).toContainText('Titan');
    await expect(page.getByTestId('mode-weekly')).toContainText('Three keys every week');
    await expect(page.getByTestId('note-weekly')).toContainText('3 of 3 keys left');
    await page.getByTestId('enter-weekly').click();
    await expect(page.getByTestId('screen-bosses')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // A fresh week on the Weekly tab: three keys, an empty pool, six chests and no record.
    await expect(page.getByTestId('bosses-keys')).toContainText('3/3');
    await expect(page.getByTestId('boss-tier-normal')).toContainText('0 of 5,000,000');
    await expect(page.getByTestId('boss-chest-normal-2')).toBeDisabled();
    await expect(page.getByTestId('boss-chest-normal-100')).toBeDisabled();
    await expect(page.getByTestId('boss-record-normal')).toContainText('Nobody here has faced Titan');

    // The sheet says how the fight changes and what stands in front of her (BOSSES.md §4).
    await page.getByTestId('bosses-sheet').click();
    await expect(page.getByTestId('boss-sheet-phases')).toContainText('Phase III');
    await expect(page.getByTestId('boss-sheet-adds')).toContainText('2 × Chorister');
    await expect(page.getByTestId('boss-sheet-adds')).toContainText('50%');
    await page.keyboard.press('Escape');
    await settle(page);

    // ── One key ───────────────────────────────────────────────────────────────
    await page.getByTestId('bosses-fight').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await page.getByTestId('start-battle').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);

    // The arena says what this boss is: a pool, the gear the fight is in, the escort's share of
    // every hit, what never lands on her, and how close the enrage is.
    await expect(page.getByTestId('boss-bar')).toContainText(String(POOL));
    await expect(page.getByTestId('boss-phase')).toContainText('Phase 1/3');
    await expect(page.getByTestId('boss-guarded')).toContainText('50%');
    await expect(page.getByTestId('boss-unshakeable')).toBeVisible();
    // Her chorus is on the field beside her, with plates of its own.
    await expect(page.getByText('Chorister', { exact: true })).toHaveCount(2);

    const auto = page.getByTestId('battle-auto');
    if ((await auto.getAttribute('aria-pressed')) !== 'true') await auto.click();
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
    const speed = page.getByTestId('battle-speed');
    if (((await speed.textContent()) ?? '').includes('1')) await speed.click();
    await expect(speed).toContainText('2');

    await expect
      .poll(() => bossHpLeft(page), { timeout: 300_000, intervals: [2_000] })
      .toBeLessThanOrEqual(POOL - FIRST_CHEST);
    await page.getByTestId('battle-pause').click();
    await page.getByTestId('pause-retreat').click();
    await page.getByTestId('pause-retreat-confirm').click();
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 120_000 });
    await settle(page);

    // Retreating costs the key, never the damage (BOSSES.md §1).
    await expect(page.getByTestId('result-boss-damage')).not.toHaveText('0');
    await expect(page.getByTestId('result-boss-total')).toContainText('The pool now holds');
    await page.getByTestId('result-gate').click();
    await expect(page.getByTestId('screen-bosses')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    const banked = await bankedDamage(page);
    expect(banked).toBeGreaterThanOrEqual(FIRST_CHEST - 10_000);
    await expect(page.getByTestId('bosses-keys')).toContainText('2/3');
    await expect(page.getByTestId('boss-record-normal')).toContainText('Best');

    // ── The chest that damage earned ─────────────────────────────────────────
    const chest = page.getByTestId('boss-chest-normal-2');
    await expect(chest).toBeEnabled();
    await chest.click();
    await expect(page.getByTestId('pill-gold')).toContainText('530K');
    await expect(chest).toBeDisabled();
    // The next rung is still out of reach on one key.
    await expect(page.getByTestId('boss-chest-normal-12')).toBeDisabled();

    // The week survives a reload: the pool, the spent key and the taken chest are all saved.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await openBossGate(page, 'weekly');
    expect(await bankedDamage(page)).toBe(banked);
    await expect(page.getByTestId('bosses-keys')).toContainText('2/3');
    await expect(page.getByTestId('boss-chest-normal-2')).toBeDisabled();

    expect(problems).toEqual([]);
  });
});
