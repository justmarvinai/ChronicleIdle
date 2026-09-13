import { expect, test, type Page } from '@playwright/test';
import { collectConsole, settle, startChronicle } from './helpers';

/** Hub → Battle → the campaign map → Thornwood Crossing → the setup screen of one stand. */
async function openStageSetup(page: Page, stage: 1 | 2): Promise<void> {
  await page.getByTestId('nav-battle').click();
  await expect(page.getByTestId('screen-game-modes')).toBeVisible();
  await settle(page);
  await page.getByTestId('mode-campaign').getByRole('button').click();
  await expect(page.getByTestId('screen-campaign')).toBeVisible();
  await settle(page);
  await page.getByTestId('enter-1').click();
  await expect(page.getByTestId('screen-settlement')).toBeVisible();
  await settle(page);
  await page.getByTestId(`battle-stage-01-0${stage}`).click();
  await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
  await settle(page);
}

/** The control switch on the setup screen (persisted in settings, so make it explicit). */
async function setAuto(page: Page, on: boolean): Promise<void> {
  const control = page.getByTestId('setup-auto').getByRole('switch');
  if ((await control.getAttribute('aria-checked')) !== String(on)) await control.click();
  await expect(control).toHaveAttribute('aria-checked', String(on));
}

async function startBattle(page: Page): Promise<void> {
  await page.getByTestId('start-battle').click();
  await expect(page.getByTestId('screen-battle')).toBeVisible({ timeout: 30_000 });
}

/** Waits for a manual decision: the A1 slot lights up when the request is open. */
async function waitForDecision(page: Page): Promise<void> {
  await expect(page.getByTestId('ability-a1')).toHaveAttribute('data-ready', 'true', { timeout: 90_000 });
}

async function waitForResult(page: Page): Promise<void> {
  await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 300_000 });
  await settle(page);
}

test.describe('battle', () => {
  // Fights render with software WebGL on CI runners; give the flows a generous wall-clock budget.
  test.setTimeout(480_000);

  test('manual mode: mouse and keyboard decisions, the info log, pause, then auto to a victory', async ({
    page,
  }) => {
    const problems = collectConsole(page);
    await startChronicle(page);
    await openStageSetup(page, 1);
    await expect(page.getByTestId('team-power')).not.toHaveText('0');
    await expect(page.getByTestId('wave-enemies')).toContainText('Thornwood Cutpurse');
    await expect(page.getByTestId('start-battle')).toContainText('4');
    await setAuto(page, false);
    await startBattle(page);
    await expect(page.getByTestId('battle-wave')).toContainText('1');
    await expect(page.getByTestId('battle-auto')).toHaveAttribute('aria-pressed', 'false');

    // Mouse: pick a target plate, then cast the A1 on it.
    await waitForDecision(page);
    const turns = page.getByTestId('battle-turns');
    const before = await turns.textContent();
    const targets = page.locator('[data-targetable="true"]');
    await expect(targets.first()).toBeVisible();
    await targets.first().click();
    await page.getByTestId('ability-a1').click();
    await expect(turns).not.toHaveText(before ?? '', { timeout: 90_000 });

    // Keyboard: Tab cycles the target, Space confirms the selected ability.
    await waitForDecision(page);
    const beforeKeys = await turns.textContent();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await expect(turns).not.toHaveText(beforeKeys ?? '', { timeout: 90_000 });

    // The Info panel lists what happened so far.
    await page.getByTestId('battle-info-toggle').click();
    await expect(page.getByTestId('battle-info')).toBeVisible();
    expect(await page.getByTestId('battle-log').locator('li').count()).toBeGreaterThan(3);
    await page.getByTestId('battle-info-toggle').click();

    // Pause and resume from the menu.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dialog-battle-pause')).toBeVisible();
    await page.getByTestId('pause-resume').click();
    await expect(page.getByTestId('dialog-battle-pause')).toHaveCount(0);

    // ×2 and auto finish the fight.
    await page.getByTestId('battle-speed').click();
    await expect(page.getByTestId('battle-speed')).toContainText('2');
    await page.getByTestId('battle-auto').click();
    await expect(page.getByTestId('battle-auto')).toHaveAttribute('aria-pressed', 'true');
    await waitForResult(page);
    await expect(page.getByTestId('result-title')).toHaveText('Victory');
    await expect(page.getByTestId('result-turns')).toBeVisible();
    // The stand paid: stars, gold and the first-clear bundle.
    await expect(page.getByTestId('result-stars')).toBeVisible();
    await expect(page.getByTestId('result-rewards')).toContainText('Gold');
    await expect(page.getByTestId('result-rewards')).toContainText('First clear');
    await page.getByTestId('result-hub').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    expect(problems).toEqual([]);
  });

  test('auto clears the first stand and the Next stand button opens the one it unlocked', async ({
    page,
  }) => {
    await startChronicle(page);
    await openStageSetup(page, 1);
    await setAuto(page, true);
    await startBattle(page);
    await expect(page.getByTestId('battle-auto')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('battle-speed').click();
    await expect(page.getByTestId('battle-speed')).toContainText('2');
    await waitForResult(page);
    await expect(page.getByTestId('result-title')).toHaveText('Victory');

    // Stage 1-2 was locked before this clear; the result screen leads straight into it.
    await page.getByTestId('result-next').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
    await settle(page);
    await startBattle(page);
    await waitForResult(page);
    await expect(page.getByTestId('result-title')).toHaveText('Victory');
    await page.getByTestId('result-campaign').click();
    await expect(page.getByTestId('screen-campaign')).toBeVisible();
    // Two stands cleared in Thornwood Crossing: its banner carries the stars.
    await expect(page.getByTestId('campaign-stars')).not.toContainText('0 /');
  });

  test('retreating from the pause menu ends the fight and the result leads back to the team', async ({
    page,
  }) => {
    await startChronicle(page);
    await openStageSetup(page, 1);
    await setAuto(page, false);
    await startBattle(page);
    await waitForDecision(page);
    await page.getByTestId('battle-pause').click();
    await expect(page.getByTestId('dialog-battle-pause')).toBeVisible();
    await page.getByTestId('pause-retreat').click();
    await page.getByTestId('pause-retreat-confirm').click();
    await waitForResult(page);
    await expect(page.getByTestId('result-title')).toHaveText('Retreat');
    await page.getByTestId('result-team').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
  });

  test('team presets save and load on the setup screen', async ({ page }) => {
    await startChronicle(page);
    await openStageSetup(page, 1);
    const power = page.getByTestId('team-power');
    const full = await power.textContent();
    await expect(page.getByTestId('preset-load-0')).toBeDisabled();
    // Empty the third slot, save the pair as preset 1, refill, then load the pair back.
    await page.getByTestId('team-slot-2').click();
    await expect(power).not.toHaveText(full ?? '');
    const pair = await power.textContent();
    await page.getByTestId('preset-save-0').click();
    await expect(page.getByTestId('preset-load-0')).toBeEnabled();
    await page.getByTestId('pick-bran_militia-2').click();
    await expect(power).not.toHaveText(pair ?? '');
    await page.getByTestId('preset-load-0').click();
    await expect(power).toHaveText(pair ?? '');
  });
});
