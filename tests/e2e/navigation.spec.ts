import { expect, test } from '@playwright/test';
import { closeDialog, openSettingsTab, settle, startChronicle } from './helpers';

/** The Hall is absent on purpose: the missions open at level 1 and guide the player from there. */
const LOCKED_HOTSPOTS: Record<string, RegExp> = {
  portal: /level 4/,
  tavern: /level 2/,
  forge: /level 8/,
  market: /later chapter/,
  idle: /level 5/,
};

test.describe('navigation', () => {
  test('the Campaign hotspot and the Battle button open Game Modes', async ({ page }) => {
    await startChronicle(page);
    await page.getByTestId('hotspot-campaign').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible();
    await settle(page);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await settle(page);
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible();
    await expect(page.locator('[data-testid^="mode-"]')).toHaveCount(3);
  });

  test('every other hotspot explains why it is still closed', async ({ page }) => {
    test.slow();
    await startChronicle(page);
    for (const [id, reason] of Object.entries(LOCKED_HOTSPOTS)) {
      await page.getByTestId(`hotspot-${id}`).click();
      const locked = page.getByTestId('screen-locked');
      await expect(locked).toBeVisible();
      await expect(locked).toContainText(reason);
      await settle(page);
      await page.getByTestId('locked-back').click();
      await expect(page.getByTestId('screen-hub')).toBeVisible();
      await settle(page);
    }
  });

  test('game mode cards are gated by player level', async ({ page }) => {
    await startChronicle(page);
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('mode-daily')).toContainText('Unlocks at level 10');
    await expect(page.getByTestId('mode-weekly')).toContainText('Unlocks at level 15');
    await page.getByTestId('mode-daily').getByRole('button').click();
    await expect(page.getByTestId('screen-locked')).toContainText('level 10');
  });

  test('settings changes persist across a reload', async ({ page }) => {
    test.slow();
    await startChronicle(page);
    await openSettingsTab(page, 'Display');
    await page.getByRole('switch', { name: 'Reduce menu motion' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await closeDialog(page);
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
    await openSettingsTab(page, 'Display');
    await expect(page.getByRole('switch', { name: 'Reduce menu motion' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('dialogs close on Escape and trap focus inside', async ({ page }) => {
    await startChronicle(page);
    await page.getByTestId('topbar-settings').click();
    const dialog = page.getByTestId('dialog-settings');
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(
        () => !!document.activeElement?.closest('[data-testid="dialog-settings"]'),
      );
      expect(inside).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });
});
