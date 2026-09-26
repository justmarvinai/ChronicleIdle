import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { closeDialog, collectConsole, eldricContinue, importChronicleFile, settle } from './helpers';

/**
 * The Mine (docs/design/MINE.md) in a production build. Both chronicles come from
 * `tools/fixtures/mine-chronicle.ts` and hold the Mine a new chronicle is handed: level 1, its first
 * store full. One stands at the Mine's lesson; the other is past the tutorial with a purse that
 * digs one level and not the next.
 */
const FIXTURES = join(import.meta.dirname, '..', 'fixtures', 'saves');
const LESSON = join(FIXTURES, 'mine-lesson.chronicle');
const DEEPER = join(FIXTURES, 'mine.chronicle');

test.describe('the Mine', () => {
  test.setTimeout(240_000);

  test('is taught the moment it opens: the building, the store, the level below', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, LESSON);

    // 5.4 — Eldric points at the building by the fountain, its store full.
    await eldricContinue(page, 'tut.5.4');
    const hotspot = page.getByTestId('hotspot-mine');
    await expect(hotspot).toContainText('Store full');
    await hotspot.click();
    await expect(page.getByTestId('dialog-mine')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('mine-store')).toContainText('3/3');

    // Collecting is what finishes the lesson; the next one points at the level below.
    await page.getByTestId('mine-collect').click();
    await expect(page.getByTestId('mine-store')).toContainText('0/3');
    await eldricContinue(page, 'tut.5.5');
    await expect(page.getByTestId('mine-gate')).toContainText('Opens at chronicle level 9');
    await expect(page.getByTestId('mine-dig')).toBeDisabled();

    expect(problems).toEqual([]);
  });

  test('collects the store, digs a level deeper, and names what the next one lacks', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, DEEPER);

    const hotspot = page.getByTestId('hotspot-mine');
    await expect(hotspot).toContainText('Store full · 3 gems');
    await hotspot.click();
    await expect(page.getByTestId('dialog-mine')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    await page.getByTestId('mine-collect').click();
    await expect(page.getByTestId('mine-haul')).toContainText('+3');
    await expect(page.getByTestId('mine-collect')).toBeDisabled();

    // Level 2 is paid for: the price leaves the purse and the crews move down a stratum.
    await expect(page.getByTestId('mine-stratum-1')).toHaveAttribute('data-state', 'here');
    await page.getByTestId('mine-dig').click();
    await expect(page.getByTestId('mine-stratum-2')).toHaveAttribute('data-state', 'here');
    await expect(page.getByTestId('mine-stratum-1')).toHaveAttribute('data-state', 'dug');
    await expect(page.getByTestId('mine-next')).toContainText('Level 3');

    // Level 3 opens at 12, which this chronicle is — but the metal is not there.
    await expect(page.getByTestId('mine-cost').locator('[data-short="true"]')).not.toHaveCount(0);
    await expect(page.getByTestId('mine-dig')).toBeDisabled();

    // Back on the hub the building counts down to its next gem, and it all survives a reload.
    await closeDialog(page);
    await expect(hotspot).toContainText('Next gem in');
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('hotspot-mine').click();
    await expect(page.getByTestId('mine-stratum-2')).toHaveAttribute('data-state', 'here', {
      timeout: 20_000,
    });

    expect(problems).toEqual([]);
  });
});
