import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { closeDialog, collectConsole, eldricContinue, importChronicleFile, settle } from './helpers';

/**
 * Instant clears (docs/design/CAMPAIGN.md §10) in a production build, on the chronicle
 * `tools/fixtures/instant-chronicle.ts` writes: level 12, Thornwood's first three stands at three
 * stars and the fourth at two, the repeat at ten, and only the instant clear's lesson still unheard.
 */
const INSTANT = join(import.meta.dirname, '..', 'fixtures', 'saves', 'instant.chronicle');
/** A Thornwood run costs four energy; the repeat is set to ten. */
const BATCH_ENERGY = 40;

/** The energy the top bar reads, before its cap. */
async function energyOf(page: Page): Promise<number> {
  const text = await page.getByTestId('pill-energy').innerText();
  return Number((text.split('/')[0] ?? '').replace(/\D/g, ''));
}

/** Hub → Battle → the campaign map → Thornwood Crossing's stands. */
async function openThornwood(page: Page): Promise<void> {
  await page.getByTestId('nav-battle').click();
  await expect(page.getByTestId('screen-game-modes')).toBeVisible();
  await settle(page);
  await page.getByTestId('mode-campaign').getByRole('button').click();
  await expect(page.getByTestId('screen-campaign')).toBeVisible();
  await settle(page);
  await page.getByTestId('enter-1').click();
  await expect(page.getByTestId('screen-settlement')).toBeVisible();
  await settle(page);
}

test.describe('instant clears', () => {
  test.setTimeout(240_000);

  test('a mastered stand is written down: taught, cleared twice, and shut one stand on', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, INSTANT);
    await openThornwood(page);

    // The three mastered stands say so; the fourth, at two stars, does not.
    for (const stand of ['01', '02', '03'])
      await expect(page.getByTestId(`instant-ready-stage-01-${stand}`)).toBeVisible();
    await expect(page.getByTestId('instant-ready-stage-01-04')).toHaveCount(0);

    // On a mastered stand's setup Eldric points at the press, and says what it does.
    await page.getByTestId('battle-stage-01-03').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
    await settle(page);
    await eldricContinue(page, 'tut.6.9');
    const press = page.getByTestId('instant-clear');
    await expect(press).toContainText('Instant ×10');
    await expect(press).toContainText(`${BATCH_ENERGY} ⚡`);

    const before = await energyOf(page);
    await press.click();
    const dialog = page.getByTestId('dialog-instant-clear');
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('instant-ledger')).toHaveAttribute('data-runs', '10');
    await expect(page.getByTestId('instant-count')).toHaveText('×10', { timeout: 10_000 });
    await expect(page.getByTestId('instant-spent')).toContainText(`${BATCH_ENERGY} ⚡ spent`);
    await expect(page.getByTestId('result-rewards')).toContainText(/Gold/);
    expect(await energyOf(page)).toBe(before - BATCH_ENERGY);

    // Again: the same ten, the same team, straight from the page.
    await page.getByTestId('instant-again').click();
    await expect(page.getByTestId('instant-count')).toHaveText('×10', { timeout: 10_000 });
    expect(await energyOf(page)).toBe(before - 2 * BATCH_ENERGY);
    await page.getByTestId('instant-done').click();
    await expect(dialog).toHaveCount(0);

    // One stand on, two stars short of nothing but the last: the press is there, and dead.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-settlement')).toBeVisible();
    await settle(page);
    await page.getByTestId('battle-stage-01-04').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
    await settle(page);
    await expect(page.getByTestId('instant-clear')).toBeDisabled();
    await expect(page.getByTestId('instant-note')).toContainText('three stars');

    expect(problems).toEqual([]);
  });

  test('a batch survives a reload: the energy, the spoils and the tally stay spent', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, INSTANT);
    await openThornwood(page);
    await page.getByTestId('battle-stage-01-01').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible();
    await settle(page);
    // The lesson is the other test's; here it is waved off.
    await eldricContinue(page, 'tut.6.9');
    const before = await energyOf(page);
    await page.getByTestId('instant-clear').click();
    await expect(page.getByTestId('dialog-instant-clear')).toBeVisible({ timeout: 20_000 });
    await closeDialog(page);

    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    // A reload cannot hand the energy back: it left with the press.
    expect(await energyOf(page)).toBeLessThanOrEqual(before - BATCH_ENERGY + 1);

    expect(problems).toEqual([]);
  });
});
