import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { bindStarter, closeDialog, gotoTitle, openSettingsTab, settle, startChronicle } from './helpers';

test.describe('chronicle lifecycle', () => {
  test('a new chronicle lands in Emberhold with the starting purse', async ({ page }) => {
    await startChronicle(page, 'Marvin');
    await expect(page.getByTestId('profile-chip')).toContainText('Marvin');
    await expect(page.getByTestId('pill-gold')).toContainText('2,500');
    await expect(page.getByTestId('pill-energy')).toContainText('60');
    // Eleven buildings stand on the Emberhold artwork: the ninth is the Glorious Palace (0.6.0), the
    // tenth the Mine by the fountain (0.10.0) and the eleventh the Torn Page's rift (0.13.0), all
    // shown before they open.
    await expect(page.locator('[data-testid^="hotspot-"]')).toHaveCount(11);
  });

  test('reload offers Continue and restores the chronicle', async ({ page }) => {
    await startChronicle(page, 'Marvin');
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await expect(page.getByTestId('btn-continue')).toBeVisible();
    // The chronicle on this device is a card: its name, its level on the gem, when it was last played.
    await expect(page.getByTestId('title-chronicle-name')).toHaveText('Marvin');
    await expect(page.getByTestId('title-chronicle-level')).toHaveText('1');
    await expect(page.getByTestId('title-chronicle-away')).toBeVisible();
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await expect(page.getByTestId('profile-chip')).toContainText('Marvin');
  });

  test('renaming the chronicler updates the profile and the top bar', async ({ page }) => {
    await startChronicle(page, 'Marvin');
    await page.getByTestId('profile-chip').click();
    await expect(page.getByTestId('dialog-profile')).toBeVisible();
    await page.getByTestId('rename').click();
    await page.getByTestId('rename-input').fill('Ysolde');
    await page.getByTestId('rename-confirm').click();
    await expect(page.getByTestId('profile-name')).toHaveText('Ysolde');
    await closeDialog(page);
    await expect(page.getByTestId('profile-chip')).toContainText('Ysolde');
  });

  test('export and import round-trip a .chronicle file', async ({ page }) => {
    test.slow();
    await startChronicle(page, 'Marvin');
    await openSettingsTab(page, 'Save data');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('export-save').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.chronicle$/);
    const file = await download.path();
    expect(file).not.toBeNull();
    const text = readFileSync(file!, 'utf8');
    expect(text.length).toBeGreaterThan(100);
    await closeDialog(page);

    // Start over under another name so the import visibly restores the exported chronicle.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-new-chronicle').click();
    await expect(page.getByTestId('dialog-new-game-confirm')).toBeVisible();
    await page.getByTestId('confirm-overwrite').click();
    // The chronicle being replaced is still the one loaded, so its own lesson is the one waiting;
    // the new chronicle hears its first line on the starter screen (`bindStarter` reads it).
    await page.getByTestId('name-input').fill('Other');
    await page.getByTestId('begin-chronicle').click();
    await bindStarter(page);
    await expect(page.getByTestId('profile-chip')).toContainText('Other');

    await openSettingsTab(page, 'Save data');
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('import-save').click(),
    ]);
    await chooser.setFiles(file!);
    await expect(page.getByTestId('dialog-import-confirm')).toBeVisible();
    await expect(page.getByTestId('dialog-import-confirm')).toContainText('Marvin');
    await page.getByTestId('confirm-import').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await expect(page.getByTestId('profile-chip')).toContainText('Marvin');
  });

  test('damaged or foreign files are rejected with a readable message', async ({ page }) => {
    await startChronicle(page, 'Marvin');
    await openSettingsTab(page, 'Save data');

    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('import-save').click(),
    ]);
    await chooser.setFiles({
      name: 'not-a-save.chronicle',
      mimeType: 'text/plain',
      buffer: Buffer.from('this is not a chronicle'),
    });
    await expect(page.getByRole('alert')).toContainText('could not be read');
    await expect(page.getByTestId('dialog-import-confirm')).toHaveCount(0);

    const [second] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByTestId('import-save').click(),
    ]);
    const tampered = JSON.stringify({
      format: 'chronicle',
      version: 1,
      checksum: '0000000000000000000000000000000000000000000000000000000000000000',
      payload: Buffer.from('{"hello":"world"}').toString('base64'),
    });
    await second.setFiles({
      name: 'tampered.chronicle',
      mimeType: 'text/plain',
      buffer: Buffer.from(tampered),
    });
    await expect(page.getByRole('alert').last()).toBeVisible();
    await expect(page.getByTestId('dialog-import-confirm')).toHaveCount(0);
    await expect(page.getByTestId('profile-chip')).toContainText('Marvin');
  });

  test('erasing the chronicle requires typing the confirmation word', async ({ page }) => {
    test.slow();
    await startChronicle(page, 'Marvin');
    await openSettingsTab(page, 'Save data');
    await page.getByTestId('reset-save').click();
    await expect(page.getByTestId('dialog-reset-confirm')).toBeVisible();
    await expect(page.getByTestId('confirm-reset')).toBeDisabled();
    await page.getByTestId('reset-input').fill('ERAS');
    await expect(page.getByTestId('confirm-reset')).toBeDisabled();
    // Case does not matter: the field upper-cases what is typed.
    await page.getByTestId('reset-input').fill('erase');
    await expect(page.getByTestId('confirm-reset')).toBeEnabled();
    await page.getByTestId('confirm-reset').click();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('btn-continue')).toHaveCount(0);
    await page.reload();
    await gotoTitle(page);
    await expect(page.getByTestId('btn-continue')).toHaveCount(0);
  });
});
