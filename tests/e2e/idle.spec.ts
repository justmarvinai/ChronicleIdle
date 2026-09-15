import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The Portal fixture is a level-20 chronicle that has mastered Intro, so its chest is full (its
 * last save is days old) and its farm tier is the twelfth settlement — which is exactly the chest
 * at its most interesting. Importing it also runs the 7→8 migration in a production build.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'portal.chronicle');

test.describe('the Idle Chest', () => {
  test.setTimeout(240_000);

  test('fills at the docks, pays what it held, and starts again', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // The hub wears the chest's state: a full ring, the word Full, and a dot.
    const hotspot = page.getByTestId('hotspot-idle');
    await expect(hotspot).toContainText('Full');
    // The top bar carries the same chest on every screen.
    await expect(page.getByTestId('topbar-idle')).toContainText('Full');

    await hotspot.click();
    await expect(page.getByTestId('dialog-idle-chest')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('idle-timer')).toContainText('Full');
    await expect(page.getByTestId('idle-tier')).toContainText('tier 12');
    await expect(page.getByTestId('idle-rewards')).toContainText('Gold');

    await page.getByTestId('idle-claim').click();
    await expect(page.getByTestId('idle-continue')).toBeVisible();
    await expect(page.getByTestId('idle-rewards')).toContainText('Chronicle XP');
    await page.getByTestId('idle-continue').click();
    await expect(page.getByTestId('dialog-idle-chest')).toBeHidden();

    // Emptied: the hub counts down again and the chest refuses a second opening.
    await expect(hotspot).not.toContainText('Full');
    await page.getByTestId('topbar-idle').click();
    await expect(page.getByTestId('dialog-idle-chest')).toBeVisible();
    await expect(page.getByTestId('idle-claim')).toBeDisabled();
    await page.keyboard.press('Escape');

    // The gold it paid survives a reload, as does the empty chest.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('topbar-idle')).not.toContainText('Full');

    expect(problems).toEqual([]);
  });
});
