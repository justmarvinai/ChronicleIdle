import { expect, test, type Page } from '@playwright/test';
import { bindStarter, gotoTitle, openSettingsTab } from './helpers';

const isFullscreen = (page: Page): Promise<boolean> =>
  page.evaluate(() => document.fullscreenElement !== null);

test.describe('game window', () => {
  test('fullscreen is offered on the first click, never forced, and not offered again once declined', async ({
    page,
  }) => {
    test.slow();
    await gotoTitle(page);
    const supported = await page.evaluate(() => document.fullscreenEnabled);
    test.skip(!supported, 'fullscreen is not available in this browser build');

    // First click anywhere on the title screen: the offer.
    await page.getByTestId('screen-title').click({ position: { x: 40, y: 40 } });
    await expect.poll(() => isFullscreen(page)).toBe(true);

    // Leaving fullscreen is the player's answer: remembered, never re-prompted.
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => isFullscreen(page)).toBe(false);
    await page.getByTestId('screen-title').click({ position: { x: 40, y: 60 } });
    await page.waitForTimeout(400);
    expect(await isFullscreen(page)).toBe(false);

    // The choice is stored with the chronicle and survives a reload.
    await page.getByTestId('btn-new-chronicle').click();
    await page.getByTestId('name-input').fill('Marvin');
    await page.getByTestId('begin-chronicle').click();
    await bindStarter(page);
    expect(await isFullscreen(page)).toBe(false);
    await openSettingsTab(page, 'Display');
    await expect(page.getByRole('switch', { name: 'Offer fullscreen at launch' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await page.reload();
    await gotoTitle(page);
    await page.getByTestId('screen-title').click({ position: { x: 40, y: 40 } });
    await page.waitForTimeout(400);
    expect(await isFullscreen(page)).toBe(false);
  });

  test('the title-screen button toggles fullscreen both ways', async ({ page }) => {
    await gotoTitle(page);
    const supported = await page.evaluate(() => document.fullscreenEnabled);
    test.skip(!supported, 'fullscreen is not available in this browser build');
    await page.getByTestId('btn-fullscreen').click();
    await expect.poll(() => isFullscreen(page)).toBe(true);
    await expect(page.getByTestId('btn-fullscreen')).toContainText(/exit/i);
    await page.getByTestId('btn-fullscreen').click();
    await expect.poll(() => isFullscreen(page)).toBe(false);
  });
});
