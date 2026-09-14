import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/** A chronicle past the refine gate, with materials and eight pieces on the racks. */
const FORGE_SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'forge.chronicle');

test.describe('the Forge', () => {
  test.setTimeout(240_000);

  test('strikes a piece, breaks two, and lights a star', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, FORGE_SAVE);
    await page.getByTestId('hotspot-forge').click();
    await expect(page.getByTestId('screen-forge')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // Craft: Tier I on the boots slot, with the set left to the hammer.
    await expect(page.getByTestId('forge-craft')).toBeVisible();
    await page.getByTestId('craft-slot-boots').click();
    await expect(page.getByTestId('craft-cost')).toContainText('2,000 Gold');
    await page.getByTestId('craft-strike').click();
    await expect(page.getByTestId('craft-result')).toBeVisible();

    // Naming the set costs a Sigil; Tier II carries every set.
    await page.getByTestId('craft-tier-ember').click();
    await expect(page.getByTestId('craft-cost')).toContainText('12,000 Gold');
    await page.getByRole('combobox', { name: 'Set' }).click();
    await page.getByRole('option', { name: 'Lifedrinker' }).click();
    await page.getByTestId('craft-strike').click();
    await expect(page.getByTestId('craft-result')).toContainText('Lifedrinker');

    // Dismantle: the quick pick takes the 1–2★ pieces, and the yield is quoted first.
    await page.getByTestId('forge-tab-dismantle').click();
    await expect(page.getByTestId('dismantle-press')).toBeDisabled();
    await page.getByTestId('dismantle-quick-lowStar').click();
    await expect(page.getByTestId('dismantle-count')).toContainText('selected');
    await expect(page.getByTestId('dismantle-yield')).toContainText('Scrap Iron');
    await page.getByTestId('dismantle-press').click();
    await expect(page.getByTestId('dismantle-count')).toContainText('0 selected');

    // Refine: the two 4★ weapons are a pair, so one climbs to 5★.
    await page.getByTestId('forge-tab-refine').click();
    await expect(page.getByTestId('forge-refine')).toBeVisible();
    await page
      .getByTestId('refine-panel')
      .getByText(/Feed a twin/)
      .waitFor();
    const weapons = page.getByRole('button', { name: /Weapon/i });
    await weapons.first().click();
    await expect(page.getByTestId('refine-climb')).toContainText('★');
    await expect(page.getByTestId('refine-cost')).toContainText('cores');
    // The twin rack now holds the other 4★ weapon; the last card is never the chosen piece.
    const twins = page.getByRole('button', { name: /Weapon/i });
    await twins.last().click();
    await page.getByTestId('refine-press').click();
    await expect(page.getByTestId('refine-panel')).toBeVisible();

    // And the Armoury is one press away, both ways.
    await page.getByTestId('forge-armoury').click();
    await expect(page.getByTestId('screen-armoury')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('armoury-forge').click();
    await expect(page.getByTestId('screen-forge')).toBeVisible({ timeout: 20_000 });
    expect(problems).toEqual([]);
  });
});
