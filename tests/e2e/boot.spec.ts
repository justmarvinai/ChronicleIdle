import { expect, test } from '@playwright/test';
import { collectConsole, gotoTitle } from './helpers';

test.describe('boot', () => {
  test('boots to the title screen without console errors', async ({ page }) => {
    const problems = collectConsole(page);
    await page.goto('/');
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('loading-screen')).toHaveCount(0);
    // No chronicle on this device yet: the slot invites a new one instead of offering Continue.
    await expect(page.getByTestId('title-first')).toBeVisible();
    await expect(page.getByTestId('btn-new-chronicle')).toBeVisible();
    await expect(page.getByTestId('btn-continue')).toHaveCount(0);
    expect(problems).toEqual([]);
  });

  test('scales the 1920×1080 stage uniformly and centres it in the window', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await gotoTitle(page);
    const stage = page.getByTestId('game-stage');
    const box = await stage.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.width)).toBe(1600);
    expect(Math.round(box!.height)).toBe(900);
    const scale = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-scale')),
    );
    expect(scale).toBeCloseTo(1600 / 1920, 3);

    // Ultra-wide: pillarboxed, still 16:9, horizontally centred.
    await page.setViewportSize({ width: 2200, height: 900 });
    await page.waitForTimeout(300);
    const wide = await stage.boundingBox();
    expect(Math.round(wide!.width)).toBe(1600);
    expect(Math.round(wide!.x)).toBe(300);
  });

  test('is an installable app: web manifest served and service worker registered', async ({
    page,
    request,
  }) => {
    const manifest = await request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBe(true);
    const json = (await manifest.json()) as { name: string; display: string; icons: unknown[] };
    expect(json.name).toBe('ChronicleIdle');
    expect(json.display).toBe('standalone');
    expect(json.icons.length).toBeGreaterThanOrEqual(2);

    await gotoTitle(page);
    const registered = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return (
        registration.active !== null || registration.installing !== null || registration.waiting !== null
      );
    });
    expect(registered).toBe(true);
  });

  test('has no browser scrollbars, text selection or context menu', async ({ page }) => {
    await gotoTitle(page);
    const guards = await page.evaluate(() => {
      const root = document.documentElement;
      const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.body.dispatchEvent(menu);
      const zoom = new WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -100 });
      document.body.dispatchEvent(zoom);
      return {
        scrollable: root.scrollWidth > root.clientWidth || root.scrollHeight > root.clientHeight,
        overflow: getComputedStyle(root).overflow,
        userSelect: getComputedStyle(document.body).userSelect,
        contextMenuBlocked: menu.defaultPrevented,
        zoomBlocked: zoom.defaultPrevented,
      };
    });
    expect(guards.scrollable).toBe(false);
    expect(guards.overflow).toBe('hidden');
    expect(guards.userSelect).toBe('none');
    expect(guards.contextMenuBlocked).toBe(true);
    expect(guards.zoomBlocked).toBe(true);
  });
});
