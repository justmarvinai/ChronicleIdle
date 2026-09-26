import { expect, test } from '@playwright/test';
import { closeDialog, gotoTitle, openSettingsTab, settle, startChronicle } from './helpers';

/**
 * The Hall is absent on purpose: the missions open at level 1 and guide the player from there.
 * So is the Market, which opened at level 1 in `0.9.0` — it is checked from the other side below.
 */
const LOCKED_HOTSPOTS: Record<string, RegExp> = {
  portal: /level 4/,
  tavern: /level 2/,
  forge: /level 8/,
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
    // Campaign, the Dungeons, the Bosses menu (0.7.1), the Brewery (0.7.0), the Unwritten (0.13.0)
    // and the tower. The tower's card is there from the start and says what opens it, because it
    // is gated on clearing Intro rather than on a level.
    await expect(page.locator('[data-testid^="mode-"]')).toHaveCount(6);
    await expect(page.getByTestId('mode-unwritten')).toContainText('Unlocks at level 16');
    await expect(page.getByTestId('mode-tower')).toContainText(/Intro/);
    // A fresh chronicle is level 1, so the Brewery's card says what it is waiting for.
    await expect(page.getByTestId('mode-brewery')).toContainText('Unlocks at level 3');
    // The keeps are open from the first hour; only the ladder stands in the way (DUNGEONS.md §2).
    await expect(page.getByTestId('mode-dungeons')).toContainText('Enter');
  });

  test('the Market opens on day one, on the stall this hour is carrying', async ({ page }) => {
    await startChronicle(page);
    // It stood shut until `0.9.0` and now opens from the first hour (MARKET.md), which is the half
    // of the hotspot table the locked walk below can no longer cover.
    await page.getByTestId('hotspot-market').click();
    await expect(page.getByTestId('screen-market')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.locator('[data-testid^="stall-slot-"]')).toHaveCount(6);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
  });

  test('the Chronicle of Changes is a frame on the title screen, and opens from Settings', async ({
    page,
  }) => {
    // Two screens in one walk: the title frame, then a whole chronicle begun to reach Settings.
    // It fits the default minute on this machine and does not on a CI runner.
    test.slow();
    await gotoTitle(page);
    // A frame, not a window: nothing is pressed to see it.
    const panel = page.getByTestId('title-changelog');
    await expect(panel).toBeVisible();
    const view = page.getByTestId('title-changelog-view');
    const newest = view.locator('[data-release]').first();
    await expect(newest.getByText('Latest')).toBeVisible();
    await expect(view.locator('li[data-kind]').first()).toBeVisible();
    // It stays in its frame and scrolls the years of releases it holds.
    const fits = await page.evaluate(() => {
      const box = document.querySelector('[data-testid="title-changelog"]')?.getBoundingClientRect();
      const scroller = document.querySelector('[data-testid="title-changelog-view"] [class*="viewport"]');
      const lines = [...document.querySelectorAll('[data-testid="title-changelog-view"] li')];
      return {
        insideWindow: !!box && box.right <= window.innerWidth + 1 && box.bottom <= window.innerHeight + 1,
        scrolls: !!scroller && scroller.scrollHeight > scroller.clientHeight + 4,
        insideRight: lines.every((li) => li.getBoundingClientRect().right <= (box?.right ?? 0) + 1),
      };
    });
    expect(fits.insideWindow, 'the frame is inside the window').toBe(true);
    expect(fits.scrolls, 'the list scrolls').toBe(true);
    expect(fits.insideRight, 'no line runs past the frame').toBe(true);

    // The chips filter and the toggle flips the order.
    await view.getByTestId('title-changelog-view-filter-fixed').click();
    const kinds = await view
      .locator('li[data-kind]')
      .evaluateAll((els) => Array.from(new Set(els.map((el) => (el as HTMLElement).dataset.kind ?? ''))));
    expect(kinds).toEqual(['fixed']);
    await view.getByTestId('title-changelog-view-filter-all').click();
    const first = await view.locator('[data-release]').first().getAttribute('data-release');
    await view.getByTestId('title-changelog-view-order').click();
    await expect(view.locator('[data-release]').first()).not.toHaveAttribute('data-release', first ?? '');

    // And the same chronicle opens from inside a chronicle.
    await startChronicle(page);
    await openSettingsTab(page, 'About');
    await page.getByTestId('open-changelog').click();
    await expect(page.getByTestId('dialog-changelog')).toBeVisible();
    await expect(page.getByTestId('dialog-changelog-view').locator('li[data-kind]').first()).toBeVisible();
    await closeDialog(page);
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
    // The Bosses card opens with the first of the two gates behind it; the Titan's own level is
    // on its card in the menu, which a chronicle this young cannot reach yet.
    await expect(page.getByTestId('mode-bosses')).toContainText('Unlocks at level 10');
    await page.getByTestId('mode-bosses').getByRole('button').click();
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
