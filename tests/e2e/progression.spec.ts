import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { closeDialog, collectConsole, importChronicleFile, settle, startChronicle } from './helpers';

/** A chronicle one stand short of level 2 (`tools/fixtures/level-up-chronicle.ts`). */
const ALMOST_LEVEL_2 = join(import.meta.dirname, '..', 'fixtures', 'saves', 'level-up.chronicle');

/** Hub → Battle → the campaign map → Thornwood Crossing → the first stand's setup. */
async function openFirstStand(page: Page): Promise<void> {
  await page.getByTestId('nav-battle').click();
  await expect(page.getByTestId('screen-game-modes')).toBeVisible();
  await settle(page);
  await page.getByTestId('mode-campaign').getByRole('button').click();
  await expect(page.getByTestId('screen-campaign')).toBeVisible();
  await settle(page);
  await page.getByTestId('enter-1').click();
  await expect(page.getByTestId('screen-settlement')).toBeVisible();
  await settle(page);
  await page.getByTestId('battle-stage-01-01').click();
  await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
  await settle(page);
}

test.describe('chronicle levels', () => {
  // Fights render with software WebGL on CI runners; give the flow a generous budget.
  test.setTimeout(480_000);

  test('a clear that fills the bar celebrates the level and pays it', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, ALMOST_LEVEL_2);
    await expect(page.getByTestId('profile-chip')).toContainText('Marvin');

    await openFirstStand(page);
    const auto = page.getByTestId('setup-auto').getByRole('switch');
    if ((await auto.getAttribute('aria-checked')) !== 'true') await auto.click();
    await page.getByTestId('start-battle').click();
    await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('battle-speed').click();
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 300_000 });

    // The celebration raises itself on the screen after the fight, never over it.
    await expect(page.getByTestId('dialog-level-up')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('level-up-level')).toHaveText('2');
    await expect(page.getByTestId('level-up-rewards')).toContainText('Gold');
    await expect(page.getByTestId('level-up-energy')).toContainText('+70');
    await expect(page.getByTestId('level-up-unlocks')).toContainText('Tavern: Levelling');
    await page.getByTestId('level-up-continue').click();
    await expect(page.getByTestId('dialog-level-up')).toHaveCount(0);

    await page.getByTestId('result-hub').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await expect(page.getByTestId('profile-chip-level')).toHaveText('2');
    expect(problems).toEqual([]);
  });

  test('the profile reports the standing and wears an earned title', async ({ page }) => {
    await startChronicle(page, 'Marvin');
    await page.getByTestId('profile-chip').click();
    await expect(page.getByTestId('dialog-profile')).toBeVisible();
    await expect(page.getByTestId('stat-champions')).toHaveText('4');
    await expect(page.getByTestId('stat-cleared')).toHaveText('0');
    await expect(page.getByTestId('profile-stars')).toContainText('0 / 360');
    await expect(page.getByTestId('profile-titles')).toContainText('Chronicler');
    await expect(page.getByTestId('profile-next-unlocks')).toContainText('Tavern: Levelling');

    await page.getByTestId('choose-title').click();
    await expect(page.getByTestId('dialog-title-picker')).toBeVisible();
    // Locked titles are visible but cannot be worn.
    await expect(page.getByTestId('title-title.loremaster')).toBeDisabled();
    await page.getByTestId('title-title.chronicler').click();
    await expect(page.getByTestId('dialog-title-picker')).toHaveCount(0);
    await expect(page.getByTestId('profile-worn-title')).toContainText('Chronicler');
    await closeDialog(page);
    await expect(page.getByTestId('profile-chip-title')).toHaveText('Chronicler');
  });
});
