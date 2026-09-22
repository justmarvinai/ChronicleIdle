import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, runItself, settle } from './helpers';

/**
 * The Brewery (docs/design/BREWERY.md) in a production build.
 *
 * The Path fixture is written at an older save version, so this run walks the migration that adds
 * the brewery ledger on its way in and finds a full day of twenty runs — which is the migration
 * doing its job as well as the screen's.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

/** The days the Waning Cellar keeps: Wednesday, Saturday and Sunday (BREWERY.md §4). */
const ECLIPSE_DAYS = [3, 6, 0];

test.describe('the Brewery', () => {
  // One run at ×2 with the full stage and its FX; a software renderer needs the room.
  test.setTimeout(420_000);

  test('spends one of the day’s runs on a hall’s first stage and pours its brews', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // A card of its own on Game Modes, reporting the day's runs the way the boss cards report keys.
    await page.getByTestId('nav-battle').click();
    await expect(page.getByTestId('screen-game-modes')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('mode-brewery')).toContainText('Four halls');
    const open = ECLIPSE_DAYS.includes(new Date().getDay()) ? 4 : 3;
    await expect(page.getByTestId('note-brewery')).toHaveText(`20/20 runs · ${open} halls open`);
    await page.getByTestId('enter-brewery').click();
    await expect(page.getByTestId('screen-brewery')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // A day nobody has spent: twenty runs, the reset counting down, and four halls to put them in.
    await expect(page.getByTestId('brewery-runs-left')).toHaveText('20/20');
    await expect(page.getByTestId('brewery-runs-line')).toHaveText('20 of 20 runs left today');
    await expect(page.getByTestId('brewery-resets')).toContainText('Resets in');
    await expect(page.getByTestId('brewery-resets')).toContainText('same twenty runs');
    for (const element of ['justice', 'valor', 'faith', 'eclipse'])
      await expect(page.getByTestId(`brewery-progress-${element}`)).toHaveText('0/5');

    // The Ember Vats: Justice beats Valor, which is the wheel the mode teaches.
    await page.getByTestId('brewery-tab-valor').click();
    await settle(page);
    await expect(page.getByTestId('brewery-hall-name')).toHaveText('The Ember Vats');
    await expect(page.getByTestId('brewery-hall-days')).toHaveText('Open every day');
    await expect(page.getByTestId('brewery-doors-valor')).toHaveText('Open today');
    await expect(page.getByTestId('brewery-bring')).toContainText('Bring Justice champions');

    // The ladder: stage 1 open, the four above it shut, and stage N paying N brews.
    await expect(page.getByTestId('brewery-stage-valor-1')).toHaveAttribute('data-state', 'next');
    await expect(page.getByTestId('brewery-stage-valor-1')).toContainText('Starting out');
    for (const stage of [2, 3, 4, 5])
      await expect(page.getByTestId(`brewery-stage-valor-${stage}`)).toHaveAttribute('data-state', 'locked');
    await expect(page.getByTestId('brewery-stage-valor-5')).toContainText('Endgame');

    // Brewing stage 1: the run is charged on the way in, before a blow is struck.
    await page.getByTestId('brewery-enter-valor-1').click();
    await expect(page.getByTestId('screen-battle-setup')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('start-battle')).toContainText('One run');
    await page.getByTestId('start-battle').click();
    await runItself(page);

    // The guards fall, and the result says what came out of the cellar rather than counting stars.
    await expect(page.getByTestId('screen-battle-result')).toBeVisible({ timeout: 300_000 });
    await settle(page);
    const outcome = page.getByTestId('brewery-outcome');
    await expect(outcome).toContainText('The Ember Vats');
    await expect(outcome).toContainText('Stage 1');
    await expect(page.getByTestId('brewery-outcome-first')).toContainText('stage 2 is open');
    await expect(page.getByTestId('brewery-outcome-runs')).toHaveText('19 runs left today');

    // Back to the hall: one stage behind the player, the next open, and nineteen runs left.
    await page.getByTestId('result-brewery').click();
    await expect(page.getByTestId('screen-brewery')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('brewery-runs-left')).toHaveText('19/20');
    await expect(page.getByTestId('brewery-progress-valor')).toHaveText('1/5');
    await expect(page.getByTestId('brewery-stage-valor-1')).toHaveAttribute('data-state', 'cleared');
    await expect(page.getByTestId('brewery-stage-valor-2')).toHaveAttribute('data-state', 'next');

    // The Waning Cellar keeps its own calendar, and says so whether or not today is one of its days.
    await page.getByTestId('brewery-tab-eclipse').click();
    await settle(page);
    await expect(page.getByTestId('brewery-hall-name')).toHaveText('The Waning Cellar');
    await expect(page.getByTestId('brewery-hall-days')).toHaveText('Open Wed, Sat, Sun');
    const brewsToday = ECLIPSE_DAYS.includes(new Date().getDay());
    await expect(page.getByTestId('brewery-doors-eclipse')).toHaveText(
      brewsToday ? 'Open today' : 'Closed today',
    );
    if (brewsToday) await expect(page.getByTestId('brewery-enter-eclipse-1')).toBeEnabled();
    else {
      await expect(page.getByTestId('brewery-barred')).toContainText('they open');
      await expect(page.getByTestId('brewery-enter-eclipse-1')).toBeDisabled();
    }

    // And the day survives a reload, because the runs and the ladder are in the save.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('nav-battle').click();
    await settle(page);
    await page.getByTestId('enter-brewery').click();
    await expect(page.getByTestId('brewery-runs-left')).toHaveText('19/20', { timeout: 20_000 });
    await expect(page.getByTestId('brewery-progress-valor')).toHaveText('1/5');

    expect(problems).toEqual([]);
  });
});
