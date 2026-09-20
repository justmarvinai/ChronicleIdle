import { expect, test, type Page } from '@playwright/test';
import { collectConsole, freshChronicle, settle } from './helpers';

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
    await freshChronicle(page);
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
    // The press picks and nothing else: the ability is what spends the turn (BATTLE.md §8).
    await expect(targets.first()).toHaveAttribute('data-targeted', 'true');
    await expect(turns).toHaveText(before ?? '');
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
    // And it stays inside its frame: the log used to grow past the panel and run off the screen,
    // because the flex column was on the panel rather than on its content box (the owner's batch).
    const logBox = await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="battle-info"]');
      const list = document.querySelector('[data-testid="battle-log"]');
      if (!panel || !list) return null;
      const p = panel.getBoundingClientRect();
      const l = list.getBoundingClientRect();
      const rows = [...list.querySelectorAll('li')];
      const lines = rows.map((li) => li.getBoundingClientRect());
      const transparent = ['rgba(0, 0, 0, 0)', 'transparent'];
      return {
        inside: l.top >= p.top - 1 && l.bottom <= p.bottom + 1,
        // No row starts on the frame itself; the panel's own padding holds them off it.
        marginLeft: Math.min(...lines.map((r) => r.left - p.left)),
        lastLineInside: lines.length > 0 && (lines.at(-1)?.bottom ?? 0) <= l.bottom + 1,
        kinds: [...new Set(rows.map((li) => li.dataset.kind ?? ''))],
        // The accent rail each kind carries (UI_DESIGN.md §5.9). It is how the log is scanned, and
        // it renders only if the kind reached a class at all — which a bundler rename can undo.
        railed: rows.filter((li) => !transparent.includes(getComputedStyle(li).borderLeftColor)).length,
      };
    });
    expect(logBox?.inside, 'the log is inside the panel').toBe(true);
    expect(logBox?.lastLineInside, 'the newest line is inside the log').toBe(true);
    expect(logBox?.marginLeft ?? -1).toBeGreaterThan(0);
    expect(logBox?.kinds ?? [], 'every row says which kind of event it is').not.toContain('');
    expect(logBox?.railed ?? 0, 'rows carry the accent rail of their kind').toBeGreaterThan(0);
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
    await freshChronicle(page);
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
    await freshChronicle(page);
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

  test('marking an enemy sets what the turn opens on, and the mark moves', async ({ page }) => {
    await freshChronicle(page);
    await openStageSetup(page, 1);
    await setAuto(page, false);
    await startBattle(page);
    // Manual mode holds the fight at the decision, which is where a mark is set by hand. That the
    // policy then aims at the mark is the simulation's own rule, and is unit-tested with it.
    await waitForDecision(page);

    const marked = page.locator('[data-testid^="plate-w0e"][data-focused="true"]');
    // Tab cycles the target, and cycling onto an enemy marks it (BATTLE.md §7.1).
    await page.keyboard.press('Tab');
    await expect(marked).toHaveCount(1);
    // The mark is what the turn opens on: the preselection is on the marked plate.
    await expect(marked).toHaveAttribute('data-targeted', 'true');
    const first = await marked.getAttribute('data-testid');

    // Marking the other enemy moves the mark rather than adding a second one.
    await page.keyboard.press('Tab');
    await expect(marked).toHaveCount(1);
    await expect(marked).toHaveAttribute('data-targeted', 'true');
    expect(await marked.getAttribute('data-testid')).not.toBe(first);

    // Marking spends nothing: the same decision is still open behind it.
    await expect(page.getByTestId('ability-a1')).toHaveAttribute('data-ready', 'true');

    await page.getByTestId('battle-pause').click();
    await page.getByTestId('pause-retreat').click();
    await page.getByTestId('pause-retreat-confirm').click();
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 120_000 });
  });

  test('team presets save and load on the setup screen', async ({ page }) => {
    await freshChronicle(page);
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
