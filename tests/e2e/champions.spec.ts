import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import {
  bindStarter,
  closeDialog,
  collectConsole,
  gotoTitle,
  importChronicleFile,
  openChampions,
  settle,
  startChronicle,
} from './helpers';

const ROSTER_204 = join(import.meta.dirname, '..', 'fixtures', 'saves', 'roster-204.chronicle');

test.describe('starter choice', () => {
  test('a new chronicle offers three Rares and binding one seeds the roster', async ({ page }) => {
    test.slow();
    const problems = collectConsole(page);
    await gotoTitle(page);
    await page.getByTestId('btn-new-chronicle').click();
    await page.getByTestId('name-input').fill('Marvin');
    await page.getByTestId('begin-chronicle').click();
    await expect(page.getByTestId('screen-starter')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    for (const slug of ['sister_maelis', 'ser_corvin', 'reva_ashblade']) {
      const card = page.getByTestId(`starter-${slug}`);
      await expect(card).toBeVisible();
      await expect(card).toContainText('% of');
      await expect(card).not.toContainText(/\{\w+\}/);
    }
    await bindStarter(page, 'reva_ashblade');
    await expect(page.getByTestId('profile-chip')).toHaveAttribute('data-avatar', 'champ.reva_ashblade');
    await openChampions(page);
    await expect(page.locator('[data-testid^="roster-card-"]')).toHaveCount(4);
    await expect(page.getByTestId('roster-count')).toHaveText('4 of 4');
    await expect(page.getByTestId('hero-name')).toHaveText('Reva Ashblade');

    // Continue after a reload lands on the hub, not on the starter screen again.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    expect(problems).toEqual([]);
  });
});

test.describe('champion detail', () => {
  test('tabs show live ability numbers, lore, the locked gear panel and placeholder art', async ({
    page,
  }) => {
    test.slow();
    const problems = collectConsole(page);
    await startChronicle(page, 'Marvin', 'ser_corvin');
    await openChampions(page);
    await expect(page.getByTestId('hero-name')).toHaveText('Ser Corvin');
    await expect(page.getByTestId('hero-level')).toContainText('1 / 30');
    await expect(page.getByTestId('hero-placeholder')).toBeVisible();
    await expect(page.getByTestId('champion-power')).not.toHaveText('0');
    await expect(page.getByTestId('stat-hp')).toContainText('3,010');

    await page.getByTestId('tab-abilities').click();
    await expect(page.getByTestId('panel-abilities')).toBeVisible();
    await expect(page.getByTestId('ability-text-a1')).toContainText('320% of DEF');
    await expect(page.getByTestId('ability-text-a2')).toContainText('Cooldown 5 turns');
    await expect(page.getByTestId('panel-abilities')).not.toContainText(/\{\w+\}/);

    await page.getByTestId('tab-lore').click();
    await expect(page.getByTestId('panel-lore')).toContainText('Corvin');
    await expect(page.getByTestId('panel-lore')).toContainText('1 owned');
    await page.getByTestId('tab-gear').click();
    await expect(page.getByTestId('panel-gear')).toBeVisible();

    // Companions come with the starter; Bran borrows the lizard model and says so.
    await page.getByTestId('roster-card-bran_militia-2').click();
    await expect(page.getByTestId('hero-name')).toHaveText('Bran of the Militia');
    await expect(page.getByTestId('hero-placeholder')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('lock and favourite persist across a reload and favourites sort first', async ({ page }) => {
    test.slow();
    await startChronicle(page, 'Marvin', 'ser_corvin');
    await openChampions(page);
    await page.getByTestId('roster-card-gil_scrapper-4').click();
    await expect(page.getByTestId('hero-name')).toHaveText('Gil the Scrapper');
    await page.getByTestId('champion-lock').click();
    await page.getByTestId('champion-favourite').click();
    await expect(page.getByTestId('champion-lock')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('champion-favourite')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid^="roster-card-"]').first()).toHaveAttribute(
      'data-testid',
      'roster-card-gil_scrapper-4',
    );

    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await openChampions(page);
    await page.getByTestId('roster-card-gil_scrapper-4').click();
    await expect(page.getByTestId('champion-lock')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('champion-favourite')).toHaveAttribute('aria-pressed', 'true');
  });
});

test.describe('champions index with 204 champions', () => {
  test('imports a large roster, virtualises the grid and sorts/filters correctly', async ({ page }) => {
    test.slow();
    const problems = collectConsole(page);
    await importChronicleFile(page, ROSTER_204);
    await expect(page.getByTestId('profile-chip')).toContainText('Marvin');
    await openChampions(page);
    await expect(page.getByTestId('roster-count')).toHaveText('204 of 204');
    const cards = page.locator('[data-testid^="roster-card-"]');
    const rendered = await cards.count();
    expect(rendered).toBeGreaterThan(16);
    expect(rendered).toBeLessThan(64);

    // Rank sort (default, descending): mythics first, commons last.
    const firstLabel = await cards.first().getAttribute('aria-label');
    expect(firstLabel).toContain('mythic');
    await page.getByTestId('virtual-grid').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(300);
    expect(await cards.count()).toBeLessThan(64);
    const lastLabel = await cards.last().getAttribute('aria-label');
    expect(lastLabel).toContain('common');

    // Rarity filter narrows the count; the legendary chip keeps only legendaries.
    await page.getByTestId('filter-rarity-legendary').click();
    const legendaryCount = await page.getByTestId('roster-count').innerText();
    expect(legendaryCount).toMatch(/^\d+ of 204$/);
    expect(Number(legendaryCount.split(' ')[0])).toBeGreaterThan(0);
    for (const label of await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))))
      expect(label).toContain('legendary');
    await page.getByTestId('filter-clear').click();
    await expect(page.getByTestId('roster-count')).toHaveText('204 of 204');

    // Element + role filters combine.
    await page.getByTestId('filter-element-valor').click();
    await page.getByTestId('filter-role-attack').click();
    for (const label of await cards.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label'))))
      expect(label).toBeTruthy();
    const combined = Number((await page.getByTestId('roster-count').innerText()).split(' ')[0]);
    expect(combined).toBeGreaterThan(0);
    expect(combined).toBeLessThan(204);
    await page.getByTestId('filter-clear').click();

    // Name sort, ascending after the direction toggle.
    await page.getByTestId('roster-filters').getByRole('combobox').click();
    await page.getByRole('option', { name: 'Name' }).click();
    await page.getByTestId('roster-sort-direction').click();
    await page.getByTestId('virtual-grid').evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(300);
    // Favourites always lead; inside each group the names run Z→A after the toggle.
    const rows = await cards.evaluateAll((els) =>
      els.map((e) => ({
        name: (e.getAttribute('aria-label') ?? '').split(',')[0] ?? '',
        favourite: e.getAttribute('data-favourite') === 'true',
      })),
    );
    const firstRegular = rows.findIndex((row) => !row.favourite);
    expect(rows.slice(Math.max(0, firstRegular)).every((row) => !row.favourite)).toBe(true);
    for (const group of [rows.filter((r) => r.favourite), rows.filter((r) => !r.favourite)]) {
      const names = group.map((row) => row.name);
      expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)));
    }
    expect(problems).toEqual([]);
  });
});

test.describe('profile avatar', () => {
  test('any owned champion can become the avatar', async ({ page }) => {
    test.slow();
    await startChronicle(page, 'Marvin', 'sister_maelis');
    await expect(page.getByTestId('profile-chip')).toHaveAttribute('data-avatar', 'champ.sister_maelis');
    await page.getByTestId('profile-chip').click();
    await expect(page.getByTestId('dialog-profile')).toBeVisible();
    await page.getByTestId('choose-avatar').click();
    await expect(page.getByTestId('dialog-avatar-picker')).toBeVisible();
    await page.getByTestId('dialog-avatar-picker').getByRole('button', { name: /Wenna/ }).click();
    await expect(page.getByTestId('dialog-avatar-picker')).toHaveCount(0);
    await expect(page.getByTestId('profile-chip')).toHaveAttribute('data-avatar', 'champ.wenna_novice');
    await page.getByTestId('profile-chip').click();
    await page.getByTestId('choose-avatar').click();
    await page.getByTestId('avatar-none').click();
    await expect(page.getByTestId('profile-chip')).toHaveAttribute('data-avatar', 'chronicler');
    await closeDialog(page);
  });
});
