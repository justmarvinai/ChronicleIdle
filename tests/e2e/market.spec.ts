import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The Market, the Bag, the boosts and the Standing Welcome in a production build
 * (docs/design/MARKET.md, docs/design/LOGIN.md).
 *
 * The Path fixture is written at save v12, so this run walks the 12 → 19 migration on the way in
 * and meets all four new slices starting empty — an untouched stall, no boosts, an empty Bag and a
 * calendar on day 1, which is exactly what a veteran chronicle should find (ARCHITECTURE.md §4.1).
 *
 * What it proves is the round trip the owner asked for: **buy, hold, then decide**. Nothing here
 * asserts a particular row on the stall — the six are drawn from the hour, so the test reads what
 * is there and checks the arithmetic rather than the draw, which is `market.test.ts`'s job.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

/**
 * What a header pill really holds. Its text is abbreviated — 825,000 prints as "825K" — so the
 * exact figure is read off `data-amount`, which carries the wallet rather than the tick-up.
 */
async function purseOf(page: Page, currency: string): Promise<number> {
  return Number(await page.getByTestId(`pill-${currency}`).getAttribute('data-amount'));
}

/** A slot's numbers, which are printed in full because they are small. */
function digits(text: string | null): number {
  return Number((text ?? '').replace(/[^\d]/g, ''));
}

test.describe('the Market and the Standing Welcome', () => {
  test('claims a day, buys from both shelves, and the boost reaches the header', async ({ page }) => {
    test.slow();
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // ── The Standing Welcome. A veteran chronicle starts the board at day 1, owed and unclaimed.
    const welcome = page.getByTestId('nav-login');
    await expect(welcome).toBeVisible();
    await welcome.click();
    const board = page.getByTestId('dialog-login');
    await expect(board).toBeVisible();
    await expect(page.getByTestId('login-board')).toBeVisible();
    await expect(page.locator('[data-testid^="login-day-"]')).toHaveCount(30);
    await expect(page.getByTestId('login-cycle')).toContainText('1');

    // Day 1 is today's; the three finale tiles are marked as such and are all still ahead.
    const today = page.getByTestId('login-day-1');
    await expect(today).toHaveAttribute('data-today', 'true');
    await expect(today).toHaveAttribute('data-taken', 'false');
    for (const day of [28, 29, 30]) {
      const tile = page.getByTestId(`login-day-${day}`);
      await expect(tile).toHaveAttribute('data-finale', 'true');
      await expect(tile).toHaveAttribute('data-taken', 'false');
    }
    await expect(page.getByTestId('login-day-27')).toHaveAttribute('data-finale', 'false');

    // Claiming pays the tile and moves the board on — and tomorrow's is *not* marked taken.
    const goldBefore = await purseOf(page, 'gold');
    await page.getByTestId('login-claim').click();
    await expect(today).toHaveAttribute('data-taken', 'true');
    await expect(page.getByTestId('login-day-2')).toHaveAttribute('data-taken', 'false');
    await expect(page.getByTestId('login-claim')).toHaveCount(0);
    await expect(page.getByTestId('login-foot')).toContainText('1');
    await expect.poll(async () => purseOf(page, 'gold')).toBe(goldBefore + 25_000);

    await page.keyboard.press('Escape');
    await expect(board).toHaveCount(0);
    await settle(page);

    // ── The Gold Market: whatever this hour happens to be carrying.
    await page.getByTestId('hotspot-market').click();
    await expect(page.getByTestId('screen-market')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('market-rotates')).toBeVisible();
    const stall = page.getByTestId('market-stall');
    await expect(stall).toBeVisible();
    await expect(page.locator('[data-testid^="stall-slot-"]')).toHaveCount(6);

    await expect(page.getByTestId('stall-slot-0')).toBeVisible();
    const price = Number(await page.getByTestId('stall-price-0').getAttribute('data-gold'));
    const stock = digits(await page.getByTestId('stall-left-0').textContent());
    expect(price).toBeGreaterThan(0);
    expect(stock).toBeGreaterThan(0);

    const purse = await purseOf(page, 'gold');
    await page.getByTestId('stall-buy-0').click();
    // One off the slot, its price off the purse: the two halves of a purchase.
    await expect
      .poll(async () => digits(await page.getByTestId('stall-left-0').textContent()))
      .toBe(stock - 1);
    await expect.poll(async () => purseOf(page, 'gold')).toBe(purse - price);

    // ── The Gem Market: the same nine entries and four bundles, whatever the hour.
    await page.getByTestId('market-tab-gems').click();
    await expect(page.getByTestId('market-shelf')).toBeVisible();
    await expect(page.locator('[data-testid^="shelf-buy-"]')).toHaveCount(13);
    // The gem shelf has no clock, because it never changes.
    await expect(page.getByTestId('market-rotates')).toHaveCount(0);
    await expect(page.getByTestId('shelf-bundle-chroniclers_satchel')).toBeVisible();

    const gems = await purseOf(page, 'gems');
    await page.getByTestId('shelf-buy-champion_xp_boost').click();
    await expect.poll(async () => purseOf(page, 'gems')).toBe(gems - 200);
    // Buying never uses: nothing is running yet.
    await expect(page.getByTestId('boost-pills')).toHaveCount(0);

    // ── The Bag: bought, held, and spent only when the player says so.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await page.getByTestId('nav-bag').click();
    const bag = page.getByTestId('dialog-bag');
    await expect(bag).toBeVisible();
    await expect(page.getByTestId('bag-champion_xp_boost')).toContainText('Champion XP Boost');
    await page.getByTestId('bag-use-champion_xp_boost').click();
    await expect(page.getByTestId('bag-said')).toContainText('Champion XP');
    // The last one is gone, so the row goes with it and the Bag is empty again.
    await expect(page.getByTestId('bag-champion_xp_boost')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(bag).toHaveCount(0);

    // ── The header pill: only the running boost, with its countdown, on every screen.
    const pill = page.getByTestId('boost-champion_xp');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText(/\d/);
    await expect(page.getByTestId('boost-player_xp')).toHaveCount(0);
    await expect(page.getByTestId('boost-brewery')).toHaveCount(0);

    await page.getByTestId('hotspot-market').click();
    await expect(page.getByTestId('screen-market')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('boost-champion_xp')).toBeVisible();

    expect(problems).toEqual([]);
  });
});
