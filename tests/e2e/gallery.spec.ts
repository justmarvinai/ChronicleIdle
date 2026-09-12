import { expect, test } from '@playwright/test';
import { collectConsole, startChronicle } from './helpers';

test.describe('component gallery', () => {
  test('renders every component without console warnings or broken images', async ({ page }) => {
    const problems = collectConsole(page);
    await startChronicle(page);
    await page.goto('/?screen=devkit');
    await expect(page.getByTestId('screen-devkit')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);

    const sections = await page.locator('[data-testid="screen-devkit"] h2').count();
    expect(sections).toBeGreaterThanOrEqual(8);

    // Scroll through so lazy sprites and tinted frames all get a chance to load.
    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1000);

    const broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.src),
    );
    expect(broken).toEqual([]);
    expect(problems).toEqual([]);
  });
});
