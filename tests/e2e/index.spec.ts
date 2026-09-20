import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The Chronicle Index (docs/tech/UI_DESIGN.md §5.20). The Path fixture holds six champions, so
 * the catalogue has both found and unfound pages to draw — which is the thing an index is for.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

test.describe('the Chronicle Index', () => {
  test.setTimeout(240_000);

  test('catalogues every champion, the bestiary, the sets and the statuses', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    await page.getByTestId('nav-index').click();
    await expect(page.getByTestId('screen-index')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // Champions: the whole roster of definitions, with the tally saying how much of it is found.
    await expect(page.getByTestId('index-found')).toContainText(/of 23 champions found/);
    await expect(page.getByTestId('index-card-champ.anuria')).toBeVisible();
    await page.getByTestId('index-card-champ.anuria').click();
    await settle(page);
    const champion = page.getByTestId('index-page');
    await expect(champion).toContainText('Anuria');
    await expect(champion).toContainText('Abilities');
    // A page states what an ability costs in turns, whether or not the chronicle owns them.
    await expect(champion).toContainText(/Cooldown \d|No cooldown/);

    // Bestiary: the first settlement's faction, its six and the boss that holds the last stand.
    await page.getByTestId('index-tab-bestiary').click();
    await settle(page);
    await expect(page.getByTestId('index-faction-name')).toContainText('Thornwood Crossing');
    await expect(page.getByTestId('index-beast-enemy.redcap_halvar')).toContainText('Boss');
    await page.getByTestId('index-beast-enemy.thornwood_poacher').click();
    await settle(page);
    await expect(page.getByTestId('index-beast-page')).toContainText('Thornwood Poacher');
    // The twelfth settlement is a tab away, and its own faction answers.
    await page.getByTestId('index-faction-12').click();
    await settle(page);
    await expect(page.getByTestId('index-faction-name')).toContainText('The Eclipse Gate');

    // The sets say what a complete group gives, once.
    await page.getByTestId('index-tab-sets').click();
    await settle(page);
    const warcry = page.getByTestId('index-set-gear_set.warcry');
    await expect(warcry).toContainText('2-piece set');
    await expect(warcry).toContainText('ATK');

    // The statuses stand in for the number an ability decides, rather than leaking a placeholder.
    await page.getByTestId('index-tab-statuses').click();
    await settle(page);
    const atkUp = page.getByTestId('index-status-atk_up');
    await expect(atkUp).toContainText('Increases ATK by X');
    await expect(page.getByTestId('index-statuses')).not.toContainText('{value}');

    expect(problems).toEqual([]);
  });
});
