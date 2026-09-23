import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/** A chronicle with shards to spend and the Intro chronicle mastered. */
const PORTAL_SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'portal.chronicle');

test.describe('the Summoning Portal', () => {
  /*
   * Two Pixi ritual scenes and eleven card reveals, all through swiftshader: two minutes on an
   * idle machine, twice that when a local run puts a second worker on the same cores. The battle
   * specs carry the same budget for the same reason.
   */
  test.setTimeout(480_000);

  test('summons once and ten times, and claims the milestone Epic', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, PORTAL_SAVE);
    await page.getByTestId('hotspot-portal').click();
    await expect(page.getByTestId('screen-portal')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // The rail holds four shards and quotes the purse.
    await expect(page.getByTestId('portal-held-faded')).toContainText('40');
    await expect(page.getByTestId('portal-shard-primordial')).toBeVisible();

    // One pull: the ritual runs, a card lands, the results panel offers the way out.
    await page.getByTestId('portal-summon-1').click();
    await expect(page.getByTestId('summon-card-0')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('summon-results')).toBeVisible({ timeout: 30_000 });
    // The champion steps *through* the gate, so the card lands on the ring's centre rather than in
    // the middle of the window, which is off to one side of it (the owner's batch).
    const offset = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="summon-card-0"]');
      const layer = document.querySelector('[data-testid="summon-ritual"]');
      if (!card || !layer) return null;
      const c = card.getBoundingClientRect();
      const l = layer.getBoundingClientRect();
      // `RING` in `@render/summon/ritualScene`, in the scene's own 1920×1080 stage pixels.
      return {
        dx: c.left + c.width / 2 - (l.left + (908 / 1920) * l.width),
        dy: c.top + c.height / 2 - (l.top + (440 / 1080) * l.height),
      };
    });
    expect(Math.abs(offset?.dx ?? 999)).toBeLessThan(2);
    expect(Math.abs(offset?.dy ?? 999)).toBeLessThan(2);
    await expect(page.getByTestId('portal-held-faded')).toContainText('39');
    await page.getByTestId('summon-continue').click();
    await expect(page.getByTestId('summon-reveal')).toBeHidden();

    // Ten pulls on an Ancient Shard, skipped while the gate is still telling: every card lands at
    // once, face up. (Skip is pressed during the ritual, not the deal: the deal turns its ten in a
    // few seconds of wall-clock, which a click through swiftshader can take just to find the
    // button.)
    await page.getByTestId('portal-shard-ancient').click();
    await page.getByTestId('portal-summon-10').click();
    await page.getByTestId('summon-skip').click();
    await expect(page.getByTestId('summon-card-9')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid^="summon-card-"][data-face="up"]')).toHaveCount(10);
    await expect(page.getByTestId('portal-held-ancient')).toContainText('30');
    await page.getByTestId('summon-continue').click();

    // Rates and history are one tap away.
    await page.getByTestId('portal-rates').click();
    await expect(page.getByTestId('dialog-summon-rates')).toContainText('92 %');
    await page.keyboard.press('Escape');
    await page.getByTestId('portal-history').click();
    await expect(page.getByTestId('dialog-summon-history')).toBeVisible();
    await page.keyboard.press('Escape');

    // The Exchange buys a Faded Shard for gold.
    await page.getByTestId('portal-shard-faded').click();
    await page.getByTestId('portal-buy-1').click();
    await expect(page.getByTestId('portal-held-faded')).toContainText('40');

    // The Featured tab shows the rotation and who it favours.
    await page.getByTestId('portal-tab-featured').click();
    await expect(page.getByTestId('portal-rotation')).toBeVisible();

    // The Intro milestone's Epic, claimed by name.
    await page.getByTestId('portal-choice').click();
    await expect(page.getByTestId('dialog-champion-picker')).toBeVisible();
    await page.getByTestId('picker-champion-champ.khazgor').click();
    await page.getByTestId('picker-confirm').click();
    await expect(page.getByTestId('dialog-champion-picker')).toBeHidden();
    await expect(page.getByTestId('portal-choice')).toBeHidden();

    // And the new copies are marked in the Champions index until they are opened.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('hotspot-champions').click();
    await expect(page.getByTestId('screen-champions')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByText('NEW').first()).toBeVisible();

    expect(problems).toEqual([]);
  });
});
