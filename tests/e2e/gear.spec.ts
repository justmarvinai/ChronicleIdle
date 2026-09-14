import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, openChampions, settle } from './helpers';

/** A chronicle past the gear gate with twelve pieces on the racks, two of them Warcry. */
const ARMOURY_SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'armoury.chronicle');

test.describe('gear', () => {
  test.setTimeout(240_000);

  test('levels a piece in the Armoury, then wears a set on a champion', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, ARMOURY_SAVE);

    // The Armoury: the racks, the bench and the capacity band.
    await page.getByTestId('nav-armoury').click();
    await expect(page.getByTestId('screen-armoury')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('gear-count')).toContainText('12 of 12');
    await expect(page.getByTestId('armoury-capacity')).toContainText('12 / 400');
    await expect(page.getByTestId('gear-detail')).toBeVisible();

    // Upgrading: four levels for the price the button quotes, and the roll at +4.
    await expect(page.getByTestId('gear-detail-level')).toHaveText('+0');
    await page.getByTestId('gear-upgrade-4').click();
    await expect(page.getByTestId('gear-detail-level')).toHaveText('+4');
    await expect(page.getByTestId('gear-detail-subs')).toBeVisible();

    // Locking protects a piece from the Forge.
    await page.getByTestId('gear-lock').click();
    await expect(page.getByTestId('gear-lock')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('gear-lock').click();

    // Filtering the racks down to one slot and back again.
    await page.getByTestId('gear-filter-slot-weapon').click();
    await expect(page.getByTestId('gear-count')).toContainText('2 of 12');
    await page.getByTestId('gear-filter-clear').click();
    await expect(page.getByTestId('gear-count')).toContainText('12 of 12');

    // The champion's own rack: equip the Warcry weapon through the picker.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await openChampions(page);
    await page.getByTestId('tab-gear').click();
    await expect(page.getByTestId('panel-gear')).toBeVisible();
    await expect(page.getByTestId('gear-sets-none')).toBeVisible();

    await page.getByTestId('gear-slot-weapon').getByRole('button').first().click();
    await expect(page.getByTestId('dialog-gear-picker')).toBeVisible();
    await page
      .getByTestId('dialog-gear-picker')
      .getByRole('button', { name: /Warcry/ })
      .first()
      .click();
    await expect(page.getByTestId('gear-compare-name')).toContainText('Warcry Weapon');
    await expect(page.getByTestId('gear-compare-power')).toContainText('Power');
    await page.getByTestId('gear-equip').click();
    await expect(page.getByTestId('dialog-gear-picker')).toHaveCount(0);
    await expect(page.getByTestId('gear-main-weapon')).toContainText('ATK');

    // The second Warcry piece completes the group, and the tab says so.
    await page.getByTestId('gear-slot-helmet').getByRole('button').first().click();
    await expect(page.getByTestId('dialog-gear-picker')).toBeVisible();
    await page
      .getByTestId('dialog-gear-picker')
      .getByRole('button', { name: /Warcry/ })
      .first()
      .click();
    await expect(page.getByTestId('set-gain-gear_set.warcry')).toBeVisible();
    await page.getByTestId('gear-equip').click();
    await expect(page.getByTestId('gear-set-gear_set.warcry')).toContainText('1 ×');

    // And taking one off breaks the group again.
    await page.getByTestId('gear-remove-helmet').click();
    await expect(page.getByTestId('gear-set-gear_set.warcry')).not.toContainText('1 ×');
    expect(problems).toEqual([]);
  });
});
