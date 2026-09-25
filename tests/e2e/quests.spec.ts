import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The Chronicler's Ledger (docs/design/QUESTS_MISSIONS.md §2–§3). The fixture is the level-20
 * chronicle the Portal and the Idle Chest specs use: deep enough for both boards, with a chest at
 * the docks that is full. That is what makes this spec a real loop rather than a screenshot — the
 * board's own counters are the ones the game writes, so opening the chest is what finishes the
 * quest that asks for it, in a production build and through the 8→10 save migration.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'portal.chronicle');

test.describe('the quest boards', () => {
  test.setTimeout(240_000);

  test('claims the day’s quests, fills the points track and opens its chest', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // The hub's ledger button counts what the boards owe: the login quest, from the first minute.
    const nav = page.getByTestId('nav-quests');
    await expect(nav).toContainText('Quests');
    await nav.click();
    await expect(page.getByTestId('screen-quests')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // The day starts empty, with ten quests on the board and one of them already done.
    await expect(page.getByTestId('quests-points')).toContainText('0 / 100 points');
    await expect(page.locator('[data-testid^="quest-row-quest.daily."]')).toHaveCount(10);
    await expect(page.getByTestId('quests-claim-all')).toContainText('Claim all (1)');
    const stages = page.getByTestId('quest-row-quest.daily.clear_stages');
    await expect(stages).toContainText('Clear 5 campaign stages');
    await expect(stages).toContainText('0 / 5');
    // A quest still to do offers the way to where it is played, not a press that does nothing.
    await expect(page.getByTestId('quest-claim-quest.daily.clear_stages')).toHaveCount(0);
    await expect(page.getByTestId('quest-go-quest.daily.clear_stages')).toBeEnabled();
    // And the tally says what its first chest holds before it is reached.
    await expect(page.getByTestId('quest-chest-daily-20').locator('xpath=..')).toContainText(
      '20 more points',
    );

    // Claiming pays the reward and moves the track; the row says so and cannot be claimed twice.
    await page.getByTestId('quest-claim-quest.daily.login').click();
    await expect(page.getByTestId('quests-points')).toContainText('10 / 100 points');
    await expect(page.getByTestId('quest-claimed-quest.daily.login')).toContainText('Claimed');
    await expect(page.getByTestId('quests-claim-all')).toBeDisabled();
    // Ten points is not a chest yet.
    await expect(page.getByTestId('quest-chest-daily-20')).toBeDisabled();

    // The weekly board is the same screen with a week's asks and its own reset.
    await page.getByTestId('quests-tab-weekly').click();
    await settle(page);
    await expect(page.locator('[data-testid^="quest-row-quest.weekly."]')).toHaveCount(8);
    await expect(page.getByTestId('quest-row-quest.weekly.clear_stages_weekly')).toContainText('0 / 60');
    // The weekly board's own ladder, and none of the daily one's rungs.
    await expect(page.getByTestId('quest-chest-daily-20')).toHaveCount(0);
    await expect(page.getByTestId('quest-chest-weekly-25')).toBeDisabled();

    // Back to the hub: opening the Idle Chest is play the board is counting.
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByTestId('screen-hub')).toBeVisible();
    await settle(page);
    await page.getByTestId('hotspot-idle').click();
    await expect(page.getByTestId('dialog-idle-chest')).toBeVisible();
    await page.getByTestId('idle-claim').click();
    await page.getByTestId('idle-continue').click();
    await expect(page.getByTestId('dialog-idle-chest')).toBeHidden();

    // The quest that asks for it is finished now, and "Claim all" takes it.
    await page.getByTestId('nav-quests').click();
    await expect(page.getByTestId('screen-quests')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await expect(page.getByTestId('quests-claim-all')).toContainText('Claim all (1)');
    await page.getByTestId('quests-claim-all').click();
    await expect(page.getByTestId('quests-points')).toContainText('20 / 100 points');

    // Twenty points is the first chest: it pays once, and then it is taken.
    const chest = page.getByTestId('quest-chest-daily-20');
    await expect(chest).toBeEnabled();
    await chest.click();
    await expect(chest).toBeDisabled();
    await expect(page.getByTestId('quests-points')).toContainText('20 / 100 points');

    // All of it survives a reload: the claims belong to the day, not to the session.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    await settle(page);
    await page.getByTestId('nav-quests').click();
    await expect(page.getByTestId('screen-quests')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('quests-points')).toContainText('20 / 100 points');
    await expect(page.getByTestId('quest-claimed-quest.daily.login')).toContainText('Claimed');
    await expect(page.getByTestId('quest-chest-daily-20')).toBeDisabled();

    expect(problems).toEqual([]);
  });
});
