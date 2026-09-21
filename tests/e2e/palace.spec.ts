import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The Glorious Palace (docs/design/GLORIOUS_PALACE.md) in a production build.
 *
 * The Path fixture is written at save v12 with the whole Intro campaign behind it, so this run
 * walks the 12 → 15 migration on the way in and finds the twelve skill points those settlements
 * owed — which is the migration's back-pay doing its job as well as the screen's.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

const CORE = 'palace-node-palace.core';
const VALOR_1 = 'palace-node-palace.valor.r1.0';

test.describe('the Glorious Palace', () => {
  test('pays the campaign’s points, spends them on the tree, and hands them back', async ({ page }) => {
    test.slow();
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // A building of its own on the Emberhold artwork, open because the first settlement fell.
    const hotspot = page.getByTestId('hotspot-palace');
    await expect(hotspot).toBeVisible();
    await expect(hotspot).not.toContainText('opens when');
    await hotspot.click();
    await expect(page.getByTestId('screen-palace')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // Twelve settlements finished on Intro, twelve points — none of them spent yet.
    await expect(page.getByTestId('palace-available')).toHaveText('12');
    await expect(page.getByTestId('palace-spent')).toContainText('12 to spend · 0 of 237 spent');
    await expect(page.getByTestId('palace-nodes-lit')).toHaveText('0 of 133 nodes lit');
    for (const element of ['justice', 'valor', 'faith', 'eclipse'])
      await expect(page.getByTestId(`palace-branch-${element}`)).toContainText('0/59');
    await expect(page.getByTestId('palace-ledger')).toContainText('One for each settlement you finish');
    await expect(page.getByTestId('palace-ledger')).toContainText('Nothing yet');

    // The whole tree is drawn, and only the Heart can be bought until it is.
    await expect(page.locator('[data-testid^="palace-node-"]')).toHaveCount(133);
    await expect(page.getByTestId(CORE)).toHaveAttribute('data-state', 'ready');
    await expect(page.getByTestId(VALOR_1)).toHaveAttribute('data-state', 'unreachable');

    // Hovering says what a node is, what it costs and who it is for.
    await page.getByTestId(VALOR_1).hover();
    const tip = page.getByRole('tooltip');
    await expect(tip).toContainText('Vigour');
    await expect(tip).toContainText('1 point');
    await expect(tip).toContainText('Every Valor champion you own');
    await expect(tip).toContainText('Reach it through the nodes before it');

    // The Heart, then the first node of a branch it opens.
    await page.getByTestId(CORE).click();
    await expect(page.getByTestId(CORE)).toHaveAttribute('data-state', 'owned');
    await expect(page.getByTestId(VALOR_1)).toHaveAttribute('data-state', 'ready');
    await page.getByTestId(VALOR_1).click();
    await expect(page.getByTestId(VALOR_1)).toHaveAttribute('data-state', 'owned');
    await expect(page.getByTestId('palace-nodes-lit')).toHaveText('2 of 133 nodes lit');
    await expect(page.getByTestId('palace-branch-valor')).toContainText('1/59');
    await expect(page.getByTestId('palace-gains')).toContainText('+1% HP to every champion you own.');
    await expect(page.getByTestId('palace-gain-valor')).toContainText('+50 HP');
    await expect(page.getByTestId('palace-available')).toHaveText('10');

    // The owner's line on the champion sheet: the Palace's share, in purple beside gear's green.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('hotspot-champions').click();
    await expect(page.getByTestId('screen-champions')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    const palaceHp = page.getByTestId('stat-palace-hp');
    await expect(palaceHp).toContainText('+');
    const purple = await palaceHp.evaluate((el) => getComputedStyle(el).color);
    expect(purple).toBe('rgb(163, 93, 227)');

    // Reclaiming is free and gives every point back (the owner's answer).
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('hotspot-palace').click();
    await expect(page.getByTestId('screen-palace')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await page.getByTestId('palace-reset').click();
    await expect(page.getByTestId('dialog-palace-reset')).toBeVisible();
    await expect(page.getByTestId('dialog-palace-reset')).toContainText('all 2 points return to you');
    await page.getByTestId('confirm-palace-reset').click();
    await expect(page.getByTestId('palace-available')).toHaveText('12');
    await expect(page.getByTestId('palace-nodes-lit')).toHaveText('0 of 133 nodes lit');
    await expect(page.getByTestId(CORE)).toHaveAttribute('data-state', 'ready');

    expect(problems).toEqual([]);
  });
});
