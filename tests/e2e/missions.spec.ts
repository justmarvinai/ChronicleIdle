import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { collectConsole, importChronicleFile, settle } from './helpers';

/**
 * The Chronicler's Path (docs/design/QUESTS_MISSIONS.md §4). The fixture is the chronicle the
 * ROADMAP's acceptance asks for: the first six chapters claimed and their chests taken, Intro
 * mastered, a party at 6★ — so the Path opens on chapter 7 and carries on from there, through the
 * 11→11 save it was written at and a production build.
 */
const SAVE = join(import.meta.dirname, '..', 'fixtures', 'saves', 'path.chronicle');

test.describe('the Chronicler’s Path', () => {
  test.setTimeout(240_000);

  test('continues a chronicle six chapters in, and claims the mission it is on', async ({ page }) => {
    const problems = collectConsole(page);
    await importChronicleFile(page, SAVE);

    // The hub's Missions button opens the Path rather than a locked screen.
    await page.getByTestId('nav-missions').click();
    await expect(page.getByTestId('screen-missions')).toBeVisible({ timeout: 20_000 });
    await settle(page);

    // Six chapters of twelve are behind it, and the tab it opens on is the seventh.
    await expect(page.getByTestId('missions-progress')).toContainText('72 / 120 missions');
    await expect(page.getByTestId('missions-eldric')).toContainText('heavier hand');
    await expect(page.getByTestId('missions-chapter-progress')).toContainText('0 / 12');
    await expect(page.getByTestId('mission-card-mission.07.01')).toContainText(
      'Clear Thornwood Crossing 1-10 (Normal)',
    );

    // The chapters it has walked read as claimed, and their chests as taken.
    await page.getByTestId('missions-tab-1').click();
    await settle(page);
    await expect(page.getByTestId('missions-chapter-progress')).toContainText('12 / 12');
    await expect(page.getByTestId('mission-claimed-mission.01.01')).toContainText('Claimed');
    await expect(page.getByTestId('chapter-chest-1')).toBeDisabled();

    // Chapter 7's second mission is already satisfied by the Intro the fixture mastered — but the
    // Path is walked in order, so it is locked until its turn.
    await page.getByTestId('missions-tab-7').click();
    await settle(page);
    const stars = page.getByTestId('mission-card-mission.07.02');
    await expect(stars).toContainText('30 / 30');
    await expect(stars).toContainText('Locked');

    // The open mission is not finished (Normal has not been touched), so there is nothing to claim:
    // the card names where it is played and offers the way there instead.
    await expect(page.getByTestId('mission-claim-mission.07.01')).toHaveCount(0);
    await expect(page.getByTestId('mission-where-mission.07.01')).toContainText('Thornwood Crossing');
    await expect(page.getByTestId('mission-go-mission.07.01')).toBeEnabled();

    // Back to chapter 6: its last mission is claimed and the chest is taken, so nothing is owed.
    await page.getByTestId('missions-tab-6').click();
    await settle(page);
    await expect(page.getByTestId('chapter-chest-6')).toBeDisabled();
    await expect(page.getByTestId('missions-chapter-progress')).toContainText('12 / 12');

    // All of it survives a reload: the Path belongs to the save, not the session.
    await page.reload();
    await expect(page.getByTestId('screen-title')).toBeVisible({ timeout: 30_000 });
    await settle(page);
    await page.getByTestId('btn-continue').click();
    await expect(page.getByTestId('screen-hub')).toBeVisible({ timeout: 20_000 });
    // A fixture's last save is days old, so the chronicle comes back to a Welcome Back panel.
    const welcome = page.getByTestId('dialog-welcome-back');
    if (await welcome.isVisible()) await page.getByRole('button', { name: 'Continue' }).click();
    await expect(welcome).toBeHidden();
    await settle(page);
    await page.getByTestId('nav-missions').click();
    await expect(page.getByTestId('screen-missions')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('missions-progress')).toContainText('72 / 120 missions');

    // And the way there leads to the settlement the open mission is fought in.
    await page.getByTestId('mission-go-mission.07.01').click();
    await expect(page.getByTestId('screen-settlement')).toBeVisible({ timeout: 20_000 });

    expect(problems).toEqual([]);
  });
});
