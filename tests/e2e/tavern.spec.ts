import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/** A chronicle past the Tavern's gate, with brews, tomes and three spare 3★ copies. */
const TAVERN_SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'tavern.chronicle');

test.describe('the Tavern', () => {
  test.setTimeout(240_000);

  test('levels, ranks and sharpens a champion', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, TAVERN_SAVE);
    await page.getByTestId('hotspot-tavern').click();
    await expect(page.getByTestId('screen-tavern')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    // The rail opens on whoever sorts first; put Ser Corvin on the stool.
    await page.getByTestId('tavern-card-ser_corvin-1').click();
    await expect(page.getByTestId('tavern-portrait')).toHaveAttribute('data-champion', 'champ.ser_corvin');
    await expect(page.getByTestId('tavern-champion-level')).toContainText('1');

    // Level: pour the champion's own brew, then seat a companion from the picker.
    await page.getByTestId('brew-plus-brew_justice').click();
    await expect(page.getByTestId('brew-count-brew_justice')).toHaveText('1');
    // Justice is Ser Corvin's element, so the brew pours 2,250 rather than 1,500.
    await expect(page.getByTestId('tavern-xp')).toContainText('2,250');
    await page.getByTestId('seat-empty-0').click();
    await expect(page.getByTestId('dialog-food-picker')).toBeVisible();
    await page
      .getByTestId('dialog-food-picker')
      .getByTestId(/^food-/)
      .first()
      .click();
    await expect(page.getByTestId('dialog-food-picker')).toHaveCount(0);
    await expect(page.getByTestId('tavern-cost')).toContainText('Gold');

    await page.getByTestId('tavern-upgrade').click();
    // A Common companion at level 1 is nobody's treasure, so the press lands without a question.
    await expect(page.getByTestId('tavern-champion-level')).not.toContainText('Level 1 ');
    await settle(page);

    // Skills: one Rare Tome buys the first step.
    await page.getByTestId('tavern-tab-skills').click();
    await expect(page.getByTestId('tavern-tomes')).toContainText('2 held');
    const skill = page.getByTestId(/^skill-upgrade-/).first();
    await skill.click();
    await expect(page.getByTestId('tavern-tomes')).toContainText('1 held');

    // Rank: three 3★ copies and the gold from the table, with the Tavern asking first.
    await page.getByTestId('tavern-tab-rank').click();
    await expect(page.getByTestId('tavern-rank-need')).toContainText('3 × 3★');
    await page.getByTestId('tavern-autofill-rank').click();
    await expect(page.getByTestId('tavern-rank-seated')).toContainText('3 of 3');
    await page.getByTestId('tavern-upgrade').click();
    await expect(page.getByTestId('dialog-tavern-confirm')).toBeVisible();
    await page.getByTestId('tavern-confirm-accept').click();
    await expect(page.getByTestId('dialog-tavern-confirm')).toHaveCount(0);
    // The star is lit: the next rank-up asks for four of the tier he just reached.
    await expect(page.getByTestId('tavern-rank-need')).toContainText('4 × 4★');
    await expect(page.getByTestId('tavern-rank-seated')).toContainText('0 of 4');
    expect(problems).toEqual([]);
  });
});
