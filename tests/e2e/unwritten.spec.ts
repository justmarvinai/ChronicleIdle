import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, eldricContinue, importChronicleFile, runItself, settle } from './helpers';

/**
 * The Unwritten (docs/design/UNWRITTEN.md) in a production build. The fixture
 * (`tools/fixtures/unwritten-chronicle.ts`) is the day the Torn Page opens: level 16, the lesson
 * still unheard, eight champions at 5★ and a few Recovered Pages. One sitting hears the lesson,
 * sets out under the first Omen, wins the first skirmish on auto and writes what it offers, finds
 * the expedition still there after a reload, turns back — and reads its Tale.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'unwritten.chronicle');

test.describe('the Unwritten', () => {
  // One skirmish at ×4 with the full stage and its FX; a software renderer needs the room.
  test.setTimeout(420_000);

  test('sets out, wins a passage, keeps it through a reload, and writes its Tale', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // Eldric points at the rift the day it opens; the rift says the week's Tithes are all there.
    await eldricContinue(page, 'tut.6.11');
    const rift = page.getByTestId('hotspot-unwritten');
    await expect(rift).toContainText('The Torn Page');
    await expect(rift).toContainText('Tithes this week: 6/6');

    // Game Modes carries it too, between the Brewery and the tower.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('note-unwritten')).toHaveText('Omen 0 open · Tithes 6/6');
    await page.getByTestId('enter-unwritten').click();
    await expect(page.getByTestId('screen-unwritten')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // The threshold: the first Omen read, the next ones shut until it is won.
    await expect(page.getByTestId('unwritten-omen-reading')).toContainText('Omen 0 · The First Page');
    await expect(page.getByTestId('unwritten-omen-1')).toBeDisabled();
    await expect(page.getByTestId('unwritten-begin')).toBeDisabled();
    const picks = page.locator('[data-testid^="unwritten-pick-"]');
    for (let i = 0; i < 4; i += 1) await picks.nth(i).click();
    await expect(page.getByTestId('unwritten-company-count')).toHaveText('4 of 6 chosen');
    await page.getByTestId('unwritten-begin').click();

    // The first folio's map, the company at full strength and the purse it set out with.
    await expect(page.getByTestId('unwritten-map')).toBeVisible();
    await expect(page.getByTestId('unwritten-where')).toContainText('Folio I');
    await expect(page.getByTestId('unwritten-gilt')).toContainText('40');
    const open = page.locator('[data-testid^="unwritten-passage-"][data-state="open"][data-kind="skirmish"]');
    await open.first().click();
    await expect(page.getByTestId('unwritten-preview')).toContainText('Skirmish');
    await page.getByTestId('unwritten-enter').click();

    // The muster: the foes standing in the passage, the four going in.
    await expect(page.getByTestId('unwritten-panel-fight')).toBeVisible();
    await expect(page.getByTestId('unwritten-fielded-count')).toHaveText('4/4');
    await page.getByTestId('unwritten-fight').click();
    await runItself(page);

    // Straight back to the folio with the victory's spoils, and three inscriptions to write one of.
    await expect(page.getByTestId('screen-unwritten')).toBeVisible({ timeout: 300_000 });
    await settle(page);
    const offer = page.getByTestId('unwritten-panel-offer');
    await expect(offer).toBeVisible();
    await expect(offer).toContainText('A skirmish won');
    await expect(page.getByTestId('unwritten-spoils')).toContainText('Pages');
    await page.getByTestId('unwritten-offer-0').click();
    await expect(offer).toHaveCount(0);
    await expect(page.locator('[data-testid^="unwritten-held-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="unwritten-passage-"][data-state="walked"]')).toHaveCount(1);

    // It keeps: the expedition is in the save, not in the page.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await expect(page.getByTestId('hotspot-unwritten')).toContainText('Folio I · Omen 0');
    await page.getByTestId('hotspot-unwritten').click();
    await expect(page.getByTestId('screen-unwritten')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.locator('[data-testid^="unwritten-held-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid^="unwritten-passage-"][data-state="walked"]')).toHaveCount(1);

    // The Scriptorium's candles are out while the company is away.
    await page.getByTestId('unwritten-tab-scriptorium').click();
    await expect(page.getByTestId('unwritten-scriptorium')).toContainText('The candles are out');
    await expect(page.getByTestId('unwritten-write-scriptorium.deeper_purse')).toBeDisabled();
    await page.getByTestId('unwritten-tab-expedition').click();

    // Turning back is asked once, and ends it as a defeat would: its Pages come home, its Tale is told.
    await page.getByTestId('unwritten-abandon').click();
    await expect(page.getByTestId('unwritten-confirm-abandon')).toContainText('Recovered Pages come home');
    await page.getByTestId('unwritten-abandon-confirm').click();
    const tale = page.getByTestId('unwritten-ending-tale');
    await expect(tale).toBeVisible();
    await expect(tale).toHaveAttribute('data-result', 'abandoned');
    await expect(tale).toContainText('The Company Turned Back');
    await expect(tale).toContainText('was written.');
    await page.getByTestId('unwritten-ending-close').click();
    await expect(page.getByTestId('unwritten-threshold')).toBeVisible();

    // The Records keep it, and the Pages it brought home write the first folio of the Scriptorium.
    await page.getByTestId('unwritten-tab-records').click();
    await expect(page.getByTestId('unwritten-tale-0')).toContainText('Turned back');
    await page.getByTestId('unwritten-tab-scriptorium').click();
    await page.getByTestId('unwritten-write-scriptorium.deeper_purse').click();
    await expect(page.getByTestId('unwritten-folio-scriptorium.deeper_purse')).toHaveAttribute(
      'data-state',
      'written',
    );

    expect(problems).toEqual([]);
  });
});
